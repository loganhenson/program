# EditorPro

Code editor app (Tauri, macOS).

## Runtime dependencies

Probed on launch. If anything is missing, the app shows install commands on startup:

- `fd` — `brew install fd`
- JetBrains Mono Nerd Font — `brew install --cask font-jetbrains-mono-nerd-font`

## Develop

```bash
cd src-tauri && cargo build   # build deps once
cd .. && npm install          # install npm deps (elm, tauri cli, esbuild, etc.)
npm run watch                 # live dev: elm + js + css + tauri all in concurrent watch
```

Two environment variables help when running the app from a terminal:

- `DEV_DIRECTORY=some/project` opens that project at startup instead of the
  welcome screen (`npm start` uses it).
- `EDITOR_DOM_DUMP=/tmp/editor.html` makes the app write what it is showing
  (the page's DOM) to that file once a second, so its state can be checked
  from a script or rendered in a browser without taking a screenshot.

```bash
npm test                      # Elm tests (tests/), then the Rust tests
```

## Build a release DMG locally

```bash
npm run build
# DMG lands in src-tauri/target/release/bundle/dmg/
```

CI produces release DMGs on tag push — see [`.github/workflows/release.yml`](../.github/workflows/release.yml).

## Test

```bash
npm test                        # runs the filetree cargo tests
cd src-tauri && cargo test      # runs all editor-pro Rust tests (filetree + main + preflight wiring)
```

## Launch from a shell

Drop this into your `.zshrc` to open a path with the app:

```bash
function e() {
  open -a EditorPro.app --args "$(realpath "$@")"
}
```

## Icon

`src-tauri/icons/icon.svg` is the source of the app icon. After changing it,
`node scripts/icons.js` (from the repository root) regenerates every size for
both apps.
