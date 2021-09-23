use filetree::filetree::{FileTreeAndFlat, File};
use serde_json::{self, Value};
use std::{
  env, fs,
  path::PathBuf,
  sync::mpsc::{self, Receiver, Sender},
};
use tauri::{Menu, Window, Wry, MenuItem, Submenu};
use terminal::{parse::TerminalCommand, terminal::Size};
use std::fs::metadata;
use std::process::Command;

#[tokio::main]
async fn main() {
  let context = tauri::generate_context!();

  let menu = Menu::new()
    .add_submenu(
      Submenu::new(
        "Controls",
        Menu::new()
          // These are required for this functionality
          // even though we are not relying on native behavior (OSX)
          .add_native_item(MenuItem::SelectAll)
          .add_native_item(MenuItem::Paste)
          .add_native_item(MenuItem::Copy),
      )
    );

  tauri::Builder::default()
    .menu(menu)
    .on_page_load(|window, _| {
      let window_ = window.clone();
      let window_terminal = window.clone();
      let window_directory_tree_worker = window.clone();
      let window_receive_activated_file = window.clone();
      let window_receive_fuzzy_find_results = window.clone();


      // Start file tree worker
      let (filetree_tx, filetree_rx): (Sender<FileTreeAndFlat>, Receiver<FileTreeAndFlat>) =
        mpsc::channel();
      let (filetree_dir_tx, filetree_dir_rx): (Sender<String>, Receiver<String>) = mpsc::channel();
      filetree::filetree::start(filetree_dir_rx, filetree_tx);
      tokio::spawn(async move {
        for tree in filetree_rx {
          window_directory_tree_worker
            .emit("message-from-directory-tree-worker", tree)
            .expect("failed to emit");
        }
      });

      // Tell file tree worker that the app has initialized
      window.listen("initialized", move |event| {
        filetree_dir_tx.send(event.payload().unwrap().to_string()).unwrap()
      });

      // Listen for "requestFuzzyFindInProjectFileOrDirectory" event
      window.listen("requestFuzzyFindInProjectFileOrDirectory", move |event| {
        let v: Value = serde_json::from_str(event.payload().unwrap()).unwrap();

        window_receive_fuzzy_find_results
          .emit("receiveFuzzyFindResults",
             find_in_project_file_or_directory(
               v["directory"].as_str().unwrap(),
               v["file_or_directory_name"].as_str().unwrap()
             ))
          .expect("failed to emit receiveActivatedFile")
      });

      // Listen for "activateFileOrDirectory" event
      window.listen("activateFileOrDirectory", move |event| {
        let filename = event.payload().unwrap();
        if metadata(filename).unwrap().is_file() {
          let contents = fs::read_to_string(filename)
            .expect("Something went wrong reading the file");

          window_receive_activated_file
            .emit("receiveActivatedFile", File {
              path: filename.to_string(),
              contents,
            })
            .expect("failed to emit receiveActivatedFile")
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
              fs::canonicalize(PathBuf::from(dir))
                .unwrap()
                .into_os_string()
                .into_string()
                .unwrap()
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

          // Start the terminal in the working directory
          start_terminal(window_terminal, dir.clone());

          window_
            .emit("initialize", dir.clone())
            .expect("failed to emit")
        }
      };
    })
    .run(context)
    .expect("failed to run app");
}

fn start_terminal(window: Window<Wry>, directory: String) {
  let window_terminal_output = window.clone();
  let window_terminal_resize = window.clone();

  let (terminal_output_tx, terminal_output_rx): (
    Sender<Vec<TerminalCommand>>,
    Receiver<Vec<TerminalCommand>>,
  ) = mpsc::channel();
  let (terminal_resize_tx, terminal_resize_rx): (Sender<Size>, Receiver<Size>) =
    mpsc::channel();

  let terminal_api = terminal::terminal::start(directory, terminal_output_tx, terminal_resize_tx);
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
}

fn find_in_project_file_or_directory(directory: &str, file_or_directory_name: &str) -> Vec<String> {
  let args = [
    "*".to_owned() + file_or_directory_name + "*",
    directory.to_string(),
    "--hidden".to_string(),
    "--glob".to_string(),
    "--exclude=.git".to_string()
  ];

  let output = Command::new("fd")
    .args(args)
    .output()
    .expect("failed to execute fd");

  String::from_utf8_lossy(&output.stdout).lines().map(|s| s.to_string()).collect()
}
