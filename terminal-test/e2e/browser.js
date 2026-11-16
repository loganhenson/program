// The real frontend in a real browser engine.
//
// terminal-pro's built frontend (its JavaScript, the Elm terminal, the CSS) is
// loaded in headless WebKit, the engine Tauri uses on macOS. Only the Tauri
// IPC is replaced: events go to `terminal-headless pty --acks`, so a real
// shell runs in a real PTY, and the page asks for its output batch by batch
// (`next_output`), which is also what holds output back until the page has
// dealt with what it has, exactly as in the app. Plugin calls (clipboard,
// opener, window) are recorded.
// What is tested here is what only exists in the browser: where a click
// lands, what gets copied, how the rows are laid out.
//
//   npm run e2e:browser      (builds terminal-pro's frontend first)
//   npx playwright install webkit      once, to get the browser

const { webkit } = require('playwright')
const { spawn } = require('child_process')
const os = require('os')
const path = require('path')

const REPO = path.join(__dirname, '../..')
const HEADLESS = path.join(REPO, 'terminal-server/target/debug/terminal-headless')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function open(viewport = { width: 900, height: 560 }) {
  const browser = await webkit.launch()
  const page = await browser.newPage({ viewport })
  const ptys = {}
  const outputs = {}
  let acknowledgements = 0
  const emitted = []
  const errors = []
  page.on('pageerror', error => errors.push(error.message))

  await page.exposeFunction('__emitted', (event, payload) => {
    emitted.push([event, payload])
    if (event === 'openTerminal') {
      const child = spawn(HEADLESS, ['pty', os.tmpdir(), '--acks'], { stdio: ['pipe', 'pipe', 'inherit'] })
      // a shell that has exited does not take what is written to it; that is not an error here
      child.stdin.on('error', () => {})
      ptys[payload.terminalId] = child
      const output = outputs[payload.terminalId] = { batches: [], waiting: [], closed: false }
      const wake = () => output.waiting.splice(0).forEach(resolve => resolve())
      let pending = ''
      child.stdout.on('data', data => {
        pending += data.toString()
        let newline
        while ((newline = pending.indexOf('\n')) >= 0) {
          const line = pending.slice(0, newline)
          pending = pending.slice(newline + 1)
          if (line) output.batches.push(JSON.parse(line))
        }
        wake()
      })
      child.on('exit', () => { output.closed = true; wake() })
    } else if (event === 'run' && ptys[payload.terminalId]) {
      ptys[payload.terminalId].stdin.write(JSON.stringify({ run: payload.contents }) + '\n')
    } else if (event === 'resize' && ptys[payload.terminalId]) {
      ptys[payload.terminalId].stdin.write(JSON.stringify({ resize: payload.size }) + '\n')
      page.evaluate(p => window.__dispatch('sendResizedToTerminal', p), payload).catch(() => {})
    } else if (event === 'closeTerminal' && ptys[payload.terminalId]) {
      ptys[payload.terminalId].kill()
    }
  })

  // The page asks for a terminal's next batch and says which one it has
  // taken: what the apps' `next_output` command does.
  await page.exposeFunction('__nextOutput', async ({ terminalId, acknowledged }) => {
    const output = outputs[terminalId]
    const child = ptys[terminalId]
    if (!output) return { state: 'unknown' }
    acknowledgements++
    if (child.exitCode === null && child.stdin.writable) child.stdin.write(JSON.stringify({ ack: acknowledged }) + '\n')
    if (!output.batches.length && !output.closed) {
      await Promise.race([new Promise(resolve => output.waiting.push(resolve)), sleep(2000)])
    }
    if (output.batches.length) {
      const { sequence, commands } = output.batches.shift()
      return { state: 'output', sequence, data: commands }
    }
    return { state: output.closed ? 'closed' : 'waiting' }
  })

  await page.addInitScript(() => {
    const listeners = {}
    window.__invoked = []
    window.__TAURI_INTERNALS__ = {
      metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main', windowLabel: 'main' } },
      transformCallback(callback) {
        const id = Math.floor(Math.random() * 1e9)
        window['_' + id] = callback
        return id
      },
      unregisterCallback() {},
      async invoke(command, args) {
        if (command === 'plugin:event|listen') { listeners[args.event] = args.handler; return args.handler }
        if (command === 'plugin:event|emit') { window.__emitted(args.event, args.payload); return null }
        if (command === 'next_output') return window.__nextOutput(args)
        window.__invoked.push([command, args])
        if (command === 'preflight') return { all_ok: true, results: [] }
        if (command === 'plugin:clipboard-manager|read_text') return window.__clipboard || ''
        if (command === 'plugin:clipboard-manager|write_text') { window.__clipboard = args.text ?? JSON.stringify(args); return null }
        return null
      },
    }
    window.__dispatch = (event, payload) => {
      const id = listeners[event]
      if (id !== undefined && window['_' + id]) window['_' + id]({ event, payload, id: 0 })
    }
  })

  await page.goto('file://' + path.join(REPO, 'terminal-pro/built/index.html'))

  const terminal = {
    page,
    emitted,
    // how often the page has asked for output (each time acknowledging what it had)
    asked: () => acknowledgements,
    errors,
    rows: () => page.evaluate(() => [...document.querySelectorAll('#terminal .terminal-row')].map(row => row.innerText)),
    invoked: command => page.evaluate(command => window.__invoked.filter(call => call[0] === command).map(call => call[1]), command),
    // wait until some row of the screen matches
    async waitFor(pattern, timeout = 15000) {
      const start = Date.now()
      while (Date.now() - start < timeout) {
        if ((await terminal.rows()).some(row => pattern.test(row))) return
        await sleep(50)
      }
      throw new Error(`timed out waiting for ${pattern} on the screen`)
    },
    // type a command and wait for what it prints
    async command(text, pattern) {
      await page.keyboard.type(text, { delay: 5 })
      await page.keyboard.press('Enter')
      if (pattern) await terminal.waitFor(pattern)
    },
    // the middle of a cell, in page coordinates (cells are 1 based, as programs count them)
    cell: (column, row) => page.evaluate(([column, row]) => {
      const screen = document.getElementById('terminal').getBoundingClientRect()
      const width = document.getElementById('character-width').getBoundingClientRect().width
      return { x: screen.left + (column - 0.5) * width, y: screen.top + (row - 0.5) * 24 }
    }, [column, row]),
    async close() {
      for (const child of Object.values(ptys)) child.kill()
      await browser.close()
    },
  }

  // the shell has started when its prompt is on the screen and it has been sized
  await terminal.waitFor(/\S/, 30000)
  await sleep(700)
  return terminal
}

