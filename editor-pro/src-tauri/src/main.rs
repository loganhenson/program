use filetree::filetree::{File, FileTreeAndFlat};
use serde_json::{self, Value};
use std::{
  env, fs,
  fs::metadata,
  path::PathBuf,
  process::Command,
  sync::mpsc::{self, Receiver, Sender},
  thread,
};
use tauri::{
  menu::{Menu, PredefinedMenuItem, Submenu},
  Emitter, Listener, Manager, WebviewWindow, Wry,
};
use terminal::{parse::TerminalCommand, terminal::Size};

fn main() {
  let context = tauri::generate_context!();

  tauri::Builder::default()
    .plugin(tauri_plugin_clipboard_manager::init())
    .plugin(tauri_plugin_process::init())
    .menu(|handle| {
      Menu::with_items(
        handle,
        &[&Submenu::with_items(
          handle,
          "Controls",
          true,
          &[
            // Required so OSX keyboard shortcuts (cmd+c/v/a) reach the focused webview
            &PredefinedMenuItem::select_all(handle, None)?,
            &PredefinedMenuItem::paste(handle, None)?,
            &PredefinedMenuItem::copy(handle, None)?,
          ],
        )?],
      )
    })
    .setup(|app| {
      let window = app.get_webview_window("main").unwrap();
      let window_for_callback = window.clone();
      window.once("frontend-ready", move |_| {
        bootstrap(window_for_callback);
      });
      Ok(())
    })
    .run(context)
    .expect("failed to run app");
}

