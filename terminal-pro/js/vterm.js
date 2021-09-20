const terminals = require('./terminals.js')
import {readText, writeText} from '@tauri-apps/api/clipboard'
import {exit} from '@tauri-apps/api/process';

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
  sendOutputToTerminal(output) {
    window.vterm.ports.receiveTerminalOutput.send(output)
  },
  sendResizedToTerminal({ height, width }) {
    window.vterm.ports.receiveTerminalResized.send({ height, width })
  },
  async initialize(state, listen, emit) {
    window.onkeydown = (event) => {
      event.preventDefault()
    }

    // Required for plugins
    this.data.state = state

    await this.start(listen, emit)

    /**
     * Elm initialization
     */
    window.vterm = Elm.Main.init({
      flags: {
        directory: state.directory,
      },
      node: document.getElementById('vterm')
    })

    /**
     * Ports
     */
    window.vterm.ports.requestRunTerminal.subscribe(({ contents }) => {
      this.handlers.requestRunTerminal({ contents })
    })

    window.vterm.ports.requestPasteTerminal.subscribe(async () => {
      this.handlers.requestRunTerminal({
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
          console.log(w, h)
          prevWidthIncrement = nextWidthIncrement
          prevHeightIncrement = nextHeightIncrement
          this.handlers.requestResizeTerminal({
            width: w,
            height: h,
          })
        }
      }))

      if (document.querySelector('#terminal')) {
        terminalResizeObserver.observe(document.querySelector('#terminal'))
      }
    })
  }
}
