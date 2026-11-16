//! Drives the terminal backend without a window, for tests and debugging.
//!
//!   terminal-headless parse [CHUNK_SIZE] < raw-bytes
//!       Parse a recorded byte stream and print one JSON array of commands
//!       per chunk (CHUNK_SIZE bytes each, default: everything at once).
//!
//!   terminal-headless chunks < chunks.jsonl
//!       Every line of stdin is a JSON string holding one chunk of output.
//!       Prints one JSON array of commands per chunk; parser state carries
//!       over from chunk to chunk exactly as it does between PTY reads.
//!
//!   terminal-headless pty [DIRECTORY]
//!       Run the user's shell in a PTY. Every batch of commands is printed as
//!       one line of JSON. Lines read from stdin are JSON messages:
//!       {"run": "text"} writes to the PTY, {"resize": {"height": 24, "width": 80}}
//!       resizes it. Set TERMINAL_RAW_LOG=path to also record the raw bytes.

use std::io::{BufRead, Read, Write};
use std::sync::mpsc;
use terminal::parse::Stream;
use terminal::terminal::{start, Size};

fn main() {
    let args: Vec<String> = std::env::args().collect();
    match args.get(1).map(|s| s.as_str()) {
        Some("parse") => parse(args.get(2).and_then(|size| size.parse().ok())),
        Some("chunks") => chunks(),
        Some("pty") => pty(args.get(2).cloned().unwrap_or_else(|| "~".to_string())),
        _ => {
            eprintln!("usage: terminal-headless parse [CHUNK_SIZE] | chunks | pty [DIRECTORY]");
            std::process::exit(2);
        }
    }
}

fn parse(chunk_size: Option<usize>) {
    let mut bytes = vec![];
    std::io::stdin().read_to_end(&mut bytes).unwrap();

    let mut stream = Stream::new();
    let stdout = std::io::stdout();
    let mut out = stdout.lock();
    for chunk in bytes.chunks(chunk_size.unwrap_or(usize::MAX).max(1)) {
        let commands = stream.feed(chunk);
        writeln!(out, "{}", serde_json::to_string(&commands).unwrap()).unwrap();
    }
}

fn chunks() {
    let mut stream = Stream::new();
    let stdout = std::io::stdout();
    let mut out = stdout.lock();
    for line in std::io::stdin().lock().lines() {
        let chunk: String = serde_json::from_str(&line.unwrap()).unwrap();
        let commands = stream.feed(chunk.as_bytes());
        writeln!(out, "{}", serde_json::to_string(&commands).unwrap()).unwrap();
    }
}

fn pty(directory: String) {
    let (output_tx, output_rx) = mpsc::channel();
    let (resized_tx, resized_rx) = mpsc::channel();
    let api = start(directory, output_tx, resized_tx);
    // keep the shell alive for as long as this process runs
    let _kill_tx = api.kill_tx.clone();

    std::thread::spawn(move || for _ in resized_rx {});

    let run_tx = api.run_tx.clone();
    let resize_tx = api.resize_tx.clone();
    std::thread::spawn(move || {
        for line in std::io::stdin().lock().lines() {
            let line = match line {
                Ok(line) => line,
                Err(_) => break,
            };
            let message: serde_json::Value = match serde_json::from_str(&line) {
                Ok(message) => message,
                Err(_) => continue,
            };
            if let Some(text) = message.get("run").and_then(|run| run.as_str()) {
                let _ = run_tx.send(text.to_string());
            }
            if let Some(size) = message.get("resize") {
                if let Ok(size) = serde_json::from_value::<Size>(size.clone()) {
                    let _ = resize_tx.send(size);
                }
            }
        }
    });

    let stdout = std::io::stdout();
    for commands in output_rx {
        let exited = commands.iter().any(|command| {
            matches!(command, terminal::parse::TerminalCommand::TerminalCommandSequence { command }
                if command == terminal::terminal::CHILD_EXITED)
        });
        let mut out = stdout.lock();
        writeln!(out, "{}", serde_json::to_string(&commands).unwrap()).unwrap();
        out.flush().unwrap();
        if exited {
            break;
        }
    }
}
