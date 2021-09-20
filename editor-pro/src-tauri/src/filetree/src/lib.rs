extern crate serde_json;

use std::{
  sync::mpsc::{Sender, Receiver},
  thread,
};
use serde::{Deserialize, Serialize};

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
pub struct FileTreeAndFlat {
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

pub fn start(receiver: Receiver<String>, sender: Sender<FileTreeAndFlat>) -> () {
  thread::spawn(move || {
    for directory_tree_request in receiver {
      println!("requesting directory tree for: {:?}", directory_tree_request);

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

      match sender.send(tree) {
        _ => {
          ();
        }
      }
    }
  });
}