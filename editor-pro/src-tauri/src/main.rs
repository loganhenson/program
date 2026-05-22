mod recent_projects;

use filetree::filetree::{File, FileTreeAndFlat};
use preflight::{Check, ProbeOutcome, Report};
use recent_projects::{RecentProjects, STORE_FILE, STORE_KEY};
use serde_json::{self, Value};
use std::{
  env, fs,
  fs::metadata,
  path::PathBuf,
  process::Command,
  sync::{
    mpsc::{self, Receiver, Sender},
    Arc, Mutex,
  },
  thread,
};
use tauri::{
  menu::{Menu, PredefinedMenuItem, Submenu},
  AppHandle, Emitter, Listener, Manager, WebviewWindow, Wry,
};
use tauri_plugin_store::StoreExt;
use terminal::{parse::TerminalCommand, terminal::Size};

type SharedRecents = Arc<Mutex<RecentProjects>>;

fn load_recents(app: &AppHandle<Wry>) -> SharedRecents {
  let paths = match app.store(STORE_FILE) {
    Ok(store) => store
      .get(STORE_KEY)
      .and_then(|v| serde_json::from_value::<Vec<String>>(v).ok())
      .unwrap_or_default(),
    Err(e) => {
      eprintln!("recent-projects store unavailable on read: {:?}", e);
      vec![]
    }
  };
  Arc::new(Mutex::new(RecentProjects::from_paths(paths)))
}

fn save_recents(app: &AppHandle<Wry>, recents: &SharedRecents) {
  let snapshot: Vec<String> = recents.lock().unwrap().paths().to_vec();
  match app.store(STORE_FILE) {
    Ok(store) => {
      store.set(STORE_KEY, serde_json::to_value(snapshot).unwrap());
      if let Err(e) = store.save() {
        eprintln!("recent-projects store save failed: {:?}", e);
      }
    }
    Err(e) => {
      eprintln!("recent-projects store unavailable on save: {:?}", e);
    }
  }
}

fn home_dir() -> PathBuf {
  PathBuf::from(std::env::var("HOME").unwrap_or_else(|_| "/".to_string()))
}

#[tauri::command]
fn get_recent_projects(recents: tauri::State<'_, SharedRecents>) -> Vec<String> {
  recents.lock().unwrap().prune_missing()
}

fn fd_probe() -> ProbeOutcome {
  preflight::probe_binary("fd")
}

fn nerd_font_probe() -> ProbeOutcome {
  preflight::probe_font("NerdFontMono")
}

const CHECKS: &[Check] = &[
  Check {
    id: "fd",
    label: "fd (fast file finder)",
    probe: fd_probe,
    install_commands: &["brew install fd"],
    docs_url: Some("https://github.com/sharkdp/fd"),
  },
  Check {
    id: "jetbrains-nerd-font",
    label: "JetBrains Mono Nerd Font",
    probe: nerd_font_probe,
    install_commands: &["brew install --cask font-jetbrains-mono-nerd-font"],
    docs_url: Some("https://www.nerdfonts.com/"),
  },
];

#[derive(Clone, Default)]
struct ResolvedTools {
  fd: Option<String>,
}

type SharedTools = Arc<Mutex<ResolvedTools>>;

fn derive_resolved_tools(report: &Report) -> ResolvedTools {
  let mut tools = ResolvedTools::default();
  for result in &report.results {
    if result.id == "fd" {
      if matches!(result.status, preflight::Status::Ok) {
        tools.fd = result.detail.clone();
      }
    }
  }
  tools
}

#[tauri::command]
fn preflight(state: tauri::State<'_, SharedTools>) -> Report {
  let report = preflight::run(CHECKS);
  let mut tools = state.lock().unwrap();
  *tools = derive_resolved_tools(&report);
  report
}

