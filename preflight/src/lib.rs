use serde::Serialize;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone)]
pub struct Check {
    pub id: &'static str,
    pub label: &'static str,
    pub probe: fn() -> ProbeOutcome,
    pub install_commands: &'static [&'static str],
    pub docs_url: Option<&'static str>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProbeOutcome {
    Ok { detail: Option<String> },
    Missing,
    BadVersion { found: String, required: String },
    Error { message: String },
}

#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Status {
    Ok,
    Missing,
    BadVersion { found: String, required: String },
    Error { message: String },
}

#[derive(Serialize, Debug, Clone)]
pub struct CheckResult {
    pub id: String,
    pub label: String,
    pub status: Status,
    pub detail: Option<String>,
    pub install_commands: Vec<String>,
    pub docs_url: Option<String>,
}

#[derive(Serialize, Debug, Clone)]
pub struct Report {
    pub all_ok: bool,
    pub results: Vec<CheckResult>,
}

pub fn run(checks: &[Check]) -> Report {
    let mut all_ok = true;
    let results: Vec<CheckResult> = checks
        .iter()
        .map(|check| {
            let outcome = (check.probe)();
            let (status, detail) = match outcome {
                ProbeOutcome::Ok { detail } => (Status::Ok, detail),
                ProbeOutcome::Missing => {
                    all_ok = false;
                    (Status::Missing, None)
                }
                ProbeOutcome::BadVersion { found, required } => {
                    all_ok = false;
                    (Status::BadVersion { found, required }, None)
                }
                ProbeOutcome::Error { message } => {
                    all_ok = false;
                    (Status::Error { message }, None)
                }
            };
            CheckResult {
                id: check.id.to_string(),
                label: check.label.to_string(),
                status,
                detail,
                install_commands: check.install_commands.iter().map(|s| s.to_string()).collect(),
                docs_url: check.docs_url.map(|s| s.to_string()),
            }
        })
        .collect();

    Report { all_ok, results }
}

/// Resolve a binary by checking the standard Homebrew install paths first,
/// then falling back to a $PATH search via `which`. Apps launched from
/// /Applications inherit launchd's stripped PATH, so the explicit-path probe
/// is what actually catches Homebrew installs in practice.
pub fn probe_binary(name: &str) -> ProbeOutcome {
    let candidates = [
        format!("/opt/homebrew/bin/{}", name),
        format!("/usr/local/bin/{}", name),
        format!("/usr/bin/{}", name),
    ];

    for candidate in &candidates {
        if std::path::Path::new(candidate).exists() {
            return ProbeOutcome::Ok {
                detail: Some(candidate.clone()),
            };
        }
    }

    match Command::new("/usr/bin/which").arg(name).output() {
        Ok(output) if output.status.success() => {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if path.is_empty() {
                ProbeOutcome::Missing
            } else {
                ProbeOutcome::Ok { detail: Some(path) }
            }
        }
        _ => ProbeOutcome::Missing,
    }
}

/// Search the macOS font directories for any file whose name contains the
/// given substring. Tests override the search dirs via `PREFLIGHT_FONT_DIRS`
/// (colon-separated). In production we look at the three standard locations.
pub fn probe_font(filename_substring: &str) -> ProbeOutcome {
    let dirs = font_search_dirs();

    for dir in dirs {
        let Ok(entries) = std::fs::read_dir(&dir) else {
            continue;
        };
        for entry in entries.flatten() {
            let name = entry.file_name();
            let Some(name_str) = name.to_str() else {
                continue;
            };
            if name_str.contains(filename_substring) {
                return ProbeOutcome::Ok {
                    detail: Some(entry.path().to_string_lossy().to_string()),
                };
            }
        }
    }

    ProbeOutcome::Missing
}

fn font_search_dirs() -> Vec<PathBuf> {
    if let Ok(override_dirs) = std::env::var("PREFLIGHT_FONT_DIRS") {
        return override_dirs.split(':').map(PathBuf::from).collect();
    }

    let mut dirs: Vec<PathBuf> = vec![];
    if let Ok(home) = std::env::var("HOME") {
        dirs.push(PathBuf::from(format!("{}/Library/Fonts", home)));
    }
    dirs.push(PathBuf::from("/Library/Fonts"));
    dirs.push(PathBuf::from("/System/Library/Fonts"));
    dirs.push(PathBuf::from("/System/Library/Fonts/Supplemental"));
    dirs
}
