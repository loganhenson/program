//! The memory figure the apps carry for their own page stays out of the
//! shells they start.

use std::sync::mpsc;
use std::time::{Duration, Instant};
use terminal::page_memory::{is_set_in, PLANNED_BYTES, VARIABLE};
use terminal::terminal::start;

#[test]
fn the_page_memory_figure_is_kept_from_the_shells_the_app_starts() {
    // as the app's environment has it when it was started from its bundle
    std::env::set_var(VARIABLE, PLANNED_BYTES.to_string());

    // a value that is not UTF-8 must not stop a shell from starting
    use std::os::unix::ffi::OsStrExt;
    std::env::set_var("TERMINAL_TEST_NOT_UTF8", std::ffi::OsStr::from_bytes(&[0x66, 0xff, 0x6f]));

    let (output_tx, output) = mpsc::channel();
    let (resized_tx, resized_rx) = mpsc::channel();
    std::thread::spawn(move || for _ in resized_rx {});
    let api = start(std::env::temp_dir().to_string_lossy().to_string(), output_tx, resized_tx).expect("a shell");
    // (the command line is echoed too, but not with these answers in it)
    api.run_tx
        .send(format!("echo \"figure<${{{}:-unset}}>\" \"home<${{HOME:+there}}>\"\r", VARIABLE))
        .unwrap();

    let started = Instant::now();
    let mut seen = String::new();
    while started.elapsed() < Duration::from_secs(20) && !seen.contains("home<there>") {
        if let Ok(batch) = output.recv_timeout(Duration::from_millis(100)) {
            seen.push_str(&serde_json::to_string(&batch.commands).unwrap());
            api.flow.acknowledge(batch.sequence);
        }
    }
    assert!(seen.contains("home<there>"), "the shell did not answer: {}", seen);
    assert!(seen.contains("figure<unset>"), "the shell was given the app's own setting: {}", seen);
}

#[test]
fn an_info_plist_is_recognised_only_when_it_sets_the_figure() {
    let with = format!(
        "<dict>\n\t<key>LSEnvironment</key>\n\t<dict>\n\t\t<key>{}</key>\n\t\t<string>{}</string>\n\t</dict>\n</dict>",
        VARIABLE, PLANNED_BYTES
    );
    assert!(is_set_in(&with));
    assert!(!is_set_in(&with.replace(&PLANNED_BYTES.to_string(), "34359738368")));
    assert!(!is_set_in("<dict><key>LSEnvironment</key><dict></dict></dict>"));
}

#[test]
fn both_apps_carry_the_figure_in_their_bundle() {
    let terminal_pro = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/../terminal-pro/src-tauri/Info.plist"));
    let editor_pro = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/../editor-pro/src-tauri/Info.plist"));
    assert!(is_set_in(terminal_pro), "TerminalPro's Info.plist does not set {}", VARIABLE);
    assert!(is_set_in(editor_pro), "EditorPro's Info.plist does not set {}", VARIABLE);
}
