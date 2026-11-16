use preflight::{Check, ProbeOutcome, Report};
use serde_json::{self, Value};
use std::{
  collections::HashMap,
  sync::{
    atomic::{AtomicBool, Ordering},
    mpsc::{self, Sender},
    Arc, Mutex,
  },
  thread,
};
use tauri::{Emitter, Listener, Manager, WebviewWindow};
use terminal::terminal::{Batch, Next, Output, Size};

fn nerd_font_probe() -> ProbeOutcome {
  preflight::probe_font("NerdFontMono")
}

const CHECKS: &[Check] = &[Check {
  id: "jetbrains-nerd-font",
  label: "JetBrains Mono Nerd Font",
  probe: nerd_font_probe,
  install_commands: &["brew install --cask font-jetbrains-mono-nerd-font"],
  docs_url: Some("https://www.nerdfonts.com/"),
}];

#[tauri::command]
fn preflight() -> Report {
  preflight::run(CHECKS)
}

/// The terminal bell (BEL): the system alert sound.
#[tauri::command]
fn bell() {
  terminal::bell::ring()
}

/// One PTY session. `is_active` flips to false on close so any in-flight
/// emits are silenced before the bridge thread observes channel hangup.
/// `_kill_tx` dropping triggers terminal-server's kill-watcher to reap
/// the child shell.
struct TerminalSlot {
  run_tx: Sender<String>,
  resize_tx: Sender<Size>,
  is_active: Arc<AtomicBool>,
  _kill_tx: Sender<()>,
}

type Terminals = Arc<Mutex<HashMap<String, TerminalSlot>>>;

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
/// page is queued and never delivered: keys typed in any terminal silently
/// do nothing for the rest of the session, while the queue grows.
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

/// The output of every open terminal, by terminal id, waiting for the page
/// to ask for it. Kept apart from the terminals themselves so that handing
/// out output never waits on anything else the app is doing.
type Outputs = Arc<Mutex<HashMap<String, Arc<Output>>>>;

/// How long a request for output waits when nothing is being printed,
/// before it is answered with "nothing yet" and asked again. (A request
/// that stays open for a minute is given up by the web view.)
const OUTPUT_WAIT: std::time::Duration = std::time::Duration::from_secs(15);

/// The page asks for a terminal's next batch of output, and says which one
/// it has taken. See `terminal::terminal::Output` for why it asks instead
/// of being sent it.
#[tauri::command(async)]
fn next_output(terminal_id: String, acknowledged: u64, outputs: tauri::State<Outputs>) -> Value {
  let output = locked(&outputs).get(&terminal_id).cloned();
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

fn main() {
  tauri::Builder::default()
    .runtime(tauri_runtime_wry::Wry::default())
    .plugin(tauri_plugin_clipboard_manager::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_notification::init())
    .manage(Outputs::default())
    .invoke_handler(tauri::generate_handler![preflight, bell, next_output])
    .setup(|app| {
      let window = app.get_webview_window("main").unwrap();
      let home = std::env::var("HOME").unwrap_or_else(|_| "/".to_string());
      let terminals: Terminals = Arc::new(Mutex::new(HashMap::new()));
      // Listeners must be live before Elm's first `requestOpenTerminal`
      // fires at init time. Registering here (not on frontend-ready)
      // guarantees the event isn't lost if JS races ahead.
      let outputs = app.state::<Outputs>().inner().clone();
      bootstrap(window, terminals, outputs, home);
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("failed to run app");
}

fn bootstrap(window: WebviewWindow, terminals: Terminals, outputs: Outputs, home: String) {
  let outputs_for_open = outputs.clone();
  let outputs_for_close = outputs;
  let terminals_for_open = terminals.clone();
  let terminals_for_close = terminals.clone();
  let terminals_for_run = terminals.clone();
  let terminals_for_resize = terminals.clone();
  let window_for_open = window.clone();

  // Elm fires `openTerminal` on init (for the first tab) and on user
  // intent (`+` button). Spawns a PTY and inserts it in the map.
  listen_safely(&window, "openTerminal", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let terminal_id = match v["terminalId"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };
    let cwd = v["cwd"]
      .as_str()
      .map(|s| s.to_string())
      .filter(|s| !s.is_empty())
      .unwrap_or_else(|| home.clone());

    let (slot, output) = spawn_terminal(&window_for_open, terminal_id.clone(), cwd);
    locked(&outputs_for_open).insert(terminal_id.clone(), Arc::new(output));
    if let Some(slot) = slot {
      locked(&terminals_for_open).insert(terminal_id, slot);
    }
  });

  // Close one tab. Dropping the slot flips is_active off and drops
  // kill_tx, which reaps the PTY.
  listen_safely(&window, "closeTerminal", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let terminal_id = match v["terminalId"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };
    locked(&outputs_for_close).remove(&terminal_id);
    if let Some(slot) = locked(&terminals_for_close).remove(&terminal_id) {
      slot.is_active.store(false, Ordering::Relaxed);
      // drop(slot) here closes kill_tx + channels
    }
  });

  listen_safely(&window, "run", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let terminal_id = match v["terminalId"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };
    let contents = match v["contents"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };
    if let Some(slot) = locked(&terminals_for_run).get(&terminal_id) {
      let _ = slot.run_tx.send(contents);
    }
  });

  listen_safely(&window, "resize", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let terminal_id = match v["terminalId"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };
    let size: Size = match serde_json::from_value(v["size"].clone()) {
      Ok(s) => s,
      Err(_) => return,
    };
    if let Some(slot) = locked(&terminals_for_resize).get(&terminal_id) {
      let _ = slot.resize_tx.send(size);
    }
  });
}

/// Spawn a PTY for the given terminal id. Its output waits to be asked for
/// (`next_output`); resize events carry the id so Elm can route them to the
/// matching tab.
///
/// No slot when no shell could be started: the output then says why,
/// instead of the failure taking every other terminal down with it.
fn spawn_terminal(window: &WebviewWindow, terminal_id: String, directory: String) -> (Option<TerminalSlot>, Output) {
  let window_terminal_resize = window.clone();
  let term_for_resize = terminal_id;

  let (terminal_output_tx, terminal_output_rx) = mpsc::channel::<Batch>();
  let (terminal_resize_tx, terminal_resize_rx) = mpsc::channel::<Size>();

  let terminal_api = match terminal::terminal::start(directory, terminal_output_tx, terminal_resize_tx) {
    Ok(api) => api,
    Err(error) => return (None, Output::of_failure(&error)),
  };
  let is_active = Arc::new(AtomicBool::new(true));

  let is_active_for_resize = is_active.clone();
  thread::spawn(move || {
    for message in terminal_resize_rx {
      if is_active_for_resize.load(Ordering::Relaxed) {
        let _ = window_terminal_resize.emit(
          "sendResizedToTerminal",
          serde_json::json!({
            "terminalId": term_for_resize,
            "size": message,
          }),
        );
      }
    }
  });

  let output = Output::new(terminal_output_rx, terminal_api.flow.clone());
  (
    Some(TerminalSlot {
      run_tx: terminal_api.run_tx,
      resize_tx: terminal_api.resize_tx,
      is_active,
      _kill_tx: terminal_api.kill_tx,
    }),
    output,
  )
}