fn bootstrap(window: WebviewWindow<Wry>) {
  let window_ = window.clone();
  let window_terminal = window.clone();
  let window_open_project = window.clone();
  let window_directory_tree_worker = window.clone();
  let window_receive_activated_file = window.clone();
  let window_receive_fuzzy_find_results = window.clone();
  let window_receive_fuzzy_find_projects_results = window.clone();
  let window_create_file = window.clone();

  // Start file tree worker
  let (filetree_tx, filetree_rx): (Sender<FileTreeAndFlat>, Receiver<FileTreeAndFlat>) =
    mpsc::channel();
  let (filetree_dir_tx, filetree_dir_rx): (Sender<String>, Receiver<String>) = mpsc::channel();

  filetree::filetree::start(filetree_dir_rx, filetree_tx);

  thread::spawn(move || {
    for tree in filetree_rx {
      window_directory_tree_worker
        .emit("message-from-directory-tree-worker", tree)
        .expect("failed to emit");
    }
  });

  // Tell file tree worker that the app has initialized
  window.listen("initialized", move |event| {
    let directory: String = serde_json::from_str(event.payload()).unwrap();
    filetree_dir_tx.send(directory).unwrap()
  });

  window.listen("requestFuzzyFindInProjectFileOrDirectory", move |event| {
    let v: Value = serde_json::from_str(event.payload()).unwrap();

    window_receive_fuzzy_find_results
      .emit(
        "receiveFuzzyFindResults",
        find_in_project_file_or_directory(
          v["directory"].as_str().unwrap_or(""),
          v["file_or_directory_name"].as_str().unwrap_or(""),
        ),
      )
      .expect("failed to emit receiveFuzzyFindResults")
  });

  window.listen("requestFuzzyFindProjects", move |event| {
    let project: String = serde_json::from_str(event.payload()).unwrap();

    window_receive_fuzzy_find_projects_results
      .emit("receiveFuzzyFindResults", find_project(&project))
      .expect("failed to emit receiveFuzzyFindResults")
  });

  window.listen("requestOpenProject", move |event| {
    let directory: String = serde_json::from_str(event.payload()).unwrap();
    println!("requestOpenProject directory: {:?}", directory);

    let dir = fs::canonicalize(PathBuf::from(&directory))
      .unwrap()
      .into_os_string()
      .into_string()
      .unwrap();

    println!("requestOpenProject dir: {:?}", dir);

    start_terminal(&window_open_project, dir.clone());
    window_open_project
      .emit("initialize", dir)
      .expect("failed to emit");
  });

  window.listen("activateFileOrDirectory", move |event| {
    let filename: String = serde_json::from_str(event.payload()).unwrap();
    if metadata(&filename).unwrap().is_file() {
      let contents =
        fs::read_to_string(&filename).expect("Something went wrong reading the file");

      window_receive_activated_file
        .emit(
          "receiveActivatedFile",
          File {
            path: filename,
            contents,
          },
        )
        .expect("failed to emit receiveActivatedFile")
    }
  });

  window.listen("createFile", move |event| {
    let v: Value = serde_json::from_str(event.payload()).unwrap();
    let directory = v["directory"].as_str().unwrap();
    let file = v["file"].as_str().unwrap();

    if metadata(file).is_err() {
      match fs::write(file, "") {
        Ok(_) => {
          window_create_file
            .emit(
              "message-from-directory-tree-worker",
              filetree::filetree::build(directory.to_string()).unwrap(),
            )
            .expect("failed to emit");

          window_create_file
            .emit(
              "receiveActivatedFile",
              File {
                path: file.to_string(),
                contents: "".to_string(),
              },
            )
            .expect("failed to emit receiveActivatedFile")
        }
        Err(e) => {
          println!("error creating file: {:?}", e);
        }
      }
    }
  });

  window.listen("save", move |event| {
    let v: Value = serde_json::from_str(event.payload()).unwrap();
    let file = v["file"].as_str().unwrap();
    let contents = v["contents"].as_str().unwrap();

    fs::write(file, contents).expect("Unable to write file");
  });

  // Set directory & initialize app (with directory positional argument if exists)
  match env::args().skip(1).next() {
    Some(directory) => {
      println!("directory: {:?}", directory);
      let dir = fs::canonicalize(PathBuf::from(directory))
        .unwrap()
        .into_os_string()
        .into_string()
        .unwrap();
      println!("dir: {:?}", dir);

      start_terminal(&window_terminal, dir.clone());
      window_.emit("initialize", dir).expect("failed to emit");
    }
    None => {
      match env::var("DEV_DIRECTORY") {
        Ok(dir) => {
          println!("dev mode, using {:?}", dir);
          fs::canonicalize(PathBuf::from(&dir))
            .unwrap()
            .into_os_string()
            .into_string()
            .unwrap();

          // Start the terminal in the working directory
          start_terminal(&window_terminal, dir.clone());
          window_.emit("initialize", &dir).expect("failed to emit")
        }
        Err(_) => {
          println!("need a project!");
          window_.emit("initialize", "").expect("failed to emit")
        }
      };
    }
  };
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

fn fd_path() -> Option<String> {
  // Apps launched from /Applications inherit launchd's stripped PATH, so
  // bare `fd` won't resolve. Probe the usual install locations first.
  for candidate in ["/opt/homebrew/bin/fd", "/usr/local/bin/fd", "/usr/bin/fd"] {
    if std::path::Path::new(candidate).exists() {
      return Some(candidate.to_string());
    }
  }
  None
}

fn find_in_project_file_or_directory(directory: &str, file_or_directory_name: &str) -> Vec<String> {
  let Some(fd) = fd_path() else {
    eprintln!("fd not found on PATH; install with `brew install fd`");
    return vec![];
  };

  if directory.is_empty() {
    return vec![];
  }

  let args = [
    "*".to_owned() + file_or_directory_name + "*",
    directory.to_string(),
    "--hidden".to_string(),
    "--glob".to_string(),
    "--exclude=.git".to_string(),
  ];

  match Command::new(fd).args(args).output() {
    Ok(output) => String::from_utf8_lossy(&output.stdout)
      .lines()
      .map(|s| s.to_string())
      .collect(),
    Err(e) => {
      eprintln!("fd execution failed: {:?}", e);
      vec![]
    }
  }
}

fn find_project(project_name: &str) -> Vec<String> {
  let Some(fd) = fd_path() else {
    eprintln!("fd not found on PATH; install with `brew install fd`");
    return vec![];
  };

  let home = std::env::var("HOME").unwrap();
  let desktop = format!("{}/Desktop", home);

  // ~/Desktop on this machine is a symlink to OneDrive, so we need -L. Match by
  // name prefix at depth 1 — projects live as direct children of Desktop.
  let args = [
    "--type=d",
    "--max-depth=1",
    "-L",
    &format!("^{}", project_name),
    &desktop,
  ];

  match Command::new(fd).args(args).output() {
    Ok(output) => String::from_utf8_lossy(&output.stdout)
      .lines()
      .map(|s| s.to_string())
      .collect(),
    Err(e) => {
      eprintln!("fd execution failed: {:?}", e);
      vec![]
    }
  }
}