// poll until the value satisfies the condition (or give up and return it)
async function until(read, condition, timeout = 5000) {
  const start = Date.now()
  let value = await read()
  while (!condition(value) && Date.now() - start < timeout) {
    await sleep(50)
    value = await read()
  }
  return value
}

function equal(actual, expected, what) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${what}\n      expected ${JSON.stringify(expected)}\n      actual   ${JSON.stringify(actual)}`)
  }
}

function ok(condition, what) {
  if (!condition) throw new Error(what)
}

const tests = {
  'the terminal is sized to the window and tells the shell': async t => {
    const size = t.emitted.filter(([event]) => event === 'resize').pop()[1].size
    const rows = (await t.rows()).length
    equal(rows, size.height, 'rows on the screen and rows the shell was told about')
    ok(size.width > 60 && size.height > 10, `an implausible size: ${JSON.stringify(size)}`)
    await t.command('stty size', new RegExp(`^${size.height} ${size.width}\\s*$`))
  },

  'text is drawn in the colors and attributes the program asked for': async t => {
    await t.command(`printf '\\033[31mred \\033[1;4;38;2;10;200;30mgreen\\033[0m \\033[7minverse\\033[0m\\n'`, /^red green inverse/)
    const styles = await t.page.evaluate(() => {
      const row = [...document.querySelectorAll('#terminal .terminal-row')].find(row => row.innerText.startsWith('red green'))
      return [...row.querySelectorAll('span')].map(span => {
        const style = getComputedStyle(span)
        return [span.innerText.trim(), style.color, style.fontWeight, style.textDecorationLine, style.backgroundColor]
      }).filter(entry => entry[0])
    })
    equal(styles.find(s => s[0] === 'red').slice(1, 2), ['rgb(194, 54, 33)'], 'the color of red text')
    equal(styles.find(s => s[0] === 'green').slice(1, 4), ['rgb(10, 200, 30)', '700', 'underline'], 'bold underlined true color text')
    ok(styles.find(s => s[0] === 'inverse')[4] !== 'rgba(0, 0, 0, 0)', 'inverse text has no background')
  },

  'a mouse click is reported for the cell that was clicked': async t => {
    await t.command(`clear; printf '\\033[?1000h\\033[?1006h'; cat -v`)
    await sleep(400)
    for (const [column, row] of [[11, 4], [1, 1], [40, 9]]) {
      const point = await t.cell(column, row)
      await t.page.mouse.click(point.x, point.y)
    }
    await t.waitFor(/\^\[\[<0;40;9m/)
    const reported = (await t.rows()).join('')
    ok(reported.includes('^[[<0;11;4M^[[<0;11;4m^[[<0;1;1M^[[<0;1;1m^[[<0;40;9M^[[<0;40;9m'), `clicks were reported as ${reported.trim()}`)
    await t.page.keyboard.press('Control+c')
    await t.command(`printf '\\033[?1000l\\033[?1006l'; clear`)
  },

  'the wheel scrolls a full screen program line by line': async t => {
    await t.command('seq 1 300 | less', /^1\s*$/)
    try {
      await sleep(300)
      await t.page.mouse.move(300, 300)
      await t.page.mouse.wheel(0, 120)
      const first = await until(async () => (await t.rows())[0].trim(), line => line !== '1')
      equal(first, '6', 'the first line after scrolling five lines (120 pixels)')
    } finally {
      await t.page.keyboard.type('q')
      await sleep(400)
    }
  },

  'copying a wrapped line gives the line back in one piece': async t => {
    const long = 'copy-' + 'abcdefghij'.repeat(14) + '-END'
    // (the command line ends in -END too, so wait for a line after the output)
    await t.command(`clear; echo ${long}; echo printed`, /^printed/)
    await t.page.evaluate(() => {
      const rows = [...document.querySelectorAll('#terminal .terminal-row')]
      const range = document.createRange()
      range.setStartBefore(rows[0])
      range.setEndAfter(rows[rows.length - 1])
      getSelection().removeAllRanges()
      getSelection().addRange(range)
    })
    await t.page.keyboard.press('Meta+c')
    await sleep(300)
    const copied = await t.page.evaluate(() => window.__clipboard || '')
    ok(copied.split('\n').includes(long), 'the wrapped output line was not copied as one line')
    ok(copied.split('\n').every(line => line === line.trimEnd()), 'copied lines end in padding')
    await t.page.evaluate(() => getSelection().removeAllRanges())
  },

  'Command+click opens links, and only links': async t => {
    await t.command(`clear; echo see https://example.com/docs?page=2, and more; printf '\\033]8;;https://example.org/marked\\033\\\\marked link\\033]8;;\\033\\\\ plain\\n'`, /^marked link plain/)
    const rows = await t.rows()
    const urlRow = rows.findIndex(row => row.startsWith('see https')) + 1
    const markedRow = rows.findIndex(row => row.startsWith('marked link')) + 1
    const click = async (column, row, modifier) => {
      const point = await t.cell(column, row)
      if (modifier) await t.page.keyboard.down('Meta')
      await t.page.mouse.click(point.x, point.y)
      if (modifier) await t.page.keyboard.up('Meta')
    }
    await click(10, urlRow, false) // without Command
    await click(2, urlRow, true) // on "see", not a link
    await click(10, urlRow, true) // on the address
    await click(3, markedRow, true) // on the marked hyperlink
    await click(15, markedRow, true) // on "plain"
    await sleep(300)
    equal((await t.invoked('plugin:opener|open_url')).map(args => args.url), ['https://example.com/docs?page=2', 'https://example.org/marked'], 'the links that were opened')
  },

  'the bell rings when the window is in front and asks for attention when it is not': async t => {
    await t.command(`printf '\\a'; sleep 0.5; echo rang`, /^rang/)
    equal((await t.invoked('bell')).length, 1, 'bells rung with the window in front')
    await t.page.evaluate(() => { document.hasFocus = () => false })
    await t.command(`printf '\\a'; sleep 0.5; echo rang again`, /^rang again/)
    equal((await t.invoked('bell')).length, 1, 'bells rung with the window in the background')
    equal((await t.invoked('plugin:window|request_user_attention')).length, 1, 'requests for attention')
    await t.page.evaluate(() => { delete document.hasFocus })
  },

  'box drawing characters fill their cell from top to bottom': async t => {
    await t.command(`clear; printf '\\342\\224\\214\\342\\224\\200\\342\\224\\220\\n\\342\\224\\202 \\342\\224\\202\\n\\342\\224\\224\\342\\224\\200\\342\\224\\230\\n'`, /^└─┘/)
    const cells = await t.page.evaluate(() => {
      const row = [...document.querySelectorAll('#terminal .terminal-row')].find(row => row.innerText.startsWith('│'))
      const cell = row.querySelector('.bx')
      const drawn = getComputedStyle(cell, '::before')
      return {
        rowHeight: row.getBoundingClientRect().height,
        cellHeight: cell.getBoundingClientRect().height,
        cellWidth: cell.getBoundingClientRect().width,
        characterWidth: document.getElementById('character-width').getBoundingClientRect().width,
        drawnHeight: parseFloat(drawn.height),
        image: drawn.backgroundImage.includes('gradient'),
        glyphHidden: getComputedStyle(cell).webkitTextFillColor,
      }
    })
    equal([cells.rowHeight, cells.cellHeight, cells.drawnHeight], [24, 24, 24], 'heights of the row, the cell and the drawing')
    ok(Math.abs(cells.cellWidth - cells.characterWidth) < 0.01, 'a drawn cell is not one character wide')
    ok(cells.image && cells.glyphHidden === 'rgba(0, 0, 0, 0)', 'the character is not drawn by the terminal')
    equal((await t.rows()).slice(0, 3).map(row => row.trimEnd()), ['┌─┐', '│ │', '└─┘'], 'the text is still there for copying')
  },

  'a narrower window wraps output again, a wider one joins it back, and the prompt appears once': async t => {
    const text = 'reflow-' + '0123456789'.repeat(12) + '-END'
    await t.command(`clear; echo ${text}; echo done`, /^done/)
    const logical = async () => {
      // rows marked as wrapped continue on the next row
      const parts = await t.page.evaluate(() => [...document.querySelectorAll('#terminal .terminal-row')].map(row => [row.innerText, row.dataset.wrapped === 'true']))
      const lines = [{ text: '', rows: 0 }]
      for (const [rowText, wrapped] of parts) {
        const line = lines[lines.length - 1]
        line.text += wrapped ? rowText : rowText.trimEnd()
        line.rows += 1
        if (!wrapped) lines.push({ text: '', rows: 0 })
      }
      return lines
    }
    for (const width of [420, 1100, 900]) {
      await t.page.setViewportSize({ width, height: 560 })
      await sleep(1200)
      const found = (await logical()).filter(line => line.text === text)
      equal(found.length, 1, `the long line of output at a width of ${width} pixels`)
      const columns = t.emitted.filter(([event]) => event === 'resize').pop()[1].size.width
      equal(found[0].rows, Math.ceil(text.length / columns), `rows the long line takes at ${columns} columns`)
    }
  },

  'a program that floods the screen can be stopped, and the terminal answers at once': async t => {
    // `yes` prints far faster than anything can draw. Nothing used to slow it
    // down: its output piled up on the way to the page (gigabytes within a
    // minute), and Ctrl+C sat behind that pile for minutes.
    await t.command('yes')
    await sleep(2500)
    const asked = t.asked()
    ok(asked > 5, `the page asked for output ${asked} times while it was flooded`)

    const pressed = Date.now()
    await t.page.keyboard.press('Control+c')
    await t.command('echo stop""ped', /^stopped/)
    const took = Date.now() - pressed
    // it used to be minutes; the limit is loose enough for a slow machine
    ok(took < 10000, `it took ${took}ms for the shell to answer after Ctrl+C`)
  },

  'a new tab gets the size of the window, and closing the last shell quits': async t => {
    await t.page.locator('[title="Open another terminal"]').click()
    await sleep(1500)
    const resizes = t.emitted.filter(([event]) => event === 'resize').map(([, payload]) => payload)
    const second = resizes.filter(payload => payload.terminalId === 'term-1').pop()
    const first = resizes.filter(payload => payload.terminalId === 'term-0').pop()
    ok(second, 'the new tab was never sized')
    equal(second.size, first.size, 'the size of the new tab')

    // ...and the shell in it has that size too. (The size used to be sent
    // only before the shell existed, so every tab after the first ran at the
    // 80x24 a shell starts with.)
    await t.command('stty size', /^\d+ \d+$/)
    const reported = (await t.rows()).filter(row => /^\d+ \d+$/.test(row.trim())).pop().trim()
    equal(reported, `${first.size.height} ${first.size.width}`, 'the size the shell in the new tab reports')
    await t.command('exit')
    await sleep(1500)
    ok(t.emitted.some(([event, payload]) => event === 'closeTerminal' && payload.terminalId === 'term-1'), 'the tab whose shell exited was not closed')
    equal((await t.invoked('plugin:process|exit')).length, 0, 'the app quit although a tab was still open')
    await t.command('exit')
    const exits = await until(async () => (await t.invoked('plugin:process|exit')).length, count => count > 0)
    equal(exits, 1, 'the app quits when its last shell exits')
  },
}

if (require.main === module) {
  ;(async () => {
    const only = process.argv.slice(2)
    const terminal = await open()
    let failed = 0
    for (const [name, test] of Object.entries(tests)) {
      if (only.length > 0 && !only.some(part => name.includes(part))) continue
      try {
        await test(terminal)
        console.log('ok   ' + name)
      } catch (error) {
        failed++
        console.log('FAIL ' + name + '\n     ' + error.message)
      }
    }
    if (terminal.errors.length > 0) {
      failed++
      console.log('FAIL the page raised errors\n     ' + terminal.errors.join('\n     '))
    }
    await terminal.close()
    process.exit(failed > 0 ? 1 : 0)
  })()
}

module.exports = { open, tests }
