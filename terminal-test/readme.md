## Terminal Test

The demo application and the tests for the `terminal` library.

## Run test app
```bash
npm run start
```

## Run tests
```bash
npm run test
```
The tests in `tests/` drive the terminal with the commands the parser in
`terminal-server` produces (`tests/Support.elm` has the helpers) and check
the screen, the cursor, the styles and what the terminal sends back.

## Compare with xterm.js
```bash
npm run e2e          # differential fuzzing and resize checks, also run by CI
npm run e2e:live     # real programs (shell, vim, less, man, htop, nano, git)
```
Both run the real pipeline without a window: bytes go through the Rust parser
(`terminal-headless`, built from `terminal-server`), the resulting commands
through the Elm terminal (`src/Headless.elm`), and the same bytes through
[xterm.js](https://xtermjs.org) as a reference. The screens have to match cell
for cell: characters, colors, attributes and cursor position.

- `e2e/fuzz.js` applies random escape sequences one at a time and reports the
  first step where the screens differ. `node e2e/fuzz.js 2000 1` runs 2000
  cases starting at seed 1; `node e2e/fuzz.js show 42` prints both screens
  for seed 42. The few places where xterm.js is deliberately not followed are
  listed at the top of the generator.
- `e2e/reflow.js` prints random lines and resizes at random, and checks that
  no text is lost or reordered: the complete text (scrollback and screen, with
  wrapped rows joined) has to stay the same as in xterm.js.
- `e2e/live.js` runs programs in a PTY with the terminal answering their
  queries, and compares snapshots taken along the way. It depends on what is
  installed and on your shell configuration, so it is a local check.

## When a program misbehaves in the app
Start the app with `TERMINAL_RAW_LOG=/tmp/terminal.raw` set to record exactly
what the shell and its programs wrote. Then replay it:
```bash
../terminal-server/target/debug/terminal-headless parse < /tmp/terminal.raw   # the parsed commands
```
or feed the file to both terminals with `differential` from `e2e/harness.js`
to see where our screen and the reference part ways.
