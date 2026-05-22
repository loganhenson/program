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
