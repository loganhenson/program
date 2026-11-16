// Resizing must never lose or reorder text. Random lines are printed, the
// terminal is resized at random, and after every step the complete text
// (scrollback and screen, with wrapped rows joined back into lines) is
// compared with xterm.js, which rearranges text on resize as well.
//
// Only the text is compared, not where each row ends up: how much history is
// pulled back onto the screen when it grows is a matter of policy, and ours
// is deliberately different (history is not dragged back onto a screen that
// was cleared).
//
// xterm.js is a reference here, not a specification. Two things it does are
// left out of the comparison instead of being copied, and are covered by
// tests/Reflow.elm:
//  - it does not rearrange the line the cursor is on, so that line keeps its
//    old row breaks; every line printed here is finished, so the cursor is
//    always on an empty line;
//  - joining rows back together it can put a space inside a pair of wide
//    characters that were printed next to each other; only narrow characters
//    are printed here.
//
//   node e2e/reflow.js [CASES] [FIRST_SEED]

const { parseChunks, createOurs, createReference, lineText } = require('./harness')

function random(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Every line of text in our terminal, oldest first. */
async function ourLines(ours) {
  const dump = await ours.dump({ scrollback: true })
  const lines = [...dump.scrollback]
  let continues = dump.scrollbackContinues
  for (const row of dump.lines) {
    const text = lineText(row)
    if (continues) lines[lines.length - 1] += text
    else lines.push(text)
    continues = row.wrapped
  }
  return { lines: trim(lines), dump }
}

/** Every line of text in the reference, oldest first. */
function referenceLines(reference) {
  const buffer = reference.term.buffer.active
  const lines = []
  for (let i = 0; i < buffer.length; i++) {
    const line = buffer.getLine(i)
    const text = line.translateToString(false)
    if (line.isWrapped && lines.length > 0) lines[lines.length - 1] += text
    else lines.push(text)
  }
  return trim(lines)
}

function trim(lines) {
  const trimmed = lines.map(line => line.trimEnd())
  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === '') trimmed.pop()
  return trimmed
}

async function runCase(seed) {
  const next = random(seed)
  const int = (low, high) => low + Math.floor(next() * (high - low + 1))
  const pick = list => list[int(0, list.length - 1)]
  const words = ['a', 'bc', 'def', 'hello', 'world', 'terminal', 'x', '0123456789', 'The', 'quick', 'brown', 'fox', 'é', '─┼─']
  const line = () => Array.from({ length: int(0, 14) }, () => pick(words)).join(' ')

  let size = { rows: int(3, 12), cols: int(8, 40) }
  const ours = createOurs(size)
  const reference = createReference(size)
  const history = [`start ${size.rows}x${size.cols}`]

  for (let step = 0; step < 40; step++) {
    if (next() < 0.35) {
      size = { rows: int(2, 14), cols: int(4, 50) }
      ours.resize(size.rows, size.cols)
      reference.term.resize(size.cols, size.rows)
      history.push(`resize ${size.rows}x${size.cols}`)
    } else {
      const text = line() + '\r\n'
      ours.write(text)
      await reference.write(text)
      history.push(JSON.stringify(text))
    }

    const { lines, dump } = await ourLines(ours)
    const expected = referenceLines(reference)
    const problems = []
    if (JSON.stringify(lines) !== JSON.stringify(expected)) {
      const at = lines.findIndex((text, i) => text !== expected[i])
      const index = at < 0 ? Math.min(lines.length, expected.length) : at
      problems.push(`text differs at line ${index}:\n      ours      ${JSON.stringify(lines[index])}\n      reference ${JSON.stringify(expected[index])}`)
    }
    if (dump.height !== size.rows || dump.width !== size.cols) problems.push(`size is ${dump.height}x${dump.width}`)
    for (const row of dump.lines) {
      const columns = row.cells.length
      if (columns !== size.cols) problems.push(`a row has ${columns} cells`)
    }
    if (dump.cursor.y < 0 || dump.cursor.y >= size.rows || dump.cursor.x < 0 || dump.cursor.x > size.cols) {
      problems.push(`cursor (${dump.cursor.x},${dump.cursor.y}) is off the screen`)
    }
    if (problems.length > 0) return { seed, step, history, problems }
  }
  return null
}

if (require.main === module) {
  ;(async () => {
    const cases = Number(process.argv[2] || 200)
    const firstSeed = Number(process.argv[3] || 1)
    const failures = []
    for (let seed = firstSeed; seed < firstSeed + cases; seed++) {
      const failure = await runCase(seed)
      if (failure) failures.push(failure)
    }
    for (const failure of failures.slice(0, Number(process.env.SHOW || 4))) {
      console.log(`\nseed ${failure.seed} step ${failure.step}`)
      console.log('  ' + failure.history.slice(-6).join(' | ').slice(0, 500))
      for (const problem of failure.problems.slice(0, 3)) console.log('    ' + problem)
    }
    console.log(`\n${cases - failures.length} of ${cases} resize cases keep the same text as xterm.js`)
    process.exit(failures.length > 0 ? 1 : 0)
  })()
}

module.exports = { runCase }
