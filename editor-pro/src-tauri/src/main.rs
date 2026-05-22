mod recent_projects;

use filetree::filetree::{File, FileTreeAndFlat};
use notify::{event::ModifyKind, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use preflight::{Check, ProbeOutcome, Report};
use recent_projects::{RecentProjects, STORE_FILE, STORE_KEY};
use serde_json::{self, Value};
use std::{
  env, fs,
  fs::metadata,
  path::{Path, PathBuf},
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

/// Holds the active file's watcher. Dropping the watcher (or replacing it
/// via Mutex assignment) stops notifications for the previously-watched
/// file — there is at most one watched file at any time because the
/// editor only shows one active file.
type SharedWatcher = Arc<Mutex<Option<RecommendedWatcher>>>;

/// Debounce window for project-wide rebuild requests. fs events come in
/// bursts (atomic renames, IDE saves, `npm install`) — we coalesce them
/// so the file tree rebuilds at most once per burst rather than once per
/// event.
const PROJECT_REBUILD_DEBOUNCE_MS: u64 = 200;

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
/// (one line!) but rendering that single span chokes the editor. 250
/// chars comfortably covers hand-written code (style guides land at
/// 80–120) and most JSON blobs while being well below anything minified.
const MAX_LINE_LENGTH: usize = 250;

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

/// Install a single-file watcher on `path`. Replaces any prior watcher
/// in `slot` (the old watcher is dropped, which stops fsevents for it).
/// On modify events, re-reads the file with the usual caps and emits
/// `externalFileChange { path, contents }` back to the webview. Identical
/// contents are still emitted — the Elm side dedupes — which keeps this
/// function simple and robust to fsevents coalescing.
fn install_file_watcher(
  path: &Path,
  slot: &SharedWatcher,
  window: WebviewWindow<Wry>,
) -> notify::Result<()> {
  let watched_path = path.to_path_buf();
  let path_for_callback = watched_path.clone();
  let window_for_callback = window;

  let mut watcher: RecommendedWatcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
    let event = match res {
      Ok(e) => e,
      Err(e) => {
        eprintln!("file watcher error: {:?}", e);
        return;
      }
    };

    // fsevents reports the file path; sanity-check we're seeing our watched file
    let is_our_file = event.paths.iter().any(|p| p == &path_for_callback);
    if !is_our_file {
      return;
    }

    let path_str = path_for_callback.to_string_lossy().to_string();

    // Deletion (incl. rename-away) unloads the file in the editor —
    // disk wins for delete too. Some tools use atomic rename which
    // shows up as Remove then Create; the deletion notification is
    // safe to send because the Elm handler will then re-activate
    // the file if the user clicks it again in the tree.
    let is_delete = matches!(
      event.kind,
      EventKind::Remove(_) | EventKind::Modify(ModifyKind::Name(_))
    );
    if is_delete {
      // Confirm the path really is gone (some Modify(Name) events are
      // atomic-rename round-trips that leave the file in place).
      if !path_for_callback.exists() {
        let payload = serde_json::json!({ "path": path_str });
        if let Err(e) = window_for_callback.emit("externalFileDelete", payload) {
          eprintln!("failed to emit externalFileDelete: {:?}", e);
        }
        return;
      }
    }

    // Only react to actual content changes. Modify(Metadata(*)) (touches)
    // are ignored.
    let is_content_change = matches!(
      event.kind,
      EventKind::Modify(ModifyKind::Data(_)) | EventKind::Modify(ModifyKind::Any)
    );
    if !is_content_change {
      return;
    }

    match load_file_with_cap(&path_str, MAX_FILE_BYTES, MAX_FILE_LINES, MAX_LINE_LENGTH) {
      LoadDecision::Ok(contents) => {
        let payload = serde_json::json!({ "path": path_str, "contents": contents });
        if let Err(e) = window_for_callback.emit("externalFileChange", payload) {
          eprintln!("failed to emit externalFileChange: {:?}", e);
        }
      }
      LoadDecision::NotAFile => {
        // file replaced with a directory — treat as delete
        let payload = serde_json::json!({ "path": path_str });
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
      LoadDecision::StatError(_) | LoadDecision::ReadError(_) => {
        // transient read error during another tool's atomic rename — ignore
      }
    }
  })?;

  watcher.watch(&watched_path, RecursiveMode::NonRecursive)?;
  *slot.lock().unwrap() = Some(watcher);
  Ok(())
}

/// Install a recursive watcher on the project root. Any fs event under
/// the project (create / modify / rename / remove) bumps a debounced
/// rebuild of the file tree via the existing filetree_dir_tx channel,
/// so the tree in the UI stays in sync with disk without polling.
fn install_project_watcher(
  project: &Path,
  slot: &SharedWatcher,
  filetree_dir_tx: Sender<String>,
) -> notify::Result<()> {
  let project_path = project.to_path_buf();
  let project_str = project_path.to_string_lossy().to_string();

  // Channel from the watcher callback to a debounce worker. Replacing
  // the watcher drops the sender end; the worker then exits cleanly
  // when its channel closes.
  let (dirty_tx, dirty_rx) = mpsc::channel::<()>();

  let project_str_for_worker = project_str.clone();
  thread::spawn(move || {
    while dirty_rx.recv().is_ok() {
      // Drain any signals that piled up while we were idle.
      while dirty_rx.try_recv().is_ok() {}
      // Settle window — anything within this period gets coalesced.
      thread::sleep(std::time::Duration::from_millis(PROJECT_REBUILD_DEBOUNCE_MS));
      while dirty_rx.try_recv().is_ok() {}
      if filetree_dir_tx.send(project_str_for_worker.clone()).is_err() {
        // receiver is gone; nothing more to do
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
  *slot.lock().unwrap() = Some(watcher);
  Ok(())
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

      let file_watcher: SharedWatcher = Arc::new(Mutex::new(None));
      let project_watcher: SharedWatcher = Arc::new(Mutex::new(None));

      let window = app.get_webview_window("main").unwrap();
      let window_for_callback = window.clone();
      let tools_for_callback = tools_for_setup.clone();
      let recents_for_callback = recents.clone();
      let app_for_callback = app_handle.clone();
      let file_watcher_for_callback = file_watcher.clone();
      let project_watcher_for_callback = project_watcher.clone();
      window.once("frontend-ready", move |_| {
        bootstrap(
          window_for_callback,
          tools_for_callback,
          recents_for_callback,
          app_for_callback,
          file_watcher_for_callback,
          project_watcher_for_callback,
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
  file_watcher: SharedWatcher,
  project_watcher: SharedWatcher,
) {
  let window_ = window.clone();
  let window_terminal = window.clone();
  let window_open_project = window.clone();
  let window_directory_tree_worker = window.clone();
  let window_receive_activated_file = window.clone();
  let window_receive_fuzzy_find_results = window.clone();
  let window_receive_fuzzy_find_projects_results = window.clone();
  let window_create_file = window.clone();
  let window_for_watcher = window.clone();

  let tools_for_fuzzy = tools.clone();
  let tools_for_projects = tools.clone();
  let recents_for_open = recents.clone();
  let recents_for_projects = recents.clone();
  let app_for_open = app.clone();
  let watcher_for_activate = file_watcher.clone();

  // Start file tree worker
  let (filetree_tx, filetree_rx): (Sender<FileTreeAndFlat>, Receiver<FileTreeAndFlat>) =
    mpsc::channel();
  let (filetree_dir_tx, filetree_dir_rx): (Sender<String>, Receiver<String>) = mpsc::channel();

  let filetree_dir_tx_for_init = filetree_dir_tx.clone();
  let filetree_dir_tx_for_open = filetree_dir_tx.clone();
  let filetree_dir_tx_for_startup = filetree_dir_tx.clone();
  let project_watcher_for_open = project_watcher.clone();
  let project_watcher_for_startup = project_watcher.clone();

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
    filetree_dir_tx_for_init.send(directory).unwrap()
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

    if let Err(e) = install_project_watcher(
      Path::new(&dir),
      &project_watcher_for_open,
      filetree_dir_tx_for_open.clone(),
    ) {
      eprintln!("failed to install project watcher for {}: {:?}", dir, e);
    }

    start_terminal(&window_open_project, dir.clone());
    window_open_project
      .emit("initialize", dir)
      .expect("failed to emit");
  });

  window.listen("activateFileOrDirectory", move |event| {
    let filename: String = serde_json::from_str(event.payload()).unwrap();
    match load_file_with_cap(&filename, MAX_FILE_BYTES, MAX_FILE_LINES, MAX_LINE_LENGTH) {
      LoadDecision::Ok(contents) => {
        // Install a watcher for the now-active file. Replaces any prior
        // watcher, so we never accumulate watchers as the user navigates.
        if let Err(e) = install_file_watcher(
          Path::new(&filename),
          &watcher_for_activate,
          window_for_watcher.clone(),
        ) {
          eprintln!("failed to install file watcher for {}: {:?}", filename, e);
        }

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
      LoadDecision::NotAFile => {
        // Directory or special file — nothing to load, no notification needed.
      }
      LoadDecision::TooLarge { size, limit } => emit_notification(
        &window_receive_activated_file,
        "info",
        format!(
          "{} is {:.1} MB — too large for the editor to load smoothly (cap is {:.1} MB). For files this size, try vim or less.",
          filename,
          size as f64 / 1_048_576.0,
          limit as f64 / 1_048_576.0,
        ),
      ),
      LoadDecision::TooManyLines { lines, limit } => emit_notification(
        &window_receive_activated_file,
        "info",
        format!(
          "{} has {} lines — the editor is tuned for files under {}. For longer files, vim or less will work better.",
          filename, lines, limit,
        ),
      ),
      LoadDecision::LineTooLong { length, limit } => emit_notification(
        &window_receive_activated_file,
        "info",
        format!(
          "{} contains a {}-character line (cap is {}), typical of minified bundles or generated code. The editor would lock up rendering it — try opening it in vim or less.",
          filename, length, limit,
        ),
      ),
      LoadDecision::StatError(e) => emit_notification(
        &window_receive_activated_file,
        "error",
        format!("Could not stat {}: {}", filename, e),
      ),
      LoadDecision::ReadError(e) => emit_notification(
        &window_receive_activated_file,
        "error",
        format!("Could not read {} (likely non-UTF-8 or binary): {}", filename, e),
      ),
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

      if let Err(e) = install_project_watcher(
        Path::new(&dir),
        &project_watcher_for_startup,
        filetree_dir_tx_for_startup.clone(),
      ) {
        eprintln!("failed to install project watcher for {}: {:?}", dir, e);
      }

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

          if let Err(e) = install_project_watcher(
            Path::new(&canonical),
            &project_watcher_for_startup,
            filetree_dir_tx_for_startup.clone(),
          ) {
            eprintln!("failed to install project watcher for {}: {:?}", canonical, e);
          }

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
