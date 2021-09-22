use crate::parse::TerminalCommand;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use std::{
  io::Read,
  str::from_utf8,
  sync::mpsc::{self, Receiver, Sender},
  thread,
};

#[derive(Deserialize, Serialize, Clone, Eq, PartialEq, Debug)]
pub struct Size {
  height: i32,
  width: i32,
}

pub struct Api {
  pub run_tx: std::sync::mpsc::Sender<std::string::String>,
  pub resize_tx: std::sync::mpsc::Sender<Size>,
}

pub fn start(directory: String, output_sender: Sender<Vec<TerminalCommand>>, resize_sender: Sender<Size>) -> Api {
  let (run_tx, run_rx): (Sender<String>, Receiver<String>) = mpsc::channel();
  let (resize_tx, resize_rx): (Sender<Size>, Receiver<Size>) = mpsc::channel();

  // When we need to immediately write a response to a query
  let internal_run_tx = run_tx.clone();

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
  let mut cmd = CommandBuilder::new_default_prog();
  cmd.cwd(directory);
  let _child = pair.slave.spawn_command(cmd).unwrap();

  // Read and parse output from the pty with reader
  let mut reader = pair.master.try_clone_reader().unwrap();
  let mut writer = pair.master.try_clone_writer().unwrap();

  thread::spawn(move || {
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

          crate::parse::parse(&utf8_str, |command| {
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
                match internal_run_tx.send("\u{1b}[?1;0c".to_string()) {
                  _ => {
                    ();
                  }
                }
              }
              TerminalCommand::TerminalCommandQuerySequence { command: ref com }
                if com == &set_text_background_color =>
              {
                // needed for procs-rs to query background color
                match internal_run_tx.send("\u{1b}]11;rgb:2626/2626/2626\u{1b}\\".to_string()) {
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
                match internal_run_tx.send("\u{1b}[?1;0c".to_string()) {
                  _ => {
                    ();
                  }
                }
              }
              TerminalCommand::TerminalCommandSequenceAndSingleStringArgument {
                command: ref com,
                ref argument,
              } if com == &web => {
                println!("web {:?}", argument)
                // window_.emit("web", argument).expect("failed to emit")
              }
              command => {
                commands.push(command);
              }
            }
          });

          output_sender.send(commands).unwrap()
        }
        Err(_err) => {
          partial_continuation = [partial_continuation, buffered].concat();
        }
      }
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
      resize_sender
        .send(Size {
          height: rows,
          width: cols,
        })
        .unwrap();
    }
  });

  tokio::spawn(async move {
    for received in run_rx {
      match writer.write(received.as_ref()) {
        _ => {
          ();
        }
      }
    }
  });

  Api { run_tx, resize_tx }
}
