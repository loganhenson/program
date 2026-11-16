use std::path::{PathBuf};
use filetree::filetree::{build, is_in_skipped_directory, start, FileOrDirectory, FileOrDirectoryType, FileTree, FileTreeAndFlat, Request};
use std::path::Path;
use std::sync::mpsc;
use std::fs;
use std::time::Duration;

#[test]
fn it_can_test() {
  let fixture_directory = env!("CARGO_MANIFEST_DIR").to_owned() + "/tests/fixture-directory";

  let directory = fs::canonicalize(PathBuf::from(fixture_directory.clone())).unwrap().into_os_string().into_string().unwrap();

  assert_eq!(build(directory).unwrap(), FileTreeAndFlat {
    tree: FileTree {
      path: fixture_directory.clone(),
      name: "fixture-directory".to_string(),
      type_: FileOrDirectoryType::Directory,
      children: Option::Some(vec![
        FileTree {
          path: fixture_directory.clone() + "/test-directory",
          name: "test-directory".to_string(),
          type_: FileOrDirectoryType::Directory,
          children: Option::Some(vec![FileTree {
            path: fixture_directory.clone() + "/test-directory/test-in-directory.txt",
            name: "test-in-directory.txt".to_string(),
            type_: FileOrDirectoryType::File,
            children: None,
          }]),
        },
        FileTree {
          path: fixture_directory.clone() + "/test-outside-directory.txt",
          name: "test-outside-directory.txt".to_string(),
          type_: FileOrDirectoryType::File,
          children: None,
        },
      ]),
    },
    flat: vec![
      FileOrDirectory {
        path: fixture_directory.clone(),
        name: "fixture-directory".to_string(),
        type_: FileOrDirectoryType::Directory,
      },
      FileOrDirectory {
        path: fixture_directory.clone() + "/test-directory",
        name: "test-directory".to_string(),
        type_: FileOrDirectoryType::Directory,
      },
      FileOrDirectory {
        path: fixture_directory.clone() + "/test-directory/test-in-directory.txt",
        name: "test-in-directory.txt".to_string(),
        type_: FileOrDirectoryType::File,
      },
      FileOrDirectory {
        path: fixture_directory.clone() + "/test-outside-directory.txt",
        name: "test-outside-directory.txt".to_string(),
        type_: FileOrDirectoryType::File,
      },
    ],
  })
}

#[test]
fn build_does_not_loop_on_symlink_cycles() {
  // Set up a temp dir containing `cycle -> ..` so naive symlink-following
  // would recurse forever.
  let root = std::env::temp_dir().join(format!("filetree-cycle-{}", std::process::id()));
  let _ = fs::remove_dir_all(&root);
  fs::create_dir_all(&root).unwrap();
  fs::create_dir_all(root.join("child")).unwrap();
  fs::write(root.join("child").join("file.txt"), b"hi").unwrap();
  // Cycle: child/loop -> ..
  std::os::unix::fs::symlink("..", root.join("child").join("loop")).unwrap();

  let canonical = fs::canonicalize(&root).unwrap().to_string_lossy().to_string();

  // Run build() on a thread; if it hangs we'll see the join time out.
  let handle = std::thread::spawn(move || build(canonical));
  let start = std::time::Instant::now();
  while !handle.is_finished() {
    if start.elapsed() > Duration::from_secs(5) {
      panic!("build() hung on a symlink cycle for >5s");
    }
    std::thread::sleep(Duration::from_millis(50));
  }
  let result = handle.join().unwrap();
  assert!(result.is_ok());

  let _ = fs::remove_dir_all(&root);
}

/// A directory to build a tree in, removed again when the test ends.
struct Scratch(PathBuf);

impl Scratch {
  fn new(name: &str) -> Self {
    let directory = std::env::temp_dir().join(format!("filetree-{}-{}", name, std::process::id()));
    let _ = fs::remove_dir_all(&directory);
    fs::create_dir_all(&directory).unwrap();
    Scratch(fs::canonicalize(directory).unwrap())
  }

