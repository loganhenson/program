use preflight::{probe_binary, probe_font, run, Check, ProbeOutcome, Status};
use std::fs;
use std::sync::Mutex;

// font tests mutate PREFLIGHT_FONT_DIRS — serialize them so they don't race
static FONT_ENV_LOCK: Mutex<()> = Mutex::new(());

#[test]
fn probe_binary_finds_a_real_binary() {
    // /bin/sh exists on every macOS install; `sh` resolves there via /usr/bin/which
    let outcome = probe_binary("sh");
    match outcome {
        ProbeOutcome::Ok { detail: Some(path) } => {
            assert!(path.contains("sh"), "expected resolved path to contain 'sh', got {}", path);
        }
        other => panic!("expected Ok with path, got {:?}", other),
    }
}

#[test]
fn probe_binary_reports_missing_for_nonexistent() {
    let outcome = probe_binary("definitely-not-a-real-binary-name-xyzzy-9q8w7e");
    assert_eq!(outcome, ProbeOutcome::Missing);
}

#[test]
fn probe_font_finds_file_matching_substring() {
    let _lock = FONT_ENV_LOCK.lock().unwrap();
    let tmp = tempdir("preflight-font-found");
    fs::write(tmp.join("MyTestNerdFontMono-Regular.ttf"), b"fake").unwrap();
    std::env::set_var("PREFLIGHT_FONT_DIRS", tmp.to_string_lossy().to_string());

    let outcome = probe_font("NerdFontMono");

    std::env::remove_var("PREFLIGHT_FONT_DIRS");
    fs::remove_dir_all(&tmp).ok();

    match outcome {
        ProbeOutcome::Ok { detail: Some(path) } => assert!(path.contains("MyTestNerdFontMono")),
        other => panic!("expected Ok, got {:?}", other),
    }
}

#[test]
fn probe_font_returns_missing_when_no_match() {
    let _lock = FONT_ENV_LOCK.lock().unwrap();
    let tmp = tempdir("preflight-font-missing");
    fs::write(tmp.join("SomeOtherFont.ttf"), b"fake").unwrap();
    std::env::set_var("PREFLIGHT_FONT_DIRS", tmp.to_string_lossy().to_string());

    let outcome = probe_font("NerdFontMono");

    std::env::remove_var("PREFLIGHT_FONT_DIRS");
    fs::remove_dir_all(&tmp).ok();

    assert_eq!(outcome, ProbeOutcome::Missing);
}

#[test]
fn run_aggregates_all_ok_when_every_check_passes() {
    let checks = vec![
        Check {
            id: "a",
            label: "Always Ok A",
            probe: || ProbeOutcome::Ok { detail: None },
            install_commands: &[],
            docs_url: None,
        },
        Check {
            id: "b",
            label: "Always Ok B",
            probe: || ProbeOutcome::Ok { detail: Some("detail-b".to_string()) },
            install_commands: &[],
            docs_url: None,
        },
    ];

    let report = run(&checks);
    assert!(report.all_ok);
    assert_eq!(report.results.len(), 2);
    assert_eq!(report.results[0].id, "a");
    assert_eq!(report.results[1].detail.as_deref(), Some("detail-b"));
}

#[test]
fn run_reports_not_ok_when_any_check_fails() {
    let checks = vec![
        Check {
            id: "ok",
            label: "Ok",
            probe: || ProbeOutcome::Ok { detail: None },
            install_commands: &[],
            docs_url: None,
        },
        Check {
            id: "broken",
            label: "Broken",
            probe: || ProbeOutcome::Missing,
            install_commands: &["brew install broken"],
            docs_url: Some("https://example.com"),
        },
    ];

    let report = run(&checks);
    assert!(!report.all_ok);
    assert_eq!(report.results[1].install_commands, vec!["brew install broken".to_string()]);
    assert_eq!(report.results[1].docs_url.as_deref(), Some("https://example.com"));
    assert_eq!(report.results[1].status, Status::Missing);
}

#[test]
fn report_serializes_to_expected_json_shape() {
    let checks = vec![
        Check {
            id: "fd",
            label: "fd (file finder)",
            probe: || ProbeOutcome::Missing,
            install_commands: &["brew install fd"],
            docs_url: None,
        },
        Check {
            id: "version-mismatch",
            label: "Version mismatch demo",
            probe: || ProbeOutcome::BadVersion {
                found: "1.0".to_string(),
                required: ">= 2.0".to_string(),
            },
            install_commands: &[],
            docs_url: None,
        },
    ];

    let report = run(&checks);
    let value = serde_json::to_value(&report).unwrap();

    assert_eq!(value["all_ok"], serde_json::Value::Bool(false));
    let results = value["results"].as_array().expect("results is array");
    assert_eq!(results.len(), 2);

    assert_eq!(results[0]["id"], "fd");
    assert_eq!(results[0]["status"]["kind"], "missing");
    assert_eq!(results[0]["install_commands"][0], "brew install fd");

    assert_eq!(results[1]["status"]["kind"], "bad_version");
    assert_eq!(results[1]["status"]["found"], "1.0");
    assert_eq!(results[1]["status"]["required"], ">= 2.0");
}

fn tempdir(label: &str) -> std::path::PathBuf {
    let mut dir = std::env::temp_dir();
    dir.push(format!("{}-{}", label, std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    // Pre-clean any leftovers
    if let Ok(entries) = fs::read_dir(&dir) {
        for e in entries.flatten() {
            let _ = fs::remove_file(e.path());
        }
    }
    dir
}
