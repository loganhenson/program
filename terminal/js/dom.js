// Helpers for applications embedding the Elm terminal (see Terminal.view):
// what the DOM knows that Elm does not.

export const LINE_HEIGHT = 24
const DEFAULT_CHARACTER_WIDTH = 8.4

// The width of one cell, measured from the font actually in use.
export function characterWidth() {
  const measure = document.getElementById('character-width')
  const width = measure ? measure.getBoundingClientRect().width : 0
  return width > 0 ? width : DEFAULT_CHARACTER_WIDTH
}

// How many rows and columns fit in an area of the given size. One row is left
// free: the rounded bottom corners of a macOS window clip whatever the last
// row would land on.
export function fit({ width, height }) {
  return {
    width: Math.max(1, Math.floor(width / characterWidth())),
    height: Math.max(1, Math.floor(height / LINE_HEIGHT) - 1),
  }
}

// The selected text as the program printed it: a line that was wrapped at the
// right margin is joined back together, and the padding at the end of each
// line is dropped.
export function selectedText() {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return ''
  }

  const range = selection.getRangeAt(0)
  const rows = [...document.querySelectorAll('#terminal-container .terminal-row')]
    .filter(row => selection.containsNode(row, true))
  if (rows.length === 0) {
    return selection.toString()
  }

  let text = ''
  rows.forEach((row, index) => {
    const part = document.createRange()
    part.selectNodeContents(row)
    if (range.compareBoundaryPoints(Range.START_TO_START, part) > 0) {
      part.setStart(range.startContainer, range.startOffset)
    }
    if (range.compareBoundaryPoints(Range.END_TO_END, part) < 0) {
      part.setEnd(range.endContainer, range.endOffset)
    }
    const last = index === rows.length - 1
    if (row.dataset.wrapped === 'true') {
      text += part.toString()
    } else {
      text += part.toString().trimEnd() + (last ? '' : '\n')
    }
  })
  return text
}

// Box drawing and block characters are drawn by the font for its own line
// height; the rows are taller. Measure how tall the font draws a full-height
// vertical line and tell the stylesheet how much to stretch (see `.box` in
// Terminal.elm), so that borders connect from one row to the next.
export function applyBoxStretch() {
  const container = document.getElementById('terminal-container')
  if (!container) {
    return
  }
  const style = getComputedStyle(container)
  const context = document.createElement('canvas').getContext('2d')
  context.font = `${style.fontSize} ${style.fontFamily}`
  const metrics = context.measureText('\u2502')
  const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
  if (height > 0) {
    // never squash, and never stretch beyond what a sane font would need
    const stretch = Math.min(2, Math.max(1, LINE_HEIGHT / height))
    document.documentElement.style.setProperty('--terminal-box-stretch', stretch.toFixed(4))
  }
}

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"'`\u0000-\u001f]+/g

// The text of the whole line under a point (wrapped rows joined) and the
// position of the point in it.
function lineAtPoint(x, y) {
  const caret = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null
  if (!caret) {
    return null
  }
  const node = caret.startContainer.nodeType === Node.ELEMENT_NODE ? caret.startContainer : caret.startContainer.parentElement
  const row = node && node.closest('.terminal-row')
  if (!row) {
    return null
  }

  const before = document.createRange()
  before.selectNodeContents(row)
  before.setEnd(caret.startContainer, caret.startOffset)
  let offset = before.toString().length
  let text = row.textContent

  const isRow = element => element && element.classList.contains('terminal-row')
  for (let previous = row.previousElementSibling; isRow(previous) && previous.dataset.wrapped === 'true'; previous = previous.previousElementSibling) {
    text = previous.textContent + text
    offset += previous.textContent.length
  }
  for (let current = row; current.dataset.wrapped === 'true' && isRow(current.nextElementSibling); current = current.nextElementSibling) {
    text += current.nextElementSibling.textContent
  }
  return { text, offset }
}

// The link under a mouse event: an explicit hyperlink the program marked
// (OSC 8), or a URL that is simply part of the text.
export function linkAt(event) {
  const marked = event.target.closest && event.target.closest('#terminal-container [data-href]')
  if (marked) {
    return marked.dataset.href
  }
  if (!event.target.closest || !event.target.closest('#terminal-container')) {
    return null
  }

  const line = lineAtPoint(event.clientX, event.clientY)
  if (!line) {
    return null
  }
  for (const match of line.text.matchAll(URL_PATTERN)) {
    // punctuation that ends a sentence is not part of the address
    const url = match[0].replace(/[.,;:!?'")\]}>]+$/, '')
    if (line.offset >= match.index && line.offset <= match.index + url.length) {
      return url
    }
  }
  return null
}

// Command+click opens links. `open` receives the URL; only web and mail
// addresses are passed on, whatever a program put in a hyperlink.
export function installLinkHandling(open) {
  const held = event => document.body.classList.toggle('terminal-links-active', event.metaKey)
  window.addEventListener('keydown', held)
  window.addEventListener('keyup', held)
  window.addEventListener('blur', () => document.body.classList.remove('terminal-links-active'))

  window.addEventListener('click', event => {
    if (!event.metaKey) {
      return
    }
    const url = linkAt(event)
    if (url && /^(https?:\/\/|mailto:)/i.test(url)) {
      event.preventDefault()
      open(url)
    }
  })
}

// The terminal bell. With the window in front it is a short, quiet tone;
// otherwise `attention` is called (bounce the dock icon, flash the taskbar).
// A program ringing the bell in a loop gets one ring every 200ms.
export function createBell(attention) {
  let audio = null
  let last = 0

  return () => {
    const now = Date.now()
    if (now - last < 200) {
      return
    }
    last = now

    if (!document.hasFocus()) {
      attention()
      return
    }

    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audio.createOscillator()
      const gain = audio.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = 660
      gain.gain.setValueAtTime(0.06, audio.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.12)
      oscillator.connect(gain).connect(audio.destination)
      oscillator.start()
      oscillator.stop(audio.currentTime + 0.12)
    } catch (error) {
      // no audio device, or audio not allowed yet: stay silent
    }
  }
}