  fn file(&self, path: &str) {
    let file = self.0.join(path);
    fs::create_dir_all(file.parent().unwrap()).unwrap();
    fs::write(file, "").unwrap();
  }

  fn directory(&self, path: &str) {
    fs::create_dir_all(self.0.join(path)).unwrap();
  }

  fn build(&self) -> FileTreeAndFlat {
    build(self.0.to_string_lossy().to_string()).unwrap()
  }
}

impl Drop for Scratch {
  fn drop(&mut self) {
    let _ = fs::remove_dir_all(&self.0);
  }
}

fn names(tree: &FileTree) -> Vec<String> {
  tree.children.as_ref().unwrap().iter().map(|child| child.name.clone()).collect()
}

#[test]
fn it_lists_folders_first_and_then_files_each_by_name() {
  let scratch = Scratch::new("order");
  // created in an order that is neither of the two
  for file in ["readme.md", "Cargo.toml", ".gitignore", "build.rs", "artisan"] {
    scratch.file(file);
  }
  for directory in ["src", "Docs", ".github", "tests"] {
    scratch.directory(directory);
  }

  assert_eq!(
    names(&scratch.build().tree),
    vec![".github", "Docs", "src", "tests", ".gitignore", "artisan", "build.rs", "Cargo.toml", "readme.md"]
  );
}

#[test]
fn it_lists_a_folder_that_is_not_walked_among_the_folders() {
  let scratch = Scratch::new("opaque");
  scratch.file("node_modules/package/index.js");
  scratch.file("app/main.js");
  scratch.file("zebra.txt");
  scratch.file("apple.txt");

  let tree = scratch.build().tree;
  assert_eq!(names(&tree), vec!["app", "node_modules", "apple.txt", "zebra.txt"]);
  assert_eq!(tree.children.as_ref().unwrap()[1].type_, FileOrDirectoryType::Opaque);
}

#[test]
fn it_orders_every_level_and_the_flat_list_the_same_way() {
  let scratch = Scratch::new("nested");
  scratch.file("src/zeta.rs");
  scratch.file("src/Alpha.rs");
  scratch.file("src/bin/main.rs");
  scratch.file("a.txt");

  let built = scratch.build();
  let src = &built.tree.children.as_ref().unwrap()[0];
  assert_eq!(names(src), vec!["bin", "Alpha.rs", "zeta.rs"]);

  // the flat list is the tree read from top to bottom, which is the order
  // the arrow keys move through it
  let flat: Vec<String> = built.flat.iter().skip(1).map(|entry| entry.name.clone()).collect();
  assert_eq!(flat, vec!["src", "bin", "main.rs", "Alpha.rs", "zeta.rs", "a.txt"]);
}

// ── What a real file system does over a long session ──────────────────────
//
// Each of these used to panic the walk. In the app that ended the thread
// that builds a project's tree: the tree never loaded, or never refreshed
// again, until the project was closed and reopened.

fn child<'a>(tree: &'a FileTree, name: &str) -> &'a FileTree {
  tree.children.as_ref().unwrap().iter().find(|child| child.name == name).unwrap_or_else(|| panic!("{} is not listed", name))
}

#[test]
fn a_link_that_leads_nowhere_is_listed_and_does_not_stop_the_walk() {
  let scratch = Scratch::new("dangling");
  scratch.file("a.txt");
  scratch.file("z.txt");
  // what Emacs leaves next to a file that is being edited
  std::os::unix::fs::symlink("someone@somewhere.1234", scratch.0.join(".#a.txt")).unwrap();

  let tree = scratch.build().tree;
  assert_eq!(names(&tree), vec![".#a.txt", "a.txt", "z.txt"]);
  assert_eq!(child(&tree, ".#a.txt").type_, FileOrDirectoryType::File);
}

#[test]
fn a_link_to_itself_is_listed_and_does_not_stop_the_walk() {
  let scratch = Scratch::new("selflink");
  scratch.file("a.txt");
  std::os::unix::fs::symlink("loop", scratch.0.join("loop")).unwrap();

  assert_eq!(names(&scratch.build().tree), vec!["a.txt", "loop"]);
}

