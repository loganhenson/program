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
      if (step.send) send(step.send)
      if (step.key) ours.key(step.key), await forwardReplies()
      if (step.paste) ours.send({ paste: step.paste }), await forwardReplies()
      if (step.expect && !step.expect.test(await screen())) problems.push(`expected ${step.expect} on screen`)
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
  for (const mark of marks) {
    await reference.write(raw.subarray(replayed, mark.bytes))
    replayed = mark.bytes
    for (const difference of compareDump(mark.dump, reference, { styles: scenario.styles !== false })) {
      differences.push(`[${mark.name}] ${difference}`)
    }
  }
  await reference.write(raw.subarray(replayed))
  differences.push(...(await compare(ours, reference, { styles: scenario.styles !== false })))
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