fn main() {
  let context = tauri::generate_context!();

  let tools: SharedTools = Arc::new(Mutex::new(ResolvedTools::default()));
  // Probe eagerly so the JS preflight call sees the same result the
  // backend will use. The JS will re-invoke `preflight` and pick up any
  // changes if the user clicks "Recheck".
  {
    let report = preflight::run(CHECKS);
    *tools.lock().unwrap() = derive_resolved_tools(&report);
  }

  let tools_for_setup = tools.clone();

  tauri::Builder::default()
    .plugin(tauri_plugin_clipboard_manager::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_store::Builder::default().build())
    .manage(tools.clone())
    .invoke_handler(tauri::generate_handler![preflight, get_recent_projects])
    .menu(|handle| {
      Menu::with_items(
        handle,
        &[&Submenu::with_items(
          handle,
          "Controls",
          true,
          &[
            // Required so OSX keyboard shortcuts (cmd+c/v/a) reach the focused webview
            &PredefinedMenuItem::select_all(handle, None)?,
            &PredefinedMenuItem::paste(handle, None)?,
            &PredefinedMenuItem::copy(handle, None)?,
          ],
        )?],
      )
    })
    .setup(move |app| {
      let app_handle = app.handle().clone();
      let recents = load_recents(&app_handle);
      app.manage(recents.clone());

      let window = app.get_webview_window("main").unwrap();
      let window_for_callback = window.clone();
      let tools_for_callback = tools_for_setup.clone();
      let recents_for_callback = recents.clone();
      let app_for_callback = app_handle.clone();
      window.once("frontend-ready", move |_| {
        bootstrap(
          window_for_callback,
          tools_for_callback,
          recents_for_callback,
          app_for_callback,
        );
      });
      Ok(())
    })
    .run(context)
    .expect("failed to run app");
}

fn bootstrap(
  window: WebviewWindow<Wry>,
  tools: SharedTools,
  recents: SharedRecents,
  app: AppHandle<Wry>,
) {
  let window_ = window.clone();
  let window_terminal = window.clone();
  let window_open_project = window.clone();
  let window_directory_tree_worker = window.clone();
  let window_receive_activated_file = window.clone();
  let window_receive_fuzzy_find_results = window.clone();
  let window_receive_fuzzy_find_projects_results = window.clone();
  let window_create_file = window.clone();

  let tools_for_fuzzy = tools.clone();
  let tools_for_projects = tools.clone();
  let recents_for_open = recents.clone();
  let recents_for_projects = recents.clone();
  let app_for_open = app.clone();

  // Start file tree worker
  let (filetree_tx, filetree_rx): (Sender<FileTreeAndFlat>, Receiver<FileTreeAndFlat>) =
    mpsc::channel();
  let (filetree_dir_tx, filetree_dir_rx): (Sender<String>, Receiver<String>) = mpsc::channel();

  filetree::filetree::start(filetree_dir_rx, filetree_tx);

  thread::spawn(move || {
    for tree in filetree_rx {
      window_directory_tree_worker
        .emit("message-from-directory-tree-worker", tree)
        .expect("failed to emit");
    }
  });

  // Tell file tree worker that the app has initialized
  window.listen("initialized", move |event| {
    let directory: String = serde_json::from_str(event.payload()).unwrap();
    filetree_dir_tx.send(directory).unwrap()
  });

  window.listen("requestFuzzyFindInProjectFileOrDirectory", move |event| {
    let v: Value = serde_json::from_str(event.payload()).unwrap();

    let resolved = tools_for_fuzzy.lock().unwrap().clone();
    window_receive_fuzzy_find_results
      .emit(
        "receiveFuzzyFindResults",
        find_in_project_file_or_directory(
          &resolved,
          v["directory"].as_str().unwrap_or(""),
          v["file_or_directory_name"].as_str().unwrap_or(""),
        ),
      )
      .expect("failed to emit receiveFuzzyFindResults")
  });

  window.listen("requestFuzzyFindProjects", move |event| {
    let project: String = serde_json::from_str(event.payload()).unwrap();

    let resolved = tools_for_projects.lock().unwrap().clone();
    let roots = recents_for_projects
      .lock()
      .unwrap()
      .project_search_roots(&home_dir());
    window_receive_fuzzy_find_projects_results
      .emit(
        "receiveFuzzyFindResults",
        find_project(&resolved, &project, &roots),
      )
      .expect("failed to emit receiveFuzzyFindResults")
  });

  window.listen("requestOpenProject", move |event| {
    let directory: String = serde_json::from_str(event.payload()).unwrap();
    println!("requestOpenProject directory: {:?}", directory);

    let dir = fs::canonicalize(PathBuf::from(&directory))
      .unwrap()
      .into_os_string()
      .into_string()
      .unwrap();

    println!("requestOpenProject dir: {:?}", dir);

    recents_for_open.lock().unwrap().record(&dir);
    save_recents(&app_for_open, &recents_for_open);

    start_terminal(&window_open_project, dir.clone());
    window_open_project
      .emit("initialize", dir)
      .expect("failed to emit");
  });

  window.listen("activateFileOrDirectory", move |event| {
    let filename: String = serde_json::from_str(event.payload()).unwrap();
    if metadata(&filename).unwrap().is_file() {
      let contents =
        fs::read_to_string(&filename).expect("Something went wrong reading the file");

      window_receive_activated_file
        .emit(
          "receiveActivatedFile",
          File {
            path: filename,
            contents,
          },
        )
        .expect("failed to emit receiveActivatedFile")
    }
  });

  window.listen("createFile", move |event| {
    let v: Value = serde_json::from_str(event.payload()).unwrap();
    let directory = v["directory"].as_str().unwrap();
    let file = v["file"].as_str().unwrap();

    if metadata(file).is_err() {
      match fs::write(file, "") {
        Ok(_) => {
          window_create_file
            .emit(
              "message-from-directory-tree-worker",
              filetree::filetree::build(directory.to_string()).unwrap(),
            )
            .expect("failed to emit");

          window_create_file
            .emit(
              "receiveActivatedFile",
              File {
                path: file.to_string(),
                contents: "".to_string(),
              },
            )
            .expect("failed to emit receiveActivatedFile")
        }
        Err(e) => {
          println!("error creating file: {:?}", e);
        }
      }
    }
  });

  window.listen("save", move |event| {
    let v: Value = serde_json::from_str(event.payload()).unwrap();
    let file = v["file"].as_str().unwrap();
    let contents = v["contents"].as_str().unwrap();

    fs::write(file, contents).expect("Unable to write file");
  });

  // Set directory & initialize app (with directory positional argument if exists)
  match env::args().skip(1).next() {
    Some(directory) => {
      println!("directory: {:?}", directory);
      let dir = fs::canonicalize(PathBuf::from(directory))
        .unwrap()
        .into_os_string()
        .into_string()
        .unwrap();
      println!("dir: {:?}", dir);

      recents.lock().unwrap().record(&dir);
      save_recents(&app, &recents);

      start_terminal(&window_terminal, dir.clone());
      window_.emit("initialize", dir).expect("failed to emit");
    }
    None => {
      match env::var("DEV_DIRECTORY") {
        Ok(dir) => {
          println!("dev mode, using {:?}", dir);
          let canonical = fs::canonicalize(PathBuf::from(&dir))
            .unwrap()
            .into_os_string()
            .into_string()
            .unwrap();

          recents.lock().unwrap().record(&canonical);
          save_recents(&app, &recents);

          // Start the terminal in the working directory
          start_terminal(&window_terminal, canonical.clone());
          window_
            .emit("initialize", &canonical)
            .expect("failed to emit")
        }
        Err(_) => {
          println!("need a project!");
          window_.emit("initialize", "").expect("failed to emit")
        }
      };
    }
  };
}

