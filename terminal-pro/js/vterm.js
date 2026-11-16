const terminals = require('./terminals.js')
import {readText, writeText} from '@tauri-apps/plugin-clipboard-manager'
import {exit} from '@tauri-apps/plugin-process';
import {getCurrentWindow} from '@tauri-apps/api/window'
import {characterWidth, fit, selectedText} from '../../terminal/js/dom.js'

let _debounce = function(ms, fn) {
  let timer;
  return function() {
    clearTimeout(timer);
    let args = Array.prototype.slice.call(arguments);
    args.unshift(this);
    timer = setTimeout(fn.bind.apply(fn, args), ms);
  };
};

module.exports = {
  handlers: {
    requestRunTerminal: ({ contents }) => {},
    requestResizeTerminal: ({ height, width }) => {},
  },
  data: {
    state: {
      directory: null,
    },
    // Active terminal id, pushed from Elm via setActiveContext. Used to
    // stamp outgoing resize emits since the ResizeObserver doesn't
    // otherwise know which tab is active.
    activeContext: { terminalId: null },
    // The size the visible area currently fits, so a tab that becomes
    // active can be brought to it without waiting for the window to resize.
    size: null,
  },
  registerOnRequestRunTerminal(handler) {
    this.handlers.requestRunTerminal = handler
  },
  registerOnTerminalResize(handler) {
    this.handlers.requestResizeTerminal = handler
  },
  start(listen, emit) {
    try {
      terminals.initialize(this, listen, emit)
      console.log(`initialized`)
    } catch (e) {
      console.log(`failed to initialize:` + e)
    }
  },
  sendOutputToTerminal(payload) {
    // payload = { terminalId, data }
    window.vterm.ports.receiveTerminalOutput.send(payload)
  },
  sendResizedToTerminal(payload) {
    // payload = { terminalId, size }
    window.vterm.ports.receiveTerminalResized.send(payload)
  },
  async initialize(state, listen, emit) {
    window.onkeydown = (event) => {
      event.preventDefault()
    }

    this.data.state = state

    await this.start(listen, emit)

    window.vterm = Elm.Main.init({
      flags: {
        directory: state.directory,
      },
      node: document.getElementById('vterm')
    })

    /**
     * Ports
     */
    window.vterm.ports.setActiveContext.subscribe((ctx) => {
      const switched = ctx.terminalId !== this.data.activeContext.terminalId
      this.data.activeContext = ctx
      getCurrentWindow().setTitle(ctx.title || 'TerminalPro').catch(() => {})

      // A new or previously hidden tab still has the size it had when it was
      // last visible (or the size every terminal starts with).
      if (switched && ctx.terminalId && this.data.size) {
        this.handlers.requestResizeTerminal({ terminalId: ctx.terminalId, ...this.data.size })
      }
    })

    window.vterm.ports.requestOpenTerminal.subscribe((payload) => {
      // payload = { terminalId, cwd }
      emit('openTerminal', payload)
    })

    window.vterm.ports.requestCloseTerminal.subscribe((payload) => {
      // payload = { terminalId }
      emit('closeTerminal', payload)
    })

    window.vterm.ports.requestRunTerminal.subscribe(({ terminalId, contents }) => {
      // Each terminal stamps its own id: replies to a program's queries
      // have to reach that program even when its tab is in the background.
      this.handlers.requestRunTerminal({
        terminalId: terminalId || this.data.activeContext.terminalId,
        contents,
      })
    })

    window.vterm.ports.requestPasteTerminal.subscribe(async () => {
      // The terminal decides how to send it (bracketed paste, line endings)
      const text = await readText()
      if (text) {
        window.vterm.ports.receiveTerminalPaste.send(text)
      }
    })

    window.vterm.ports.requestCopyTerminal.subscribe(async () => {
      const text = selectedText()
      if (text) {
        await writeText(text)
      }
    })

    // OSC 52: a program asked to put text on the clipboard
    window.vterm.ports.requestWriteClipboard.subscribe(async (text) => {
      await writeText(text)
    })

    window.vterm.ports.requestCharacterWidth.subscribe(() => {
      window.vterm.ports.receiveCharacterWidth.send(characterWidth())
    })

    // Programs can ask to be told when the terminal gains or loses focus
    window.addEventListener('focus', () => window.vterm.ports.receiveTerminalFocus.send(true))
    window.addEventListener('blur', () => window.vterm.ports.receiveTerminalFocus.send(false))

    window.vterm.ports.requestQuit.subscribe(async () => {
      await exit()
    })

    window.vterm.ports.requestSetupTerminalResizeObserver.subscribe(() => {
      let prevWidthIncrement = 0;
      let prevHeightIncrement = 0;
      const terminalResizeObserver = new ResizeObserver(_debounce(50, terminals => {
        if (terminals[0].contentRect.height <= 0 && terminals[0].contentRect.width <= 0) {
          return
        }

        // Subtract a row of slack — the macOS window's rounded bottom
        // corners clip a few pixels of whatever the last row would have
        // landed on, so we leave one row of breathing room to guarantee
        // the prompt is never hidden under the curve.
        const { width: w, height: h } = fit(terminals[0].contentRect)
        let nextWidthIncrement = w;
        let nextHeightIncrement = h;

        if (nextWidthIncrement !== prevWidthIncrement || nextHeightIncrement !== prevHeightIncrement) {
          prevWidthIncrement = nextWidthIncrement
          prevHeightIncrement = nextHeightIncrement
          this.data.size = { width: w, height: h }
          this.handlers.requestResizeTerminal({
            terminalId: this.data.activeContext.terminalId,
            width: w,
            height: h,
          })
        }
      }))

      // Observe #terminal-container, NOT #terminal. #terminal's height is
      // content-driven (grows with rendered rows), so observing it creates
      // a self-reinforcing PTY size that ignores the actual visible area —
      // the last rows end up below the window fold. #terminal-container
      // has h-full (= viewport), so its content rect is the real viewport.
      let interval = setInterval(() => {
        if (document.querySelector('#terminal-container')) {
          terminalResizeObserver.observe(document.querySelector('#terminal-container'))
          clearInterval(interval)
        }
      }, 200)
    })
  }
}
