use std::{
  sync::mpsc::{self, Receiver, Sender},
};
use tauri::Menu;
use terminal::parse::TerminalCommand;
use terminal::terminal::Size;

#[tokio::main]
async fn main() {
  tauri::Builder::default()
    .menu(Menu::new())
    .on_page_load(|window, _| {
      let window_terminal_output = window.clone();
      let window_terminal_resize = window.clone();

      let (terminal_output_tx, terminal_output_rx): (
        Sender<Vec<TerminalCommand>>,
        Receiver<Vec<TerminalCommand>>,
      ) = mpsc::channel();
      let (terminal_resize_tx, terminal_resize_rx): (Sender<Size>, Receiver<Size>) =
        mpsc::channel();

      let terminal_api = terminal::terminal::start("~".to_string(), terminal_output_tx, terminal_resize_tx);
      let terminal_api_run_tx = terminal_api.run_tx.clone();
      let terminal_api_resize_tx = terminal_api.resize_tx.clone();
      window.listen("run", move |event| {
        terminal_api_run_tx
          .send(event.payload().unwrap().to_string())
          .unwrap()
      });
      window.listen("resize", move |event| {
        terminal_api_resize_tx
          .send(serde_json::from_str(event.payload().unwrap()).unwrap())
          .unwrap()
      });

      tokio::spawn(async move {
        for message in terminal_resize_rx {
          window_terminal_resize.emit("sendResizedToTerminal", message).unwrap();
        }
      });
      tokio::spawn(async move {
        for message in terminal_output_rx {
          window_terminal_output.emit("output", message).unwrap();
        }
      });
    })
    .run(tauri::generate_context!())
    .expect("failed to run app");
}
