use std::{
  collections::HashSet,
  fs::{metadata, read_dir, symlink_metadata},
  panic::{catch_unwind, AssertUnwindSafe},
  path::{Path, PathBuf},
  sync::mpsc::{Receiver, Sender, TryRecvError},
  thread,
};
use serde::{Deserialize, Serialize};

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

/// Whether a path is inside a directory the walk does not go into (or is
/// such a directory). Changes there cannot change the tree: whoever watches
/// the project can ignore them.
pub fn is_in_skipped_directory(root: &Path, path: &Path) -> bool {
  let inside = match path.strip_prefix(root) {
    Ok(inside) => inside,
    Err(_) => return false,
  };
  let mut components = inside.components().peekable();
  while let Some(component) = components.next() {
    let name = component.as_os_str().to_string_lossy();
    if should_skip_dir(&name) {
      // the skipped directory itself appearing or going away does show in
      // the tree (as a row that cannot be opened); what is inside does not
      return components.peek().is_some();
    }
  }
  false
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

/// A request for a project's tree.
#[derive(Debug, Clone, PartialEq)]
pub enum Request {
  /// Send the tree, whatever it is: the page has none yet.
  Load(String),
  /// Something changed on disk: send the tree if it is not the one that
  /// was sent last.
  Refresh(String),
}

/// Walks a project on request and sends its tree.
///
/// While a walk is running more requests can pile up (a build writes
/// thousands of files): only the last one is acted on. A tree that is the
/// same as the one sent last is not sent again. The thread ends when the
/// requests' sender is dropped, without working through what was still
/// queued.
pub fn start(receiver: Receiver<Request>, sender: Sender<FileTreeAndFlat>) -> () {
  thread::spawn(move || {
    let mut sent: Option<FileTreeAndFlat> = None;

    while let Ok(mut request) = receiver.recv() {
      loop {
        match receiver.try_recv() {
          Ok(newer) => {
            // a Load that was waiting must still be answered
            request = match (&request, newer) {
              (Request::Load(_), Request::Refresh(directory)) => Request::Load(directory),
              (_, newer) => newer,
            };
          }
          Err(TryRecvError::Empty) => break,
          Err(TryRecvError::Disconnected) => return,
        }
      }

      let (directory, always) = match request {
        Request::Load(directory) => (directory, true),
        Request::Refresh(directory) => (directory, false),
      };

      // Nothing the file system does may end this thread: the tree would
      // never load or refresh again.
      let tree = match catch_unwind(AssertUnwindSafe(|| build(directory))) {
        Ok(Ok(tree)) => tree,
        _ => continue,
      };

      if always || sent.as_ref() != Some(&tree) {
        if sender.send(tree.clone()).is_err() {
          return;
        }
        sent = Some(tree);
      }
    }
  });
}

/// Why there is no tree for a directory.
#[derive(Debug, PartialEq)]
pub struct BuildError(pub String);

impl std::fmt::Display for BuildError {
  fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
    write!(f, "{}", self.0)
  }
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

#[derive(PartialEq)]
enum Kind {
  File,
  Directory,
}

/// What a path is, following links. A link that leads nowhere is still an
/// entry and is listed as a file. `None` for what is not there (it can go
/// away between being listed and being looked at) and for what is neither
/// (a socket, a pipe).
fn kind_of(path: &Path) -> Option<Kind> {
  match metadata(path) {
    Ok(meta) if meta.is_dir() => Some(Kind::Directory),
    Ok(meta) if meta.is_file() => Some(Kind::File),
    Ok(_) => None,
    Err(_) => match symlink_metadata(path) {
      Ok(meta) if meta.file_type().is_symlink() => Some(Kind::File),
      _ => None,
    },
  }
}

/// The last part of a path, as text. A path that has none (`/`) is named by
/// the whole path.
fn name_of(path: &Path) -> String {
  match path.file_name() {
    Some(name) => name.to_string_lossy().to_string(),
    None => path.to_string_lossy().to_string(),
  }
}

/// What is in a directory, in the order it is listed: folders first, then
/// files, each by name without regard to case. (The file system's own order
/// is arbitrary.) A directory that cannot be read is listed as empty.
fn children_of(directory: &Path) -> Vec<(PathBuf, String, Kind)> {
  let entries = match read_dir(directory) {
    Ok(entries) => entries,
    Err(_) => return vec![],
  };
  let mut children: Vec<(PathBuf, String, Kind)> = entries
    .filter_map(|entry| entry.ok())
    .filter_map(|entry| {
      let path = entry.path();
      // what the entry is comes with the listing; only a link has to be followed
      let kind = match entry.file_type() {
        Ok(file_type) if file_type.is_dir() => Kind::Directory,
        Ok(file_type) if file_type.is_file() => Kind::File,
        _ => kind_of(&path)?,
      };
      Some((path, entry.file_name().to_string_lossy().to_string(), kind))
    })
    .collect();
  children.sort_by_cached_key(|(_, name, kind)| (*kind == Kind::File, name.to_lowercase(), name.clone()));
  children
}

fn directory_tree(
  path: &Path,
  kind: Kind,
  add_to_flat: &mut dyn FnMut(FileOrDirectory),
  state: &mut WalkState,
) -> Option<FileTree> {
  if state.at_limit() {
    return None;
  }
  let path_text = path.to_string_lossy().to_string();
  let name = name_of(path);

  if kind == Kind::File {
    state.entry_count += 1;
    add_to_flat(FileOrDirectory {
      path: path_text.clone(),
      name: name.clone(),
      type_: FileOrDirectoryType::File,
    });
    return Some(FileTree {
      path: path_text,
      name,
      type_: FileOrDirectoryType::File,
      children: None,
    });
  }

  // Cycle detection: skip directories we've already entered via their
  // canonical path. Without this, a symlink loop (`ln -s .. cycle`)
  // would recurse forever.
  if let Ok(canonical) = std::fs::canonicalize(path) {
    if !state.enter(canonical) {
      return Some(FileTree {
        path: path_text,
        name,
        type_: FileOrDirectoryType::Directory,
        children: Some(vec![]),
      });
    }
  }

  state.entry_count += 1;
  add_to_flat(FileOrDirectory {
    path: path_text.clone(),
    name: name.clone(),
    type_: FileOrDirectoryType::Directory,
  });

  // A child that is left out (typically because MAX_ENTRIES was reached deep
  // in the walk) does not take its parent with it: the root would otherwise
  // be reported with no children, which the view renders as a file.
  let mut children = vec![];
  for (child_path, child_name, child_kind) in children_of(path) {
    if state.at_limit() {
      break;
    }
    // also when it is a link to one: following it would walk all of it
    if child_kind == Kind::Directory && should_skip_dir(&child_name) {
      state.entry_count += 1;
      let opaque_path = child_path.to_string_lossy().to_string();
      add_to_flat(FileOrDirectory {
        path: opaque_path.clone(),
        name: child_name.clone(),
        type_: FileOrDirectoryType::Opaque,
      });
      children.push(FileTree {
        path: opaque_path,
        name: child_name,
        type_: FileOrDirectoryType::Opaque,
        children: None,
      });
      continue;
    }
    if let Some(child) = directory_tree(&child_path, child_kind, add_to_flat, state) {
      children.push(child);
    }
  }

  Some(FileTree {
    path: path_text,
    name,
    type_: FileOrDirectoryType::Directory,
    children: Some(children),
  })
}

/// The tree of a directory. An error when the directory is not there (or is
/// not a directory); whatever is wrong inside it only leaves entries out.
pub fn build(directory: String) -> Result<FileTreeAndFlat, BuildError> {
  let mut flattened: Vec<FileOrDirectory> = vec![];
  let mut state = WalkState::new();

  let root = Path::new(&directory);
  if kind_of(root) != Some(Kind::Directory) {
    return Err(BuildError(format!("{:?} is not a directory", directory)));
  }

  let tree = directory_tree(
    root,
    Kind::Directory,
    &mut |file_or_directory| flattened.push(file_or_directory),
    &mut state,
  )
  .ok_or_else(|| BuildError(format!("{:?} could not be read", directory)))?;

  Ok(FileTreeAndFlat { tree, flat: flattened })
}
