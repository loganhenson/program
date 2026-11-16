mod recent_projects;

use filetree::filetree::FileTreeAndFlat;
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
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
  menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
  AppHandle, Emitter, Listener, Manager, WebviewWindow,
};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_store::StoreExt;
use filetree::filetree::Request as TreeRequest;
use terminal::terminal::{Batch, Next, Output, Size};

/// Locks a mutex whether or not a thread panicked while holding it. What
/// these mutexes guard (maps of what is open) stays usable after a panic,
/// and refusing to touch it would turn one failure into every later one.
fn locked<T>(mutex: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
  mutex.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}

/// Listens for an event from the page with a handler whose panic stays its
/// own.
///
/// Tauri runs handlers while holding the lock on its table of listeners. A
/// panic in one poisons that lock, and from then on every event from the
/// page is queued and never delivered: keys typed in a terminal, save, open,
/// close all silently do nothing for the rest of the session, while the
/// queue grows.
fn listen_safely<R, F>(window: &WebviewWindow<R>, event: &'static str, handler: F)
where
  R: tauri::Runtime,
  F: Fn(tauri::Event) + Send + 'static,
{
  window.listen(event, move |received| {
    if std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| handler(received))).is_err() {
      eprintln!("the handler for {:?} panicked; that one event was dropped", event);
    }
  });
}

/// The id of the Quit item in the app menu.
const QUIT_MENU_ID: &str = "quit";

/// Quitting loses edits that were not saved and stops whatever is running
/// in the terminals, so it is confirmed while a project is open. With
/// nothing open there is nothing to lose.
fn quit_needs_confirmation(open_projects: usize) -> bool {
  open_projects > 0
}

/// How many projects are open, for deciding whether quitting is confirmed.
/// Quitting must never wait on the rest of the app: if the list is in use
/// (or was left broken by a thread that panicked) it counts as "some".
fn open_projects(workspaces: &Workspaces) -> usize {
  match workspaces.try_lock() {
    Ok(open) => open.len(),
    Err(std::sync::TryLockError::Poisoned(poisoned)) => poisoned.into_inner().len(),
    Err(std::sync::TryLockError::WouldBlock) => 1,
  }
}

/// Command+Q. Handled here and not in the page, so that it works whatever
/// the page is showing or doing.
fn request_quit(app: &AppHandle) {
  static ASKING: AtomicBool = AtomicBool::new(false);

  let open = app
    .try_state::<Workspaces>()
    .map(|workspaces| open_projects(&workspaces))
    .unwrap_or(0);
  if !quit_needs_confirmation(open) {
    app.exit(0);
    return;
  }

  // Already asking: the dialog that is up gets the answer.
  if ASKING.swap(true, Ordering::SeqCst) {
    return;
  }

  let app_for_answer = app.clone();
  let mut dialog = app
    .dialog()
    .message("Changes that have not been saved will be lost, and anything running in a terminal will be stopped.")
    .title("Quit EditorPro?")
    .kind(MessageDialogKind::Warning)
    .buttons(MessageDialogButtons::OkCancelCustom("Quit".to_string(), "Cancel".to_string()));
  if let Some(window) = app.get_webview_window("main") {
    dialog = dialog.parent(&window);
  }
  dialog.show(move |quit| {
    ASKING.store(false, Ordering::SeqCst);
    if quit {
      app_for_answer.exit(0);
    }
  });
}

/// Debounce window for project-wide rebuild requests. fs events come in
/// bursts (atomic renames, IDE saves, `npm install`) — we coalesce them
/// so the file tree rebuilds at most once per burst rather than once per
/// event.
const PROJECT_REBUILD_DEBOUNCE_MS: u64 = 200;
/// The longest a refresh of the tree is put off while changes keep coming.
const PROJECT_REBUILD_MAX_WAIT_MS: u64 = 1000;

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
  _output: OutputRegistration,
}

impl Drop for TerminalSlot {
  fn drop(&mut self) {
    // however the terminal went away (its tab, or its whole project)
    self.is_active.store(false, Ordering::Relaxed);
  }
}

/// The output of every open terminal, waiting for the page to ask for it.
/// Kept apart from the workspaces so that handing out output never waits on
/// anything else the app is doing with them.
type Outputs = Arc<Mutex<HashMap<String, Arc<Output>>>>;

fn output_key(workspace_id: &str, terminal_id: &str) -> String {
  format!("{}\u{0}{}", workspace_id, terminal_id)
}

/// A terminal's entry in `Outputs`, removed again when the terminal goes away.
struct OutputRegistration {
  outputs: Outputs,
  key: String,
}

impl OutputRegistration {
  fn new(outputs: &Outputs, key: String, output: Output) -> Self {
    locked(outputs).insert(key.clone(), Arc::new(output));
    OutputRegistration { outputs: outputs.clone(), key }
  }
}

impl Drop for OutputRegistration {
  fn drop(&mut self) {
    locked(&self.outputs).remove(&self.key);
  }
}

/// How long a request for output waits when nothing is being printed,
/// before it is answered with "nothing yet" and asked again. (A request
/// that stays open for a minute is given up by the web view.)
const OUTPUT_WAIT: std::time::Duration = std::time::Duration::from_secs(15);

/// The page asks for a terminal's next batch of output, and says which one
/// it has taken. See `terminal::terminal::Output` for why it asks instead
/// of being sent it.
#[tauri::command(async)]
fn next_output(workspace_id: String, terminal_id: String, acknowledged: u64, outputs: tauri::State<Outputs>) -> Value {
  let output = locked(&outputs).get(&output_key(&workspace_id, &terminal_id)).cloned();
  match output {
    // not opened yet, or closed
    None => serde_json::json!({ "state": "unknown" }),
    Some(output) => match output.next(acknowledged, OUTPUT_WAIT) {
      Next::Batch(batch) => serde_json::json!({ "state": "output", "sequence": batch.sequence, "data": batch.commands }),
      Next::Nothing => serde_json::json!({ "state": "waiting" }),
      Next::Closed => serde_json::json!({ "state": "closed" }),
    },
  }
}

/// Everything Rust holds on behalf of one open project tab. Each
/// workspace owns its own terminal map keyed by `terminalId` (Elm
/// generates the id when the user adds a tab). Dropping this entry
/// reaps every terminal in the map (each TerminalSlot's _kill_tx
/// reaches its kill-watcher), and drops the watchers + filetree worker
/// channel.
///
/// `file_watcher` and `project_watcher` are held to keep their fsevent
/// callbacks alive — Rust's dead-code warning doesn't account for RAII
/// drop semantics, so they look unread.
#[allow(dead_code)]
struct WorkspaceState {
  file_watcher: Option<RecommendedWatcher>,
  project_watcher: Option<RecommendedWatcher>,
  filetree_dir_tx: Sender<TreeRequest>,
  terminals: HashMap<String, TerminalSlot>,
}

impl Drop for WorkspaceState {
  fn drop(&mut self) {
    for slot in self.terminals.values() {
      slot.is_active.store(false, Ordering::Relaxed);
    }
  }
}

/// Workspaces keyed by canonical project path. The path doubles as the
/// workspace id, which also matches the Elm-side `Workspace.projectPath`.
type Workspaces = Arc<Mutex<HashMap<String, WorkspaceState>>>;

type SharedRecents = Arc<Mutex<RecentProjects>>;

