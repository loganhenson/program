// Runs real programs in a PTY through the whole pipeline (PTY -> Rust parser
// -> Elm terminal, with the terminal's replies going back to the program) and
// compares the final screen with xterm.js fed the same bytes.
//
//   node e2e/live.js                 run every scenario
//   node e2e/live.js vim less        run the named scenarios
//   SHOW=1 node e2e/live.js vim      also print the final screen
//
// These depend on what is installed on the machine and on the user's shell
// configuration, so they are a local check rather than part of CI.

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')
const { createOurs, createReference, compare, compareDump, lineText, ESC } = require('./harness')

const HEADLESS = path.join(__dirname, '../../terminal-server/target/debug/terminal-headless')
const ROWS = 24
const COLS = 80

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function run(scenario) {
  const rawLog = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-live-')), 'raw.log')
  const env = { ...process.env, TERMINAL_RAW_LOG: rawLog, ...(scenario.env || {}) }
  for (const name of Object.keys(env)) {
    if ((scenario.unsetEnv || []).some(pattern => pattern.test(name))) delete env[name]
  }
  const child = spawn(HEADLESS, ['pty', scenario.cwd || os.tmpdir()], {
    env,
    stdio: ['pipe', 'pipe', 'inherit'],
  })
  const ours = createOurs({ rows: ROWS, cols: COLS })
  let exited = false
  let pending = ''
  let forwarded = 0
  let lastOutput = Date.now()

  const send = text => {
    lastOutput = Date.now()
    child.stdin.write(JSON.stringify({ run: text }) + '\n')
  }
  // whatever the terminal answers (cursor position, device attributes...)
  // goes straight back to the program, as it does in the app
  const forwardReplies = async () => {
    await ours.dump()
    while (forwarded < ours.sent.length) send(ours.sent[forwarded++])
  }

  child.stdout.on('data', data => {
    pending += data.toString()
    let newline
    while ((newline = pending.indexOf('\n')) >= 0) {
      const line = pending.slice(0, newline)
      pending = pending.slice(newline + 1)
      if (line.length === 0) continue
      const commands = JSON.parse(line)
      if (commands.some(command => command.command === 'child-exited')) exited = true
      ours.output(commands)
      lastOutput = Date.now()
      forwardReplies()
    }
  })

  const screen = async () => (await ours.dump()).lines.map(lineText).join('\n')
  const waitFor = async (pattern, timeout = 20000) => {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      if (pattern.test(await screen())) return true
      await sleep(50)
    }
    return false
  }
  const quiet = async (ms = 400, timeout = 15000) => {
    const start = Date.now()
    while (Date.now() - lastOutput < ms && Date.now() - start < timeout) await sleep(50)
  }

  const problems = []
  const snapshots = {}
  const marks = []
  try {
    for (const step of scenario.steps) {
      if (step.waitFor && !(await waitFor(step.waitFor, step.timeout))) {
        problems.push(`timed out waiting for ${step.waitFor}`)
        break
      }
      if (step.wait) await sleep(step.wait)
      if (step.quiet) await quiet(step.quiet, step.timeout)
      if (step.resize) {
        // as in the app: the PTY is resized (the shell gets SIGWINCH) and the
        // terminal is told its new size
        // The reference is resized at the same point in the output: whatever
        // the program writes from here on is for the new size. (Resize after
        // the program has gone quiet, or its last output is misplaced.)
        marks.push({ resize: step.resize, bytes: fs.existsSync(rawLog) ? fs.statSync(rawLog).size : 0 })
        lastOutput = Date.now()
        child.stdin.write(JSON.stringify({ resize: { height: step.resize[0], width: step.resize[1] } }) + '\n')
        ours.resize(step.resize[0], step.resize[1])
      }
      if (step.send) send(step.send)
      if (step.key) ours.key(step.key), await forwardReplies()
      if (step.paste) ours.send({ paste: step.paste }), await forwardReplies()
      if (step.expect && !step.expect.test(await screen())) problems.push(`expected ${step.expect} on screen`)
      if (step.expectNot && step.expectNot.test(await screen())) problems.push(`did not expect ${step.expectNot} on screen`)
      if (step.check) {
        // a function of everything the terminal holds: returns a problem or nothing
        const dump = await ours.dump({ scrollback: true })
        const rows = dump.lines.map(lineText)
        const problem = step.check({ rows, scrollback: dump.scrollback, text: [...dump.scrollback, ...rows].join('\n'), cursor: dump.cursor, dump })
        if (problem) problems.push(problem)
      }
      if (step.snapshot) {
        // Remember the screen and how much output had been written by now, so
        // the reference can be compared at the same point. Only meaningful
        // once the program has gone quiet.
        const dump = await ours.dump()
        snapshots[step.snapshot] = dump.lines.map(lineText).join('\n')
        marks.push({ name: step.snapshot, dump, bytes: fs.existsSync(rawLog) ? fs.statSync(rawLog).size : 0 })
      }
      if (step.expectExit) {
        const start = Date.now()
        while (!exited && Date.now() - start < 5000) await sleep(50)
        if (!exited) problems.push('the shell did not exit')
      }
    }
    await quiet(500)
  } finally {
    child.stdin.end()
    child.kill()
  }

  // Replay exactly what the program wrote into the reference terminal
  const reference = createReference({ rows: ROWS, cols: COLS, unicode11: true })
  const raw = fs.existsSync(rawLog) ? fs.readFileSync(rawLog) : Buffer.alloc(0)
  const differences = []
  let replayed = 0
  // Scenarios that resize the primary screen set `compare: false`: xterm.js
  // does not rearrange the line the cursor is on, so the two would differ by
  // design. They state what they expect with `check` instead.
  const comparing = scenario.compare !== false
  for (const mark of marks) {
    await reference.write(raw.subarray(replayed, mark.bytes))
    replayed = mark.bytes
    if (mark.resize) {
      reference.term.resize(mark.resize[1], mark.resize[0])
    } else if (comparing) {
      for (const difference of compareDump(mark.dump, reference, { styles: scenario.styles !== false })) {
        differences.push(`[${mark.name}] ${difference}`)
      }
    }
  }
  await reference.write(raw.subarray(replayed))
  if (comparing) differences.push(...(await compare(ours, reference, { styles: scenario.styles !== false })))
  fs.rmSync(path.dirname(rawLog), { recursive: true, force: true })

  return { ours, reference, differences, problems, snapshots, raw, bytes: raw.length, screen: await screen(), sent: ours.sent.join('') }
}

