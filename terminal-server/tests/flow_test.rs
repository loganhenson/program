//! A real shell in a real PTY, printing faster than anything can draw.
//!
//! Before output was held back for the screen, `yes` filled gigabytes of
//! memory with output nobody had seen yet, and Ctrl+C did nothing for
//! minutes because the screen was still working through the backlog.

use std::sync::mpsc::{self, Receiver};
use std::time::{Duration, Instant};
use terminal::terminal::{start, Api, Batch};

struct Terminal {
    api: Api,
    output: Receiver<Batch>,
}

impl Terminal {
    fn start() -> Self {
        let (output_tx, output) = mpsc::channel();
        let (resized_tx, resized_rx) = mpsc::channel();
        std::thread::spawn(move || for _ in resized_rx {});
        let api = start(std::env::temp_dir().to_string_lossy().to_string(), output_tx, resized_tx).expect("a shell");
        Terminal { api, output }
    }

    fn run(&self, text: &str) {
        self.api.run_tx.send(text.to_string()).unwrap();
    }

    /// Take batches as a screen does, saying so each time, until `done`
    /// says to stop or the time is up. Returns what was printed, as text.
    fn read_as_a_screen(&self, limit: Duration, mut done: impl FnMut(&str) -> bool) -> String {
        let started = Instant::now();
        let mut seen = String::new();
        while started.elapsed() < limit {
            if let Ok(batch) = self.output.recv_timeout(Duration::from_millis(100)) {
                seen.push_str(&serde_json::to_string(&batch.commands).unwrap());
                self.api.flow.acknowledge(batch.sequence);
                if done(&seen) {
                    break;
                }
            }
        }
        seen
    }

    /// Wait for the shell to be ready: it has printed something and gone quiet.
    fn wait_for_prompt(&self) {
        let mut quiet_since = Instant::now();
        let started = Instant::now();
        let mut printed = false;
        while started.elapsed() < Duration::from_secs(20) {
            match self.output.recv_timeout(Duration::from_millis(100)) {
                Ok(batch) => {
                    self.api.flow.acknowledge(batch.sequence);
                    printed = true;
                    quiet_since = Instant::now();
                }
                Err(_) => {
                    if printed && quiet_since.elapsed() > Duration::from_millis(800) {
                        return;
                    }
                }
            }
        }
    }
}

#[test]
fn a_program_that_floods_is_held_back_until_the_screen_takes_its_output() {
    let terminal = Terminal::start();
    terminal.wait_for_prompt();
    terminal.run("yes\r");

    // A screen that takes nothing for three seconds. `yes` prints tens of
    // megabytes a second; almost none of it may be handed over.
    std::thread::sleep(Duration::from_secs(3));
    let mut handed_over = 0;
    let mut bytes = 0;
    while let Ok(batch) = terminal.output.try_recv() {
        handed_over += 1;
        bytes += serde_json::to_string(&batch.commands).unwrap().len();
    }
    assert!(handed_over >= 1, "nothing was handed over at all");
    assert!(bytes < 4_000_000, "{} bytes were handed over to a screen that took none", bytes);
    // two at once, then one each time the wait for an answer runs out
    assert!(
        handed_over <= 8,
        "{} batches ({} bytes) were handed over to a screen that took none",
        handed_over,
        bytes
    );

    terminal.run("\x03");
}

#[test]
fn ctrl_c_stops_a_flood_at_once_and_the_shell_is_usable_again() {
    let terminal = Terminal::start();
    terminal.wait_for_prompt();
    terminal.run("yes\r");

    // a screen that keeps up, for two seconds
    let flood = terminal.read_as_a_screen(Duration::from_secs(2), |_| false);
    assert!(flood.len() > 100_000, "yes did not print much: {} bytes", flood.len());

    // Ctrl+C, then a command: its output has to arrive promptly, not after
    // a backlog of output that was already on its way
    let pressed = Instant::now();
    terminal.run("\x03");
    std::thread::sleep(Duration::from_millis(300));
    terminal.run("echo flood-is-ov''er\r");
    let after = terminal.read_as_a_screen(Duration::from_secs(10), |seen| seen.contains("flood-is-over"));
    assert!(after.contains("flood-is-over"), "the shell did not come back after Ctrl+C");
    assert!(
        pressed.elapsed() < Duration::from_secs(5),
        "it took {:?} for the shell to come back after Ctrl+C",
        pressed.elapsed()
    );
}
