use crate::parse::{Stream, TerminalCommand};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use std::{
    fs::OpenOptions,
    io::{Read, Write},
    sync::atomic::{AtomicBool, Ordering},
    sync::mpsc::{self, Receiver, RecvTimeoutError, Sender},
    sync::{Arc, Condvar, Mutex},
    thread,
    time::{Duration, Instant},
};

/// Sent as the last command once the shell has exited and the PTY is closed.
pub const CHILD_EXITED: &str = "child-exited";

/// How much raw output is gathered into a single batch of commands. A batch
/// is handled by the screen in one go, with the keyboard waiting until it is
/// done, so this is what bounds how long Ctrl+C can take during a flood: a
/// batch of nothing but short lines (`yes`) is thousands of lines.
const MAX_BATCH_BYTES: usize = 16 * 1024;
/// How much is read from the PTY at once. A batch is at least one read.
const READ_BYTES: usize = 8 * 1024;
/// How long output is gathered before it is handed over. A PTY delivers a
/// busy program's output in reads of a few hundred bytes; without this every
/// one of them would be a separate message to the frontend (tens of thousands
/// per second), and the frontend, not the program, would set the pace.
const BATCH_WINDOW: Duration = Duration::from_millis(4);
/// How long a synchronized update (DEC mode 2026) may hold back output.
const SYNCHRONIZED_UPDATE_TIMEOUT: Duration = Duration::from_millis(200);

/// How many batches may be on their way to the screen at once. Without a
/// limit a program that prints faster than the screen draws (`yes`, a build
/// gone wrong, `cat` of a huge file) fills memory with output nobody has
/// seen yet, and the screen is still working through it long after the
/// program was told to stop.
const MAX_UNACKNOWLEDGED_BATCHES: u64 = 2;
/// How long to wait for the screen to take a batch before sending the next
/// one anyway. A screen that is alive answers within milliseconds; one that
/// does not answer (not listening yet, reloading) must not stop the terminal.
const ACKNOWLEDGE_TIMEOUT: Duration = Duration::from_secs(1);
/// How many reads from the PTY may wait to be parsed. When this is full the
/// reader stops reading, the PTY's own buffer fills, and the program blocks
/// in its `write`: that is what slows a runaway program down. It is also
/// how much is still to come after the program was stopped.
const MAX_PENDING_READS: usize = 4;

/// Output on its way to the screen: the commands, and which batch this is.
/// The screen acknowledges a batch by its number.
#[derive(Debug)]
pub struct Batch {
    pub sequence: u64,
    pub commands: Vec<TerminalCommand>,
}

/// Keeps output from getting ahead of the screen.
///
/// Batches are numbered as they are handed over, and the screen says which
/// one it has taken (`acknowledge`). While `MAX_UNACKNOWLEDGED_BATCHES` are
/// on their way no more are handed over. Because the screen names the batch,
/// an answer that gets lost is made up for by the next one.
#[derive(Clone)]
pub struct Flow {
    state: Arc<(Mutex<FlowState>, Condvar)>,
}

#[derive(Default)]
struct FlowState {
    handed_over: u64,
    acknowledged: u64,
}

impl Flow {
    fn new() -> Self {
        Flow {
            state: Arc::new((Mutex::new(FlowState::default()), Condvar::new())),
        }
    }

    /// The screen has taken the batch with this number (and so every batch
    /// before it).
    pub fn acknowledge(&self, sequence: u64) {
        let (state, changed) = &*self.state;
        let mut state = state.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        // never beyond what was handed over, whatever the screen says
        let sequence = sequence.min(state.handed_over);
        if sequence > state.acknowledged {
            state.acknowledged = sequence;
            changed.notify_all();
        }
    }

    /// Waits until another batch may be handed over. Returns false when the
    /// screen did not answer in time; one more batch is then handed over
    /// anyway.
    fn wait_for_room(&self, timeout: Duration) -> bool {
        let (state, changed) = &*self.state;
        let state = state.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        let (_state, result) = changed
            .wait_timeout_while(state, timeout, |state| {
                state.handed_over - state.acknowledged >= MAX_UNACKNOWLEDGED_BATCHES
            })
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        !result.timed_out()
    }

    /// Numbers a batch that is about to be handed over.
    fn next(&self, commands: Vec<TerminalCommand>) -> Batch {
        let (state, _) = &*self.state;
        let mut state = state.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        state.handed_over += 1;
        Batch {
            sequence: state.handed_over,
            commands,
        }
    }

    #[cfg(test)]
    fn on_their_way(&self) -> u64 {
        let state = self.state.0.lock().unwrap();
        state.handed_over - state.acknowledged
    }
}

#[derive(Deserialize, Serialize, Clone, Eq, PartialEq, Debug)]
pub struct Size {
    pub height: i32,
    pub width: i32,
}

