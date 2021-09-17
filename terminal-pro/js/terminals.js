function bufferCommands(callback, timeout) {
  let s = []
  let sender = null
  return (event) => {
    s = s.concat(event.payload)
    if (!sender) {
      sender = setTimeout(() => {
        callback(s)
        s = []
        sender = null
      }, timeout)
    }
  }
}

module.exports = {
  initialize(editor, listen, emit) {
    // listen('output', bufferCommands(commands => {
    //     editor.sendOutputToTerminal(commands)
    // }, 25));

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
  },
}
