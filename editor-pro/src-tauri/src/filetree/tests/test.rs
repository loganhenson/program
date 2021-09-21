use std::path::{PathBuf};
use filetree::filetree::{build, FileTreeAndFlat, FileOrDirectoryType, FileTree, FileOrDirectory};
use std::fs;

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
