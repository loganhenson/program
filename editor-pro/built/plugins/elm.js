const cp = require('child_process')
const rpc = require('vscode-jsonrpc')
import { elmOnly } from '../utils/plugins.js'

let version = 0
export default {
  async initialize(editor) {
    this.ready = new Promise((resolve, reject) => {
      let childProcess = cp.spawn('elm-language-server')

      let connection = rpc.createMessageConnection(
        new rpc.StreamMessageReader(childProcess.stdout),
        new rpc.StreamMessageWriter(childProcess.stdin)
      )

      connection.listen()

      connection.onUnhandledNotification((e) => {
        console.log('unhandled', e)
      })

      connection.onError((e) => {
        console.log('error', e)
      })

      connection.onRequest(new rpc.RequestType('window/showMessageRequest'), (e) => {
        editor.receiveNotification({
          source: 'Elm (Plugin)',
          type: 'error',
          message: e.message,
        })
      })

      connection.sendRequest(new rpc.RequestType('initialize'), {
        processId: childProcess.pid,
        rootUri: editor.data.state.directory,
        capabilities: {
          workspace: {},
        },
        initializationOptions: {
          elmAnalyseTrigger: 'never',
        },
      }).then((response) => {
        connection.sendNotification(new rpc.NotificationType('initialized'))
        resolve()
      }).catch((error) => {
        editor.receiveNotification({
          source: 'Elm (Plugin)',
          type: 'error',
          message: error.message,
        })
      })

      editor.registerOnRequestCompletionHandler((filePath, completionRequest) => {
        elmOnly(filePath, () => {
          connection.sendRequest(new rpc.RequestType('textDocument/completion'), {
            textDocument: {
              uri: filePath,
            },
            position: {
              line: completionRequest.line,
              character: completionRequest.character,
            },
          }).then((completions) => {
            if (completions === null) {
              return;
            }

            if (Array.isArray(completions)) {
              editor.receiveCompletions(completions)
              return;
            }

            editor.receiveCompletions(completions.items)
          })
        })
      })

      editor.registerOnOpenFileHandler((filePath) => {
        elmOnly(filePath, async () => {
          await this.ready
          connection.sendNotification(new rpc.NotificationType('textDocument/didOpen'), {
            textDocument: {
              uri: filePath,
            }
          })

          requestTextDocumentFoldingRanges(connection, editor, filePath)
        })
      })

      editor.registerOnSaveFileHandler((filePath, text) => {
        elmOnly(filePath, async () => {
          await this.ready

          connection.sendNotification(new rpc.NotificationType('textDocument/didSave'), {
            textDocument: {
              uri: filePath,
            },
          })
        })
      })

      editor.registerOnChangeFileHandler((filePath, text) => {
        elmOnly(filePath, async () => {
          await this.ready

          version += 1

          connection.sendNotification(new rpc.NotificationType('textDocument/didChange'), {
            textDocument: {
              uri: filePath,
              version: version,
            },
            contentChanges: [
              { text: text },
            ],
          })

          requestTextDocumentFoldingRanges(connection, editor, filePath, text)
        })
      })

      connection.onNotification(new rpc.NotificationType('textDocument/publishDiagnostics'), ({ uri, diagnostics }) => {
        const videDiagnostics = diagnostics.map(({ message, range, severity, source }) => {
          const htmlOnlyMessage = message
            .replace(/\<(.*)\>/gm, `<a style="text-decoration: underline;" target="_blank" href="$1">$1</a>`)

          return { message: htmlOnlyMessage, line: range.start.line, col: range.start.character }
        })

        editor.setDiagnostics({
          uri: uri.replace('file://', ''),
          diagnostics: videDiagnostics,
        })
      })

      connection.onNotification(new rpc.NotificationType('window/logMessage'), (e) => {
        console.log('log', e.message)
      })
    })

    return this.ready
  },
}

function requestTextDocumentFoldingRanges(connection, editor, filePath, text) {
  connection.sendRequest('textDocument/foldingRange', {
    textDocument: {
      uri: filePath,
      text,
    },
  }).then(foldingRanges => {
    const symbols = foldingRanges.filter(({ kind }) => kind === 'comment')
      .map(({ startLine, startCharacter, endLine, endCharacter }) => {
        return {
          // 100 -> multiline string
          // 101 -> multiline comment
          kind: 101,
          location: {
            range: {
              start: {
                line: startLine,
                character: startCharacter,
              },
              end: {
                line: endLine,
                character: endCharacter,
              },
            }
          }
        }
      })

    editor.receiveSymbols(symbols)
  }).catch(_ => {
    //
  })
}

function requestTextDocumentSymbols(connection, editor, filePath, text) {
  connection.sendRequest('textDocument/documentSymbol', {
    textDocument: {
      uri: filePath,
      text,
    },
  }).then(symbols => {
    editor.receiveSymbols(symbols)
  })
}
