const cp = require('child_process')
const rpc = require('vscode-jsonrpc')
import { phpOnly } from '../utils/plugins.js'

let childProcess
let connection
export default {
  async ready(editor) {
    return new Promise((resolve, reject) => {
      childProcess = cp.spawn('/Users/loganhenson/php-language-server/bin/php-language-server')
        .on('error', (err) => {
          reject(err)
        })

      connection = rpc.createMessageConnection(
        new rpc.StreamMessageReader(childProcess.stdout),
        new rpc.StreamMessageWriter(childProcess.stdin)
      )

      connection.listen()

      connection.onUnhandledNotification((e) => {
        console.log('plugins:php:unhandled-notification', e)
      })

      connection.onError((e) => {
        console.log('plugins:php:error', e)
      })

      connection.onRequest(new rpc.RequestType('window/showMessageRequest'), (e) => {
        editor.receiveNotification({
          source: 'Php (Plugin)',
          type: 'info',
          message: e.message,
        })
      })

      connection.onNotification(new rpc.NotificationType('textDocument/publishDiagnostics'), e => {
        editor.setDiagnostics({
          uri: e.uri,
          diagnostics: e.diagnostics.map(err => {
            return { message: err.message, line: err.range.start.line - 1, col: err.range.start.character }
          })
        })
      })

      connection.onNotification(new rpc.NotificationType('window/logMessage'), (e) => {
        console.log('log', e.message)
      })

      connection.sendRequest(new rpc.RequestType('initialize'), {
        processId: childProcess.pid,
        rootUri: editor.data.state.directory,
        capabilities: {
          workspace: {},
          textDocument: {
            completion: {
              contextSupport: true,
            },
          },
        },
        initializationOptions: {},
      }).then((response) => {
        connection.sendNotification(new rpc.NotificationType('initialized'))
        resolve()
      })
    })
  },
  async initialize(editor) {
    try {
      await this.ready(editor)
    } catch (e) {
      if (e.message.includes('ENOENT')) {
        throw Error('Is `php-language-server` in your PATH? Try running `composer install -g loganhenson/php-language-server`')
      }
    }

    this.registerHandlers(editor)
  },
  registerHandlers(editor) {
    editor.registerOnRequestCompletionHandler((filePath, completionRequest) => {
      phpOnly(filePath, async () => {
        connection.sendRequest(new rpc.RequestType('textDocument/completion'), {
          textDocument: {
            uri: filePath,
          },
          position: {
            line: completionRequest.line,
            character: completionRequest.character,
          },
          vide: {
            token: completionRequest.token,
          }
        }).then((completions) => {
          if (completions === null) {
            return
          }

          if (Array.isArray(completions)) {
            editor.receiveCompletions(completions)
            return
          }

          editor.receiveCompletions(completions.items)
        })
      })
    })

    editor.registerOnOpenFileHandler((filePath, text) => {
      phpOnly(filePath, () => {
        connection.sendNotification(new rpc.NotificationType('textDocument/didOpen'), {
          textDocument: {
            uri: filePath,
            text: text,
          }
        })

        // Sending notifications on the same tick can break randomly...
        setTimeout(() => {
          requestTextDocumentFoldingRanges(connection, editor, filePath, text)
        })
      })
    })

    editor.registerOnSaveFileHandler((filePath, text) => {
      phpOnly(filePath, () => {
        connection.sendNotification(new rpc.NotificationType('textDocument/didSave'), {
          textDocument: {
            uri: filePath,
            text: text,
          },
        })
      })
    })

    editor.registerOnChangeFileHandler((filePath, text) => {
      phpOnly(filePath, () => {
        connection.sendNotification(new rpc.NotificationType('textDocument/didChange'), {
          textDocument: {
            uri: filePath,
            text: text,
          },
        })

        // Sending notifications on the same tick can break randomly...
        setTimeout(() => {
          requestTextDocumentFoldingRanges(connection, editor, filePath, text)
        })
      })
    })
  },
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

function requestTextDocumentFoldingRanges(connection, editor, filePath, text) {
  connection.sendRequest('textDocument/foldingRange', {
    textDocument: {
      uri: filePath,
      text: text,
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
  })
}