// Whatever the prompt looks like: wait for the shell to print something and
// then to go quiet.
const prompt = /\S/
const shell = steps => [{ waitFor: prompt, timeout: 30000 }, { quiet: 700 }, ...steps]

const scenarios = {
  shell: {
    steps: shell([
      { send: 'echo hello from the terminal\r' },
      { waitFor: /^hello from the terminal/m },
      { send: 'ls -la /usr\r' },
      { waitFor: /local/ },
      { quiet: 500, expect: /hello from the terminal/ },
    ]),
  },
  colors: {
    steps: shell([
      { send: `for i in {0..255}; do printf '\\e[48;5;%dm \\e[0m' $i; done; echo; printf '\\e[1;3;4;38;2;255;100;0mstyled\\e[0m \\e[7minverse\\e[27m \\e[9mstrike\\e[29m \\e[2mdim\\e[22m\\n'\r` },
      { waitFor: /styled inverse strike dim/ },
      { quiet: 500 },
    ]),
  },
  unicode: {
    steps: shell([
      { send: `printf '%s\\n' '日本語 wide' 'box ┌─┬─┐ │ │ └─┴─┘' 'combining é ñ' '⏺ ✻ ⎿ ✓ ❯ ▐▛███▜▌'\r` },
      { waitFor: /^⏺ ✻ ⎿ ✓/m },
      { quiet: 500 },
    ]),
  },
  vim: {
    steps: shell([
      { send: 'vim -u NONE -N\r' },
      { waitFor: /VIM - Vi IMproved|~/ },
      { quiet: 500 },
      { send: 'ihello vim\x1bo second line\x1b' },
      { quiet: 500 },
      { send: ':set number\r' },
      { quiet: 500, expect: /1 hello vim/, snapshot: 'vim: two lines, numbered' },
      { send: 'yy10p' },
      { quiet: 500, snapshot: 'vim: pasted lines' },
      { send: ':%s/line/LINE/g\r' },
      { quiet: 500 },
      { send: 'ggdd\x04\x15' },
      { quiet: 500, snapshot: 'vim: scrolled' },
      { send: ':q!\r' },
      { quiet: 700 },
    ]),
  },
  less: {
    steps: shell([
      { send: 'seq 1 500 | less\r' },
      { waitFor: /^23 *$/m },
      { quiet: 300, snapshot: 'less: first page' },
      { send: ' ' },
      { quiet: 300, snapshot: 'less: second page' },
      { send: 'G' },
      { quiet: 300, expect: /^500 *$/m, snapshot: 'less: end' },
      { send: 'bkkj' },
      { quiet: 300, snapshot: 'less: scrolled back' },
      { send: 'q' },
      { quiet: 700 },
    ]),
  },
  man: {
    steps: shell([
      { send: 'man ls\r' },
      { waitFor: /LS\(1\)/ },
      { quiet: 500, snapshot: 'man: first page' },
      { send: ' ' },
      { quiet: 300, snapshot: 'man: second page' },
      { send: 'q' },
      { quiet: 700 },
    ]),
  },
  htop: {
    steps: shell([
      { send: 'htop\r' },
      { waitFor: /PID|CPU|Mem/ },
      { quiet: 300, timeout: 2000 },
      { send: 'q' },
      { quiet: 700 },
    ]),
  },
  nano: {
    steps: shell([
      { send: 'nano\r' },
      { waitFor: /Exit|\^X/ },
      { quiet: 300, snapshot: 'nano: empty' },
      { send: 'typed into nano\rsecond line' },
      { quiet: 300, expect: /typed into nano/, snapshot: 'nano: text' },
      { send: '\x18n' },
      { quiet: 700 },
    ]),
  },
  git: {
    cwd: path.join(__dirname, '../..'),
    steps: shell([
      { send: 'git --no-pager log --oneline --graph --color=always -15\r' },
      { waitFor: /\* [0-9a-f]{7}/ },
      { quiet: 500 },
      { send: 'git --no-pager diff --stat --color=always HEAD~3 HEAD | tail -20\r' },
      { quiet: 800 },
    ]),
  },
  exit: {
    steps: shell([{ send: 'exit\r' }, { expectExit: true }]),
  },

  // A shell redraws its prompt and the command being typed when the window
  // changes size. The prompt has to end up on the screen exactly once and the
  // output above it has to survive, at every size.
  'resize-prompt': {
    compare: false,
    steps: shell([
      { send: 'echo one; echo two\r' },
      { waitFor: /^two *$/m },
      { quiet: 500 },
      { send: 'echo this-is-a-long-command-line that will need to wrap when the window gets narrow 1234567890' },
      { quiet: 500, check: promptOnce('typed') },
      { resize: [24, 40] },
      { quiet: 900, check: promptOnce('narrowed to 40 columns') },
      { resize: [24, 100] },
      { quiet: 900, check: promptOnce('widened to 100 columns') },
      { resize: [10, 60] },
      { quiet: 900, check: promptOnce('10 rows of 60 columns') },
      { resize: [30, 25] },
      { quiet: 900, check: promptOnce('25 columns') },
      { resize: [24, 80] },
      { quiet: 900, check: promptOnce('back to 80 columns') },
      { send: '\r' },
      { quiet: 900, check: ({ rows }) => (count(rows.join(''), 'this-is-a-long-command-line that will need to wrap') === 2 ? null : 'the command did not run cleanly after resizing') },
    ]),
  },

  // Output that wrapped is wrapped again at the new width and joins back up,
  // without losing a character.
  'resize-output': {
    compare: false,
    steps: shell([
      { send: "echo $(seq 1 70) | tr ' ' '-'; echo END-OF-OUTPUT\r" },
      { waitFor: /^END-OF-OUTPUT/m },
      { quiet: 500, check: outputIntact('at 80 columns') },
      { resize: [24, 30] },
      { quiet: 900, check: outputIntact('narrowed to 30 columns') },
      { resize: [8, 30] },
      { quiet: 900, check: outputIntact('8 rows of 30 columns') },
      { resize: [24, 200] },
      { quiet: 900, check: outputIntact('widened to 200 columns') },
      { resize: [24, 80] },
      { quiet: 900, check: outputIntact('back to 80 columns') },
    ]),
  },

  // A full screen program redraws itself for the new size.
  'resize-vim': {
    steps: shell([
      { send: 'vim -u NONE -N\r' },
      { waitFor: /VIM - Vi IMproved|~/ },
      { quiet: 500 },
      { send: ':set number\r' },
      { send: 'ihello vim\x1byy30p' },
      { quiet: 500, snapshot: 'vim at 24x80' },
      { resize: [12, 50] },
      { quiet: 900, snapshot: 'vim at 12x50', expect: /hello vim/ },
      { resize: [30, 100] },
      { quiet: 900, snapshot: 'vim at 30x100', expect: /hello vim/ },
      { send: ':q!\r' },
      { quiet: 700 },
    ]),
  },
}

