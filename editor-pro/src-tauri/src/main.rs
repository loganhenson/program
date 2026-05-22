mod recent_projects;

use filetree::filetree::FileTreeAndFlat;
use notify::{event::ModifyKind, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use preflight::{Check, ProbeOutcome, Report};
use recent_projects::{RecentProjects, STORE_FILE, STORE_KEY};
use serde_json::{self, Value};
use std::{
  collections::HashMap,
  env, fs,
  fs::metadata,
  path::{Path, PathBuf},
  process::Command,
  sync::{
    atomic::{AtomicBool, Ordering},
    mpsc::{self, Sender},
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

/// Debounce window for project-wide rebuild requests. fs events come in
/// bursts (atomic renames, IDE saves, `npm install`) — we coalesce them
/// so the file tree rebuilds at most once per burst rather than once per
/// event.
const PROJECT_REBUILD_DEBOUNCE_MS: u64 = 200;

/// Per-workspace terminal channels. When the workspace is dropped
/// (close-tab), `is_active` flips to false so any in-flight output
/// emits are silenced, and `_kill_tx` dropping triggers terminal-server's
/// kill-watcher to reap the child shell. The PTY threads then exit
/// cleanly as their own channels close + the master hits EOF.
struct TerminalSlot {
  run_tx: Sender<String>,
  resize_tx: Sender<Size>,
  is_active: Arc<AtomicBool>,
  _kill_tx: Sender<()>,
}

/// Everything Rust holds on behalf of one open project tab. Dropping
/// this entry from the `Workspaces` map deactivates the terminal, drops
/// the file/project watchers (which cleanly cancels their fsevent
/// callbacks), and closes the filetree worker channel (whose worker
/// thread then exits on next recv).
///
/// `file_watcher` and `project_watcher` are held to keep their fsevent
/// callbacks alive — Rust's dead-code warning doesn't account for RAII
/// drop semantics, so they look unread.
#[allow(dead_code)]
struct WorkspaceState {
  file_watcher: Option<RecommendedWatcher>,
  project_watcher: Option<RecommendedWatcher>,
  filetree_dir_tx: Sender<String>,
  terminal: TerminalSlot,
}

impl Drop for WorkspaceState {
  fn drop(&mut self) {
    self.terminal.is_active.store(false, Ordering::Relaxed);
  }
}

/// Workspaces keyed by canonical project path. The path doubles as the
/// workspace id, which also matches the Elm-side `Workspace.projectPath`.
type Workspaces = Arc<Mutex<HashMap<String, WorkspaceState>>>;

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

/// Tall files (e.g., 50k narrow lines) produce a virtual DOM tree that
/// Elm's diff has to walk on every keystroke. Hard cap on line count
/// keeps interactive latency bounded; for longer files, suggest a real
/// editor (vim/less/etc.).
const MAX_FILE_LINES: usize = 10_000;

/// Minified bundles, embedded sourcemaps, and packed data files cram a
/// huge amount of text onto one line. They sail past the line-count cap
/// (one line!) but rendering that single span chokes the editor. 500
/// chars is well above hand-written code (style guides land at 80–120)
/// and most JSON blobs while still being well below anything minified.
const MAX_LINE_LENGTH: usize = 500;

/// Byte cap derived from the line and length caps: no file with both
/// `MAX_FILE_LINES` lines of `MAX_LINE_LENGTH` chars can exceed this
/// (each line plus its trailing newline). Lets us reject oversize files
/// at stat time without reading them. Keeping it derived also prevents
/// drift between the three caps as the others are tuned.
const MAX_FILE_BYTES: u64 = (MAX_FILE_LINES as u64) * (MAX_LINE_LENGTH as u64 + 1);

fn emit_notification(window: &WebviewWindow<Wry>, type_: &str, message: String) {
  let payload = serde_json::json!({
    "source": "Editor",
    "type": type_,
    "message": message,
  });
  if let Err(e) = window.emit("notification", payload) {
    eprintln!("failed to emit notification: {:?}", e);
  }
}

/// Build a single-file watcher on `path` for the given workspace. The
/// caller is responsible for storing the returned watcher in the
/// workspace's state (dropping it stops fsevents). Modify events
/// re-read the file with the usual caps and emit `externalFileChange`
/// stamped with `workspaceId`; deletion emits `externalFileDelete`.
fn build_file_watcher(
  path: &Path,
  workspace_id: String,
  window: WebviewWindow<Wry>,
) -> notify::Result<RecommendedWatcher> {
  let watched_path = path.to_path_buf();
  let path_for_callback = watched_path.clone();
  let window_for_callback = window;
  let ws_for_callback = workspace_id;

  let mut watcher: RecommendedWatcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
    let event = match res {
      Ok(e) => e,
      Err(e) => {
        eprintln!("file watcher error: {:?}", e);
        return;
      }
    };

    let is_our_file = event.paths.iter().any(|p| p == &path_for_callback);
    if !is_our_file {
      return;
    }

    let path_str = path_for_callback.to_string_lossy().to_string();

    let is_delete = matches!(
      event.kind,
      EventKind::Remove(_) | EventKind::Modify(ModifyKind::Name(_))
    );
    if is_delete {
      if !path_for_callback.exists() {
        let payload = serde_json::json!({
          "workspaceId": ws_for_callback,
          "path": path_str,
        });
        if let Err(e) = window_for_callback.emit("externalFileDelete", payload) {
          eprintln!("failed to emit externalFileDelete: {:?}", e);
        }
        return;
      }
    }

    let is_content_change = matches!(
      event.kind,
      EventKind::Modify(ModifyKind::Data(_)) | EventKind::Modify(ModifyKind::Any)
    );
    if !is_content_change {
      return;
    }

    match load_file_with_cap(&path_str, MAX_FILE_BYTES, MAX_FILE_LINES, MAX_LINE_LENGTH) {
      LoadDecision::Ok(contents) => {
        let payload = serde_json::json!({
          "workspaceId": ws_for_callback,
          "path": path_str,
          "contents": contents,
        });
        if let Err(e) = window_for_callback.emit("externalFileChange", payload) {
          eprintln!("failed to emit externalFileChange: {:?}", e);
        }
      }
      LoadDecision::NotAFile => {
        let payload = serde_json::json!({
          "workspaceId": ws_for_callback,
          "path": path_str,
        });
        if let Err(e) = window_for_callback.emit("externalFileDelete", payload) {
          eprintln!("failed to emit externalFileDelete: {:?}", e);
        }
      }
      LoadDecision::TooLarge { .. } | LoadDecision::TooManyLines { .. } | LoadDecision::LineTooLong { .. } => {
        emit_notification(
          &window_for_callback,
          "info",
          format!(
            "{} was modified externally but exceeds the editor's caps; keeping the in-memory contents.",
            path_str
          ),
        );
      }
      LoadDecision::StatError(_) | LoadDecision::ReadError(_) => {}
    }
  })?;

  watcher.watch(&watched_path, RecursiveMode::NonRecursive)?;
  Ok(watcher)
}

/// Build a recursive watcher on the project root. fs events trigger a
/// debounced rebuild of the file tree via `filetree_dir_tx`. Caller
/// stores the watcher in the workspace state; dropping it stops events.
fn build_project_watcher(
  project: &Path,
  filetree_dir_tx: Sender<String>,
) -> notify::Result<RecommendedWatcher> {
  let project_path = project.to_path_buf();
  let project_str = project_path.to_string_lossy().to_string();

  // Replacing/dropping the watcher closes dirty_tx, which lets the
  // debounce worker exit on next recv.
  let (dirty_tx, dirty_rx) = mpsc::channel::<()>();

  let project_str_for_worker = project_str.clone();
  thread::spawn(move || {
    while dirty_rx.recv().is_ok() {
      while dirty_rx.try_recv().is_ok() {}
      thread::sleep(std::time::Duration::from_millis(PROJECT_REBUILD_DEBOUNCE_MS));
      while dirty_rx.try_recv().is_ok() {}
      if filetree_dir_tx.send(project_str_for_worker.clone()).is_err() {
        break;
      }
    }
  });

  let mut watcher: RecommendedWatcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
    if res.is_ok() {
      let _ = dirty_tx.send(());
    }
  })?;

  watcher.watch(&project_path, RecursiveMode::Recursive)?;
  Ok(watcher)
}