pub struct Api {
    pub run_tx: std::sync::mpsc::Sender<std::string::String>,
    pub resize_tx: std::sync::mpsc::Sender<Size>,
    /// Held by the caller (typically in a per-workspace struct) so that
    /// dropping the workspace closes this channel; the kill-watcher
    /// thread spawned in `start` is blocked on the receiver and will
    /// kill the spawned shell as soon as the sender drops. Closing the
    /// channel propagates through the PTY: the child dies, the master's
    /// reader returns EOF, the reader thread exits; the writer/resize
    /// threads exit when their own channels close shortly after.
    pub kill_tx: std::sync::mpsc::Sender<()>,
    /// Call `flow.acknowledge(batch.sequence)` each time the screen has taken
    /// a batch of output. Output is held back while the screen is behind.
    pub flow: Flow,
}

/// How long a shell gets to exit after it was told its terminal is gone,
/// before it is killed.
const HANGUP_GRACE: Duration = Duration::from_secs(2);

/// Starts a shell in a new PTY.
///
/// An error when no terminal device could be opened or no shell could be
/// started (out of file descriptors or PTYs, `$SHELL` pointing nowhere and
/// none of the usual shells there either). Nothing is left running then.
pub fn start(
    directory: String,
    output_sender: Sender<Batch>,
    resize_sender: Sender<Size>,
) -> Result<Api, String> {
    let (run_tx, run_rx): (Sender<String>, Receiver<String>) = mpsc::channel();
    let (resize_tx, resize_rx): (Sender<Size>, Receiver<Size>) = mpsc::channel();

    // Use the native pty implementation for the system
    let pty_system = native_pty_system();

    // Create a new pty
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|error| format!("could not open a terminal device: {}", error))?;

    // Spawn a shell into the pty: the user's, or failing that one of the
    // shells every system has.
    let mut child = None;
    let mut failures = vec![];
    for shell in shells() {
        match pair.slave.spawn_command(shell_command(&shell, &directory)) {
            Ok(spawned) => {
                child = Some(spawned);
                break;
            }
            Err(error) => failures.push(format!("{}: {}", shell, error)),
        }
    }
    let mut child = child.ok_or_else(|| format!("could not start a shell ({})", failures.join("; ")))?;

    // The child holds its own handle to the slave side. Ours has to be closed,
    // otherwise reads on the master never end after the shell exits.
    drop(pair.slave);

    let streams = pair
        .master
        .try_clone_reader()
        .and_then(|reader| pair.master.take_writer().map(|writer| (reader, writer)));
    let (mut reader, mut writer) = match streams {
        Ok(streams) => streams,
        Err(error) => {
            let _ = child.kill();
            let _ = child.wait();
            return Err(format!("could not attach to the terminal device: {}", error));
        }
    };
    let master = pair.master;

    // Kill-watcher: blocks on `kill_rx.recv()` until the sender drops (or
    // someone explicitly sends a unit). Hanging up on the shell closes the
    // slave's pty fds, which causes the master reader to hit EOF; the output
    // thread below then reaps the child.
    let (kill_tx, kill_rx) = mpsc::channel::<()>();
    let mut killer = child.clone_killer();
    let shell_pid = child.process_id();
    let exited = Arc::new(AtomicBool::new(false));
    let exited_for_kill = exited.clone();
    thread::spawn(move || {
        let _ = kill_rx.recv();
        // A shell that has exited was already reaped: its process id may
        // belong to another process by now.
        if exited_for_kill.load(Ordering::SeqCst) {
            return;
        }
        let _ = killer.kill();

        // That was a hangup, which a shell may ignore. One that does keeps
        // the PTY open, and with it this terminal's threads and file
        // descriptors, for as long as the app runs.
        let asked = Instant::now();
        while asked.elapsed() < HANGUP_GRACE {
            if exited_for_kill.load(Ordering::SeqCst) {
                return;
            }
            thread::sleep(Duration::from_millis(50));
        }
        if let Some(pid) = shell_pid {
            if !exited_for_kill.load(Ordering::SeqCst) {
                unsafe {
                    libc::kill(pid as i32, libc::SIGKILL);
                }
            }
        }
    });

    // Read raw output from the pty
    // Bounded: see MAX_PENDING_READS.
    let (raw_tx, raw_rx) = mpsc::sync_channel::<Vec<u8>>(MAX_PENDING_READS);
    thread::spawn(move || {
        // Set TERMINAL_RAW_LOG=/some/file to record exactly what the shell
        // wrote, for replaying through `terminal-headless parse`.
        let mut raw_log = std::env::var_os("TERMINAL_RAW_LOG")
            .and_then(|path| OpenOptions::new().create(true).append(true).open(path).ok());
        let mut buf = [0u8; READ_BYTES];

        // An error here (EIO on Linux) means the shell is gone, same as EOF.
        while let Ok(len) = reader.read(&mut buf) {
            if len == 0 {
                break;
            }
            if let Some(log) = raw_log.as_mut() {
                let _ = log.write_all(&buf[0..len]);
            }
            if raw_tx.send(buf[0..len].to_vec()).is_err() {
                break;
            }
        }
    });

    // Parse the output and hand it over in batches
    let flow = Flow::new();
    let flow_for_batches = flow.clone();
    thread::spawn(move || {
        let flow = flow_for_batches;
        let mut stream = Stream::new();

        'batches: loop {
            // Not while the screen is still behind on what it already has.
            flow.wait_for_room(ACKNOWLEDGE_TIMEOUT);

            // Wait for output, then keep taking what arrives within the
            // batch window, so that a burst becomes one batch instead of
            // hundreds. A single keystroke echo is delayed by the window at
            // most, well under a frame.
            let mut bytes = match raw_rx.recv() {
                Ok(bytes) => bytes,
                Err(_) => break 'batches,
            };
            let mut commands: Vec<TerminalCommand> = vec![];
            let mut synchronized_since: Option<Instant> = None;
            let deadline = Instant::now() + BATCH_WINDOW;

            loop {
                while bytes.len() < MAX_BATCH_BYTES {
                    let remaining = deadline.saturating_duration_since(Instant::now());
                    match raw_rx.recv_timeout(remaining) {
                        Ok(more) => bytes.extend_from_slice(&more),
                        Err(_) => break,
                    }
                }

                for command in stream.feed(&bytes) {
                    match synchronized_update(&command) {
                        Some(true) => {
                            synchronized_since.get_or_insert_with(Instant::now);
                        }
                        Some(false) => synchronized_since = None,
                        None => (),
                    }
                    commands.push(command);
                }

                // During a synchronized update the program is in the middle of
                // drawing a frame: hold the batch until the frame is complete.
                let waited = match synchronized_since {
                    Some(since) => since.elapsed(),
                    None => break,
                };
                if waited >= SYNCHRONIZED_UPDATE_TIMEOUT {
                    break;
                }
                match raw_rx.recv_timeout(SYNCHRONIZED_UPDATE_TIMEOUT - waited) {
                    Ok(more) => bytes = more,
                    Err(RecvTimeoutError::Timeout) => break,
                    Err(RecvTimeoutError::Disconnected) => {
                        let _ = output_sender.send(flow.next(commands));
                        break 'batches;
                    }
                }
            }

            if !commands.is_empty() && output_sender.send(flow.next(commands)).is_err() {
                break 'batches;
            }
        }

        // The shell has exited (or was killed): reap it and say so.
        let _ = child.wait();
        exited.store(true, Ordering::SeqCst);
        let _ = output_sender.send(flow.next(vec![TerminalCommand::TerminalCommandSequence {
            command: CHILD_EXITED.to_string(),
        }]));
    });

    thread::spawn(move || {
        for received in resize_rx {
            let cols = received.width.clamp(1, u16::MAX as i32);
            let rows = received.height.clamp(1, u16::MAX as i32);
            let _ = master.resize(PtySize {
                rows: rows as u16,
                cols: cols as u16,
                pixel_width: 0,
                pixel_height: 0,
            });
            if resize_sender
                .send(Size {
                    height: rows,
                    width: cols,
                })
                .is_err()
            {
                break;
            }
        }
    });

    // Send data to the pty by writing to the master
    thread::spawn(move || {
        for received in run_rx {
            if writer.write_all(received.as_bytes()).is_err() {
                break;
            }
            let _ = writer.flush();
        }
    });

    Ok(Api {
        run_tx,
        resize_tx,
        kill_tx,
        flow,
    })
}