#[test]
fn a_folder_that_may_not_be_read_is_listed_as_empty() {
  use std::os::unix::fs::PermissionsExt;
  let scratch = Scratch::new("unreadable");
  scratch.file("locked/secret.txt");
  scratch.file("open/file.txt");
  let locked = scratch.0.join("locked");
  fs::set_permissions(&locked, fs::Permissions::from_mode(0o000)).unwrap();

  let tree = scratch.build().tree;
  fs::set_permissions(&locked, fs::Permissions::from_mode(0o755)).unwrap();

  assert_eq!(names(&tree), vec!["locked", "open"]);
  assert_eq!(names(child(&tree, "locked")), Vec::<String>::new());
  assert_eq!(names(child(&tree, "open")), vec!["file.txt"]);
}

#[test]
fn something_that_is_neither_a_file_nor_a_folder_is_left_out() {
  let scratch = Scratch::new("fifo");
  scratch.file("a.txt");
  let made = std::process::Command::new("mkfifo").arg(scratch.0.join("pipe")).status().unwrap();
  assert!(made.success());

  assert_eq!(names(&scratch.build().tree), vec!["a.txt"]);
}

#[test]
fn a_directory_that_is_not_there_is_an_error_not_a_panic() {
  let scratch = Scratch::new("gone");
  let gone = scratch.0.join("never-existed").to_string_lossy().to_string();
  assert!(build(gone).is_err());

  // "New File" used to ask for the tree of "" and take the whole app's
  // event handling down with the panic
  assert!(build("".to_string()).is_err());

  scratch.file("a.txt");
  assert!(build(scratch.0.join("a.txt").to_string_lossy().to_string()).is_err(), "a file is not a project");
}

#[test]
fn a_path_without_a_last_part_still_gets_a_name() {
  let scratch = Scratch::new("dotdot");
  scratch.file("inner/a.txt");
  let odd = scratch.0.join("inner").join("..").to_string_lossy().to_string();

  let built = build(odd.clone()).unwrap();
  assert_eq!(built.tree.name, odd);
  assert_eq!(names(&built.tree), vec!["inner"]);
}

#[test]
fn a_link_to_a_folder_that_is_not_walked_is_not_walked_either() {
  let scratch = Scratch::new("linked-modules");
  let elsewhere = Scratch::new("linked-modules-target");
  elsewhere.file("package/index.js");
  scratch.file("app.js");
  std::os::unix::fs::symlink(&elsewhere.0, scratch.0.join("node_modules")).unwrap();

  let built = scratch.build();
  assert_eq!(names(&built.tree), vec!["node_modules", "app.js"]);
  assert_eq!(child(&built.tree, "node_modules").type_, FileOrDirectoryType::Opaque);
  assert!(built.flat.iter().all(|entry| entry.name != "index.js"));
}

#[test]
fn changes_inside_a_folder_that_is_not_walked_cannot_change_the_tree() {
  let root = Path::new("/project");
  assert!(is_in_skipped_directory(root, Path::new("/project/target/debug/deps/app.o")));
  assert!(is_in_skipped_directory(root, Path::new("/project/web/node_modules/left-pad/index.js")));
  assert!(is_in_skipped_directory(root, Path::new("/project/.git/index.lock")));

  // the folder itself appearing or going away does change the tree
  assert!(!is_in_skipped_directory(root, Path::new("/project/target")));
  assert!(!is_in_skipped_directory(root, Path::new("/project/src/main.rs")));
  // a name that only looks like one
  assert!(!is_in_skipped_directory(root, Path::new("/project/targets/list.txt")));
  // a project that itself lives inside one is still watched
  assert!(!is_in_skipped_directory(Path::new("/work/build/project"), Path::new("/work/build/project/src/a.rs")));
  // outside the project
  assert!(!is_in_skipped_directory(root, Path::new("/elsewhere/target/x")));
}

// ── The thread that builds trees on request ───────────────────────────────

