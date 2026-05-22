# TerminalPro

Terminal emulator app (Tauri, macOS).

## Runtime dependencies

Probed on launch. If anything is missing, the app shows install commands on startup:

- JetBrains Mono Nerd Font — `brew install --cask font-jetbrains-mono-nerd-font`

## Develop

```bash
cd src-tauri && cargo build   # build deps once
cd .. && npm install          # install npm deps (elm, tauri cli, esbuild, etc.)
npm run watch                 # live dev: elm + js + css + tauri all in concurrent watch
```

## Build a release DMG locally

```bash
npm run build
# DMG lands in src-tauri/target/release/bundle/dmg/
```

CI also produces signed-ready DMGs on tag push — see [`.github/workflows/release.yml`](../.github/workflows/release.yml).

## Test

```bash
npm test
```
