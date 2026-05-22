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

    editor.registerOnRequestRunTerminal(async ({ workspaceId, contents }) => {
      emit('run', { workspaceId, contents })
    })

    editor.registerOnTerminalResize(async ({ workspaceId, height, width }) => {
      emit('resize', { workspaceId, size: { height, width } })
    })
  }
}