/// What to show in a terminal whose shell could not be started, as the
/// commands a program's output would be.
pub fn start_failure_notice(error: &str) -> Vec<TerminalCommand> {
    Stream::new().feed(format!("\x1b[31mThis terminal could not be started: {}\x1b[0m\r\n", error).as_bytes())
}

/// The shells to try, in order: the user's own, then the ones every system
/// has. A `$SHELL` that points nowhere must not mean no terminal at all.
fn shells() -> Vec<String> {
    let mut shells = vec![];
    if let Ok(shell) = std::env::var("SHELL") {
        if !shell.is_empty() {
            shells.push(shell);
        }
    }
    for fallback in ["/bin/zsh", "/bin/bash", "/bin/sh"] {
        if !shells.iter().any(|shell| shell == fallback) {
            shells.push(fallback.to_string());
        }
    }
    shells
}

/// Some(true) when the command starts a synchronized update, Some(false) when
/// it ends one.
fn synchronized_update(command: &TerminalCommand) -> Option<bool> {
    match command {
        TerminalCommand::TerminalCommandSequence { command } if command == "[?2026h" => Some(true),
        TerminalCommand::TerminalCommandSequence { command } if command == "[?2026l" => Some(false),
        _ => None,
    }
}

fn shell_command(shell: &str, directory: &str) -> CommandBuilder {
    let mut cmd = CommandBuilder::new(shell);
    // -l makes it a login shell (sources .zprofile/.zlogin),
    // -i makes it interactive (sources .zshrc, including oh-my-zsh)
    cmd.arg("-l");
    cmd.arg("-i");
    cmd.cwd(expand_home(directory));

    // Inherit current process env - portable-pty by default uses minimal env
    for (key, value) in std::env::vars() {
        cmd.env(key, value);
    }

    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
    cmd.env("TERM_PROGRAM", "TerminalPro");
    cmd.env("TERM_PROGRAM_VERSION", env!("CARGO_PKG_VERSION"));

    // Apps started from the Finder/Dock have no locale. Without one, shells
    // and line editors treat multi-byte characters as raw bytes.
    let has_locale = ["LC_ALL", "LC_CTYPE", "LANG"]
        .iter()
        .any(|name| std::env::var_os(name).map_or(false, |value| !value.is_empty()));
    if !has_locale {
        cmd.env("LANG", "en_US.UTF-8");
    }

    cmd
}

