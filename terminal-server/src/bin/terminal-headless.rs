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
//!   terminal-headless pty [DIRECTORY] [--acks]
//!       Run the user's shell in a PTY. Every batch of commands is printed as
//!       one line of JSON. Lines read from stdin are JSON messages:
//!       {"run": "text"} writes to the PTY, {"resize": {"height": 24, "width": 80}}
//!       resizes it. Set TERMINAL_RAW_LOG=path to also record the raw bytes.
//!       With --acks output is held back as the apps hold it back: every
//!       line is {"sequence": n, "commands": [...]}, and after a couple of
//!       them no more are printed until an {"ack": n} line says that batch n
//!       was taken.

use std::io::{BufRead, Read, Write};
use std::sync::mpsc;
use terminal::parse::{pack, Stream};
use terminal::terminal::{start, Size};

fn main() {
    let args: Vec<String> = std::env::args().collect();
    match args.get(1).map(|s| s.as_str()) {
        Some("parse") => parse(args.get(2).and_then(|size| size.parse().ok())),
        Some("chunks") => chunks(),
        Some("pty") => {
            let wait_for_acks = args.iter().any(|arg| arg == "--acks");
            let directory = args.iter().skip(2).find(|arg| !arg.starts_with("--")).cloned();
            pty(directory.unwrap_or_else(|| "~".to_string()), wait_for_acks)
        }
        _ => {
            eprintln!("usage: terminal-headless parse [CHUNK_SIZE] | chunks | pty [DIRECTORY] [--acks]");
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
        // packed, as the apps send them to the screen
        let commands = pack(stream.feed(chunk));
        writeln!(out, "{}", serde_json::to_string(&commands).unwrap()).unwrap();
    }
}

fn chunks() {
    let mut stream = Stream::new();
    let stdout = std::io::stdout();
    let mut out = stdout.lock();
    for line in std::io::stdin().lock().lines() {
        let chunk: String = serde_json::from_str(&line.unwrap()).unwrap();
        let commands = pack(stream.feed(chunk.as_bytes()));
        writeln!(out, "{}", serde_json::to_string(&commands).unwrap()).unwrap();
    }
}

fn pty(directory: String, wait_for_acks: bool) {
    let (output_tx, output_rx) = mpsc::channel();
    let (resized_tx, resized_rx) = mpsc::channel();
    let api = match start(directory, output_tx, resized_tx) {
        Ok(api) => api,
        Err(error) => {
            eprintln!("{}", error);
            std::process::exit(1);
        }
    };
    // keep the shell alive for as long as this process runs
    let _kill_tx = api.kill_tx.clone();

    std::thread::spawn(move || for _ in resized_rx {});

    let run_tx = api.run_tx.clone();
    let resize_tx = api.resize_tx.clone();
    let flow_for_stdin = api.flow.clone();
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
            if let Some(sequence) = message.get("ack").and_then(|sequence| sequence.as_u64()) {
                flow_for_stdin.acknowledge(sequence);
            }
        }
    });

    let stdout = std::io::stdout();
    for batch in output_rx {
        let terminal::terminal::Batch { sequence, commands } = batch;
        let exited = commands.iter().any(|command| {
            matches!(command, terminal::parse::TerminalCommand::TerminalCommandSequence { command }
                if command == terminal::terminal::CHILD_EXITED)
        });
        let mut out = stdout.lock();
        // Whoever reads the output paces it: either by reading stdout at its
        // own speed (the default), or as a screen would when started with
        // --acks: each line is then {"sequence": n, "commands": [...]} and
        // is answered with {"ack": n}.
        if wait_for_acks {
            writeln!(out, "{}", serde_json::json!({ "sequence": sequence, "commands": commands })).unwrap();
        } else {
            writeln!(out, "{}", serde_json::to_string(&commands).unwrap()).unwrap();
        }
        out.flush().unwrap();
        if !wait_for_acks {
            api.flow.acknowledge(sequence);
        }
        if exited {
            break;
        }
    }
}
