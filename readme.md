## Program Suite

A monorepo containing two macOS apps — a terminal emulator and a code editor — built on Tauri with an Elm frontend.

### Download

Pre-built DMGs for Apple Silicon Macs are attached to each [GitHub Release](../../releases):

- **TerminalPro** — `TerminalPro_*_aarch64.dmg`
- **EditorPro** — `EditorPro_*_aarch64.dmg`

> Apple Silicon (M-series) only. Intel Mac builds are not produced.

#### First-time launch

These DMGs are not signed with an Apple Developer ID, so macOS Gatekeeper will block them by default on first launch.

To run the app the first time:

1. Drag the app to `/Applications` from the mounted DMG.
2. Right-click (or Control-click) the app icon in Finder → **Open**.
3. macOS will show a Gatekeeper dialog; click **Open** again.

After the first launch, double-clicking works as normal.

#### Required tools

The apps probe for required tools on startup and walk you through installing anything missing. Today the required tools are:

- `fd` (file finder) — used by EditorPro for fuzzy file search
- JetBrains Mono Nerd Font — used by both apps for terminal glyphs and editor text

If anything is missing, the app shows the exact `brew` command to install it. The standard answers:

```bash
brew install fd
brew install --cask font-jetbrains-mono-nerd-font
```

---

## Repo layout

### `editor`
Elm library for implementing a text editor.

### `terminal`
Elm library for implementing a terminal emulator. Uses `editor`.

### `terminal-server`
Rust library that drives a PTY and parses terminal output. Used by both apps.

### `preflight`
Rust library that probes the host for required CLI tools and fonts. Returns a structured report consumed by the apps' startup gate.

### `terminal-pro`
Terminal emulator app (Tauri).
```bash
cd terminal-pro
npm install
npm run build   # produces a .dmg under src-tauri/target/release/bundle/dmg/
```

### `editor-pro`
Code editor app (Tauri).
```bash
cd editor-pro
npm install
npm run build
```

---

## Development

Each Tauri app supports a live dev mode:
```bash
cd terminal-pro    # or editor-pro
npm run dev
```

Tests:
```bash
cd editor && npm test                              # Elm editor library
cd terminal-test && npx elm-test                   # Elm terminal library
cd terminal-server && cargo test                   # Rust terminal-server lib
cd editor-pro/src-tauri/src/filetree && cargo test # Rust filetree lib
cd preflight && cargo test                         # Rust preflight lib
```

CI runs all of the above on every push and PR to `main` — see [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
