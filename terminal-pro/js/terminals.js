module.exports = {
  async initialize(editor, listen, emit) {
    await listen('output', event => {
      try {
        editor.sendOutputToTerminal(event.payload)
      } finally {
        // The backend sends no more than a couple of batches ahead of this:
        // a program that prints faster than the page draws is slowed down
        // instead of burying the page (and the keyboard) under its output.
        editor.acknowledgeTerminalOutput(event.payload)
      }
    });

    await listen('sendResizedToTerminal', event => {
      editor.sendResizedToTerminal(event.payload)
    })

    editor.registerOnRequestRunTerminal(async ({ terminalId, contents }) => {
      emit('run', { terminalId, contents })
    })

    editor.registerOnTerminalResize(async ({ terminalId, height, width }) => {
      emit('resize', { terminalId, size: { height, width } })
    })
  },
}