#[derive(Debug, PartialEq, Eq)]
enum LoadDecision {
  Ok(String),
  TooLarge { size: u64, limit: u64 },
  TooManyLines { lines: usize, limit: usize },
  LineTooLong { length: usize, limit: usize },
  NotAFile,
  StatError(String),
  ReadError(String),
}

fn load_file_with_cap(
  path: &str,
  byte_limit: u64,
  line_limit: usize,
  line_length_limit: usize,
) -> LoadDecision {
  let meta = match metadata(path) {
    Ok(m) => m,
    Err(e) => return LoadDecision::StatError(e.to_string()),
  };
  if !meta.is_file() {
    return LoadDecision::NotAFile;
  }
  let size = meta.len();
  if size > byte_limit {
    return LoadDecision::TooLarge { size, limit: byte_limit };
  }
  let contents = match fs::read_to_string(path) {
    Ok(c) => c,
    Err(e) => return LoadDecision::ReadError(e.to_string()),
  };
  // Single-pass scan: track both line count and max line length so we
  // catch minified one-liners (under the line cap, way over the length
  // cap) and tall files in one walk.
  let mut line_count = 0usize;
  let mut max_length = 0usize;
  for line in contents.lines() {
    line_count += 1;
    if line.len() > max_length {
      max_length = line.len();
    }
  }
  if max_length > line_length_limit {
    return LoadDecision::LineTooLong { length: max_length, limit: line_length_limit };
  }
  if line_count > line_limit {
    return LoadDecision::TooManyLines { lines: line_count, limit: line_limit };
  }
  LoadDecision::Ok(contents)
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

      let workspaces: Workspaces = Arc::new(Mutex::new(HashMap::new()));

      let window = app.get_webview_window("main").unwrap();
      let window_for_callback = window.clone();
      let tools_for_callback = tools_for_setup.clone();
      let recents_for_callback = recents.clone();
      let app_for_callback = app_handle.clone();
      let workspaces_for_callback = workspaces.clone();
      window.once("frontend-ready", move |_| {
        bootstrap(
          window_for_callback,
          tools_for_callback,
          recents_for_callback,
          app_for_callback,
          workspaces_for_callback,
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
  workspaces: Workspaces,
) {
  // One clone per listener — Tauri requires owned `'static` data inside.
  let workspaces_for_initialized = workspaces.clone();
  let workspaces_for_open = workspaces.clone();
  let workspaces_for_close = workspaces.clone();
  let workspaces_for_activate = workspaces.clone();
  let workspaces_for_run = workspaces.clone();
  let workspaces_for_resize = workspaces.clone();

  let window_for_open = window.clone();
  let window_for_activate = window.clone();
  let window_for_fuzzy_results = window.clone();
  let window_for_fuzzy_projects = window.clone();
  let window_for_create_file = window.clone();

  let tools_for_fuzzy = tools.clone();
  let tools_for_projects = tools.clone();
  let recents_for_open = recents.clone();
  let recents_for_projects = recents.clone();
  let app_for_open = app.clone();

  // `run` and `resize` look up the workspace in the map and forward to
  // that workspace's terminal channels. Registered once, not per-workspace.
  window.listen("run", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let workspace_id = match v["workspaceId"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };
    let contents = match v["contents"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };
    if let Some(ws) = workspaces_for_run.lock().unwrap().get(&workspace_id) {
      let _ = ws.terminal.run_tx.send(contents);
    }
  });
  window.listen("resize", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let workspace_id = match v["workspaceId"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };
    let size: Size = match serde_json::from_value(v["size"].clone()) {
      Ok(s) => s,
      Err(_) => return,
    };
    if let Some(ws) = workspaces_for_resize.lock().unwrap().get(&workspace_id) {
      let _ = ws.terminal.resize_tx.send(size);
    }
  });

  // `initialized` arrives from JS after Elm mounts; tell the workspace's
  // filetree worker to do its first walk.
  window.listen("initialized", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let workspace_id = match v["workspaceId"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };
    let directory = match v["directory"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };
    if let Some(ws) = workspaces_for_initialized.lock().unwrap().get(&workspace_id) {
      let _ = ws.filetree_dir_tx.send(directory);
    }
  });

  // Fuzzy-find for files within the active project — workspaceId is used
  // to confirm the right directory is searched (matches the project path).
  window.listen("requestFuzzyFindInProjectFileOrDirectory", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let workspace_id = v["workspaceId"].as_str().unwrap_or("").to_string();
    let directory = v["directory"].as_str().unwrap_or("").to_string();
    let name = v["file_or_directory_name"].as_str().unwrap_or("").to_string();

    let resolved = tools_for_fuzzy.lock().unwrap().clone();
    let results = find_in_project_file_or_directory(&resolved, &directory, &name);
    let _ = window_for_fuzzy_results.emit(
      "receiveFuzzyFindResults",
      serde_json::json!({ "workspaceId": workspace_id, "results": results }),
    );
  });

  // Fuzzy-find for project directories — used from the welcome screen
  // before any workspace exists, so the workspaceId is empty/unused on
  // its way back to Elm (Elm routes it through the welcome flow).
  window.listen("requestFuzzyFindProjects", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let project = v["project"].as_str().unwrap_or("").to_string();
    let workspace_id = v["workspaceId"].as_str().unwrap_or("").to_string();

    let resolved = tools_for_projects.lock().unwrap().clone();
    let roots = recents_for_projects
      .lock()
      .unwrap()
      .project_search_roots(&home_dir());
    let results = find_project(&resolved, &project, &roots);
    let _ = window_for_fuzzy_projects.emit(
      "receiveFuzzyFindResults",
      serde_json::json!({ "workspaceId": workspace_id, "results": results }),
    );
  });

  // Open a project tab. Add-or-focus: if already open, just emit
  // `initialize` again so Elm switches to that tab on the JS side.
  window.listen("requestOpenProject", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let directory = match v["directory"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };
    println!("requestOpenProject directory: {:?}", directory);

    let dir = match fs::canonicalize(PathBuf::from(&directory)) {
      Ok(p) => p.to_string_lossy().to_string(),
      Err(e) => {
        eprintln!("failed to canonicalize {}: {:?}", directory, e);
        return;
      }
    };
    println!("requestOpenProject dir: {:?}", dir);

    recents_for_open.lock().unwrap().record(&dir);
    save_recents(&app_for_open, &recents_for_open);

    let already_open = workspaces_for_open.lock().unwrap().contains_key(&dir);
    if !already_open {
      let filetree_dir_tx =
        spawn_filetree_worker_for_workspace(&window_for_open, dir.clone());
      let project_watcher_result = build_project_watcher(Path::new(&dir), filetree_dir_tx.clone());
      let project_watcher = match project_watcher_result {
        Ok(w) => Some(w),
        Err(e) => {
          eprintln!("failed to install project watcher for {}: {:?}", dir, e);
          None
        }
      };
      let terminal = spawn_terminal_for_workspace(&window_for_open, dir.clone(), dir.clone());

      workspaces_for_open.lock().unwrap().insert(
        dir.clone(),
        WorkspaceState {
          file_watcher: None,
          project_watcher,
          filetree_dir_tx,
          terminal,
        },
      );
    }

    let _ = window_for_open.emit(
      "initialize",
      serde_json::json!({ "workspaceId": dir, "directory": dir }),
    );
  });

  // Close a project tab. Dropping the entry tears down its watchers +
  // filetree worker; the terminal's `is_active` flips false in
  // `WorkspaceState::drop`.
  window.listen("closeWorkspace", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let workspace_id = match v["workspaceId"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };
    let removed = workspaces_for_close.lock().unwrap().remove(&workspace_id);
    if removed.is_none() {
      eprintln!("closeWorkspace: unknown workspace id {}", workspace_id);
    }
    // dropping `removed` here closes its channels + watchers + flips is_active
  });

  // Open a file inside a workspace. Replaces that workspace's file
  // watcher with one on the new active file.
  window.listen("activateFileOrDirectory", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let workspace_id = match v["workspaceId"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };
    let filename = match v["path"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };

    match load_file_with_cap(&filename, MAX_FILE_BYTES, MAX_FILE_LINES, MAX_LINE_LENGTH) {
      LoadDecision::Ok(contents) => {
        let new_watcher = build_file_watcher(
          Path::new(&filename),
          workspace_id.clone(),
          window_for_activate.clone(),
        );
        match new_watcher {
          Ok(w) => {
            if let Some(ws) = workspaces_for_activate.lock().unwrap().get_mut(&workspace_id) {
              ws.file_watcher = Some(w);
            }
          }
          Err(e) => {
            eprintln!("failed to install file watcher for {}: {:?}", filename, e);
          }
        }

        let _ = window_for_activate.emit(
          "receiveActivatedFile",
          serde_json::json!({
            "workspaceId": workspace_id,
            "path": filename,
            "contents": contents,
          }),
        );
      }
      LoadDecision::NotAFile => {
        // Directory or special file — nothing to load
      }
      LoadDecision::TooLarge { size, limit } => emit_notification(
        &window_for_activate,
        "info",
        format!(
          "{} is {:.1} MB — too large for the editor to load smoothly (cap is {:.1} MB). For files this size, try vim or less.",
          filename,
          size as f64 / 1_048_576.0,
          limit as f64 / 1_048_576.0,
        ),
      ),
      LoadDecision::TooManyLines { lines, limit } => emit_notification(
        &window_for_activate,
        "info",
        format!(
          "{} has {} lines — the editor is tuned for files under {}. For longer files, vim or less will work better.",
          filename, lines, limit,
        ),
      ),
      LoadDecision::LineTooLong { length, limit } => emit_notification(
        &window_for_activate,
        "info",
        format!(
          "{} contains a {}-character line (cap is {}), typical of minified bundles or generated code. The editor would lock up rendering it — try opening it in vim or less.",
          filename, length, limit,
        ),
      ),
      LoadDecision::StatError(e) => emit_notification(
        &window_for_activate,
        "error",
        format!("Could not stat {}: {}", filename, e),
      ),
      LoadDecision::ReadError(e) => emit_notification(
        &window_for_activate,
        "error",
        format!("Could not read {} (likely non-UTF-8 or binary): {}", filename, e),
      ),
    }
  });

  // Create a new empty file inside a workspace; refresh just that
  // workspace's tree + activate the new file in it.
  window.listen("createFile", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let workspace_id = v["workspaceId"].as_str().unwrap_or("").to_string();
    let directory = v["directory"].as_str().unwrap_or("");
    let file = v["file"].as_str().unwrap_or("");

    if metadata(file).is_err() {
      match fs::write(file, "") {
        Ok(_) => {
          if let Ok(tree) = filetree::filetree::build(directory.to_string()) {
            let _ = window_for_create_file.emit(
              "message-from-directory-tree-worker",
              serde_json::json!({ "workspaceId": workspace_id, "tree": tree }),
            );
          }
          let _ = window_for_create_file.emit(
            "receiveActivatedFile",
            serde_json::json!({
              "workspaceId": workspace_id,
              "path": file,
              "contents": "",
            }),
          );
        }
        Err(e) => {
          println!("error creating file: {:?}", e);
        }
      }
    }
  });

  // Save is workspace-independent — file path + contents is enough.
  window.listen("save", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let file = v["file"].as_str().unwrap_or("");
    let contents = v["contents"].as_str().unwrap_or("");
    if let Err(e) = fs::write(file, contents) {
      eprintln!("save failed for {}: {:?}", file, e);
    }
  });

  // Startup paths — argv positional + DEV_DIRECTORY env both create the
  // first workspace. The welcome-screen path leaves the map empty until
  // the user picks something.
  let startup_dir: Option<String> = match env::args().nth(1) {
    Some(d) => Some(d),
    None => env::var("DEV_DIRECTORY").ok(),
  };

  if let Some(raw_dir) = startup_dir {
    println!("startup directory: {:?}", raw_dir);
    let canonical = match fs::canonicalize(PathBuf::from(&raw_dir)) {
      Ok(p) => p.to_string_lossy().to_string(),
      Err(e) => {
        eprintln!("failed to canonicalize startup dir {}: {:?}", raw_dir, e);
        let _ = window.emit("initialize", serde_json::json!({ "workspaceId": "", "directory": "" }));
        return;
      }
    };

    recents.lock().unwrap().record(&canonical);
    save_recents(&app, &recents);

    let filetree_dir_tx = spawn_filetree_worker_for_workspace(&window, canonical.clone());
    let project_watcher = match build_project_watcher(Path::new(&canonical), filetree_dir_tx.clone()) {
      Ok(w) => Some(w),
      Err(e) => {
        eprintln!("failed to install project watcher for {}: {:?}", canonical, e);
        None
      }
    };
    let terminal =
      spawn_terminal_for_workspace(&window, canonical.clone(), canonical.clone());

    workspaces.lock().unwrap().insert(
      canonical.clone(),
      WorkspaceState {
        file_watcher: None,
        project_watcher,
        filetree_dir_tx,
        terminal,
      },
    );

    let _ = window.emit(
      "initialize",
      serde_json::json!({ "workspaceId": canonical, "directory": canonical }),
    );
  } else {
    println!("need a project!");
    let _ = window.emit("initialize", serde_json::json!({ "workspaceId": "", "directory": "" }));
  }
}

