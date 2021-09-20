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

    editor.registerOnRequestRunTerminal(async ({ contents }) => {
      emit('run', contents)
    })

    editor.registerOnTerminalResize(async ({ height, width }) => {
      emit('resize', JSON.stringify({ height, width }))
    })
  }
}
