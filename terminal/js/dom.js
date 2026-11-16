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