/// Spawn a per-workspace PTY + output/resize emitter threads. The `output`
/// and `sendResizedToTerminal` events both include `workspaceId` so the
/// Elm side can route to the right workspace's terminal model.
fn spawn_terminal_for_workspace(
  window: &WebviewWindow<Wry>,
  workspace_id: String,
  directory: String,
) -> TerminalSlot {
  let window_terminal_output = window.clone();
  let window_terminal_resize = window.clone();
  let ws_for_output = workspace_id.clone();
  let ws_for_resize = workspace_id;

  let (terminal_output_tx, terminal_output_rx) = mpsc::channel::<Vec<TerminalCommand>>();
  let (terminal_resize_tx, terminal_resize_rx) = mpsc::channel::<Size>();

  let terminal_api = terminal::terminal::start(directory, terminal_output_tx, terminal_resize_tx);
  let is_active = Arc::new(AtomicBool::new(true));

  let is_active_for_output = is_active.clone();
  thread::spawn(move || {
    for message in terminal_output_rx {
      if is_active_for_output.load(Ordering::Relaxed) {
        let _ = window_terminal_output.emit(
          "output",
          serde_json::json!({ "workspaceId": ws_for_output, "data": message }),
        );
      }
    }
  });

  let is_active_for_resize = is_active.clone();
  thread::spawn(move || {
    for message in terminal_resize_rx {
      if is_active_for_resize.load(Ordering::Relaxed) {
        let _ = window_terminal_resize.emit(
          "sendResizedToTerminal",
          serde_json::json!({ "workspaceId": ws_for_resize, "size": message }),
        );
      }
    }
  });

  TerminalSlot {
    run_tx: terminal_api.run_tx,
    resize_tx: terminal_api.resize_tx,
    is_active,
    _kill_tx: terminal_api.kill_tx,
  }
}