struct Worker {
  requests: mpsc::Sender<Request>,
  trees: mpsc::Receiver<FileTreeAndFlat>,
}

impl Worker {
  fn start() -> Self {
    let (requests, request_rx) = mpsc::channel();
    let (tree_tx, trees) = mpsc::channel();
    start(request_rx, tree_tx);
    Worker { requests, trees }
  }

  fn next(&self) -> Option<FileTreeAndFlat> {
    self.trees.recv_timeout(Duration::from_secs(5)).ok()
  }

  fn nothing_more(&self) -> bool {
    self.trees.recv_timeout(Duration::from_millis(300)).is_err()
  }
}

fn path(scratch: &Scratch) -> String {
  scratch.0.to_string_lossy().to_string()
}

#[test]
fn the_worker_survives_a_directory_it_cannot_build() {
  let scratch = Scratch::new("worker-survives");
  scratch.file("a.txt");
  let worker = Worker::start();

  worker.requests.send(Request::Load("".to_string())).unwrap();
  worker.requests.send(Request::Load(scratch.0.join("gone").to_string_lossy().to_string())).unwrap();
  std::thread::sleep(Duration::from_millis(200));
  worker.requests.send(Request::Load(path(&scratch))).unwrap();

  let tree = worker.next().expect("the worker stopped answering after a directory it could not build");
  assert_eq!(names(&tree.tree), vec!["a.txt"]);
}

#[test]
fn a_tree_that_did_not_change_is_not_sent_again() {
  let scratch = Scratch::new("worker-unchanged");
  scratch.file("a.txt");
  let worker = Worker::start();

  worker.requests.send(Request::Load(path(&scratch))).unwrap();
  assert!(worker.next().is_some());

  // something was written somewhere, but the tree is the same
  worker.requests.send(Request::Refresh(path(&scratch))).unwrap();
  assert!(worker.nothing_more(), "the same tree was sent again");

  // a real change is sent
  scratch.file("b.txt");
  worker.requests.send(Request::Refresh(path(&scratch))).unwrap();
  assert_eq!(names(&worker.next().unwrap().tree), vec!["a.txt", "b.txt"]);

  // and a page that asks for the tree gets it even though nothing changed
  worker.requests.send(Request::Load(path(&scratch))).unwrap();
  assert!(worker.next().is_some());
}

#[test]
fn requests_that_pile_up_during_a_walk_are_answered_once() {
  let scratch = Scratch::new("worker-pile");
  for i in 0..3000 {
    scratch.file(&format!("dir{}/file{}.txt", i % 30, i));
  }
  let worker = Worker::start();

  // a build writing thousands of files: hundreds of requests
  scratch.file("first-change.txt");
  for _ in 0..300 {
    worker.requests.send(Request::Refresh(path(&scratch))).unwrap();
  }
  let mut sent = 0;
  while worker.trees.recv_timeout(Duration::from_millis(1500)).is_ok() {
    sent += 1;
  }
  assert!(sent >= 1, "the change was never sent");
  assert!(sent <= 2, "{} trees were sent for one change", sent);
}

#[test]
fn the_worker_stops_when_its_project_is_closed_without_finishing_what_was_queued() {
  let scratch = Scratch::new("worker-stop");
  for i in 0..3000 {
    scratch.file(&format!("dir{}/file{}.txt", i % 30, i));
  }
  let (requests, request_rx) = mpsc::channel();
  let (tree_tx, trees) = mpsc::channel();
  start(request_rx, tree_tx);
  for _ in 0..300 {
    requests.send(Request::Load(path(&scratch))).unwrap();
  }
  drop(requests);

  // it may finish the walk it is in, and then ends: the channel closes
  let started = std::time::Instant::now();
  let mut sent = 0;
  while trees.recv_timeout(Duration::from_secs(10)).is_ok() {
    sent += 1;
  }
  assert!(sent <= 1, "{} trees were built for a project that was closed", sent);
  assert!(started.elapsed() < Duration::from_secs(8), "the worker was still running {:?} after its project was closed", started.elapsed());
}
