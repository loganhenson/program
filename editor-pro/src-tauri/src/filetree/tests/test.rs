use std::path::{PathBuf};
use filetree::filetree::{build, FileTreeAndFlat, FileOrDirectoryType, FileTree, FileOrDirectory};
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
