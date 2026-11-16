use crate::parse::{Stream, TerminalCommand};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use std::{
    fs::OpenOptions,
    io::{Read, Write},
    sync::mpsc::{self, Receiver, RecvTimeoutError, Sender},
    thread,
    time::{Duration, Instant},
};

/// Sent as the last command once the shell has exited and the PTY is closed.
pub const CHILD_EXITED: &str = "child-exited";

/// How much raw output is gathered into a single batch of commands.
const MAX_BATCH_BYTES: usize = 256 * 1024;
/// How long output is gathered before it is handed over. A PTY delivers a
/// busy program's output in reads of a few hundred bytes; without this every
/// one of them would be a separate message to the frontend (tens of thousands
/// per second), and the frontend, not the program, would set the pace.
const BATCH_WINDOW: Duration = Duration::from_millis(4);
/// How long a synchronized update (DEC mode 2026) may hold back output.
const SYNCHRONIZED_UPDATE_TIMEOUT: Duration = Duration::from_millis(200);

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
}

pub fn start(
    directory: String,
    output_sender: Sender<Vec<TerminalCommand>>,
    resize_sender: Sender<Size>,
) -> Api {
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
        .unwrap();

    // Spawn a shell into the pty
    let mut child = pair.slave.spawn_command(shell_command(&directory)).unwrap();

    // The child holds its own handle to the slave side. Ours has to be closed,
    // otherwise reads on the master never end after the shell exits.
    drop(pair.slave);

    // Kill-watcher: blocks on `kill_rx.recv()` until the sender drops (or
    // someone explicitly sends a unit). Killing the child closes the slave's
    // pty fds, which causes the master reader to hit EOF; the output thread
    // below then reaps the child.
    let (kill_tx, kill_rx) = mpsc::channel::<()>();
    let mut killer = child.clone_killer();
    thread::spawn(move || {
        let _ = kill_rx.recv();
        let _ = killer.kill();
    });

    let mut reader = pair.master.try_clone_reader().unwrap();
    let mut writer = pair.master.take_writer().unwrap();
    let master = pair.master;

    // Read raw output from the pty
    let (raw_tx, raw_rx): (Sender<Vec<u8>>, Receiver<Vec<u8>>) = mpsc::channel();
    thread::spawn(move || {
        // Set TERMINAL_RAW_LOG=/some/file to record exactly what the shell
        // wrote, for replaying through `terminal-headless parse`.
        let mut raw_log = std::env::var_os("TERMINAL_RAW_LOG")
            .and_then(|path| OpenOptions::new().create(true).append(true).open(path).ok());
        let mut buf = [0u8; 65536];

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
    thread::spawn(move || {
        let mut stream = Stream::new();

        'batches: loop {
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
                        let _ = output_sender.send(commands);
                        break 'batches;
                    }
                }
            }

            if !commands.is_empty() && output_sender.send(commands).is_err() {
                break 'batches;
            }
        }

        // The shell has exited (or was killed): reap it and say so.
        let _ = child.wait();
        let _ = output_sender.send(vec![TerminalCommand::TerminalCommandSequence {
            command: CHILD_EXITED.to_string(),
        }]);
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

    Api {
        run_tx,
        resize_tx,
        kill_tx,
    }
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

fn shell_command(directory: &str) -> CommandBuilder {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let mut cmd = CommandBuilder::new(&shell);
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