fn expand_home(directory: &str) -> String {
    let home = std::env::var("HOME").unwrap_or_default();
    if directory.is_empty() || directory == "~" {
        if home.is_empty() {
            "/".to_string()
        } else {
            home
        }
    } else if let Some(rest) = directory.strip_prefix("~/") {
        format!("{}/{}", home, rest)
    } else {
        directory.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn output_is_held_while_the_screen_is_behind() {
        let flow = Flow::new();
        let mut last = 0;
        for _ in 0..MAX_UNACKNOWLEDGED_BATCHES {
            assert!(flow.wait_for_room(Duration::from_millis(50)));
            last = flow.next(vec![]).sequence;
        }

        // the screen has not taken any of them: the next one waits
        let waiting = flow.clone();
        let (done_tx, done_rx) = mpsc::channel();
        thread::spawn(move || {
            let in_time = waiting.wait_for_room(Duration::from_secs(10));
            let _ = done_tx.send(in_time);
        });
        assert!(done_rx.recv_timeout(Duration::from_millis(200)).is_err(), "more output was handed over while the screen was behind");

        // it takes the first: the next one goes
        flow.acknowledge(last - (MAX_UNACKNOWLEDGED_BATCHES - 1));
        assert_eq!(done_rx.recv_timeout(Duration::from_secs(5)), Ok(true));
    }

    #[test]
    fn a_screen_that_does_not_answer_does_not_stop_the_terminal() {
        let flow = Flow::new();
        for _ in 0..MAX_UNACKNOWLEDGED_BATCHES {
            flow.next(vec![]);
        }

        // nobody answers: after the timeout one more goes anyway
        let started = Instant::now();
        assert!(!flow.wait_for_room(Duration::from_millis(100)));
        assert!(started.elapsed() >= Duration::from_millis(100));
    }

    #[test]
    fn an_answer_that_got_lost_is_made_up_for_by_the_next_one() {
        let flow = Flow::new();
        let first = flow.next(vec![]).sequence;
        let second = flow.next(vec![]).sequence;
        assert_eq!(flow.on_their_way(), 2);

        // the answer for the first never arrives; the one for the second does
        let _ = first;
        flow.acknowledge(second);
        assert_eq!(flow.on_their_way(), 0);
        assert!(flow.wait_for_room(Duration::from_millis(50)));
    }

    #[test]
    fn answers_that_come_late_twice_or_for_batches_never_sent_do_no_harm() {
        let flow = Flow::new();
        flow.acknowledge(7);
        assert_eq!(flow.on_their_way(), 0);

        let first = flow.next(vec![]).sequence;
        let second = flow.next(vec![]).sequence;
        flow.acknowledge(second);
        flow.acknowledge(first);
        flow.acknowledge(second);
        assert_eq!(flow.on_their_way(), 0);

        // an answer for a batch that was never sent does not open the gate
        // for batches to come
        flow.acknowledge(1_000);
        flow.next(vec![]);
        flow.next(vec![]);
        assert_eq!(flow.on_their_way(), 2);
    }

    #[test]
    fn batches_are_numbered_from_one_in_the_order_they_are_handed_over() {
        let flow = Flow::new();
        assert_eq!(flow.next(vec![]).sequence, 1);
        assert_eq!(flow.next(vec![]).sequence, 2);
        assert_eq!(flow.next(vec![]).sequence, 3);
    }
}
