// Runs the real pipeline (Rust parser -> JSON commands -> Elm terminal) without
// a window, next to xterm.js as a reference implementation.
//
// Build first: `npm run e2e:build` (see package.json).

const path = require('path')
const { execFileSync } = require('child_process')
const { Terminal: XTerm } = require('@xterm/headless')

// Elm's Browser.Dom tasks look for the scroll container; there is none here.
global.document = global.document || { getElementById: () => null }

const HEADLESS = path.join(__dirname, '../../terminal-server/target/debug/terminal-headless')
const ESC = '\x1b'

// attribute bits, see Terminal.Screen
const BOLD = 1, DIM = 2, ITALIC = 4, UNDERLINE = 8, BLINK = 16, INVERSE = 32,
  INVISIBLE = 64, STRIKE = 128, DOUBLE_UNDERLINE = 256, OVERLINE = 512

/** Parse chunks of output with the Rust parser: one batch of commands per chunk. */
function parseChunks(chunks) {
  const input = chunks.map(chunk => JSON.stringify(chunk)).join('\n') + '\n'
  return execFileSync(HEADLESS, ['chunks'], { input, maxBuffer: 1 << 30 })
    .toString()
    .split('\n')
    .filter(line => line.length > 0)
    .map(line => JSON.parse(line))
}

/** Our terminal. `sent` collects everything it writes back to the program. */
function createOurs({ rows, cols }) {
  delete require.cache[require.resolve('./build/headless.js')]
  const { Elm } = require('./build/headless.js')
  const app = Elm.Headless.init()
  const ours = { sent: [], events: [] }
  const waiting = []

  app.ports.headlessOut.subscribe(message => {
    if (message.dump) waiting.shift()(message.dump)
    else if (typeof message.run === 'string') ours.sent.push(message.run)
    else ours.events.push(message)
  })

  ours.send = message => app.ports.headlessIn.send(message)
  ours.output = commands => ours.send({ output: commands })
  ours.resize = (height, width) => ours.send({ resize: { height, width } })
  ours.key = key => ours.send({
    key: { key: '', code: '', shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, ...key },
  })
  // Elm delivers outgoing port messages in order but not always in the same
  // tick, so the state is asked for and awaited. Everything the terminal sent
  // before the dump request (replies, title changes) has arrived by then.
  // The scrollback can be thousands of lines, so it is only included on request.
  ours.dump = ({ scrollback = false } = {}) => new Promise(resolve => {
    waiting.push(resolve)
    ours.send({ dump: scrollback })
  })
  /** Parse and apply raw output, optionally split into chunks. */
  ours.write = (...chunks) => {
    for (const commands of parseChunks(chunks)) ours.output(commands)
  }
  ours.text = async () => (await ours.dump()).lines.map(lineText)

  ours.resize(rows, cols)
  return ours
}

function lineText(line) {
  return line.cells.map(cell => cell.char).join('')
}

function createReference({ rows, cols, unicode11 = false }) {
  const term = new XTerm({ rows, cols, allowProposedApi: true, scrollback: 10000 })
  if (unicode11) {
    // emoji are two columns wide, as in every current terminal
    const { Unicode11Addon } = require('@xterm/addon-unicode11')
    term.loadAddon(new Unicode11Addon())
    term.unicode.activeVersion = '11'
  }
  return {
    term,
    write: data => new Promise(resolve => term.write(data, resolve)),
  }
}

function referenceColor(cell, foreground) {
  const isDefault = foreground ? cell.isFgDefault() : cell.isBgDefault()
  const isPalette = foreground ? cell.isFgPalette() : cell.isBgPalette()
  const value = foreground ? cell.getFgColor() : cell.getBgColor()
  if (isDefault) return 'default'
  if (isPalette) return 'p' + value
  return 'rgb' + ((value >> 16) & 255) + ',' + ((value >> 8) & 255) + ',' + (value & 255)
}

function referenceAttributes(cell) {
  return (cell.isBold() ? BOLD : 0) | (cell.isDim() ? DIM : 0) | (cell.isItalic() ? ITALIC : 0) |
    (cell.isUnderline() ? UNDERLINE : 0) | (cell.isBlink() ? BLINK : 0) | (cell.isInverse() ? INVERSE : 0) |
    (cell.isInvisible() ? INVISIBLE : 0) | (cell.isStrikethrough() ? STRIKE : 0) |
    (cell.isOverline() ? OVERLINE : 0)
}

function ourAttributes(attributes) {
  // xterm.js reports every underline style as "underline"
  const underline = attributes & (UNDERLINE | DOUBLE_UNDERLINE) ? UNDERLINE : 0
  return (attributes & ~(UNDERLINE | DOUBLE_UNDERLINE)) | underline
}

/**
 * Compare our screen with the reference. Returns a list of differences
 * (empty when the screens are the same).
 */
async function compare(ours, reference, options = {}) {
  return compareDump(await ours.dump(), reference, options)
}

/** Compare a dump of our screen (see `ours.dump()`) with the reference. */
function compareDump(dump, reference, { styles = true } = {}) {
  const buffer = reference.term.buffer.active
  const differences = []

  if (dump.cursor.x !== buffer.cursorX || dump.cursor.y !== buffer.cursorY) {
    differences.push(`cursor: ours (${dump.cursor.x},${dump.cursor.y}) reference (${buffer.cursorX},${buffer.cursorY})`)
  }

  for (let y = 0; y < dump.height; y++) {
    const line = buffer.getLine(buffer.baseY + y)
    const ourCells = dump.lines[y].cells
    let ourText = ''
    let referenceText = ''
    let styleDifference = null

    let previousWidth = 1
    for (let x = 0; x < dump.width; x++) {
      const cell = line.getCell(x)
      const our = ourCells[x]
      // The second half of a wide character has no text of its own. xterm.js
      // can leave such a half behind without its first half (inserting blanks
      // in the middle of a wide character); that cell is simply blank.
      const orphan = cell.getWidth() === 0 && previousWidth !== 2
      const chars = orphan ? ' ' : cell.getWidth() === 0 ? '' : (cell.getChars() || ' ')
      previousWidth = cell.getWidth()
      // (a column left empty because a wide character moved to the next row
      // has no text; the reference shows it as a blank)
      ourText += our.width === 0 ? '' : (our.char || ' ')
      referenceText += chars

      if (styles && !styleDifference && our.width !== 0 && cell.getWidth() !== 0) {
        const ourStyle = `${our.fg}/${our.bg}/${ourAttributes(our.attributes)}`
        const referenceStyle = `${referenceColor(cell, true)}/${referenceColor(cell, false)}/${referenceAttributes(cell)}`
        if (ourStyle !== referenceStyle) {
          styleDifference = `style at (${x},${y}): ours ${ourStyle} reference ${referenceStyle}`
        }
      }
    }

    if (ourText !== referenceText) {
      differences.push(`row ${y}:\n      ours      ${JSON.stringify(ourText)}\n      reference ${JSON.stringify(referenceText)}`)
    } else if (styleDifference) {
      differences.push(styleDifference)
    }
  }

  return differences
}

/** Feed the same output to both terminals and compare the result. */
async function differential({ rows, cols, chunks, styles = true }) {
  const ours = createOurs({ rows, cols })
  const reference = createReference({ rows, cols })
  ours.write(...chunks)
  for (const chunk of chunks) await reference.write(chunk)
  return { ours, reference, differences: await compare(ours, reference, { styles }) }
}

module.exports = { ESC, parseChunks, createOurs, createReference, compare, compareDump, differential, lineText }
