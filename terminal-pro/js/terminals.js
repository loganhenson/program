module.exports = {
  async initialize(editor, listen, emit) {
    await listen('output', event => {
      editor.sendOutputToTerminal(event.payload)
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
