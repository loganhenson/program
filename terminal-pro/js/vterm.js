const terminals = require('./terminals.js')
import {readText, writeText} from '@tauri-apps/plugin-clipboard-manager'
import {exit} from '@tauri-apps/plugin-process';

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
    // stamp outgoing run/resize emits since the ResizeObserver and run
    // handler don't otherwise know which tab is active.
    activeContext: { terminalId: null },
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
      this.data.activeContext = ctx
    })

    window.vterm.ports.requestOpenTerminal.subscribe((payload) => {
      // payload = { terminalId, cwd }
      emit('openTerminal', payload)
    })

    window.vterm.ports.requestCloseTerminal.subscribe((payload) => {
      // payload = { terminalId }
      emit('closeTerminal', payload)
    })

    window.vterm.ports.requestRunTerminal.subscribe(({ contents }) => {
      this.handlers.requestRunTerminal({
        terminalId: this.data.activeContext.terminalId,
        contents,
      })
    })

    window.vterm.ports.requestPasteTerminal.subscribe(async () => {
      this.handlers.requestRunTerminal({
        terminalId: this.data.activeContext.terminalId,
        contents: await readText(),
      })
    })

    window.vterm.ports.requestCopyTerminal.subscribe(async () => {
      await writeText(window.getSelection().toString().replaceAll("\n", ""))
    })

    window.vterm.ports.requestCharacterWidth.subscribe(() => {
      window.vterm.ports.receiveCharacterWidth.send(
          document.getElementById('character-width').getBoundingClientRect().width
      )
    })

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
        let w = Math.floor(terminals[0].contentRect.width / 8.4)
        let h = Math.max(1, Math.floor(terminals[0].contentRect.height / 24) - 1)
        let nextWidthIncrement = Math.floor(w * 8.4);
        let nextHeightIncrement = Math.floor(h * 24);

        if (nextWidthIncrement !== prevWidthIncrement || nextHeightIncrement !== prevHeightIncrement) {
          prevWidthIncrement = nextWidthIncrement
          prevHeightIncrement = nextHeightIncrement
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
