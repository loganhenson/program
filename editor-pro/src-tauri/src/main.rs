use filetree::FileTreeAndFlat;
use serde_json::{self};
use std::{
  env, fs,
  sync::mpsc::{self, Receiver, Sender},
};
use tauri::Menu;
use terminal::{parse::TerminalCommand, terminal::Size};

#[tokio::main]
async fn main() {
  let context = tauri::generate_context!();

  tauri::Builder::default()
    .menu(Menu::new())
    .on_page_load(|window, _| {
      let window_ = window.clone();
      let window_terminal_output = window.clone();
      let window_terminal_resize = window.clone();
      let window_directory_tree_worker = window.clone();

      let (terminal_output_tx, terminal_output_rx): (
        Sender<Vec<TerminalCommand>>,
        Receiver<Vec<TerminalCommand>>,
      ) = mpsc::channel();
      let (terminal_resize_tx, terminal_resize_rx): (Sender<Size>, Receiver<Size>) =
        mpsc::channel();

      let terminal_api = terminal::terminal::start(terminal_output_tx, terminal_resize_tx);
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

      // Start file tree worker
      let (filetree_tx, filetree_rx): (Sender<FileTreeAndFlat>, Receiver<FileTreeAndFlat>) =
        mpsc::channel();
      let (filetree_dir_tx, filetree_dir_rx): (Sender<String>, Receiver<String>) = mpsc::channel();
      filetree::start(filetree_dir_rx, filetree_tx);
      tokio::spawn(async move {
        for tree in filetree_rx {
          window_directory_tree_worker
            .emit("message-from-directory-tree-worker", tree)
            .expect("failed to emit");
        }
      });
      window.listen("initialized", move |event| {
        match filetree_dir_tx.send(event.payload().unwrap().to_string()) {
          _ => {
            ();
          }
        }
      });

      // Set directory & initialize app (with directory positional argument if exists)
      match env::args().skip(1).next() {
        Some(directory) => {
          println!("directory: {:?}", directory);

          window_
            .emit("initialize", directory.clone())
            .expect("failed to emit");
        }
        None => {
          let dir = match env::var("DEV_DIRECTORY") {
            Ok(dir) => {
              println!("dev mode, using {:?}", dir);
              dir
            }
            Err(_) => {
              println!("using current working directory");
              fs::canonicalize(env::current_dir().unwrap())
                .unwrap()
                .into_os_string()
                .into_string()
                .unwrap()
            }
          };

          window_
            .emit("initialize", dir.clone())
            .expect("failed to emit")
        }
      };
    })
    .run(context)
    .expect("failed to run app");
}
