module.exports = {
  async initialize(editor, listen, emit) {
    await listen('output', event => {
      editor.sendOutputToTerminal(event.payload)
    });

    await listen('sendResizedToTerminal', event => {
      editor.sendResizedToTerminal(event.payload)
    })

    editor.registerOnRequestRunTerminal(async ({ contents }) => {
      emit('run', contents)
    })

    editor.registerOnTerminalResize(async ({ height, width }) => {
      emit('resize', { height, width })
    })
  },
}
