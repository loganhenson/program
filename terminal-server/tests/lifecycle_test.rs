//! Starting and closing terminals, as an app that stays open for weeks does
//! thousands of times.

use std::sync::mpsc::{self, Receiver};
use std::time::{Duration, Instant};
use terminal::terminal::{start, start_failure_notice, Api, Batch, CHILD_EXITED};

fn open() -> (Api, Receiver<Batch>) {
    let (output_tx, output) = mpsc::channel();
    let (resized_tx, resized_rx) = mpsc::channel();
    std::thread::spawn(move || for _ in resized_rx {});
    let api = start(std::env::temp_dir().to_string_lossy().to_string(), output_tx, resized_tx).expect("a shell");
    (api, output)
}

/// Read output, acknowledging it as a screen does, until `done` or the time is up.
fn read(api: Option<&Api>, output: &Receiver<Batch>, limit: Duration, mut done: impl FnMut(&str) -> bool) -> String {
    let started = Instant::now();
    let mut seen = String::new();
    while started.elapsed() < limit {
        if let Ok(batch) = output.recv_timeout(Duration::from_millis(100)) {
            seen.push_str(&serde_json::to_string(&batch.commands).unwrap());
            if let Some(api) = api {
                api.flow.acknowledge(batch.sequence);
            }
            if done(&seen) {
                break;
            }
        }
    }
    seen
}

fn is_running(pid: i32) -> bool {
    unsafe { libc::kill(pid, 0) == 0 }
}

/// The process id the shell printed as `pid<123>`. (The command line that
/// asks for it is echoed too, as `pid<$$>`.)
fn printed_pid(seen: &str) -> Option<i32> {
    seen.match_indices("pid<").find_map(|(at, _)| {
        let digits: String = seen[at + 4..].chars().take_while(|c| c.is_ascii_digit()).collect();
        digits.parse().ok()
    })
}

#[test]
fn closing_a_terminal_ends_a_shell_that_ignores_the_hangup() {
    let (api, output) = open();
    // the shell now ignores what closing a terminal sends it
    api.run_tx.send("trap '' HUP; echo \"pid<$$>\"\r".to_string()).unwrap();
    let seen = read(Some(&api), &output, Duration::from_secs(20), |seen| printed_pid(seen).is_some());
    let pid = printed_pid(&seen).expect("the shell did not print its process id");
    assert!(is_running(pid));

    // closing the tab: everything the app holds for the terminal is dropped
    drop(api);

    let closed = Instant::now();
    while is_running(pid) && closed.elapsed() < Duration::from_secs(6) {
        std::thread::sleep(Duration::from_millis(50));
    }
    assert!(!is_running(pid), "the shell was still running {:?} after its terminal was closed", closed.elapsed());

    // and the app is told, which is what lets it free the rest
    let rest = read(None, &output, Duration::from_secs(5), |rest| rest.contains(CHILD_EXITED));
    assert!(rest.contains(CHILD_EXITED));
}

#[test]
fn a_shell_that_exits_is_reported_once_and_closing_afterwards_is_harmless() {
    let (api, output) = open();
    api.run_tx.send("exit\r".to_string()).unwrap();
    let seen = read(Some(&api), &output, Duration::from_secs(20), |seen| seen.contains(CHILD_EXITED));
    assert_eq!(seen.matches(CHILD_EXITED).count(), 1);

    // the tab closes after the shell is gone: nothing is left to signal
    drop(api);
    std::thread::sleep(Duration::from_millis(300));
    assert!(output.recv_timeout(Duration::from_millis(300)).is_err());
}

#[test]
fn many_terminals_can_be_opened_and_closed() {
    // each one takes a PTY and five threads: none of it may be left behind
    for _ in 0..40 {
        let (api, output) = open();
        api.run_tx.send("exit\r".to_string()).unwrap();
        let seen = read(Some(&api), &output, Duration::from_secs(20), |seen| seen.contains(CHILD_EXITED));
        assert!(seen.contains(CHILD_EXITED), "a shell did not exit");
    }
    // if PTYs or file descriptors leaked, this one could not be opened
    let (api, output) = open();
    api.run_tx.send("echo still-wor''king\r".to_string()).unwrap();
    let seen = read(Some(&api), &output, Duration::from_secs(20), |seen| seen.contains("still-working"));
    assert!(seen.contains("still-working"));
}

#[test]
fn a_terminal_that_could_not_start_says_why() {
    let notice = serde_json::to_string(&start_failure_notice("could not open a terminal device: out of ptys")).unwrap();
    assert!(notice.contains("could not be started"));
    assert!(notice.contains("out of ptys"));
}
