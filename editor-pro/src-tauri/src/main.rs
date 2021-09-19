use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use serde_json;
use std::{
  fs,
  io::Read,
  path::PathBuf,
  str::from_utf8,
  sync::mpsc::{self, Receiver, Sender},
  thread,
  thread::sleep,
  time::Duration,
};
use tauri::{api::cli::get_matches, Manager, Menu};
use terminal::{parse, TerminalCommand};

#[derive(Deserialize, Serialize, Clone, Eq, PartialEq, Debug)]
struct Size {
  height: i32,
  width: i32,
}

#[derive(Serialize, Deserialize, Debug)]
struct File {
  path: String,
  contents: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct FileOrDirectory {
  path: String,
  name: String,
  type_: FileOrDirectoryType,
}

#[derive(Serialize, Deserialize, Debug)]
struct FileTreeAndFlat {
  tree: FileTree,
  flat: Vec<FileOrDirectory>,
}

#[derive(Serialize, Deserialize, Debug)]
pub enum FileOrDirectoryType {
  File,
  Directory,
}

#[derive(Serialize, Deserialize, Debug)]
struct FileTree {
  path: String,
  name: String,
  type_: FileOrDirectoryType,
  children: Option<Vec<FileTree>>
}

#[tokio::main]
async fn main() {
  let context = tauri::generate_context!();

  tauri::Builder::default()
    .menu(Menu::new())
    .on_page_load(|window, _| {
      let window_ = window.clone();
      let window2_ = window.clone();
      let window_directory_tree_worker = window.clone();

      // Set directory
      let cli_config = window.config().tauri.cli.clone().unwrap();
      match get_matches(&cli_config) {
        // `matches` here is a Struct with { args, subcommand }.
        // `args` is `HashMap<String, ArgData>` where `ArgData` is a struct with { value, occurances }.
        // `subcommand` is `Option<Box<SubcommandMatches>>` where `SubcommandMatches` is a struct with { name, matches }.
        Ok(matches) => {
          println!("MATCHES: {:?}", matches);
          let directory = fs::canonicalize(PathBuf::from("../testing-codebase"));
          match directory {
            Ok(dir) => {
              println!("directory: {:?}", dir);
              window_.emit("initialize", dir).expect("failed to emit")
            }
            Err(_error) => {}
          }
        }
        Err(_) => {}
      };

      // end set directory

      // Directory Tree worker
      thread::spawn(move || {
        let tree = FileTreeAndFlat {
          tree: FileTree {
            path: "/Users/loganhenson/program/editor-pro/testing-codebase".to_string(),
            name: "testing-codebase".to_string(),
            type_: FileOrDirectoryType::Directory,
            children: Option::Some(vec![
              FileTree {
                path: "/Users/loganhenson/program/editor-pro/testing-codebase/directory".to_string(),
                name: "directory".to_string(),
                type_: FileOrDirectoryType::Directory,
                children: Option::Some(vec![FileTree {
                  path: "/Users/loganhenson/program/editor-pro/testing-codebase/directory/file".to_string(),
                  name: "file".to_string(),
                  type_: FileOrDirectoryType::File,
                  children: None,
                }]),
              },
              FileTree {
                path: "/Users/loganhenson/program/editor-pro/testing-codebase/file".to_string(),
                name: "file".to_string(),
                type_: FileOrDirectoryType::File,
                children: None
              },
            ]),
          },
          flat: vec![
            FileOrDirectory {
              path: "/Users/loganhenson/program/editor-pro/testing-codebase".to_string(),
              name: "testing-codebase".to_string(),
              type_: FileOrDirectoryType::Directory,
            },
            FileOrDirectory {
              path: "/Users/loganhenson/program/editor-pro/testing-codebase/directory".to_string(),
              name: "directory".to_string(),
              type_: FileOrDirectoryType::Directory,
            },
            FileOrDirectory {
              path: "/Users/loganhenson/program/editor-pro/testing-codebase/directory/file".to_string(),
              name: "file".to_string(),
              type_: FileOrDirectoryType::File,
            },
            FileOrDirectory {
              path: "/Users/loganhenson/program/editor-pro/testing-codebase/file".to_string(),
              name: "file".to_string(),
              type_: FileOrDirectoryType::File,
            },
          ],
        };

        println!("SENDING TREE: {:?}", tree);

        sleep(Duration::from_secs(1));
        window_directory_tree_worker
          .emit("message-from-directory-tree-worker", tree)
          .expect("failed to emit");

        //     window2_
        //       .emit(
        //         "sendResizedToTerminal",
        //         Size {
        //           height: rows,
        //           width: cols,
        //         },
        //       )
        //       .expect("failed to emit");
        //   }
      });

      let (tx, rx): (Sender<String>, Receiver<String>) = mpsc::channel();
      let tx1 = tx.clone();
      let tx2 = tx.clone();

      let (resize_tx, resize_rx): (Sender<Size>, Receiver<Size>) = mpsc::channel();
      let resize_tx1 = resize_tx.clone();
      // Send data to the pty by writing to the master
      // Use the native pty implementation for the system
      let pty_system = native_pty_system();

      // Create a new pty
      let pair = pty_system
        .openpty(PtySize {
          rows: 24,
          cols: 80,
          // Not all systems support pixel_width, pixel_height,
          // but it is good practice to set it to something
          // that matches the size of the selected font.  That
          // is more complex than can be shown here in this
          // brief example though!
          pixel_width: 0,
          pixel_height: 0,
        })
        .unwrap();

      // Spawn a shell into the pty
      std::env::set_var("TERM", "xterm-256color");
      let cmd = CommandBuilder::new_default_prog();
      let _child = pair.slave.spawn_command(cmd).unwrap();

      // Read and parse output from the pty with reader
      let mut reader = pair.master.try_clone_reader().unwrap();
      let mut writer = pair.master.try_clone_writer().unwrap();

      tokio::task::spawn(async move {
        let mut buf = [0u8; 8192];
        let mut partial_continuation: Vec<u8> = vec![];

        while let Ok(len) = reader.read(&mut buf) {
          if len == 0 {
            break;
          }

          let buffered: Vec<u8> = [&partial_continuation, &buf[0..len]].concat();
          match from_utf8(&buffered) {
            Ok(utf8_str) => {
              partial_continuation = vec![];

              let mut commands: Vec<TerminalCommand> = vec![];

              let report = String::from("[0c");
              let web = String::from("_WEB");
              let set_text_background_color = String::from("]11;?\u{1b}\\");

              parse(&utf8_str, |command| {
                // println!("{:?}", command);

                match command {
                  TerminalCommand::TerminalCommandPartial(partial) => {
                    partial_continuation =
                      [partial_continuation.clone(), partial.into_bytes()].concat();
                  }
                  TerminalCommand::TerminalCommandQuerySequence { command: ref com }
                    if com == &report =>
                  {
                    // ESC [ 0 c	DA	Device Attributes	Report the terminal identity.
                    // vttest hangs without this
                    match tx2.send("\u{1b}[?1;0c".to_string()) {
                      _ => {
                        ();
                      }
                    }
                  }
                  TerminalCommand::TerminalCommandQuerySequence { command: ref com }
                    if com == &set_text_background_color =>
                  {
                    // needed for procs-rs to query background color
                    match tx2.send("\u{1b}]11;rgb:2626/2626/2626\u{1b}\\".to_string()) {
                      _ => {
                        ();
                      }
                    }
                  }
                  TerminalCommand::TerminalCommandQuerySequence { command: ref com }
                    if com == &report =>
                  {
                    // ESC [ 0 c	DA	Device Attributes	Report the terminal identity.
                    // vttest hangs without this
                    match tx2.send("\u{1b}[?1;0c".to_string()) {
                      _ => {
                        ();
                      }
                    }
                  }
                  TerminalCommand::TerminalCommandSequenceAndSingleStringArgument {
                    command: ref com,
                    ref argument,
                  } if com == &web => window_.emit("web", argument).expect("failed to emit"),
                  command => {
                    commands.push(command);
                  }
                }
              });
              window_.emit("output", commands).expect("failed to emit");
            }
            Err(_err) => {
              partial_continuation = [partial_continuation, buffered].concat();
            }
          }
        }
      });

      window.listen("run", move |event| {
        match tx1.send(event.payload().unwrap().to_string()) {
          _ => {
            ();
          }
        }
      });

      window.listen("resize", move |event| match event.payload() {
        Some(r) => match resize_tx1.send(serde_json::from_str(r).unwrap()) {
          _ => {
            ();
          }
        },
        None => {
          ();
        }
      });

      thread::spawn(move || {
        for received in resize_rx {
          let cols = received.width;
          let rows = received.height;
          match pair.master.resize(PtySize {
            rows: rows as u16,
            cols: cols as u16,
            // Not all systems support pixel_width, pixel_height,
            // but it is good practice to set it to something
            // that matches the size of the selected font.  That
            // is more complex than can be shown here in this
            // brief example though!
            pixel_width: 0,
            pixel_height: 0,
          }) {
            _ => {
              ();
            }
          }
          window2_
            .emit(
              "sendResizedToTerminal",
              Size {
                height: rows,
                width: cols,
              },
            )
            .expect("failed to emit");
        }
      });

      thread::spawn(move || {
        for received in rx {
          match writer.write(received.as_ref()) {
            _ => {
              ();
            }
          }
        }
      });
    })
    .run(context)
    .expect("failed to run app");
}
