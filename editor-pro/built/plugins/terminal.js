export default {
  async ready(editor, listen, emit) {},
  async initialize(editor, listen, emit) {
    await this.ready(editor, listen, emit)

    this.registerHandlers(editor, listen, emit)
  },
  registerHandlers(editor, listen, emit) {
    listen('output', event => {
      editor.sendOutputToTerminal(event.payload)
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