/// Spawn a per-workspace filetree worker. Returns the sender used to
/// trigger rebuilds; dropping the sender (via WorkspaceState being
/// dropped from the map) closes the worker channels and lets all threads
/// exit cleanly. Output trees are stamped with `workspaceId`.
fn spawn_filetree_worker_for_workspace(
  window: &WebviewWindow<Wry>,
  workspace_id: String,
) -> Sender<String> {
  let (ft_tx, ft_rx) = mpsc::channel::<FileTreeAndFlat>();
  let (dir_tx, dir_rx) = mpsc::channel::<String>();

  filetree::filetree::start(dir_rx, ft_tx);

  let window_for_emit = window.clone();
  let ws_for_emit = workspace_id;
  thread::spawn(move || {
    for tree in ft_rx {
      let _ = window_for_emit.emit(
        "message-from-directory-tree-worker",
        serde_json::json!({ "workspaceId": ws_for_emit, "tree": tree }),
      );
    }
  });

  dir_tx
}

/// Cap fuzzy results so we never feed the frontend more DOM nodes than it
/// can render quickly. Searching a huge monorepo for a vague substring
/// can match tens of thousands of files; the UI freezes well before then.
const MAX_FUZZY_RESULTS: usize = 5_000;

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
      .take(MAX_FUZZY_RESULTS)
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
    if results.len() >= MAX_FUZZY_RESULTS {
      break;
    }
  }

  // Dedupe while preserving order (different roots can yield the same
  // canonical project via symlinks)
  let mut seen = std::collections::HashSet::new();
  results.retain(|p| seen.insert(p.clone()));
  results.truncate(MAX_FUZZY_RESULTS);
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
  fn load_file_with_cap_returns_ok_for_small_file() {
    let tmp = std::env::temp_dir().join(format!("editor-pro-load-ok-{}", std::process::id()));
    let _ = std::fs::remove_file(&tmp);
    std::fs::write(&tmp, b"hello").unwrap();
    let result = load_file_with_cap(tmp.to_str().unwrap(), 1024, 100, 1000);
    assert_eq!(result, LoadDecision::Ok("hello".to_string()));
    let _ = std::fs::remove_file(&tmp);
  }

  #[test]
  fn load_file_with_cap_rejects_oversize() {
    let tmp = std::env::temp_dir().join(format!("editor-pro-load-big-{}", std::process::id()));
    let _ = std::fs::remove_file(&tmp);
    std::fs::write(&tmp, vec![b'a'; 2048]).unwrap();
    let result = load_file_with_cap(tmp.to_str().unwrap(), 1024, 100, 1000);
    assert!(matches!(result, LoadDecision::TooLarge { size: 2048, limit: 1024 }));
    let _ = std::fs::remove_file(&tmp);
  }

  #[test]
  fn load_file_with_cap_rejects_too_many_lines() {
    let tmp = std::env::temp_dir().join(format!("editor-pro-load-tall-{}", std::process::id()));
    let _ = std::fs::remove_file(&tmp);
    let body = "x\n".repeat(50);
    std::fs::write(&tmp, body.as_bytes()).unwrap();
    let result = load_file_with_cap(tmp.to_str().unwrap(), 1024, 10, 1000);
    assert!(matches!(result, LoadDecision::TooManyLines { lines: 50, limit: 10 }));
    let _ = std::fs::remove_file(&tmp);
  }

  #[test]
  fn load_file_with_cap_rejects_minified_one_liner() {
    // 5000 chars on a single line — catches minified bundles even though
    // line count is just 1.
    let tmp = std::env::temp_dir().join(format!("editor-pro-load-minified-{}", std::process::id()));
    let _ = std::fs::remove_file(&tmp);
    let body: String = std::iter::repeat('x').take(5000).collect();
    std::fs::write(&tmp, body.as_bytes()).unwrap();
    let result = load_file_with_cap(tmp.to_str().unwrap(), 1_000_000, 1000, 1000);
    assert!(matches!(result, LoadDecision::LineTooLong { length: 5000, limit: 1000 }));
    let _ = std::fs::remove_file(&tmp);
  }

  #[test]
  fn load_file_with_cap_allows_normal_code_lines() {
    // A file with sensible code lines (a few hundred chars each) should
    // not trip the length cap.
    let tmp = std::env::temp_dir().join(format!("editor-pro-load-normal-{}", std::process::id()));
    let _ = std::fs::remove_file(&tmp);
    let body = "fn hello() { println!(\"world\"); }\n".repeat(20);
    std::fs::write(&tmp, body.as_bytes()).unwrap();
    let result = load_file_with_cap(tmp.to_str().unwrap(), 1024, 1000, 1000);
    assert!(matches!(result, LoadDecision::Ok(_)));
    let _ = std::fs::remove_file(&tmp);
  }

  #[test]
  fn load_file_with_cap_returns_not_a_file_for_directory() {
    let tmp = std::env::temp_dir().join(format!("editor-pro-load-dir-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&tmp);
    std::fs::create_dir_all(&tmp).unwrap();
    let result = load_file_with_cap(tmp.to_str().unwrap(), 1024, 100, 1000);
    assert_eq!(result, LoadDecision::NotAFile);
    let _ = std::fs::remove_dir_all(&tmp);
  }

  #[test]
  fn load_file_with_cap_returns_stat_error_for_missing_path() {
    let result = load_file_with_cap("/nope/this/does/not/exist/xyzzy", 1024, 100, 1000);
    assert!(matches!(result, LoadDecision::StatError(_)));
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
