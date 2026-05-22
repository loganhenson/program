use preflight::{Check, ProbeOutcome, Report};
use std::sync::mpsc::{self, Receiver, Sender};
use std::thread;
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

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_clipboard_manager::init())
    .plugin(tauri_plugin_process::init())
    .invoke_handler(tauri::generate_handler![preflight])
    .setup(|app| {
      let window = app.get_webview_window("main").unwrap();
      let home = std::env::var("HOME").unwrap_or_else(|_| "/".to_string());
      let window_for_callback = window.clone();
      window.once("frontend-ready", move |_| {
        start_terminal(&window_for_callback, home);
      });
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("failed to run app");
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
