const cp = require('child_process')
const { parse } = require('@typescript-eslint/typescript-estree')
const {promisify} = require('util')
const fs = require('fs')
const readFile = promisify(fs.readFile)
const { EOL } = require('os')
const { createInterface } = require('readline')
import { javascriptOnly } from '../utils/plugins.js'

let version = 0
let seq = 0
let childProcess
export default {
  async ready(editor) {
    return new Promise((resolve, reject) => {
      childProcess = cp.spawn('tsserver', [
        '--allowJs',
      ], {
        stdio: 'pipe',
        cwd: process.cwd(),
        env: process.env,
        detached: true,
        shell: false
      }).on('error', function (err) {
        reject(err)
      })

      let _rl = createInterface({
        input: childProcess.stdout,
        output: childProcess.stdin,
        terminal: false
      })

      _rl.on('line', (msg) => {
        resolve()

        if (msg.indexOf('{') === 0) {
          let parsed = JSON.parse(msg)
          if (parsed.type === 'event') {
            if (parsed.event === 'suggestionDiag') {
              const diagnostics = parsed.body.diagnostics.map(({ start, end, text }) => {
                return {
                  message: text,
                  line: start.line - 1,
                  col: start.offset - 1,
                }
              })

              editor.setDiagnostics({
                uri: parsed.body.file,
                diagnostics: diagnostics,
              })
            }
          } else if (parsed.type === 'response') {
            if (parsed.command === 'getOutliningSpans') {
              const symbols = parsed.body.filter(({ kind }) => kind === 'comment')
                .map(({ textSpan }) => {
                  return {
                    // 100 -> multiline string
                    // 101 -> multiline comment
                    kind: 101,
                    location: {
                      range: {
                        start: {
                          line: textSpan.start.line - 1,
                          character: textSpan.start.offset - 1,
                        },
                        end: {
                          line: textSpan.end.line - 1,
                          character: textSpan.end.offset - 1,
                        },
                      }
                    }
                  }
                })

              editor.receiveSymbols(symbols)
            }
          }

          console.log('MESSAGE', parsed)
        }
      })

    })
  },
  async initialize(editor) {
      try {
        await this.ready(editor)
      } catch (e) {
        if (e.message.includes('ENOENT')) {
          throw Error('Is `tsserver` in your PATH? Try running `npm install -g typescript`')
        }
      }

      this.registerHandlers(editor)
  },
  registerHandlers(editor) {
    editor.registerOnRequestCompletionHandler((filePath, completionRequest) => {
      javascriptOnly(filePath, () => {
        console.log('textDocument/completion', {
          textDocument: {
            uri: filePath,
          },
          position: {
            line: completionRequest.line,
            character: completionRequest.character,
          },
        })

        // editor.receiveCompletions(completions.items)
      })
    })

    editor.registerOnOpenFileHandler((filePath) => {
      javascriptOnly(filePath, async () => {
        commandOpen(childProcess, filePath)

        const code = await readFile(filePath)
        requestMultilineComments(editor, code)
      })
    })

    editor.registerOnSaveFileHandler((filePath, text) => {
      javascriptOnly(filePath, async () => {
        // todo
      })
    })

    editor.registerOnChangeFileHandler((filePath, text) => {
      javascriptOnly(filePath, async () => {
        version += 1

        requestMultilineComments(editor, text)
      })
    })
  }
}

function requestMultilineComments(editor, code) {
  const ast = parse(code, {
    comment: true,
    loc: true,
    range: true,
  });

  if (ast.comments.length) {
    const symbols = ast.comments.filter(({ type }) => type === 'Block')
      .map(({ loc }) => {
        return {
          // 100 -> multiline string
          // 101 -> multiline comment
          kind: 101,
          location: {
            range: {
              start: {
                line: loc.start.line - 1,
                character: loc.start.column,
              },
              end: {
                line: loc.end.line - 1,
                character: loc.end.column,
              },
            }
          }
        }
      })

    editor.receiveSymbols(symbols)
  }
}

function commandOpen(childProcess, filePath) {
  childProcess.stdin.write(JSON.stringify({
    seq: seq++,
    type: 'request',
    arguments: {
      file: filePath,
    },
    command: 'open'
  }) + EOL)
}