fn load_recents(app: &AppHandle) -> SharedRecents {
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

fn save_recents(app: &AppHandle, recents: &SharedRecents) {
  let snapshot: Vec<String> = locked(&recents).paths().to_vec();
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
  locked(&recents).prune_missing()
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

fn emit_notification(window: &WebviewWindow, type_: &str, message: String) {
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
/// Whether a path may be created or deleted on behalf of a project: it is
/// inside the project, and is not the project itself. The page names the
/// path; this is what keeps a mistake there from reaching the rest of the
/// disk.
fn is_inside_project(project: &str, path: &str) -> bool {
  let project = Path::new(project);
  let path = Path::new(path);
  !project.as_os_str().is_empty()
    && path.is_absolute()
    && path != project
    && path.starts_with(project)
    && !path.components().any(|part| matches!(part, std::path::Component::ParentDir))
}

fn entry_name(path: &str) -> String {
  Path::new(path)
    .file_name()
    .map(|name| name.to_string_lossy().to_string())
    .unwrap_or_else(|| path.to_string())
}

/// "New Folder" in the file tree. The error is what to tell the user.
fn create_directory(project: &str, directory: &str) -> Result<(), String> {
  if !is_inside_project(project, directory) {
    return Err(format!("{} is not inside the project", directory));
  }
  match fs::create_dir(directory) {
    Ok(()) => Ok(()),
    Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {
      Err(format!("There is already something named {} there", entry_name(directory)))
    }
    Err(error) => Err(format!("Could not create the folder {}: {}", entry_name(directory), error)),
  }
}

/// Moves a file or folder to the Trash.
///
/// Through the file manager itself, not by asking the Finder to do it (the
/// default of the `trash` crate): that needs the user's permission to
/// control the Finder, and waits minutes for an answer that may never come.
fn move_to_trash(path: &Path) -> Result<(), String> {
  use trash::macos::{DeleteMethod, TrashContextExtMacos};
  let mut trash = trash::TrashContext::default();
  trash.set_delete_method(DeleteMethod::NsFileManager);
  trash.delete(path).map_err(|error| error.to_string())
}

/// "Delete" in the file tree: hands each entry to `remove` (which moves it
/// to the Trash). Returns what to tell the user about the ones that were
/// not removed. An entry inside another one that is being removed goes with
/// it.
fn delete_entries(
  project: &str,
  paths: &[String],
  remove: &mut dyn FnMut(&Path) -> Result<(), String>,
) -> Vec<String> {
  let mut problems = vec![];
  let mut removed: Vec<&String> = vec![];
  let mut ordered: Vec<&String> = paths.iter().collect();
  ordered.sort_by_key(|path| path.len());
  for path in ordered {
    if !is_inside_project(project, path) {
      problems.push(format!("{} is not inside the project and was not deleted", path));
      continue;
    }
    if removed.iter().any(|parent| Path::new(path).starts_with(Path::new(parent.as_str()))) {
      continue;
    }
    if fs::symlink_metadata(path).is_err() {
      // already gone
      continue;
    }
    match remove(Path::new(path)) {
      Ok(()) => removed.push(path),
      Err(error) => problems.push(format!("Could not delete {}: {}", entry_name(path), error)),
    }
  }
  problems
}

/// Writes a file the page asked to save, and notes that the page has these
/// contents (so that the watcher does not send them back as a change).
fn save_file(file: &str, contents: &str, known: &KnownContents) -> std::io::Result<()> {
  if file.is_empty() {
    return Err(std::io::Error::new(std::io::ErrorKind::InvalidInput, "no file is open"));
  }
  // Before writing: the watcher may look at the file the moment it changes.
  let before = locked(known).insert(file.to_string(), contents_hash(contents));
  let written = fs::write(file, contents);
  if written.is_err() {
    // what is on disk is not what the page has
    let mut known = locked(known);
    match before {
      Some(hash) => known.insert(file.to_string(), hash),
      None => known.remove(file),
    };
  }
  written
}

/// What the page has of each file it was given: a hash of the contents it
/// loaded, saved, or was last sent. The watcher on the open file compares
/// what is on disk with this, so that the page is only sent what it does not
/// already have. Without it every save came back as a change from outside,
/// and whatever was typed in between was replaced by the saved text.
type KnownContents = Arc<Mutex<HashMap<String, u64>>>;

fn contents_hash(contents: &str) -> u64 {
  use std::hash::{Hash, Hasher};
  let mut hasher = std::collections::hash_map::DefaultHasher::new();
  contents.hash(&mut hasher);
  hasher.finish()
}

/// How long the open file has to be left alone before it is read again.
/// One save by another program is several events (and several states of the
/// file); reading at each of them sent the whole file to the page each time.
const FILE_CHANGE_SETTLE_MS: u64 = 60;

/// What the watcher on the open file tells the page after the file changed.
#[derive(Debug, PartialEq)]
enum FileChange {
  /// It has new contents.
  Changed(String),
  /// It is gone (or is not a file any more).
  Deleted,
  /// It is now too big for the editor.
  TooBig,
  /// It is what the page already has, or could not be read right now.
  Nothing,
}

/// Looks at the open file after something happened to it, and updates what
/// the page is known to have.
fn file_change(path: &str, known: &KnownContents) -> FileChange {
  match load_file_with_cap(path, MAX_FILE_BYTES, MAX_FILE_LINES, MAX_LINE_LENGTH) {
    LoadDecision::Ok(contents) => {
      let hash = contents_hash(&contents);
      let mut known = locked(known);
      if known.get(path) == Some(&hash) {
        FileChange::Nothing
      } else {
        known.insert(path.to_string(), hash);
        FileChange::Changed(contents)
      }
    }
    LoadDecision::NotAFile => FileChange::Deleted,
    LoadDecision::StatError(_) => {
      if Path::new(path).exists() {
        FileChange::Nothing
      } else {
        FileChange::Deleted
      }
    }
    LoadDecision::TooLarge { .. } | LoadDecision::TooManyLines { .. } | LoadDecision::LineTooLong { .. } => {
      // told once, not at every write to a file that stays too big
      if locked(known).remove(path).is_some() {
        FileChange::TooBig
      } else {
        FileChange::Nothing
      }
    }
    LoadDecision::ReadError(_) => FileChange::Nothing,
  }
}

fn build_file_watcher(
  path: &Path,
  workspace_id: String,
  window: WebviewWindow,
  known: KnownContents,
) -> notify::Result<RecommendedWatcher> {
  let watched_path = path.to_path_buf();
  let path_for_callback = watched_path.clone();
  let path_str = watched_path.to_string_lossy().to_string();

  // Dropping the watcher closes touched_tx, which ends this thread.
  let (touched_tx, touched_rx) = mpsc::channel::<()>();
  thread::spawn(move || {
    let settle = std::time::Duration::from_millis(FILE_CHANGE_SETTLE_MS);
    while touched_rx.recv().is_ok() {
      // wait until it is left alone: a save is several events
      loop {
        match touched_rx.recv_timeout(settle) {
          Ok(()) => continue,
          Err(mpsc::RecvTimeoutError::Timeout) => break,
          Err(mpsc::RecvTimeoutError::Disconnected) => return,
        }
      }
      match file_change(&path_str, &known) {
        FileChange::Changed(contents) => {
          let _ = window.emit(
            "externalFileChange",
            serde_json::json!({ "workspaceId": workspace_id, "path": path_str, "contents": contents }),
          );
        }
        FileChange::Deleted => {
          let _ = window.emit(
            "externalFileDelete",
            serde_json::json!({ "workspaceId": workspace_id, "path": path_str }),
          );
        }
        FileChange::TooBig => emit_notification(
          &window,
          "info",
          format!(
            "{} was modified externally but exceeds the editor's caps; keeping the in-memory contents.",
            path_str
          ),
        ),
        FileChange::Nothing => {}
      }
    }
  });

  let mut watcher: RecommendedWatcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
    let event = match res {
      Ok(e) => e,
      Err(e) => {
        eprintln!("file watcher error: {:?}", e);
        return;
      }
    };
    // Whatever happened to it (written in place, replaced by a rename as
    // most programs save, removed): look at the file once it is left alone.
    if event.paths.is_empty() || event.paths.iter().any(|p| p == &path_for_callback) {
      let _ = touched_tx.send(());
    }
  })?;

  watcher.watch(&watched_path, RecursiveMode::NonRecursive)?;
  Ok(watcher)
}

/// Whether a file system event can change what the file tree shows.
///
/// Most events cannot: a file's contents changing (the editor's own saves, a
/// log being written), and anything inside the directories the tree does not
/// go into (`target`, `node_modules`, `.git`). Without this a build made the
/// whole project be walked and sent to the page again and again.
fn changes_the_tree(project: &Path, event: &notify::Event) -> bool {
  use notify::event::{EventKind, ModifyKind};
  let can_add_or_remove = match event.kind {
    EventKind::Create(_) | EventKind::Remove(_) | EventKind::Modify(ModifyKind::Name(_)) => true,
    EventKind::Modify(ModifyKind::Data(_)) | EventKind::Modify(ModifyKind::Metadata(_)) | EventKind::Access(_) => false,
    // not known what happened (or the watcher lost track): look
    EventKind::Modify(_) | EventKind::Any | EventKind::Other => true,
  };
  can_add_or_remove
    && (event.paths.is_empty()
      || event
        .paths
        .iter()
        .any(|path| !filetree::filetree::is_in_skipped_directory(project, path)))
}

/// Build a recursive watcher on the project root. fs events trigger a
/// debounced rebuild of the file tree via `filetree_dir_tx`. Caller
/// stores the watcher in the workspace state; dropping it stops events.
fn build_project_watcher(
  project: &Path,
  filetree_dir_tx: Sender<TreeRequest>,
) -> notify::Result<RecommendedWatcher> {
  let project_path = project.to_path_buf();
  let project_str = project_path.to_string_lossy().to_string();

  // Replacing/dropping the watcher closes dirty_tx, which lets the
  // debounce worker exit on next recv.
  let (dirty_tx, dirty_rx) = mpsc::channel::<()>();

  let project_str_for_worker = project_str.clone();
  thread::spawn(move || {
    let quiet = std::time::Duration::from_millis(PROJECT_REBUILD_DEBOUNCE_MS);
    let longest = std::time::Duration::from_millis(PROJECT_REBUILD_MAX_WAIT_MS);
    while dirty_rx.recv().is_ok() {
      // Wait until the changes have stopped for a moment, but not forever:
      // during a long burst the tree is refreshed once a second.
      let started = std::time::Instant::now();
      loop {
        match dirty_rx.recv_timeout(quiet) {
          Ok(()) if started.elapsed() < longest => continue,
          Ok(()) | Err(mpsc::RecvTimeoutError::Timeout) => break,
          Err(mpsc::RecvTimeoutError::Disconnected) => return,
        }
      }
      if filetree_dir_tx.send(TreeRequest::Refresh(project_str_for_worker.clone())).is_err() {
        break;
      }
    }
  });

  let project_for_events = project_path.clone();
  let mut watcher: RecommendedWatcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
    if let Ok(event) = res {
      if changes_the_tree(&project_for_events, &event) {
        let _ = dirty_tx.send(());
      }
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

/// The terminal bell (BEL): the system alert sound.
#[tauri::command]
fn bell() {
  terminal::bell::ring()
}

/// Diagnostics: with `EDITOR_DOM_DUMP=/some/file` set, the frontend reports
/// what it is showing (the page's DOM) once a second and it is written there.
/// It lets the app be checked from outside without a screenshot.
#[tauri::command]
fn dom_dump(html: Option<String>) -> bool {
  let Some(path) = std::env::var_os("EDITOR_DOM_DUMP") else {
    return false;
  };
  if let Some(html) = html {
    let _ = fs::write(path, html);
  }
  true
}

/// A project to open as soon as the app has started, instead of showing the
/// welcome screen: the folder named by `DEV_DIRECTORY` (see `npm start`).
#[tauri::command]
fn startup_directory() -> Option<String> {
  startup_directory_from(std::env::var("DEV_DIRECTORY").ok())
}

fn startup_directory_from(directory: Option<String>) -> Option<String> {
  let directory = directory?;
  let expanded = match directory.strip_prefix("~/") {
    Some(rest) => home_dir().join(rest),
    None => PathBuf::from(&directory),
  };
  if expanded.is_dir() {
    Some(expanded.to_string_lossy().to_string())
  } else {
    eprintln!("DEV_DIRECTORY is not a directory: {}", directory);
    None
  }
}

#[tauri::command]
fn preflight(state: tauri::State<'_, SharedTools>) -> Report {
  let report = preflight::run(CHECKS);
  let mut tools = locked(&state);
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
    *locked(&tools) = derive_resolved_tools(&report);
  }

  let tools_for_setup = tools.clone();

  tauri::Builder::default()
    .runtime(tauri_runtime_wry::Wry::default())
    .plugin(tauri_plugin_clipboard_manager::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_store::Builder::default().build())
    .manage(tools.clone())
    .manage(Outputs::default())
    .invoke_handler(tauri::generate_handler![
      preflight,
      get_recent_projects,
      bell,
      startup_directory,
      dom_dump,
      next_output
    ])
    .menu(|handle| {
      Menu::with_items(
        handle,
        &[
          // The first menu is the app's own menu on macOS. Quit is an item
          // of ours rather than the predefined one, so that it can ask.
          &Submenu::with_items(
            handle,
            "EditorPro",
            true,
            &[&MenuItem::with_id(handle, QUIT_MENU_ID, "Quit EditorPro", true, Some("CmdOrCtrl+Q"))?],
          )?,
          &Submenu::with_items(
            handle,
            "Edit",
            true,
            &[
              // Required so OSX keyboard shortcuts (cmd+c/v/a) reach the focused webview
              &PredefinedMenuItem::select_all(handle, None)?,
              &PredefinedMenuItem::paste(handle, None)?,
              &PredefinedMenuItem::copy(handle, None)?,
            ],
          )?,
        ],
      )
    })
    .on_menu_event(|app, event| {
      if event.id().as_ref() == QUIT_MENU_ID {
        request_quit(app);
      }
    })
    // The window's close button quits the app, so it asks like Command+Q
    // does: closing it used to end every project and terminal at once.
    .on_window_event(|window, event| {
      if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        api.prevent_close();
        request_quit(window.app_handle());
      }
    })
    .setup(move |app| {
      let app_handle = app.handle().clone();
      let recents = load_recents(&app_handle);
      app.manage(recents.clone());

      let workspaces: Workspaces = Arc::new(Mutex::new(HashMap::new()));
      // also reachable from the menu, which asks before quitting while a project is open
      app.manage(workspaces.clone());

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
  window: WebviewWindow,
  tools: SharedTools,
  recents: SharedRecents,
  app: AppHandle,
  workspaces: Workspaces,
) {
  // One clone per listener — Tauri requires owned `'static` data inside.
  let workspaces_for_initialized = workspaces.clone();
  let workspaces_for_open = workspaces.clone();
  let workspaces_for_close = workspaces.clone();
  let workspaces_for_activate = workspaces.clone();
  let workspaces_for_run = workspaces.clone();
  let workspaces_for_resize = workspaces.clone();
  let workspaces_for_open_term = workspaces.clone();
  let workspaces_for_close_term = workspaces.clone();
  let workspaces_for_create = workspaces.clone();
  let workspaces_for_create_directory = workspaces.clone();
  let workspaces_for_delete = workspaces.clone();
  let window_for_create_directory = window.clone();
  let window_for_delete = window.clone();
  let outputs_for_close_term = window.app_handle().state::<Outputs>().inner().clone();
  let known: KnownContents = Arc::new(Mutex::new(HashMap::new()));
  let known_for_activate = known.clone();
  let known_for_save = known;
  let window_for_save = window.clone();
  let window_for_open_term = window.clone();

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

  // `run` and `resize` look up (workspace, terminal) in the maps and
  // forward to that specific terminal's channels. Registered once.
  listen_safely(&window, "run", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let workspace_id = match v["workspaceId"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };
    let terminal_id = match v["terminalId"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };
    let contents = match v["contents"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };
    if let Some(ws) = locked(&workspaces_for_run).get(&workspace_id) {
      if let Some(slot) = ws.terminals.get(&terminal_id) {
        let _ = slot.run_tx.send(contents);
      }
    }
  });
  listen_safely(&window, "resize", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let workspace_id = match v["workspaceId"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };
    let terminal_id = match v["terminalId"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };
    let size: Size = match serde_json::from_value(v["size"].clone()) {
      Ok(s) => s,
      Err(_) => return,
    };
    if let Some(ws) = locked(&workspaces_for_resize).get(&workspace_id) {
      if let Some(slot) = ws.terminals.get(&terminal_id) {
        let _ = slot.resize_tx.send(size);
      }
    }
  });

  // `initialized` arrives from JS after Elm mounts; tell the workspace's
  // filetree worker to do its first walk.
  listen_safely(&window, "initialized", move |event| {
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
    if let Some(ws) = locked(&workspaces_for_initialized).get(&workspace_id) {
      let _ = ws.filetree_dir_tx.send(TreeRequest::Load(directory));
    }
  });

  // Searches run on threads of their own, one at a time each, and only for
  // the latest request. A search is started for every key typed; run here
  // they would hold up every other handler (keys typed in a terminal, save)
  // for as long as they took, one after the other.
  let search_files = latest_only(move |(workspace_id, directory, name): (String, String, String), is_stale| {
    let resolved = locked(&tools_for_fuzzy).clone();
    if let Some(results) = find_in_project_file_or_directory(&resolved, &directory, &name, is_stale) {
      let _ = window_for_fuzzy_results.emit(
        "receiveFuzzyFindResults",
        serde_json::json!({ "workspaceId": workspace_id, "results": results }),
      );
    }
  });
  let search_projects = latest_only(move |(workspace_id, project): (String, String), is_stale| {
    let resolved = locked(&tools_for_projects).clone();
    let roots = locked(&recents_for_projects).project_search_roots(&home_dir());
    if let Some(results) = find_project(&resolved, &project, &roots, is_stale) {
      let _ = window_for_fuzzy_projects.emit(
        "receiveFuzzyFindResults",
        serde_json::json!({ "workspaceId": workspace_id, "results": results }),
      );
    }
  });

  // Fuzzy-find for files within the active project — workspaceId is used
  // to confirm the right directory is searched (matches the project path).
  listen_safely(&window, "requestFuzzyFindInProjectFileOrDirectory", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let workspace_id = v["workspaceId"].as_str().unwrap_or("").to_string();
    let directory = v["directory"].as_str().unwrap_or("").to_string();
    let name = v["file_or_directory_name"].as_str().unwrap_or("").to_string();

    let _ = search_files.send((workspace_id, directory, name));
  });

  // Fuzzy-find for project directories — used from the welcome screen
  // before any workspace exists, so the workspaceId is empty/unused on
  // its way back to Elm (Elm routes it through the welcome flow).
  listen_safely(&window, "requestFuzzyFindProjects", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let project = v["project"].as_str().unwrap_or("").to_string();
    let workspace_id = v["workspaceId"].as_str().unwrap_or("").to_string();

    let _ = search_projects.send((workspace_id, project));
  });

  // Open a project tab. Add-or-focus: if already open, just emit
  // `initialize` again so Elm switches to that tab on the JS side.
  listen_safely(&window, "requestOpenProject", move |event| {
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

    locked(&recents_for_open).record(&dir);
    save_recents(&app_for_open, &recents_for_open);

    let already_open = locked(&workspaces_for_open).contains_key(&dir);
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

      // Terminals are spawned lazily via `openTerminal` events; the Elm
      // side auto-fires one when the workspace is first created.
      locked(&workspaces_for_open).insert(
        dir.clone(),
        WorkspaceState {
          file_watcher: None,
          project_watcher,
          filetree_dir_tx,
          terminals: HashMap::new(),
        },
      );
    }

    let _ = window_for_open.emit(
      "initialize",
      serde_json::json!({ "workspaceId": dir, "directory": dir }),
    );
  });

  // Open a new terminal session in a workspace. Spawns a PTY in the
  // workspace's project directory and inserts it into the workspace's
  // `terminals` map under the Elm-provided id.
  listen_safely(&window, "openTerminal", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let workspace_id = match v["workspaceId"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };
    let terminal_id = match v["terminalId"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };

    // Resolve the project's directory from the workspace state so we
    // spawn the shell at the right cwd.
    let directory = {
      let workspaces_guard = locked(&workspaces_for_open_term);
      if workspaces_guard.contains_key(&workspace_id) {
        workspace_id.clone()
      } else {
        eprintln!("openTerminal: unknown workspace {}", workspace_id);
        return;
      }
    };

    let new_slot = match spawn_terminal_for_workspace(
      &window_for_open_term,
      workspace_id.clone(),
      terminal_id.clone(),
      directory,
    ) {
      Some(slot) => slot,
      None => return,
    };

    let mut workspaces_guard = locked(&workspaces_for_open_term);
    if let Some(ws) = workspaces_guard.get_mut(&workspace_id) {
      ws.terminals.insert(terminal_id, new_slot);
    }
  });

  // Close one terminal session within a workspace. Dropping the slot
  // reaps the PTY (via terminal-server's kill-watcher).
  listen_safely(&window, "closeTerminal", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let workspace_id = match v["workspaceId"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };
    let terminal_id = match v["terminalId"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };

    let mut workspaces_guard = locked(&workspaces_for_close_term);
    if let Some(ws) = workspaces_guard.get_mut(&workspace_id) {
      ws.terminals.remove(&terminal_id);
    }
    drop(workspaces_guard);
    // also the output of a terminal that never started, which has no slot
    locked(&outputs_for_close_term).remove(&output_key(&workspace_id, &terminal_id));
  });

  // Close a project tab. Dropping the entry tears down its watchers +
  // filetree worker; each terminal in the workspace's `terminals` map
  // is reaped via the same Drop chain.
  listen_safely(&window, "closeWorkspace", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let workspace_id = match v["workspaceId"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };
    let removed = locked(&workspaces_for_close).remove(&workspace_id);
    if removed.is_none() {
      eprintln!("closeWorkspace: unknown workspace id {}", workspace_id);
    }
    // dropping `removed` here closes its channels + watchers + flips is_active
  });

  // Open a file inside a workspace. Replaces that workspace's file
  // watcher with one on the new active file.
  listen_safely(&window, "activateFileOrDirectory", move |event| {
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
        locked(&known_for_activate).insert(filename.clone(), contents_hash(&contents));
        let new_watcher = build_file_watcher(
          Path::new(&filename),
          workspace_id.clone(),
          window_for_activate.clone(),
          known_for_activate.clone(),
        );
        match new_watcher {
          Ok(w) => {
            // The watcher it replaces is dropped after the lock is let go:
            // stopping a watcher waits for its thread.
            let replaced = match locked(&workspaces_for_activate).get_mut(&workspace_id) {
              Some(ws) => ws.file_watcher.replace(w),
              None => None,
            };
            drop(replaced);
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
  listen_safely(&window, "createFile", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let workspace_id = v["workspaceId"].as_str().unwrap_or("").to_string();
    let file = v["file"].as_str().unwrap_or("");

    if metadata(file).is_err() {
      match fs::write(file, "") {
        Ok(_) => {
          // The project's own worker shows the new file in the tree. (This
          // used to build the tree right here, for a directory the page
          // always sent as "": that panicked, and took every handler in the
          // app down with it.)
          if let Some(ws) = locked(&workspaces_for_create).get(&workspace_id) {
            let _ = ws.filetree_dir_tx.send(TreeRequest::Refresh(workspace_id.clone()));
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
          emit_notification(
            &window_for_create_file,
            "error",
            format!("Could not create {}: {}", file, e),
          );
        }
      }
    }
  });

  // "New Folder" in the file tree.
  listen_safely(&window, "createDirectory", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let workspace_id = v["workspaceId"].as_str().unwrap_or("").to_string();
    let directory = v["directory"].as_str().unwrap_or("");
    match create_directory(&workspace_id, directory) {
      Ok(()) => {
        if let Some(ws) = locked(&workspaces_for_create_directory).get(&workspace_id) {
          let _ = ws.filetree_dir_tx.send(TreeRequest::Refresh(workspace_id.clone()));
        }
      }
      Err(reason) => emit_notification(&window_for_create_directory, "error", reason),
    }
  });

  // "Delete" in the file tree: to the Trash, where it can be got back from.
  listen_safely(&window, "deleteFilesAndDirectories", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let workspace_id = v["workspaceId"].as_str().unwrap_or("").to_string();
    let paths: Vec<String> = v["paths"]
      .as_array()
      .map(|paths| paths.iter().filter_map(|path| path.as_str().map(|path| path.to_string())).collect())
      .unwrap_or_default();
    for reason in delete_entries(&workspace_id, &paths, &mut move_to_trash) {
      emit_notification(&window_for_delete, "error", reason);
    }
    if let Some(ws) = locked(&workspaces_for_delete).get(&workspace_id) {
      let _ = ws.filetree_dir_tx.send(TreeRequest::Refresh(workspace_id.clone()));
    }
  });

  // Save is workspace-independent — file path + contents is enough.
  listen_safely(&window, "save", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let file = v["file"].as_str().unwrap_or("");
    let contents = v["contents"].as_str().unwrap_or("");
    match save_file(file, contents, &known_for_save) {
      Ok(()) => {}
      // Said out loud: a save that silently did nothing is found out when
      // the work is already gone.
      Err(e) => emit_notification(&window_for_save, "error", format!("Could not save {}: {}", file, e)),
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

    locked(&recents).record(&canonical);
    save_recents(&app, &recents);

    let filetree_dir_tx = spawn_filetree_worker_for_workspace(&window, canonical.clone());
    let project_watcher = match build_project_watcher(Path::new(&canonical), filetree_dir_tx.clone()) {
      Ok(w) => Some(w),
      Err(e) => {
        eprintln!("failed to install project watcher for {}: {:?}", canonical, e);
        None
      }
    };

    locked(&workspaces).insert(
      canonical.clone(),
      WorkspaceState {
        file_watcher: None,
        project_watcher,
        filetree_dir_tx,
        terminals: HashMap::new(),
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

/// Spawn one PTY for a given (workspace, terminal) pair. Output/resize
/// events both carry `workspaceId` AND `terminalId` so Elm can route to
/// the specific terminal model regardless of which is active.
fn spawn_terminal_for_workspace(
  window: &WebviewWindow,
  workspace_id: String,
  terminal_id: String,
  directory: String,
) -> Option<TerminalSlot> {
  let window_terminal_resize = window.clone();
  let outputs = window.app_handle().state::<Outputs>().inner().clone();
  let key = output_key(&workspace_id, &terminal_id);
  let ws_for_resize = workspace_id;
  let term_for_resize = terminal_id;

  let (terminal_output_tx, terminal_output_rx) = mpsc::channel::<Batch>();
  let (terminal_resize_tx, terminal_resize_rx) = mpsc::channel::<Size>();

  // `None` when no shell could be started: the terminal's output then says
  // why, instead of the failure taking every other terminal down with it.
  let terminal_api = match terminal::terminal::start(directory, terminal_output_tx, terminal_resize_tx) {
    Ok(api) => api,
    Err(error) => {
      locked(&outputs).insert(key, Arc::new(Output::of_failure(&error)));
      return None;
    }
  };
  let is_active = Arc::new(AtomicBool::new(true));
  let output_registration = OutputRegistration::new(
    &outputs,
    key,
    Output::new(terminal_output_rx, terminal_api.flow.clone()),
  );

  let is_active_for_resize = is_active.clone();
  thread::spawn(move || {
    for message in terminal_resize_rx {
      if is_active_for_resize.load(Ordering::Relaxed) {
        let _ = window_terminal_resize.emit(
          "sendResizedToTerminal",
          serde_json::json!({
            "workspaceId": ws_for_resize,
            "terminalId": term_for_resize,
            "size": message,
          }),
        );
      }
    }
  });

  Some(TerminalSlot {
    run_tx: terminal_api.run_tx,
    resize_tx: terminal_api.resize_tx,
    is_active,
    _kill_tx: terminal_api.kill_tx,
    _output: output_registration,
  })
}

/// Spawn a per-workspace filetree worker. Returns the sender used to
/// trigger rebuilds; dropping the sender (via WorkspaceState being
/// dropped from the map) closes the worker channels and lets all threads
/// exit cleanly. Output trees are stamped with `workspaceId`.
fn spawn_filetree_worker_for_workspace(
  window: &WebviewWindow,
  workspace_id: String,
) -> Sender<TreeRequest> {
  let (ft_tx, ft_rx) = mpsc::channel::<FileTreeAndFlat>();
  let (dir_tx, dir_rx) = mpsc::channel::<TreeRequest>();

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

/// The longest a search may run. One that is still going after this (a
/// mount that stopped answering) is killed.
const SEARCH_LIMIT: std::time::Duration = std::time::Duration::from_secs(10);

/// Runs jobs one at a time on a thread of their own, and only the latest:
/// a job that is still waiting when a newer one arrives is dropped, and the
/// one that is running is told (through the function it is given) that
/// nobody is waiting for its answer any more.
fn latest_only<Job: Send + 'static>(
  mut run: impl FnMut(Job, &mut dyn FnMut() -> bool) + Send + 'static,
) -> Sender<Job> {
  let (jobs_tx, jobs_rx) = mpsc::channel::<Job>();
  thread::spawn(move || {
    let mut waiting: Option<Job> = None;
    loop {
      let mut job = match waiting.take() {
        Some(job) => job,
        None => match jobs_rx.recv() {
          Ok(job) => job,
          Err(_) => return,
        },
      };
      while let Ok(newer) = jobs_rx.try_recv() {
        job = newer;
      }

      let mut is_stale = || {
        if waiting.is_none() {
          waiting = jobs_rx.try_recv().ok();
        }
        waiting.is_some()
      };
      // a job that goes wrong must not be the last one that runs
      let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| run(job, &mut is_stale)));
    }
  });
  jobs_tx
}

/// Runs a command to its end and returns what it printed. `None` when it
/// was killed instead: because `is_stale` said nobody is waiting for the
/// answer any more, or because it ran longer than `limit`.
fn run_cancellable(
  mut command: Command,
  is_stale: &mut dyn FnMut() -> bool,
  limit: std::time::Duration,
) -> Option<String> {
  use std::io::Read;
  use std::process::Stdio;

  let mut child = command
    .stdin(Stdio::null())
    .stdout(Stdio::piped())
    .stderr(Stdio::null())
    .spawn()
    .ok()?;
  let mut stdout = child.stdout.take()?;
  // read as it prints, or it would block on a full pipe
  let reader = thread::spawn(move || {
    let mut printed = Vec::new();
    let _ = stdout.read_to_end(&mut printed);
    printed
  });

  let started = std::time::Instant::now();
  let finished = loop {
    match child.try_wait() {
      Ok(Some(_)) => break true,
      Ok(None) => {}
      Err(_) => break false,
    }
    if is_stale() || started.elapsed() > limit {
      let _ = child.kill();
      let _ = child.wait();
      break false;
    }
    thread::sleep(std::time::Duration::from_millis(5));
  };

  let printed = reader.join().ok()?;
  if finished {
    Some(String::from_utf8_lossy(&printed).to_string())
  } else {
    None
  }
}

/// `None` when the search was given up (see `run_cancellable`).
fn find_in_project_file_or_directory(
  tools: &ResolvedTools,
  directory: &str,
  file_or_directory_name: &str,
  is_stale: &mut dyn FnMut() -> bool,
) -> Option<Vec<String>> {
  let Some(fd) = tools.fd.as_ref() else {
    eprintln!("fd not resolved; preflight should have blocked startup");
    return Some(vec![]);
  };

  if directory.is_empty() {
    return Some(vec![]);
  }

  let mut command = Command::new(fd);
  command.args([
    "*".to_owned() + file_or_directory_name + "*",
    directory.to_string(),
    "--hidden".to_string(),
    "--glob".to_string(),
    "--exclude=.git".to_string(),
    // fd stops there by itself, instead of listing a huge project in full
    // for the rest to be thrown away
    format!("--max-results={}", MAX_FUZZY_RESULTS),
  ]);

  let printed = run_cancellable(command, is_stale, SEARCH_LIMIT)?;
  Some(printed.lines().take(MAX_FUZZY_RESULTS).map(|s| s.to_string()).collect())
}

/// `None` when the search was given up (see `run_cancellable`).
fn find_project(
  tools: &ResolvedTools,
  project_name: &str,
  search_roots: &[PathBuf],
  is_stale: &mut dyn FnMut() -> bool,
) -> Option<Vec<String>> {
  let Some(fd) = tools.fd.as_ref() else {
    eprintln!("fd not resolved; preflight should have blocked startup");
    return Some(vec![]);
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
    let mut command = Command::new(fd);
    command.args(["--type=d", "--max-depth=1", "-L", &pattern, root_str]);

    let printed = run_cancellable(command, is_stale, SEARCH_LIMIT)?;
    results.extend(printed.lines().map(|s| s.to_string()));
    if results.len() >= MAX_FUZZY_RESULTS {
      break;
    }
  }

  // Dedupe while preserving order (different roots can yield the same
  // canonical project via symlinks)
  let mut seen = std::collections::HashSet::new();
  results.retain(|p| seen.insert(p.clone()));
  results.truncate(MAX_FUZZY_RESULTS);
  Some(results)
}

#[cfg(test)]
mod tests {
  use super::*;

  type Mock = tauri::test::MockRuntime;

  fn mock_window() -> (tauri::App<Mock>, WebviewWindow<Mock>) {
    let app = tauri::test::mock_app();
    let window = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
      .build()
      .unwrap();
    (app, window)
  }

  #[test]
  fn a_handler_that_panics_does_not_stop_the_events_that_come_after_it() {
    use std::sync::atomic::AtomicUsize;
    let (app, window) = mock_window();

    let saves = Arc::new(AtomicUsize::new(0));
    let saves_for_handler = saves.clone();
    listen_safely(&window, "save", move |_| {
      saves_for_handler.fetch_add(1, Ordering::SeqCst);
    });
    listen_safely(&window, "createFile", |_| panic!("a handler went wrong"));

    app.emit("save", ()).unwrap();
    app.emit("createFile", ()).unwrap();

    // every event after the panic used to be queued and never delivered
    for _ in 0..5 {
      app.emit("save", ()).unwrap();
    }
    assert_eq!(saves.load(Ordering::SeqCst), 6);
  }

  #[test]
  fn a_lock_stays_usable_after_a_thread_panicked_while_holding_it() {
    let map: Arc<Mutex<HashMap<String, u32>>> = Arc::new(Mutex::new(HashMap::new()));
    locked(&map).insert("open".to_string(), 1);

    let for_panic = map.clone();
    let _ = thread::spawn(move || {
      let _guard = locked(&for_panic);
      panic!("while holding the lock");
    })
    .join();

    assert!(map.is_poisoned());
    assert_eq!(locked(&map).get("open"), Some(&1));
  }

  #[test]
  fn only_what_is_inside_a_project_may_be_created_or_deleted_for_it() {
    assert!(is_inside_project("/work/app", "/work/app/src"));
    assert!(is_inside_project("/work/app", "/work/app/src/deep/file.rs"));

    // the project itself, its parent, a neighbour with a longer name
    assert!(!is_inside_project("/work/app", "/work/app"));
    assert!(!is_inside_project("/work/app", "/work"));
    assert!(!is_inside_project("/work/app", "/work/app-two/file"));
    // out again by way of ..
    assert!(!is_inside_project("/work/app", "/work/app/../other/file"));
    // anything else
    assert!(!is_inside_project("/work/app", "/etc/hosts"));
    assert!(!is_inside_project("/work/app", "relative/path"));
    assert!(!is_inside_project("/work/app", ""));
    assert!(!is_inside_project("", "/work/app/src"));
  }

  fn scratch_project(name: &str) -> String {
    let directory = std::env::temp_dir().join(format!("editor-pro-project-{}-{}", name, std::process::id()));
    let _ = fs::remove_dir_all(&directory);
    fs::create_dir_all(&directory).unwrap();
    fs::canonicalize(directory).unwrap().to_string_lossy().to_string()
  }

  #[test]
  fn a_new_folder_is_made_inside_the_project() {
    let project = scratch_project("new-folder");
    let folder = format!("{}/components", project);
    assert_eq!(create_directory(&project, &folder), Ok(()));
    assert!(Path::new(&folder).is_dir());

    // a second time: said, not overwritten
    fs::write(format!("{}/kept.txt", folder), "kept").unwrap();
    let again = create_directory(&project, &folder).unwrap_err();
    assert!(again.contains("already"), "{}", again);
    assert!(Path::new(&format!("{}/kept.txt", folder)).exists());

    // not outside the project, and not where the folder above it is missing
    assert!(create_directory(&project, "/tmp/editor-pro-elsewhere").is_err());
    assert!(!Path::new("/tmp/editor-pro-elsewhere").exists());
    assert!(create_directory(&project, &format!("{}/missing/child", project)).is_err());
  }

  #[test]
  fn deleting_removes_what_was_chosen_and_nothing_else() {
    let project = scratch_project("delete");
    fs::create_dir_all(format!("{}/src/inner", project)).unwrap();
    fs::write(format!("{}/src/inner/a.rs", project), "").unwrap();
    fs::write(format!("{}/src/b.rs", project), "").unwrap();
    fs::write(format!("{}/keep.txt", project), "").unwrap();
    let outside = scratch_file("outside-the-project");
    fs::write(&outside, "not ours").unwrap();

    let mut removed: Vec<String> = vec![];
    let chosen = vec![
      format!("{}/src/inner/a.rs", project),
      format!("{}/src", project),
      outside.clone(),
      project.clone(),
      format!("{}/never-existed", project),
    ];
    let problems = delete_entries(&project, &chosen, &mut |path| {
      removed.push(path.to_string_lossy().to_string());
      fs::remove_dir_all(path).or_else(|_| fs::remove_file(path)).map_err(|error| error.to_string())
    });

    // the folder once (what is inside it goes with it), nothing outside, not the project itself
    assert_eq!(removed, vec![format!("{}/src", project)]);
    assert!(!Path::new(&format!("{}/src", project)).exists());
    assert!(Path::new(&format!("{}/keep.txt", project)).exists());
    assert!(Path::new(&outside).exists());
    assert!(Path::new(&project).exists());
    assert_eq!(problems.len(), 2, "{:?}", problems);
    assert!(problems.iter().all(|problem| problem.contains("not inside the project")));
  }

  /// Moves a real file to the real Trash, so it is not run with the rest:
  /// `cargo test -- --ignored the_trash`.
  #[test]
  #[ignore]
  fn the_trash_takes_a_file_and_a_folder() {
    let project = scratch_project("trash");
    let file = format!("{}/editor-pro-trash-test.txt", project);
    let folder = format!("{}/editor-pro-trash-test-folder", project);
    fs::write(&file, "to the trash").unwrap();
    fs::create_dir_all(format!("{}/inner", folder)).unwrap();
    fs::write(format!("{}/inner/file.txt", folder), "").unwrap();

    let started = std::time::Instant::now();
    let problems = delete_entries(&project, &[file.clone(), folder.clone()], &mut move_to_trash);
    assert!(started.elapsed() < std::time::Duration::from_secs(10), "it took {:?}", started.elapsed());
    assert_eq!(problems, Vec::<String>::new());
    assert!(!Path::new(&file).exists());
    assert!(!Path::new(&folder).exists());
    assert!(Path::new(&project).exists());
  }

  #[test]
  fn what_could_not_be_deleted_is_said() {
    let project = scratch_project("delete-fails");
    fs::write(format!("{}/locked.txt", project), "").unwrap();
    let problems = delete_entries(&project, &[format!("{}/locked.txt", project)], &mut |_| Err("it is in use".to_string()));
    assert_eq!(problems, vec!["Could not delete locked.txt: it is in use".to_string()]);
  }

  fn scratch_file(name: &str) -> String {
    let directory = std::env::temp_dir().join(format!("editor-pro-{}-{}", name, std::process::id()));
    let _ = fs::remove_dir_all(&directory);
    fs::create_dir_all(&directory).unwrap();
    directory.join("file.txt").to_string_lossy().to_string()
  }

  fn known() -> KnownContents {
    Arc::new(Mutex::new(HashMap::new()))
  }

  #[test]
  fn the_editors_own_save_is_not_sent_back_as_a_change_from_outside() {
    // it used to be: whatever was typed between the save and its echo was
    // replaced by the saved text
    let file = scratch_file("own-save");
    let known = known();
    fs::write(&file, "opened").unwrap();
    locked(&known).insert(file.clone(), contents_hash("opened"));

    save_file(&file, "typed and saved", &known).unwrap();
    assert_eq!(fs::read_to_string(&file).unwrap(), "typed and saved");
    assert_eq!(file_change(&file, &known), FileChange::Nothing);
  }

  #[test]
  fn a_change_from_outside_is_sent_once() {
    let file = scratch_file("outside-change");
    let known = known();
    fs::write(&file, "opened").unwrap();
    locked(&known).insert(file.clone(), contents_hash("opened"));

    fs::write(&file, "changed by another program").unwrap();
    assert_eq!(file_change(&file, &known), FileChange::Changed("changed by another program".to_string()));
    // more events for the same save
    assert_eq!(file_change(&file, &known), FileChange::Nothing);
  }

  #[test]
  fn a_file_replaced_by_a_rename_is_noticed() {
    // how most programs save: write next to it, rename over it
    let file = scratch_file("replaced");
    let known = known();
    fs::write(&file, "opened").unwrap();
    locked(&known).insert(file.clone(), contents_hash("opened"));

    let next_to_it = format!("{}.tmp", file);
    fs::write(&next_to_it, "formatted").unwrap();
    fs::rename(&next_to_it, &file).unwrap();
    assert_eq!(file_change(&file, &known), FileChange::Changed("formatted".to_string()));
  }

  #[test]
  fn a_file_that_is_removed_is_reported_as_gone() {
    let file = scratch_file("removed");
    let known = known();
    fs::write(&file, "opened").unwrap();
    locked(&known).insert(file.clone(), contents_hash("opened"));

    fs::remove_file(&file).unwrap();
    assert_eq!(file_change(&file, &known), FileChange::Deleted);
  }

  #[test]
  fn a_file_that_grows_too_big_is_said_once() {
    let file = scratch_file("too-big");
    let known = known();
    fs::write(&file, "opened").unwrap();
    locked(&known).insert(file.clone(), contents_hash("opened"));

    fs::write(&file, "x".repeat(MAX_LINE_LENGTH + 1)).unwrap();
    assert_eq!(file_change(&file, &known), FileChange::TooBig);
    // a log that keeps being written
    fs::write(&file, "y".repeat(MAX_LINE_LENGTH + 2)).unwrap();
    assert_eq!(file_change(&file, &known), FileChange::Nothing);
    // and when it is small again, the page gets it
    fs::write(&file, "small again").unwrap();
    assert_eq!(file_change(&file, &known), FileChange::Changed("small again".to_string()));
  }

  #[test]
  fn a_save_that_fails_is_an_error_and_is_not_taken_for_saved() {
    let known = known();
    let nowhere = "/nonexistent-directory/for/editor-pro/file.txt";
    assert!(save_file(nowhere, "work", &known).is_err());
    assert!(locked(&known).get(nowhere).is_none());

    // nothing open
    assert!(save_file("", "work", &known).is_err());

    // a file that may not be written
    use std::os::unix::fs::PermissionsExt;
    let file = scratch_file("read-only");
    fs::write(&file, "on disk").unwrap();
    locked(&known).insert(file.clone(), contents_hash("on disk"));
    fs::set_permissions(&file, fs::Permissions::from_mode(0o444)).unwrap();
    assert!(save_file(&file, "edited", &known).is_err());
    // what the page is taken to have is still what is on disk
    assert_eq!(locked(&known).get(&file), Some(&contents_hash("on disk")));
    assert_eq!(fs::read_to_string(&file).unwrap(), "on disk");
  }

  fn shell(script: &str) -> Command {
    let mut command = Command::new("/bin/sh");
    command.args(["-c", script]);
    command
  }

  #[test]
  fn a_command_runs_to_its_end_and_what_it_printed_comes_back() {
    let printed = run_cancellable(shell("echo one; echo two"), &mut || false, std::time::Duration::from_secs(5));
    assert_eq!(printed, Some("one\ntwo\n".to_string()));
  }

  #[test]
  fn a_command_that_prints_more_than_a_pipe_holds_does_not_block() {
    let printed = run_cancellable(shell("head -c 2000000 /dev/zero | tr '\\0' x"), &mut || false, std::time::Duration::from_secs(10));
    assert_eq!(printed.map(|printed| printed.len()), Some(2_000_000));
  }

  #[test]
  fn a_command_nobody_waits_for_any_more_is_killed() {
    let started = std::time::Instant::now();
    let mut asked = 0;
    let printed = run_cancellable(
      shell("sleep 30"),
      &mut || {
        asked += 1;
        asked > 10
      },
      std::time::Duration::from_secs(60),
    );
    assert_eq!(printed, None);
    assert!(started.elapsed() < std::time::Duration::from_secs(5), "it was left running for {:?}", started.elapsed());
  }

  #[test]
  fn a_command_that_hangs_is_killed_when_its_time_is_up() {
    let started = std::time::Instant::now();
    let printed = run_cancellable(shell("sleep 30"), &mut || false, std::time::Duration::from_millis(300));
    assert_eq!(printed, None);
    assert!(started.elapsed() < std::time::Duration::from_secs(5));
  }

  #[test]
  fn only_the_latest_job_runs_when_they_arrive_faster_than_they_finish() {
    // a search for every key typed, each taking longer than the typing
    let ran = Arc::new(Mutex::new(Vec::<u32>::new()));
    let ran_for_jobs = ran.clone();
    let jobs = latest_only(move |job: u32, is_stale| {
      for _ in 0..40 {
        if is_stale() {
          return;
        }
        thread::sleep(std::time::Duration::from_millis(5));
      }
      locked(&ran_for_jobs).push(job);
    });

    for job in 1..=20 {
      jobs.send(job).unwrap();
      thread::sleep(std::time::Duration::from_millis(10));
    }
    thread::sleep(std::time::Duration::from_millis(600));

    let ran = locked(&ran).clone();
    assert_eq!(ran.last(), Some(&20), "the last request was not answered");
    assert!(ran.len() <= 3, "{} of 20 jobs ran to the end: {:?}", ran.len(), ran);
  }

  #[test]
  fn a_job_that_panics_is_not_the_last_one_that_runs() {
    let ran = Arc::new(Mutex::new(Vec::<u32>::new()));
    let ran_for_jobs = ran.clone();
    let jobs = latest_only(move |job: u32, _is_stale| {
      if job == 1 {
        panic!("a search went wrong");
      }
      locked(&ran_for_jobs).push(job);
    });

    jobs.send(1).unwrap();
    thread::sleep(std::time::Duration::from_millis(200));
    jobs.send(2).unwrap();
    thread::sleep(std::time::Duration::from_millis(200));
    assert_eq!(locked(&ran).clone(), vec![2]);
  }

  #[test]
  fn searching_a_project_finds_files_and_stops_at_the_cap() {
    let Some(fd) = ["/opt/homebrew/bin/fd", "/usr/local/bin/fd", "/usr/bin/fd"].iter().find(|path| Path::new(path).exists()) else {
      eprintln!("fd is not installed here; skipped");
      return;
    };
    let tools = ResolvedTools { fd: Some(fd.to_string()) };
    let project = std::env::temp_dir().join(format!("editor-pro-search-{}", std::process::id()));
    let _ = fs::remove_dir_all(&project);
    fs::create_dir_all(project.join("src")).unwrap();
    for name in ["main.rs", "parser.rs", "notes.txt"] {
      fs::write(project.join("src").join(name), "").unwrap();
    }

    let directory = project.to_string_lossy().to_string();
    let found = find_in_project_file_or_directory(&tools, &directory, "pars", &mut || false).unwrap();
    assert_eq!(found.len(), 1);
    assert!(found[0].ends_with("src/parser.rs"));

    // given up as soon as nobody waits for it
    assert_eq!(find_in_project_file_or_directory(&tools, &directory, "", &mut || true), None);

    let _ = fs::remove_dir_all(&project);
  }

  fn event(kind: notify::EventKind, path: &str) -> notify::Event {
    notify::Event::new(kind).add_path(PathBuf::from(path))
  }

  #[test]
  fn only_changes_that_can_alter_the_tree_refresh_it() {
    use notify::event::{AccessKind, CreateKind, DataChange, EventKind, MetadataKind, ModifyKind, RemoveKind, RenameMode};
    let project = Path::new("/project");

    // files and folders coming and going
    assert!(changes_the_tree(project, &event(EventKind::Create(CreateKind::File), "/project/src/new.rs")));
    assert!(changes_the_tree(project, &event(EventKind::Remove(RemoveKind::File), "/project/src/old.rs")));
    assert!(changes_the_tree(project, &event(EventKind::Modify(ModifyKind::Name(RenameMode::Any)), "/project/src/a.rs")));

    // a file being written: the editor's own saves, a log that keeps growing
    assert!(!changes_the_tree(project, &event(EventKind::Modify(ModifyKind::Data(DataChange::Any)), "/project/src/a.rs")));
    assert!(!changes_the_tree(project, &event(EventKind::Modify(ModifyKind::Metadata(MetadataKind::Any)), "/project/src/a.rs")));
    assert!(!changes_the_tree(project, &event(EventKind::Access(AccessKind::Any), "/project/src/a.rs")));

    // a build: thousands of files created where the tree does not look
    assert!(!changes_the_tree(project, &event(EventKind::Create(CreateKind::File), "/project/target/debug/deps/app.o")));
    assert!(!changes_the_tree(project, &event(EventKind::Remove(RemoveKind::File), "/project/node_modules/pkg/index.js")));
    assert!(!changes_the_tree(project, &event(EventKind::Create(CreateKind::File), "/project/.git/index.lock")));
    // ...but that folder itself appearing is a row in the tree
    assert!(changes_the_tree(project, &event(EventKind::Create(CreateKind::Folder), "/project/target")));

    // the watcher does not know what happened: look
    assert!(changes_the_tree(project, &event(EventKind::Other, "/project")));
    assert!(changes_the_tree(project, &notify::Event::new(EventKind::Any)));
  }

  #[test]
  fn quitting_is_confirmed_only_while_a_project_is_open() {
    assert!(!quit_needs_confirmation(0));
    assert!(quit_needs_confirmation(1));
    assert!(quit_needs_confirmation(3));
  }

  #[test]
  fn counting_open_projects_never_waits_for_the_list() {
    let workspaces: Workspaces = Arc::new(Mutex::new(HashMap::new()));
    assert_eq!(open_projects(&workspaces), 0);

    // in use by something else: quitting does not wait, it asks
    let held = locked(&workspaces);
    assert!(quit_needs_confirmation(open_projects(&workspaces)));
    drop(held);

    // left poisoned by a thread that panicked while holding it: still answers
    let for_panic = workspaces.clone();
    let _ = thread::spawn(move || {
      let _guard = locked(&for_panic);
      panic!("poison the list");
    })
    .join();
    assert!(workspaces.is_poisoned());
    assert_eq!(open_projects(&workspaces), 0);
  }

  #[test]
  fn find_in_project_returns_empty_when_fd_unresolved() {
    let tools = ResolvedTools { fd: None };
    let result = find_in_project_file_or_directory(&tools, "/tmp", "foo", &mut || false);
    assert_eq!(result, Some(vec![]));
  }

  #[test]
  fn find_in_project_returns_empty_for_empty_directory() {
    let tools = ResolvedTools {
      fd: Some("/opt/homebrew/bin/fd".to_string()),
    };
    let result = find_in_project_file_or_directory(&tools, "", "foo", &mut || false);
    assert_eq!(result, Some(vec![]));
  }

  #[test]
  fn find_project_returns_empty_when_fd_unresolved() {
    let tools = ResolvedTools { fd: None };
    let roots = vec![PathBuf::from("/tmp")];
    let result = find_project(&tools, "some-project", &roots, &mut || false);
    assert_eq!(result, Some(vec![]));
  }

  #[test]
  fn startup_directory_is_only_used_when_it_exists() {
    let existing = std::env::temp_dir();
    assert_eq!(
      startup_directory_from(Some(existing.to_string_lossy().to_string())),
      Some(existing.to_string_lossy().to_string())
    );
    assert_eq!(startup_directory_from(Some("/no/such/directory/anywhere".to_string())), None);
    assert_eq!(startup_directory_from(None), None);
  }

  #[test]
  fn startup_directory_expands_the_home_directory() {
    assert_eq!(
      startup_directory_from(Some("~/".to_string())),
      Some(home_dir().join("").to_string_lossy().to_string())
    );
  }

  #[test]
  fn find_project_returns_empty_with_no_search_roots() {
    let tools = ResolvedTools {
      fd: Some("/opt/homebrew/bin/fd".to_string()),
    };
    let result = find_project(&tools, "anything", &[], &mut || false);
    assert_eq!(result, Some(vec![]));
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
