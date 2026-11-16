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
use terminal::terminal::{Batch, Flow, Size};

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

/// The output flow of every open terminal, by terminal id. Kept apart from
/// the terminals themselves so that acknowledging output never waits on
/// anything else the app is doing.
type Flows = Arc<Mutex<HashMap<String, Flow>>>;

/// The page has taken a batch of a terminal's output. Until it says so, no
/// more than a couple of batches are sent: a program that prints faster than
/// the page can draw is slowed down instead of filling memory.
#[tauri::command]
fn acknowledge_output(terminal_id: String, sequence: u64, flows: tauri::State<Flows>) {
  if let Some(flow) = locked(&flows).get(&terminal_id) {
    flow.acknowledge(sequence);
  }
}

fn main() {
  tauri::Builder::default()
    .runtime(tauri_runtime_wry::Wry::default())
    .plugin(tauri_plugin_clipboard_manager::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_notification::init())
    .manage(Flows::default())
    .invoke_handler(tauri::generate_handler![preflight, bell, acknowledge_output])
    .setup(|app| {
      let window = app.get_webview_window("main").unwrap();
      let home = std::env::var("HOME").unwrap_or_else(|_| "/".to_string());
      let terminals: Terminals = Arc::new(Mutex::new(HashMap::new()));
      // Listeners must be live before Elm's first `requestOpenTerminal`
      // fires at init time. Registering here (not on frontend-ready)
      // guarantees the event isn't lost if JS races ahead.
      let flows = app.state::<Flows>().inner().clone();
      bootstrap(window, terminals, flows, home);
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("failed to run app");
}

fn bootstrap(window: WebviewWindow, terminals: Terminals, flows: Flows, home: String) {
  let flows_for_open = flows.clone();
  let flows_for_close = flows;
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

    if let Some((slot, flow)) = spawn_terminal(&window_for_open, terminal_id.clone(), cwd) {
      locked(&flows_for_open).insert(terminal_id.clone(), flow);
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
    locked(&flows_for_close).remove(&terminal_id);
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

/// Spawn a PTY for the given terminal id. Output/resize events carry the
/// id so Elm can route them to the matching tab.
///
/// `None` when no shell could be started: the tab then says why, instead of
/// the failure taking every other terminal down with it.
fn spawn_terminal(window: &WebviewWindow, terminal_id: String, directory: String) -> Option<(TerminalSlot, Flow)> {
  let window_terminal_output = window.clone();
  let window_terminal_resize = window.clone();
  let term_for_output = terminal_id.clone();
  let term_for_resize = terminal_id;

  let (terminal_output_tx, terminal_output_rx) = mpsc::channel::<Batch>();
  let (terminal_resize_tx, terminal_resize_rx) = mpsc::channel::<Size>();

  let terminal_api = match terminal::terminal::start(directory, terminal_output_tx, terminal_resize_tx) {
    Ok(api) => api,
    Err(error) => {
      let _ = window.emit(
        "output",
        serde_json::json!({
          "terminalId": term_for_output,
          "sequence": 0,
          "data": terminal::terminal::start_failure_notice(&error),
        }),
      );
      return None;
    }
  };
  let is_active = Arc::new(AtomicBool::new(true));

  let is_active_for_output = is_active.clone();
  let flow_for_output = terminal_api.flow.clone();
  thread::spawn(move || {
    for batch in terminal_output_rx {
      let sent = is_active_for_output.load(Ordering::Relaxed)
        && window_terminal_output
          .emit(
            "output",
            serde_json::json!({
              "terminalId": term_for_output,
              "sequence": batch.sequence,
              "data": batch.commands,
            }),
          )
          .is_ok();
      // Nobody will acknowledge what was not sent.
      if !sent {
        flow_for_output.acknowledge(batch.sequence);
      }
    }
  });

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

  let flow = terminal_api.flow.clone();
  Some((
    TerminalSlot {
      run_tx: terminal_api.run_tx,
      resize_tx: terminal_api.resize_tx,
      is_active,
      _kill_tx: terminal_api.kill_tx,
    },
    flow,
  ))
}
