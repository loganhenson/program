// Differential fuzzing: random escape sequences are applied, one at a time, to
// our terminal and to xterm.js, and the two screens are compared after every
// step. The first step that makes them disagree is reported with everything
// needed to reproduce it.
//
//   node e2e/fuzz.js [CASES] [FIRST_SEED]

const { ESC, parseChunks, createOurs, createReference, compare } = require('./harness')

function random(seed) {
  // mulberry32
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function generator(seed, rows, cols) {
  const next = random(seed)
  const int = (low, high) => low + Math.floor(next() * (high - low + 1))
  const pick = list => list[int(0, list.length - 1)]
  const maybe = probability => next() < probability
  const count = () => (maybe(0.3) ? '' : String(int(0, Math.max(rows, cols) + 2)))
  const words = ['a', 'bc', 'def', 'hello', 'world', 'x', 'terminal', '0123456789', '~', 'The quick brown fox']
  const wide = ['日', '本', '語', '한', '글', '中']

  const text = () => {
    let out = ''
    const parts = int(1, 4)
    for (let i = 0; i < parts; i++) {
      out += maybe(0.15) ? pick(wide) : pick(words)
      if (maybe(0.3)) out += ' '
      if (maybe(0.05)) out += 'é'
    }
    return out
  }

  // xterm.js is a reference for finding our mistakes, not a specification.
  // Where it has a quirk of its own we keep the better behaviour and steer
  // the generator around the difference instead of copying it:
  //
  //  - DECALN (the screen alignment pattern) is plain text and resets the
  //    margins; xterm.js draws it in whatever colors are selected and keeps
  //    the margins. Colors are reset before it and the margins after it.
  //  - Insert/delete line outside the scroll region does nothing; xterm.js
  //    still takes the cursor out of "waiting past the last column". The
  //    cursor is returned to the first column first.
  //  - Back tab moves back from the last column also while the cursor waits
  //    past it; xterm.js ignores it there. The cursor is moved first.
  //  - Scrolling down fills with the current background like every other
  //    scroll; xterm.js alone uses the default one. It is reset first.
  //  - A full reset also resets automatic newline mode; xterm.js keeps it.
  //  - A restored cursor goes back to exactly where it was saved, including
  //    "waiting past the last column"; xterm.js moves it up by the number of
  //    lines that scrolled into the scrollback since and never restores the
  //    waiting state. Restores are followed by an explicit position.
  //  - Restoring the cursor also restores origin mode and auto wrap as they
  //    were when it was saved; xterm.js leaves them alone. Auto wrap is set
  //    explicitly after a restore.
  //  - Origin mode (DECOM): xterm.js adds the top margin twice on relative
  //    cursor movement. Origin mode is covered by the Elm unit tests instead.
  //  - Without auto wrap, xterm.js can leave half of a wide character behind
  //    in the last columns. Auto wrap is only turned off around narrow text.
  const place = () => `${ESC}[?7h${ESC}[${int(1, rows)};${int(1, cols)}H`
  const narrow = () => Array.from({ length: int(1, 4) }, () => pick(words)).join(' ')
  const withoutWrap = () => `${ESC}[?7l${narrow()}${ESC}[${count()}${pick(['C', 'D', 'G'])}${narrow()}${ESC}[?7h`

  const sgr = () => {
    const simple = [0, 1, 2, 3, 4, 7, 8, 9, 21, 22, 23, 24, 27, 28, 29, 39, 49, 53, 55]
    const parts = []
    const n = int(1, 3)
    for (let i = 0; i < n; i++) {
      const kind = int(0, 9)
      if (kind < 4) parts.push(pick(simple))
      else if (kind === 4) parts.push(int(30, 37))
      else if (kind === 5) parts.push(int(40, 47))
      else if (kind === 6) parts.push(pick([int(90, 97), int(100, 107)]))
      else if (kind === 7) parts.push(`${pick([38, 48])};5;${int(0, 255)}`)
      else if (kind === 8) parts.push(`${pick([38, 48])};2;${int(0, 255)};${int(0, 255)};${int(0, 255)}`)
      else parts.push('')
    }
    return `${ESC}[${parts.join(';')}m`
  }

  const operations = [
    [30, text],
    [6, () => '\r'],
    [8, () => '\n'],
    [4, () => '\r\n'],
    [3, () => '\b'],
    [4, () => '\t'],
    [8, () => `${ESC}[${int(0, rows + 2)};${int(0, cols + 2)}H`],
    [2, () => `${ESC}[H`],
    [2, () => `${ESC}[${int(1, rows)}H`],
    [10, () => `${ESC}[${count()}${pick(['A', 'B', 'C', 'D'])}`],
    [3, () => `${ESC}[${count()}${pick(['E', 'F'])}`],
    [3, () => `${ESC}[${count()}G`],
    [3, () => `${ESC}[${count()}d`],
    [6, () => `${ESC}[${pick(['', '0', '1', '2'])}K`],
    [4, () => `${ESC}[${pick(['', '0', '1', '2'])}J`],
    [4, () => `${ESC}[${count()}X`],
    [4, () => `${ESC}[${count()}@`],
    [4, () => `${ESC}[${count()}P`],
    [4, () => `\r${ESC}[${count()}L`],
    [4, () => `\r${ESC}[${count()}M`],
    [3, () => `${ESC}[${count()}S`],
    [3, () => `${ESC}[49m${ESC}[${count()}T`],
    [4, () => `${ESC}[${int(1, rows)};${int(1, rows)}r`],
    [2, () => `${ESC}[r`],
    [1, () => `${ESC}[${int(1, rows)}r`],
    [4, () => `${ESC}M`],
    [3, () => `${ESC}D`],
    [3, () => `${ESC}E`],
    [12, sgr],
    [3, () => `${ESC}7`],
    [3, () => `${ESC}8${place()}`],
    [1, () => `${ESC}[s`],
    [1, () => `${ESC}[u${place()}`],
    [1, () => `${ESC}[?1049h`],
    [1, () => `${ESC}[?1049l${place()}`],
    [1, () => `${ESC}[?47${pick(['h', 'l'])}`],
    [1, () => `${ESC}[?1047${pick(['h', 'l'])}`],
    [1, () => `${ESC}[?1048h`],
    [1, () => `${ESC}[?1048l${place()}`],
    [3, withoutWrap],
    [2, () => `${ESC}[4${pick(['h', 'l'])}`],
    [1, () => `${ESC}[20${pick(['h', 'l'])}`],
    [2, () => `${ESC}H`],
    [1, () => `${ESC}[${pick(['', '0', '3'])}g`],
    [2, () => `${ESC}[${count()}I`],
    [2, () => `${ESC}[C${ESC}[${count()}Z`],
    [2, () => `${pick(words)}${ESC}[${int(1, 6)}b`],
    [1, () => `${ESC}[m${ESC}#8${ESC}[r`],
    [1, () => `${ESC}[!p`],
    [1, () => `${ESC}c${ESC}[20l`],
    [2, () => `${ESC}(0lqqk${ESC}(B`],
    [1, () => `${ESC}[?25${pick(['h', 'l'])}`],
    [1, () => `${ESC}[?5${pick(['h', 'l'])}`],
    [1, () => `${ESC}]0;title${pick(['\x07', ESC + '\\'])}`],
    [1, () => `${ESC}[?2004h${ESC}[?1000;1006h${ESC}[?2026h${ESC}[?2026l`],
  ]
  const total = operations.reduce((sum, [weight]) => sum + weight, 0)

  return () => {
    let roll = next() * total
    for (const [weight, make] of operations) {
      roll -= weight
      if (roll < 0) return make()
    }
    return ''
  }
}

async function runCase(seed, { rows, cols, steps }) {
  const make = generator(seed, rows, cols)
  const operations = Array.from({ length: steps }, make)
  const batches = parseChunks(operations)
  const ours = createOurs({ rows, cols })
  const reference = createReference({ rows, cols })

  // xterm.js has bugs of its own: some sequences make it throw from inside a
  // timer. Such a case says nothing about our terminal and is skipped.
  let referenceCrashed
  const crashed = new Promise((_, reject) => (referenceCrashed = reject))
  crashed.catch(() => {})
  process.on('uncaughtException', referenceCrashed)

  try {
    for (let i = 0; i < operations.length; i++) {
      ours.output(batches[i])
      await Promise.race([reference.write(operations[i]), crashed])
      const differences = await compare(ours, reference)
      if (differences.length > 0) {
        return { seed, rows, cols, step: i, operation: operations[i], history: operations.slice(0, i + 1), differences }
      }
    }
    return null
  } catch (error) {
    return { seed, skipped: String(error && error.message) }
  } finally {
    process.off('uncaughtException', referenceCrashed)
  }
}

async function fuzz({ cases = 300, firstSeed = 1, steps = 60 } = {}) {
  const sizes = [{ rows: 6, cols: 20 }, { rows: 10, cols: 40 }, { rows: 4, cols: 10 }, { rows: 24, cols: 80 }]
  const failures = []
  for (let seed = firstSeed; seed < firstSeed + cases; seed++) {
    const size = sizes[seed % sizes.length]
    const failure = await runCase(seed, { ...size, steps })
    if (failure) failures.push(failure)
  }
  return failures
}

/** Print both screens for one case, at the step where they first differ. */
async function show(seed) {
  const sizes = [{ rows: 6, cols: 20 }, { rows: 10, cols: 40 }, { rows: 4, cols: 10 }, { rows: 24, cols: 80 }]
  const size = sizes[seed % sizes.length]
  const failure = await runCase(seed, { ...size, steps: 60 })
  if (!failure || failure.skipped) return console.log(failure ? `skipped: ${failure.skipped}` : 'no difference')

  const ours = createOurs(size)
  const reference = createReference(size)
  const batches = parseChunks(failure.history)
  for (let i = 0; i < failure.history.length; i++) {
    ours.output(batches[i])
    await reference.write(failure.history[i])
  }
  const dump = await ours.dump()
  const buffer = reference.term.buffer.active
  console.log(`seed ${seed} ${size.rows}x${size.cols}, step ${failure.step}`)
  console.log('history: ' + JSON.stringify(failure.history))
  console.log('parsed:  ' + JSON.stringify(batches[batches.length - 1]))
  for (const difference of failure.differences) console.log(difference)
  console.log(`cursor ours (${dump.cursor.x},${dump.cursor.y}) reference (${buffer.cursorX},${buffer.cursorY})`)
  for (let y = 0; y < size.rows; y++) {
    const text = dump.lines[y].cells.map(cell => cell.char).join('')
    console.log(String(y).padStart(2) + ' |' + text + '|   |' + buffer.getLine(buffer.baseY + y).translateToString(false) + '|')
  }
}

module.exports = { fuzz, runCase, show }

if (require.main === module && process.argv[2] === 'show') {
  show(Number(process.argv[3])).then(() => process.exit(0))
} else if (require.main === module) {
  const cases = Number(process.argv[2] || 300)
  const firstSeed = Number(process.argv[3] || 1)
  fuzz({ cases, firstSeed }).then(results => {
    const skipped = results.filter(result => result.skipped)
    const failures = results.filter(result => !result.skipped)
    const byOperation = {}
    for (const failure of failures) {
      const key = JSON.stringify(failure.operation.replace(/\d+/g, 'N'))
      ;(byOperation[key] = byOperation[key] || []).push(failure)
    }
    for (const [key, group] of Object.entries(byOperation).sort((a, b) => b[1].length - a[1].length).slice(0, Number(process.env.SHOW || 6))) {
      const failure = group.sort((a, b) => a.step - b.step)[0]
      console.log(`\n${group.length}x after ${key}; e.g. seed ${failure.seed} (${failure.rows}x${failure.cols}) step ${failure.step}: ${JSON.stringify(failure.operation)}`)
      console.log('  history: ' + JSON.stringify(failure.history.slice(-8).join('')))
      for (const difference of failure.differences.slice(0, 3)) console.log('    ' + difference)
    }
    if (skipped.length > 0) console.log(`\n${skipped.length} cases skipped because xterm.js threw (${skipped[0].skipped})`)
    console.log(`${cases - failures.length - skipped.length} of ${cases - skipped.length} cases agree with xterm.js`)
    process.exit(failures.length > 0 ? 1 : 0)
  })
}
