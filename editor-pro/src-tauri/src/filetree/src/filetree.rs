extern crate serde_json;

use std::{
  collections::HashSet,
  fs::metadata,
  path::{Path, PathBuf},
  sync::mpsc::{Receiver, Sender},
  thread,
};
use serde::{Deserialize, Serialize};
use walkdir::WalkDir;

/// Stop walking once we've accumulated this many file-tree entries.
/// Protects against accidental opens of `~` or other huge directories.
const MAX_ENTRIES: usize = 50_000;

/// Directory names to prune from the walk entirely. These are
/// build outputs, package caches, and VCS internals that shouldn't
/// appear in a code editor's tree — including them slows the initial
/// walk by 100x+ on a typical polyglot project and bloats the rendered
/// tree with files the user has no reason to open.
const SKIP_DIR_NAMES: &[&str] = &[
  "node_modules",
  "target",
  "elm-stuff",
  ".git",
  "dist",
  "build",
  ".next",
  ".nuxt",
  ".turbo",
  ".svelte-kit",
  ".cache",
  ".vite",
  ".parcel-cache",
  "__pycache__",
  ".pytest_cache",
  ".venv",
  "venv",
];

fn should_skip_dir(name: &str) -> bool {
  SKIP_DIR_NAMES.iter().any(|n| *n == name)
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct File {
  pub path: String,
  pub contents: String,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Clone)]
pub struct FileOrDirectory {
  pub path: String,
  pub name: String,
  pub type_: FileOrDirectoryType,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Clone)]
pub struct FileTreeAndFlat {
  pub tree: FileTree,
  pub flat: Vec<FileOrDirectory>,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Clone)]
pub enum FileOrDirectoryType {
  File,
  Directory,
  /// Directory the walker chose not to recurse into (e.g. node_modules,
  /// target, .git). Listed so the user sees it in the tree, but not
  /// expanded — saves ~99% of walk time + tree-render cost on typical
  /// polyglot projects.
  Opaque,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Clone)]
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

struct WalkState {
  visited: HashSet<PathBuf>,
  entry_count: usize,
}

impl WalkState {
  fn new() -> Self {
    Self { visited: HashSet::new(), entry_count: 0 }
  }

  fn at_limit(&self) -> bool {
    self.entry_count >= MAX_ENTRIES
  }

  /// Returns false if this canonical directory has already been visited
  /// (i.e. we'd be re-entering a symlink cycle).
  fn enter(&mut self, canonical: PathBuf) -> bool {
    self.visited.insert(canonical)
  }
}

fn directory_tree(
  directory: String,
  add_to_flat: &mut dyn FnMut(FileOrDirectory),
  state: &mut WalkState,
) -> Option<FileTree> {
  let name = Path::new(&directory);

  let mut item = Item {
    path: directory.clone(),
    name: Path::file_name(name).unwrap().to_os_string().into_string().unwrap(),
    children: None,
  };

  let meta = metadata(directory.clone()).unwrap();

  if meta.is_file() {
    if state.at_limit() {
      return None;
    }
    state.entry_count += 1;
    add_to_flat(FileOrDirectory {
      path: item.path.clone(),
      name: item.name.clone(),
      type_: FileOrDirectoryType::File,
    });
  } else if meta.is_dir() {
    // Cycle detection: skip directories we've already entered via their
    // canonical path. Without this, a symlink loop (`ln -s .. cycle`)
    // would recurse forever.
    let canonical = std::fs::canonicalize(&directory).ok();
    if let Some(c) = canonical {
      if !state.enter(c) {
        return Some(FileTree {
          path: item.path,
          name: item.name,
          type_: FileOrDirectoryType::Directory,
          children: Some(vec![]),
        });
      }
    }

    if state.at_limit() {
      return None;
    }
    state.entry_count += 1;
    add_to_flat(FileOrDirectory {
      path: item.path.clone(),
      name: item.name.clone(),
      type_: FileOrDirectoryType::Directory,
    });

    // Collect via filter_map so a child returning None (typically because
    // MAX_ENTRIES was reached deep in the walk) doesn't short-circuit the
    // whole .collect::<Option<Vec<_>>>() to None. That bug surfaced as the
    // ROOT being reported with children=None, which the Elm view renders
    // as a file instead of an empty directory.
    item.children = Some(
      WalkDir::new(directory)
        .min_depth(1)
        .max_depth(1)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter_map(|entry| {
          if state.at_limit() {
            return None;
          }
          if entry.file_type().is_dir()
            && entry
              .file_name()
              .to_str()
              .map(should_skip_dir)
              .unwrap_or(false)
          {
            if state.at_limit() {
              return None;
            }
            state.entry_count += 1;
            let opaque_path = entry.path().display().to_string();
            let opaque_name = entry
              .file_name()
              .to_str()
              .unwrap_or("")
              .to_string();
            add_to_flat(FileOrDirectory {
              path: opaque_path.clone(),
              name: opaque_name.clone(),
              type_: FileOrDirectoryType::Opaque,
            });
            return Some(FileTree {
              path: opaque_path,
              name: opaque_name,
              type_: FileOrDirectoryType::Opaque,
              children: None,
            });
          }
          directory_tree(entry.path().display().to_string(), add_to_flat, state)
        })
        .collect(),
    );
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
  let mut state = WalkState::new();

  let tree = directory_tree(
    directory,
    &mut |file_or_directory| flattened.push(file_or_directory),
    &mut state,
  );

  Ok(FileTreeAndFlat {
    tree: tree.unwrap(),
    flat: flattened,
  })
}
