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

        let w = Math.floor(terminals[0].contentRect.width / 8.4)
        let h = Math.floor(terminals[0].contentRect.height / 24)
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

      // Re-observe whenever the DOM element changes (e.g., on tab switch
      // the active terminal's div re-renders). Polling is overkill — the
      // #terminal element is stable across tab switches because Elm just
      // swaps its inner content.
      let interval = setInterval(() => {
        if (document.querySelector('#terminal')) {
          terminalResizeObserver.observe(document.querySelector('#terminal'))
          clearInterval(interval)
        }
      }, 200)
    })
  }
}