fn start_terminal(window: &WebviewWindow<Wry>, directory: String) {
  let window_terminal_output = window.clone();
  let window_terminal_resize = window.clone();

  let (terminal_output_tx, terminal_output_rx): (
    Sender<Vec<TerminalCommand>>,
    Receiver<Vec<TerminalCommand>>,
  ) = mpsc::channel();
  let (terminal_resize_tx, terminal_resize_rx): (Sender<Size>, Receiver<Size>) = mpsc::channel();

  let terminal_api = terminal::terminal::start(directory, terminal_output_tx, terminal_resize_tx);
  let terminal_api_run_tx = terminal_api.run_tx.clone();
  let terminal_api_resize_tx = terminal_api.resize_tx.clone();
  window.listen("run", move |event| {
    let contents: String = serde_json::from_str(event.payload()).unwrap();
    terminal_api_run_tx.send(contents).unwrap()
  });
  window.listen("resize", move |event| {
    let size: Size = serde_json::from_str(event.payload()).unwrap();
    terminal_api_resize_tx.send(size).unwrap()
  });

  thread::spawn(move || {
    for message in terminal_resize_rx {
      window_terminal_resize
        .emit("sendResizedToTerminal", message)
        .unwrap();
    }
  });
  thread::spawn(move || {
    for message in terminal_output_rx {
      window_terminal_output.emit("output", message).unwrap();
    }
  });
}

