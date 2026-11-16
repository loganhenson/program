# Recordings for the readme

`docs/terminal-pro.gif` and `docs/editor-pro.gif` are made by these scripts:

```bash
cd terminal-test && npm ci && npx playwright install webkit && npm run e2e:build   # once
cd ../editor-pro && npm ci && npm run elm:optimize && npm run js && npm run css    # once
node scripts/recordings/terminal.js
node scripts/recordings/editor.js
```

They need `ffmpeg`, oh-my-zsh, and `php`, `claude` and `codex` on the `PATH`.
`DEMO_PROJECT` names the Laravel project they use, as a path below the home
directory (default `Desktop/getcaloric`).

## What is recorded

Each app's own built frontend runs in headless WebKit, the engine Tauri uses
on macOS. The Tauri IPC is replaced by a stand-in for the Rust backend: the
terminals are real shells in real PTYs, EditorPro's file tree comes from its
own walker, and files are read from disk. The programs on screen are really
running.

It is not a capture of the app's window, so there is no title bar and no mouse
pointer, and EditorPro's native folder picker is answered directly. While a
slow program is being waited for, the recording is paused.

## Before publishing a recording

The shell is started without your own configuration, history or credentials
(`zdot/.zshrc`), but the programs still show what they show. Each run writes
the text that was on screen to `out/*-text.txt`: read it, and watch the GIF.
