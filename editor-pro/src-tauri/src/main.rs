use filetree::filetree::{FileTreeAndFlat, File};
use serde_json::{self};
use std::{
  env, fs,
  path::PathBuf,
  sync::mpsc::{self, Receiver, Sender},
};
use tauri::Menu;
use terminal::{parse::TerminalCommand, terminal::Size};
use std::fs::metadata;

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
      let window_receive_activated_file = window.clone();

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
      filetree::filetree::start(filetree_dir_rx, filetree_tx);
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

      // Listen for "activateFileOrDirectory" event
      window.listen("activateFileOrDirectory", move |event| {
        // const stat = await fs.lstat(path)
        //
        // if (stat.isFile()) {
        //   await this.checkFilePlugins(path)
        //
        //   const contents = await fs.readFile(path, 'utf8')
        //
        //   window.vide.ports.receiveActivatedFile.send({
        //     path,
        //     contents,
        //   })
        //
        //   this.data.activeFile = path
        //
        //   this.runOpenFileHandlers(path, contents)
        // } else if (stat.isDirectory()) {
        //   window.vide.ports.receiveActivatedDirectory.send(path)
        // }

        let filename = event.payload().unwrap();
        if metadata(filename).unwrap().is_file() {
          let contents = fs::read_to_string(filename)
            .expect("Something went wrong reading the file");

          window_receive_activated_file
            .emit("receiveActivatedFile", File {
              path: filename.to_string(),
              contents,
            })
            .expect("failed to emit")
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

          window_
            .emit("initialize", dir.clone())
            .expect("failed to emit")
        }
      };
    })
    .run(context)
    .expect("failed to run app");
}