fn find_in_project_file_or_directory(
  tools: &ResolvedTools,
  directory: &str,
  file_or_directory_name: &str,
) -> Vec<String> {
  let Some(fd) = tools.fd.as_ref() else {
    eprintln!("fd not resolved; preflight should have blocked startup");
    return vec![];
  };

  if directory.is_empty() {
    return vec![];
  }

  let args = [
    "*".to_owned() + file_or_directory_name + "*",
    directory.to_string(),
    "--hidden".to_string(),
    "--glob".to_string(),
    "--exclude=.git".to_string(),
  ];

  match Command::new(fd).args(args).output() {
    Ok(output) => String::from_utf8_lossy(&output.stdout)
      .lines()
      .map(|s| s.to_string())
      .collect(),
    Err(e) => {
      eprintln!("fd execution failed: {:?}", e);
      vec![]
    }
  }
}

fn find_project(
  tools: &ResolvedTools,
  project_name: &str,
  search_roots: &[PathBuf],
) -> Vec<String> {
  let Some(fd) = tools.fd.as_ref() else {
    eprintln!("fd not resolved; preflight should have blocked startup");
    return vec![];
  };

  let pattern = format!("^{}", project_name);
  let mut results: Vec<String> = vec![];

  // -L follows symlinks because common project parents (e.g. a ~/Desktop
  // shimmed onto a cloud-sync mount) are often symlinks. Depth 1 keeps the
  // scan cheap — projects are direct children of the search root.
  for root in search_roots {
    let root_str = match root.to_str() {
      Some(s) => s,
      None => continue,
    };
    let args: [&str; 5] = ["--type=d", "--max-depth=1", "-L", &pattern, root_str];

    match Command::new(fd).args(args).output() {
      Ok(output) => results.extend(
        String::from_utf8_lossy(&output.stdout)
          .lines()
          .map(|s| s.to_string()),
      ),
      Err(e) => {
        eprintln!("fd execution failed for root {}: {:?}", root_str, e);
      }
    }
  }

  // Dedupe while preserving order (different roots can yield the same
  // canonical project via symlinks)
  let mut seen = std::collections::HashSet::new();
  results.retain(|p| seen.insert(p.clone()));
  results
}


#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn find_in_project_returns_empty_when_fd_unresolved() {
    let tools = ResolvedTools { fd: None };
    let result = find_in_project_file_or_directory(&tools, "/tmp", "foo");
    assert!(result.is_empty());
  }

  #[test]
  fn find_in_project_returns_empty_for_empty_directory() {
    let tools = ResolvedTools {
      fd: Some("/opt/homebrew/bin/fd".to_string()),
    };
    let result = find_in_project_file_or_directory(&tools, "", "foo");
    assert!(result.is_empty());
  }

  #[test]
  fn find_project_returns_empty_when_fd_unresolved() {
    let tools = ResolvedTools { fd: None };
    let roots = vec![PathBuf::from("/tmp")];
    let result = find_project(&tools, "some-project", &roots);
    assert!(result.is_empty());
  }

  #[test]
  fn find_project_returns_empty_with_no_search_roots() {
    let tools = ResolvedTools {
      fd: Some("/opt/homebrew/bin/fd".to_string()),
    };
    let result = find_project(&tools, "anything", &[]);
    assert!(result.is_empty());
  }

  #[test]
  fn derive_resolved_tools_pulls_fd_path_from_ok_status() {
    let report = Report {
      all_ok: true,
      results: vec![preflight::CheckResult {
        id: "fd".to_string(),
        label: "fd".to_string(),
        status: preflight::Status::Ok,
        detail: Some("/opt/homebrew/bin/fd".to_string()),
        install_commands: vec![],
        docs_url: None,
      }],
    };
    let resolved = derive_resolved_tools(&report);
    assert_eq!(resolved.fd.as_deref(), Some("/opt/homebrew/bin/fd"));
  }

  #[test]
  fn derive_resolved_tools_leaves_fd_none_when_missing() {
    let report = Report {
      all_ok: false,
      results: vec![preflight::CheckResult {
        id: "fd".to_string(),
        label: "fd".to_string(),
        status: preflight::Status::Missing,
        detail: None,
        install_commands: vec!["brew install fd".to_string()],
        docs_url: None,
      }],
    };
    let resolved = derive_resolved_tools(&report);
    assert!(resolved.fd.is_none());
  }
}
