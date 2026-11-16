//! In a file of its own: it changes `$SHELL`, which every test in a file shares.

use std::sync::mpsc;
use std::time::{Duration, Instant};
use terminal::terminal::start;

#[test]
fn a_shell_setting_that_points_nowhere_still_gives_a_terminal() {
    std::env::set_var("SHELL", "/nonexistent/bin/fancy-shell");

    let (output_tx, output) = mpsc::channel();
    let (resized_tx, resized_rx) = mpsc::channel();
    std::thread::spawn(move || for _ in resized_rx {});
    // this used to panic, and in the apps a panic there stopped every
    // terminal, not only the new one
    let api = start(std::env::temp_dir().to_string_lossy().to_string(), output_tx, resized_tx).expect("one of the standard shells");

    api.run_tx.send("echo fell-ba''ck\r".to_string()).unwrap();
    let started = Instant::now();
    let mut seen = String::new();
    while started.elapsed() < Duration::from_secs(20) && !seen.contains("fell-back") {
        if let Ok(batch) = output.recv_timeout(Duration::from_millis(100)) {
            seen.push_str(&serde_json::to_string(&batch.commands).unwrap());
            api.flow.acknowledge(batch.sequence);
        }
    }
    assert!(seen.contains("fell-back"), "no shell answered");
}
