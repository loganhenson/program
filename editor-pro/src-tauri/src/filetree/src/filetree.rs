extern crate serde_json;

use std::{
  fs::metadata,
  sync::mpsc::{Sender, Receiver},
  thread,
  path::Path,
};
use serde::{Deserialize, Serialize};
use walkdir::WalkDir;

#[derive(Serialize, Deserialize, Debug)]
struct File {
  path: String,
  contents: String,
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub struct FileOrDirectory {
  pub path: String,
  pub name: String,
  pub type_: FileOrDirectoryType,
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub struct FileTreeAndFlat {
  pub tree: FileTree,
  pub flat: Vec<FileOrDirectory>,
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub enum FileOrDirectoryType {
  File,
  Directory,
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub struct FileTree {
  pub path: String,
  pub name: String,
  pub type_: FileOrDirectoryType,
  pub children: Option<Vec<FileTree>>,
}

pub fn start(receiver: Receiver<String>, sender: Sender<FileTreeAndFlat>) -> () {
  thread::spawn(move || {
    for directory_tree_request in receiver {
      println!("requesting directory tree for: {:?}", directory_tree_request);

      match build(directory_tree_request) {
        Ok(tree) => match sender.send(tree) {
          _ => {
            ();
          }
        }
        _ => {}
      }
    }
  });
}

struct Item {
  path: String,
  name: String,
  children: Option<Vec<FileTree>>,
}

fn directory_tree(directory: String, add_to_flat: &mut dyn FnMut(FileOrDirectory)) -> Option<FileTree> {
  let name = Path::new(&directory);

  let mut item = Item {
    path: directory.clone(),
    name: Path::file_name(name).unwrap().to_os_string().into_string().unwrap(),
    children: None,
  };

  let meta = metadata(directory.clone()).unwrap();

  if meta.is_file() {
    add_to_flat(FileOrDirectory {
      path: item.path.clone(),
      name: item.name.clone(),
      type_: FileOrDirectoryType::File,
    });
  } else if meta.is_dir() {
    add_to_flat(FileOrDirectory {
      path: item.path.clone(),
      name: item.name.clone(),
      type_: FileOrDirectoryType::Directory,
    });

    item.children = WalkDir::new(directory).min_depth(1).max_depth(1).follow_links(true).into_iter().filter_map(|e| e.ok()).map(|entry| {
      directory_tree(entry.path().display().to_string(), add_to_flat)
    }).collect();
  } else {
    return None;
  }

  Some(FileTree {
    path: item.path,
    name: item.name,
    type_: if meta.is_file() { FileOrDirectoryType::File } else { FileOrDirectoryType::Directory },
    children: item.children,
  })
}

pub fn build(directory: String) -> Result<FileTreeAndFlat, walkdir::Error> {
  let mut flattened: Vec<FileOrDirectory> = vec![];

  let tree = directory_tree(directory, &mut |file_or_directory| {
    flattened.push(file_or_directory)
  });

  Ok(FileTreeAndFlat {
    tree: tree.unwrap(),
    flat: flattened,
  })
}
