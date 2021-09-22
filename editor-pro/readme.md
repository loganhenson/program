# Editor Pro

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

> Get npm deps (elm)
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

## Build for distribution
> Install the Tauri rust cli globally
```console
> cargo install tauri-cli --version ^1.0.0-beta
> cargo tauri --version
cargo-tauri 1.0.0-beta.0
```

> Actual build
(`npm run build` proxies below)
```console
cd src-tauri
cargo tauri build
```

## How to run it from cli on OSX
```console
./cli.sh $path
```

> Note: Linux will put the `.deb` file in `./target/release/bundle/deb/..`
