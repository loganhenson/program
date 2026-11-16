export default {
  async ready(editor, listen, emit) {},
  async initialize(editor, listen, emit) {
    await this.ready(editor, listen, emit)

    this.registerHandlers(editor, listen, emit)
  },
  registerHandlers(editor, listen, emit) {
    listen('output', event => {
      try {
        editor.sendOutputToTerminal(event.payload)
      } finally {
        // The backend sends no more than a couple of batches ahead of this:
        // a program that prints faster than the page draws is slowed down
        // instead of burying the page (and the keyboard) under its output.
        editor.acknowledgeTerminalOutput(event.payload)
      }
    });

    listen('sendResizedToTerminal', event => {
      editor.sendResizedToTerminal(event.payload)
    })

    editor.registerOnRequestRunTerminal(async ({ workspaceId, terminalId, contents }) => {
      emit('run', { workspaceId, terminalId, contents })
    })

    editor.registerOnTerminalResize(async ({ workspaceId, terminalId, height, width }) => {
      emit('resize', { workspaceId, terminalId, size: { height, width } })
    })
  }
}
