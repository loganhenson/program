// import { getPlugin, getPluginNameFromFilePath } from './utils/plugins.js'

// import {listen} from "@tauri-apps/api/event";

export default {
  handlers: {
    onOpenFile: [],
    onSaveFile: [],
    onChangeFile: [],
    onRequestCompletion: [],
    requestRunTerminal: ({ contents }) => {},
    requestResizeTerminal: ({ height, width }) => {},
  },
  plugins: {},
  data: {
    state: {
      directory: null,
    },
    activeFile: null,
    saved: true,
    diagnostics: {},
    // Fuzzy Finder Stuff
    fuzzyFinder: null,
  },
  runOpenFileHandlers(filePath, contents) {
    this.handlers.onOpenFile.forEach(handler => handler(filePath, contents))
  },
  runSaveFileHandlers(filePath, contents) {
    this.handlers.onSaveFile.forEach(handler => handler(filePath, contents))
  },
  runChangeFileHandlers(filePath, contents) {
    this.handlers.onChangeFile.forEach(handler => handler(filePath, contents))
  },
  runRequestCompletionHandlers(filePath, completionRequest) {
    this.handlers.onRequestCompletion.forEach(handler => handler(filePath, completionRequest))
  },
  receiveNotification(notification) {
    console.log('NOTIFICATION: ', notification)
    window.vide.ports.receiveNotification.send(notification)
  },
  receiveCompletions(completions) {
    console.log('COMPLETIONS: ', completions)
    window.vide.ports.receiveCompletions.send(completions)
  },
  receiveSymbols(symbols) {
    window.vide.ports.receiveSymbols.send(symbols)
  },
  setDiagnostics(e) {
    if (this.data.activeFile === e.uri) {
      this.receiveErrors(e.diagnostics)
    }
  },
  receiveErrors(errors) {
    window.vide.ports.receiveErrors.send(errors)
  },
  receiveVideError(error) {
    window.vide.ports.receiveVideError.send(error)
  },
  registerOnRequestRunTerminal(handler) {
    this.handlers.requestRunTerminal = handler
  },
  registerOnTerminalResize(handler) {
    this.handlers.requestResizeTerminal = handler
  },
  registerOnRequestCompletionHandler(handler) {
    this.handlers.onRequestCompletion.push(handler)
  },
  registerOnOpenFileHandler(handler) {
    this.handlers.onOpenFile.push(handler)
  },
  registerOnSaveFileHandler(handler) {
    this.handlers.onSaveFile.push(handler)
  },
  registerOnChangeFileHandler(handler) {
    this.handlers.onChangeFile.push(handler)
  },
  async save(contents) {
      console.log('save called')
    // if (!this.data.saved) {
    //   return
    // }
    //
    // this.data.saved = false
    //
    // return new Promise(async (resolve, _) => {
    //   await fs.writeFile(this.data.activeFile, contents)
    //
    //   this.data.saved = true
    //   this.runSaveFileHandlers(this.data.activeFile, contents)
    //
    //   resolve()
    // })
  },
  async startPlugin(pluginName) {
      console.log('startPlugin called', pluginName)
    // if (pluginName && !this.plugins[pluginName]) {
    //   let plugin = await getPlugin(pluginName)
    //
    //   try {
    //     await plugin.default.initialize(this)
    //     this.plugins[pluginName] = true
    //
    //     console.log(`${pluginName} plugin initialized`)
    //   } catch (e) {
    //     this.receiveNotification({
    //       source: `${pluginName} (Plugin)`,
    //       type: 'error',
    //       message: 'Failed To Initialize. ' + e.message,
    //     })
    //
    //     console.log(`${pluginName} plugin failed to initialized`)
    //   }
    // }
  },
  async checkFilePlugins(filePath) {
    // const pluginName = getPluginNameFromFilePath(filePath)
    // await this.startPlugin(pluginName)
  },
  async activateFileOrDirectory(path) {
    // const stat = await fs.lstat(path)
    //
    // if (stat.isFile()) {
    //   await this.checkFilePlugins(path)
    //
    //   const contents = await fs.readFile(path, 'utf8')
    //
    //   window.vide.ports.receiveActivatedFile.send({
    //     path,
    //     contents,
    //   })
    //
    //   this.data.activeFile = path
    //
    //   this.runOpenFileHandlers(path, contents)
    // } else if (stat.isDirectory()) {
    //   window.vide.ports.receiveActivatedDirectory.send(path)
    // }
  },
  async createFile(file) {
    // await fs.writeFile(file, '', 'utf8')
  },
  async createDirectory(directory) {
    // await fs.mkdir(directory)
  },
  sendVideError(error) {
    window.vide.ports.receiveVideError.send(error)
  },
  sendOutputToTerminal(output) {
    window.vide.ports.receiveTerminalOutput.send(output)
  },
  sendResizedToTerminal({height, width}) {
    window.vide.ports.receiveTerminalResized.send({height, width})
  },
  refreshDirectory(directory) {
    // ipcRenderer.send('message-to-directory-tree-worker', directory)
  },
  initialize(state, listen, emit) {
    document.body.onkeydown = (event) => {
      if (event.target === document.body) {
        if ([
          'Space',
          'Tab',
          'ArrowRight',
          'ArrowLeft',
          'ArrowUp',
          'ArrowDown',
        ].includes(event.code)) {
          event.preventDefault()
        }
      }
    }

    // Required for plugins
    this.data.state = state

    // Start vide base functionality plugins (terminal, etc.)
    // Language specific plugins are lazily loaded upon opening a file of that type
    // this.startPlugin('terminal')

    // Directory tree
    listen('message-from-directory-tree-worker', event => {
      console.log('message-from-directory-tree-worker', event)
      window.vide.ports.receiveFileTree.send(event.payload);
    })
    // ipcRenderer.on('message-from-directory-tree-worker', (event, message) => {
    //   window.vide.ports.receiveFileTree.send(
    //     JSON.parse(message)
    //   )
    // })

    /**
     * Elm initialization
     */
    if (state.directory) {
      // ipcRenderer.send('message-to-directory-tree-worker', state.directory)
    }
    window.vide = Elm.Main.init({
      flags: {
        activeFile: null,
        files: null,
      }, node: document.getElementById('vide')
    })

    /**
     * Ports
     */
    window.vide.ports.requestOpenProject.subscribe((directory) => {
      // ipcRenderer.send('message-to-directory-tree-worker', directory)
    })

    window.vide.ports.requestRefreshDirectory.subscribe((directory) => {
      // ipcRenderer.send('message-to-directory-tree-worker', directory)
    })

    window.vide.ports.requestScrollIntoView.subscribe((id) => {
      // window.requestAnimationFrame(() => window.document.getElementById(id)?.scrollIntoViewIfNeeded())
    })

    window.vide.ports.requestFuzzyFindInProjectFileOrDirectory.subscribe(async (fileOrDirectoryName) => {
      // if (!this.data.fuzzyFinder) {
      //   const fuzzyFinder = await import('./features/fuzzyFinder.js')
      //   this.data.fuzzyFinder = fuzzyFinder.default
      // }
      //
      // const filesOrDirectories = await this.data.fuzzyFinder.findInProjectFileOrDirectory(this.data.state.directory, fileOrDirectoryName)
      // window.vide.ports.receiveFuzzyFindResults.send(filesOrDirectories)
    })

    window.vide.ports.requestFuzzyFindProjects.subscribe(async (projectName) => {
      // if (!this.data.fuzzyFinder) {
      //   const fuzzyFinder = await import('./features/fuzzyFinder.js')
      //   this.data.fuzzyFinder = fuzzyFinder.default
      // }
      //
      // const projects = await this.data.fuzzyFinder.findProject(projectName)
      // window.vide.ports.receiveFuzzyFindResults.send(projects)
    })

    window.vide.ports.requestChange.subscribe((contents) => {
      this.runChangeFileHandlers(this.data.activeFile, contents)
    })

    window.vide.ports.requestActivateFileOrDirectory.subscribe((fileOrDirectory) => {
      this.activateFileOrDirectory(fileOrDirectory)
    })

    window.vide.ports.requestRunTerminal.subscribe(({ contents }) => {
      this.handlers.requestRunTerminal({ contents })
    })

    window.vide.ports.requestPasteTerminal.subscribe(async () => {
      this.handlers.requestRunTerminal({
        contents: await navigator.clipboard.readText(),
      })
    })

    window.vide.ports.requestSetupTerminalResizeObserver.subscribe(() => {
      const terminalResizeObserver = new ResizeObserver(terminals => {
        if (terminals[0].contentRect.height <= 0 && terminals[0].contentRect.width <= 0) {
          return
        }

        this.handlers.requestResizeTerminal({
          height: terminals[0].contentRect.height,
          width: terminals[0].contentRect.width
        })
      })

      let interval
      const bindObserver = () => {
        if (document.querySelector('#terminal')) {
          terminalResizeObserver.observe(document.querySelector('#terminal'))
          clearInterval(interval)
        }
      }
      interval = setInterval(bindObserver, 100)
    })

    window.vide.ports.requestRun.subscribe(async ({ contents }) => {
      // Nothing yet.
    })

    /**
     * requestCompletion
     */
    window.vide.ports.requestCompletion.subscribe(async (completionRequest) => {
      this.runRequestCompletionHandlers(this.data.activeFile, completionRequest)
    })

    /**
     * requestSave
     */
    window.vide.ports.requestSave.subscribe(async (contents) => {
      await this.save(contents)
    })

    /**
     * requestCopy
     */
    window.vide.ports.requestCopy.subscribe(copyToClipboard)

    /**
     * requestPaste
     */
    window.vide.ports.requestPaste.subscribe(() => {
      navigator.clipboard.readText().then(text => window.vide.ports.receivePaste.send(text))
    })

    window.vide.ports.requestCreateFile.subscribe(async (file) => {
      try {
        await this.createFile(file)
        await this.refreshDirectory(state.directory)
        await this.activateFileOrDirectory(file)
      } catch (e) {
        if (e.code === 'EISDIR') {
          this.sendVideError({
            type: 'FILE_TREE_CREATE_DIRECTORY_ALREADY_EXISTS',
            message: `There is a clash with a directory named "${path.basename(file)}"!`
          })
        }
      }
    })

    window.vide.ports.requestCreateDirectory.subscribe(async (directory) => {
      try {
        await this.createDirectory(directory)
        await this.refreshDirectory(state.directory)
        await this.activateFileOrDirectory(directory)
      } catch (e) {
        if (e.code === 'EEXIST' || e.code === 'EISDIR') {
          this.sendVideError({
            type: 'FILE_TREE_CREATE_DIRECTORY_ALREADY_EXISTS',
            message: `A directory with name "${path.basename(directory)}" already exists`
          })
        }
      }
    })

    window.vide.ports.requestDelete.subscribe(async (filesAndDirectories) => {
      // await Promise.all(filesAndDirectories.map(async fileOrDirectory => {
      //   return fileOrDirectory.type === 'directory'
      //     ? await fs.rmdir(fileOrDirectory.path, { recursive: true })
      //     : await fs.unlink(fileOrDirectory.path)
      // }))
      //
      // await this.refreshDirectory(state.directory)
    })
  },
}

function copyToClipboard(contents) {
  const el = document.createElement('textarea')
  el.value = contents
  el.setAttribute('readonly', '')
  el.style.position = 'absolute'
  el.style.left = '-9999px'
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
}
