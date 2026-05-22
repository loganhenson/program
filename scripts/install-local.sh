#!/usr/bin/env bash
# Build EditorPro and TerminalPro from the current checkout in release mode
# and install the .app bundles to /Applications, replacing any prior version.
#
# Intended to be run after a merge to main so this machine always has
# the latest published behavior — no waiting for a GitHub release.
#
# Usage: ./scripts/install-local.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

build_and_install() {
  local app_dir="$1"
  local app_name="$2"

  echo "==> Building $app_name"
  cd "$REPO_ROOT/$app_dir"

  # `npm ci` only if node_modules looks stale relative to lockfile
  if [[ ! -d node_modules ]] || [[ package-lock.json -nt node_modules ]]; then
    echo "    installing JS deps"
    npm ci
  fi

  npm run elm:optimize
  npm run js
  npm run css

  # `--bundles app` produces just the .app — skip the DMG step we use for releases.
  echo "    building Tauri .app bundle (release mode)"
  npx tauri build --bundles app

  local src="$REPO_ROOT/$app_dir/src-tauri/target/release/bundle/macos/$app_name.app"
  local dest="/Applications/$app_name.app"

  if [[ ! -d "$src" ]]; then
    echo "ERROR: expected bundle at $src" >&2
    exit 1
  fi

  # If the destination is held open by a running instance, the rm will
  # fail. Kill the process first so the swap is clean.
  pkill -f "$app_name.app/Contents/MacOS/" 2>/dev/null || true
  sleep 0.5

  echo "    installing to /Applications/$app_name.app"
  rm -rf "$dest"
  cp -R "$src" "$dest"

  # The freshly-built bundle has no quarantine attribute, but if a prior
  # GitHub-downloaded DMG version was here, strip it from /Applications
  # anyway as belt-and-suspenders.
  xattr -dr com.apple.quarantine "$dest" 2>/dev/null || true

  # Report the version we just installed
  local plist="$dest/Contents/Info.plist"
  if [[ -f "$plist" ]]; then
    local version
    version="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$plist" 2>/dev/null || echo '?')"
    echo "    installed $app_name $version"
  fi
}

build_and_install "editor-pro" "EditorPro"
build_and_install "terminal-pro" "TerminalPro"

echo
echo "Done. Both apps installed to /Applications."
