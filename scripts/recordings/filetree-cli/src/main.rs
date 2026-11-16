// Prints the file tree EditorPro's backend would send for a directory, as JSON.
use std::sync::mpsc;
fn main() {
    let directory = std::env::args().nth(1).expect("directory");
    let (dir_tx, dir_rx) = mpsc::channel::<filetree::filetree::Request>();
    let (tree_tx, tree_rx) = mpsc::channel();
    filetree::filetree::start(dir_rx, tree_tx);
    dir_tx.send(filetree::filetree::Request::Load(directory)).unwrap();
    let tree = tree_rx.recv().unwrap();
    eprintln!("ok");
    let json = serde_json::to_string(&tree).unwrap();
    use std::io::Write;
    std::io::stdout().write_all(b"\x1e").unwrap();
    std::io::stdout().write_all(json.as_bytes()).unwrap();
}
