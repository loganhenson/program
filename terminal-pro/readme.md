VTerm

## Install the font
- https://github.com/ryanoasis/nerd-fonts
> OSX
```console
brew install font-jetbrains-mono-nerd-font
```

## Work on it
- https://www.rust-lang.org/tools/install
- `rustup default nightly`

> Get tauri dev deps
- https://tauri.studio/en/docs/getting-started/setup-linux/

```console
cd src-tauri
cargo build
```

> Get npm deps (elm & tauri cli)
```console
npm install
```

> Build
```console
npm run watch
```

## Test
```console
npm run test
```

> Actual build
(`npm run build` proxies below)
```console
cd src-tauri
cargo tauri build
```

> Note: Linux will put the `.deb` file in `./target/release/bundle/deb/..`