function count(text, part) {
  return text.split(part).length - 1
}

// The command being typed is on the screen once (wrapped rows are as wide as
// the screen, so joining the rows gives the text back), and the output above
// the prompt is still there.
function promptOnce(when) {
  return ({ rows, text }) => {
    const typed = count(rows.join(''), 'echo this-is-a-long-command-line')
    if (typed !== 1) return `${when}: the command being typed is on the screen ${typed} times`
    if (!/^one *$/m.test(text) || !/^two *$/m.test(text)) return `${when}: output above the prompt was lost`
    return null
  }
}

const SEQUENCE = Array.from({ length: 70 }, (_, i) => i + 1).join('-')

// The long line of output is there exactly once, complete, in the scrollback
// or on the screen. Scrollback lines are whole lines; rows on the screen are
// joined where they are wrapped.
function outputIntact(when) {
  return ({ dump, scrollback }) => {
    const lines = [...scrollback]
    let continues = dump.scrollbackContinues
    for (const row of dump.lines) {
      const text = lineText(row)
      if (continues) lines[lines.length - 1] += text
      else lines.push(text)
      continues = row.wrapped
    }
    const found = lines.filter(line => line.trimEnd() === SEQUENCE).length
    return found === 1 ? null : `${when}: the long line of output is there ${found} times as one complete line`
  }
}

module.exports = { run, scenarios, shell, prompt, sleep, ROWS, COLS }

if (require.main === module) {
  ;(async () => {
    const names = process.argv.slice(2).length > 0 ? process.argv.slice(2) : Object.keys(scenarios)
    let failed = 0
    for (const name of names) {
      const scenario = scenarios[name]
      if (!scenario) {
        console.log(`unknown scenario ${name}`)
        failed++
        continue
      }
      const result = await run(scenario)
      // RAW_DIR=some/dir keeps the recorded byte stream of every scenario
      if (process.env.RAW_DIR) fs.writeFileSync(path.join(process.env.RAW_DIR, name + '.raw'), result.raw)
      const ok = result.differences.length === 0 && result.problems.length === 0
      if (!ok) failed++
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} (${result.bytes} bytes of output)`)
      for (const problem of result.problems) console.log('     ' + problem)
      for (const difference of result.differences.slice(0, 6)) console.log('     ' + difference)
      if (process.env.SHOW || !ok) console.log(result.screen.split('\n').map(line => '     |' + line + '|').join('\n'))
    }
    process.exit(failed > 0 ? 1 : 0)
  })()
}
