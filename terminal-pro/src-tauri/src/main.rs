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
use tauri::{Emitter, Listener, Manager, WebviewWindow, Wry};
use terminal::{parse::TerminalCommand, terminal::Size};

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

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_clipboard_manager::init())
    .plugin(tauri_plugin_process::init())
    .invoke_handler(tauri::generate_handler![preflight])
    .setup(|app| {
      let window = app.get_webview_window("main").unwrap();
      let home = std::env::var("HOME").unwrap_or_else(|_| "/".to_string());
      let terminals: Terminals = Arc::new(Mutex::new(HashMap::new()));
      // Listeners must be live before Elm's first `requestOpenTerminal`
      // fires at init time. Registering here (not on frontend-ready)
      // guarantees the event isn't lost if JS races ahead.
      bootstrap(window, terminals, home);
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("failed to run app");
}

fn bootstrap(window: WebviewWindow<Wry>, terminals: Terminals, home: String) {
  let terminals_for_open = terminals.clone();
  let terminals_for_close = terminals.clone();
  let terminals_for_run = terminals.clone();
  let terminals_for_resize = terminals.clone();
  let window_for_open = window.clone();

  // Elm fires `openTerminal` on init (for the first tab) and on user
  // intent (`+` button). Spawns a PTY and inserts it in the map.
  window.listen("openTerminal", move |event| {
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

    let slot = spawn_terminal(&window_for_open, terminal_id.clone(), cwd);
    terminals_for_open.lock().unwrap().insert(terminal_id, slot);
  });

  // Close one tab. Dropping the slot flips is_active off and drops
  // kill_tx, which reaps the PTY.
  window.listen("closeTerminal", move |event| {
    let v: Value = match serde_json::from_str(event.payload()) {
      Ok(v) => v,
      Err(_) => return,
    };
    let terminal_id = match v["terminalId"].as_str() {
      Some(s) => s.to_string(),
      None => return,
    };
    if let Some(slot) = terminals_for_close.lock().unwrap().remove(&terminal_id) {
      slot.is_active.store(false, Ordering::Relaxed);
      // drop(slot) here closes kill_tx + channels
    }
  });

  window.listen("run", move |event| {
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
    if let Some(slot) = terminals_for_run.lock().unwrap().get(&terminal_id) {
      let _ = slot.run_tx.send(contents);
    }
  });

  window.listen("resize", move |event| {
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
    if let Some(slot) = terminals_for_resize.lock().unwrap().get(&terminal_id) {
      let _ = slot.resize_tx.send(size);
    }
  });
}

/// Spawn a PTY for the given terminal id. Output/resize events carry the
/// id so Elm can route them to the matching tab.
fn spawn_terminal(window: &WebviewWindow<Wry>, terminal_id: String, directory: String) -> TerminalSlot {
  let window_terminal_output = window.clone();
  let window_terminal_resize = window.clone();
  let term_for_output = terminal_id.clone();
  let term_for_resize = terminal_id;

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
          serde_json::json!({
            "terminalId": term_for_output,
            "data": message,
          }),
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
          serde_json::json!({
            "terminalId": term_for_resize,
            "size": message,
          }),
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
