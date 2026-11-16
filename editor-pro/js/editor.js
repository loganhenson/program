import { getPlugin, getPluginNameFromFilePath } from './utils/plugins.js'
import {readText, writeText} from "@tauri-apps/plugin-clipboard-manager";
import { open as openFolderDialog } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, UserAttentionType } from '@tauri-apps/api/window'
import { openUrl } from '@tauri-apps/plugin-opener'
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'
import { applyBoxStretch, createBell, fit, installLinkHandling, selectedText } from '../../terminal/js/dom.js'

// A program asked for a notification (OSC 9 / OSC 777). It is only shown when
// the window is in the background: with the window in front the user is
// already looking at whatever the program has to say.
async function notify(title, body) {
  if (document.hasFocus()) {
    return
  }
  try {
    let granted = await isPermissionGranted()
    if (!granted) {
      granted = (await requestPermission()) === 'granted'
    }
    if (granted) {
      sendNotification({ title, body })
    }
  } catch (error) {
    console.log('notification failed: ' + error)
  }
}

// import {listen} from "@tauri-apps/api/event";

let _debounce = function(ms, fn) {
  let timer;
  return function() {
    clearTimeout(timer);
    let args = Array.prototype.slice.call(arguments);
    args.unshift(this);
    timer = setTimeout(fn.bind.apply(fn, args), ms);
  };
};


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
    // Active context updated by Elm via setActiveContext port — JS uses it
    // to stamp outgoing events (save, run, resize, createFile) with the
    // right workspaceId / activeFile / terminalId when the user has multiple
    // project tabs and multiple terminal tabs open.
    activeContext: { workspaceId: null, activeFile: null, terminalId: null },
    saved: true,
    diagnostics: {},
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
  async save(emit, contents) {
    emit('save', {
      workspaceId: this.data.activeContext.workspaceId,
      file: this.data.activeContext.activeFile,
      contents: contents,
    });
  },
  async startPlugin(pluginName, listen, emit) {
    console.log('startPlugin called', pluginName)
    if (pluginName && !this.plugins[pluginName]) {
      let plugin = await getPlugin(pluginName)

      try {
        await plugin.default.initialize(this, listen, emit)
        this.plugins[pluginName] = true

        console.log(`${pluginName} plugin initialized`)
      } catch (e) {
        this.receiveNotification({
          source: `${pluginName} (Plugin)`,
          type: 'error',
          message: 'Failed To Initialize. ' + e.message,
        })

        console.log(`${pluginName} plugin failed to initialized`)
      }
    }
  },
  async checkFilePlugins(filePath) {
    const pluginName = getPluginNameFromFilePath(filePath)
    await this.startPlugin(pluginName)
  },
  async activateFileOrDirectory(emit, payload) {
    // payload is { workspaceId, path } — emitted as-is to Rust
    emit('activateFileOrDirectory', payload)
  },
  async createFile(emit, file) {
    emit('createFile', {
      workspaceId: this.data.activeContext.workspaceId,
      directory: this.data.state.directory,
      file,
    })
  },
  async createDirectory(directory) {
    console.log('createDirectory', directory)
  },
  sendVideError(error) {
    window.vide.ports.receiveVideError.send(error)
  },
  acknowledgeTerminalOutput(payload) {
    invoke('acknowledge_output', {
      workspaceId: payload.workspaceId,
      terminalId: payload.terminalId,
      sequence: payload.sequence,
    }).catch(() => {})
  },
  sendOutputToTerminal(output) {
    // Rust sends { workspaceId, data } — forward the whole envelope so
    // the Elm side can route the output to the right workspace.
    window.vide.ports.receiveTerminalOutput.send(output)
  },
  sendResizedToTerminal(payload) {
    // Rust sends { workspaceId, size }
    window.vide.ports.receiveTerminalResized.send(payload)
  },
  refreshDirectory(directory) {},
  initialize(state, listen, emit) {
    // Suppress incessant beep on macOS for hotkeys without focused input.
    window.onkeyup = event => {
      if (document.activeElement.tagName !== 'INPUT') {
        event.preventDefault();
      }
    };
    window.onkeydown = event => {
      if (document.activeElement.tagName !== 'INPUT') {
        event.preventDefault();
      }
    };

    this.data.state = state

    this.startPlugin('terminal', listen, emit)

    // Rust debugging
    listen('log', event => {
      console.log('rust log:', event.payload)
    })

    listen('message-from-directory-tree-worker', event => {
      window.vide.ports.receiveFileTree.send(event.payload);
    })

    listen('receiveActivatedFile', (event) => {
        window.vide.ports.receiveActivatedFile.send(event.payload)
        // payload.path used for the legacy activeFile field (per-app);
        // multi-workspace routing is handled by Elm via workspaceId.
        if (event.payload && event.payload.path) {
          this.data.activeFile = event.payload.path
        }
    })

    listen('receiveFuzzyFindResults', (event) => {
      window.vide.ports.receiveFuzzyFindResults.send(event.payload)
    })

    listen('notification', (event) => {
      this.receiveNotification(event.payload)
    })

    listen('externalFileChange', (event) => {
      window.vide.ports.receiveExternalFileChange.send(event.payload)
    })

    listen('externalFileDelete', (event) => {
      window.vide.ports.receiveExternalFileDelete.send(event.payload)
    })


    /**
     * Elm initialization — happens once at app start. `initialized` event
     * is now emitted by main.js for each opened workspace, not here.
     */
    window.vide = Elm.Main.init({
      flags: {
        activeFile: null,
        files: null,
      }, node: document.getElementById('vide')
    })

    /**
     * Ports
     */
    window.vide.ports.setActiveContext.subscribe((ctx) => {
      // ctx = { workspaceId: String, activeFile: String|null }
      const previous = this.data.activeContext
      this.data.activeContext = ctx

      // A new or previously hidden terminal still has the size it had when
      // it was last visible (or the size every terminal starts with).
      const switched = ctx.terminalId !== previous.terminalId || ctx.workspaceId !== previous.workspaceId
      if (switched && ctx.terminalId && this.data.terminalSize) {
        this.handlers.requestResizeTerminal({
          workspaceId: ctx.workspaceId,
          terminalId: ctx.terminalId,
          ...this.data.terminalSize,
        })
      }
    })

    window.vide.ports.requestOpenProject.subscribe((directory) => {
      emit('requestOpenProject', { directory })
    })

    window.vide.ports.requestCloseWorkspace.subscribe((workspaceId) => {
      emit('closeWorkspace', { workspaceId })
    })

    window.vide.ports.requestOpenTerminal.subscribe(async (payload) => {
      // payload = { workspaceId, terminalId }
      await emit('openTerminal', payload)

      // A shell starts at 80x24. The size sent when its tab became active
      // (above) can get there before the shell exists and is then dropped,
      // so it is sent again now that there is a shell to take it.
      if (this.data.terminalSize) {
        this.handlers.requestResizeTerminal({
          workspaceId: payload.workspaceId,
          terminalId: payload.terminalId,
          ...this.data.terminalSize,
        })
      }
    })

    window.vide.ports.requestCloseTerminal.subscribe((payload) => {
      // payload = { workspaceId, terminalId }
      emit('closeTerminal', payload)
    })

    window.vide.ports.requestRefreshDirectory.subscribe((directory) => {
      // no-op
    })

    window.vide.ports.requestScrollIntoView.subscribe((id) => {
      // no-op
    })

    window.vide.ports.requestFuzzyFindInProjectFileOrDirectory.subscribe(async (fileOrDirectoryName) => {
      const wsId = this.data.activeContext.workspaceId
      if (!wsId) return
      emit('requestFuzzyFindInProjectFileOrDirectory', {
        workspaceId: wsId,
        directory: wsId, // workspaceId is the canonical project path
        file_or_directory_name: fileOrDirectoryName,
      })
    })

    window.vide.ports.requestFuzzyFindProjects.subscribe(async (projectName) => {
      emit('requestFuzzyFindProjects', { workspaceId: '', project: projectName })
    })

    window.vide.ports.requestPickProjectFolder.subscribe(async () => {
      try {
        const picked = await openFolderDialog({ directory: true, multiple: false })
        window.vide.ports.receivePickedProjectFolder.send(picked ?? null)
      } catch (e) {
        console.error('folder dialog failed', e)
        window.vide.ports.receivePickedProjectFolder.send(null)
      }
    })

    window.vide.ports.requestRecentProjects.subscribe(async () => {
      try {
        const list = await invoke('get_recent_projects')
        window.vide.ports.receiveRecentProjects.send(list)
      } catch (e) {
        console.error('get_recent_projects failed', e)
        window.vide.ports.receiveRecentProjects.send([])
      }
    })

    window.vide.ports.requestChange.subscribe((contents) => {
      this.runChangeFileHandlers(this.data.activeContext.activeFile, contents)
    })

    window.vide.ports.requestActivateFileOrDirectory.subscribe((path) => {
      const wsId = this.data.activeContext.workspaceId
      if (!wsId) return
      this.activateFileOrDirectory(emit, { workspaceId: wsId, path })
    })

    window.vide.ports.requestRunTerminal.subscribe(({ workspaceId, terminalId, contents }) => {
      // Each terminal stamps its own ids: replies to a program's queries
      // have to reach that program even when its tab is in the background.
      this.handlers.requestRunTerminal({
        workspaceId: workspaceId || this.data.activeContext.workspaceId,
        terminalId: terminalId || this.data.activeContext.terminalId,
        contents,
      })
    })

    window.vide.ports.requestPasteTerminal.subscribe(async () => {
      // The terminal decides how to send it (bracketed paste, line endings)
      const text = await readText()
      if (text) {
        window.vide.ports.receiveTerminalPaste.send(text)
      }
    })

    window.vide.ports.requestCopyTerminal.subscribe(async () => {
      const text = selectedText()
      if (text) {
        await writeText(text)
      }
    })

    // Command+click opens links in the default browser
    installLinkHandling(url => openUrl(url).catch(error => console.log('could not open ' + url + ': ' + error)))
    document.fonts.ready.then(applyBoxStretch)

    // The bell: the system alert sound, or the dock icon bouncing when the
    // window is in the background
    window.vide.ports.requestBellTerminal.subscribe(createBell({
      ring: () => invoke('bell').catch(() => {}),
      attention: () => getCurrentWindow().requestUserAttention(UserAttentionType.Informational).catch(() => {}),
    }))

    window.vide.ports.requestNotifyTerminal.subscribe(message => {
      notify('EditorPro', message)
    })

    // Programs can ask to be told when the terminal gains or loses focus
    window.addEventListener('focus', () => window.vide.ports.receiveTerminalFocus.send(true))
    window.addEventListener('blur', () => window.vide.ports.receiveTerminalFocus.send(false))

    window.vide.ports.requestSetupTerminalResizeObserver.subscribe(() => {
      let prevWidthIncrement = 0;
      let prevHeightIncrement = 0;
      const terminalResizeObserver = new ResizeObserver(_debounce(50, terminals => {
        if (terminals[0].contentRect.height <= 0 && terminals[0].contentRect.width <= 0) {
          return
        }

        // Subtract one row of slack — the macOS window's rounded bottom
        // corners clip a few pixels of whatever the last row would land
        // on, so we leave one row of breathing room to guarantee the
        // prompt is never hidden under the curve.
        const { width: w, height: h } = fit(terminals[0].contentRect)
        let nextWidthIncrement = w;
        let nextHeightIncrement = h;

        if (nextWidthIncrement !== prevWidthIncrement || nextHeightIncrement !== prevHeightIncrement) {
          prevWidthIncrement = nextWidthIncrement
          prevHeightIncrement = nextHeightIncrement
          this.data.terminalSize = { width: w, height: h }
          this.handlers.requestResizeTerminal({
            workspaceId: this.data.activeContext.workspaceId,
            terminalId: this.data.activeContext.terminalId,
            width: w,
            height: h,
          })
        }
      }))

      // Observe #terminal-container, NOT #terminal. #terminal's height is
      // content-driven, so observing it creates a self-reinforcing PTY
      // size that ignores the actual viewport — the last rows end up
      // below the window fold. #terminal-container has h-full, so its
      // content rect is the real viewport.
      let interval = setInterval(() => {
        if (document.querySelector('#terminal-container')) {
          terminalResizeObserver.observe(document.querySelector('#terminal-container'))
          clearInterval(interval)
        }
      }, 200)
    })

    window.vide.ports.requestRun.subscribe(async ({ contents }) => {
      // Nothing yet.
    })

    window.vide.ports.requestCompletion.subscribe(async (completionRequest) => {
      this.runRequestCompletionHandlers(this.data.activeContext.activeFile, completionRequest)
    })

    window.vide.ports.requestSave.subscribe(async (contents) => {
      await this.save(emit, contents)
    })

    window.vide.ports.requestCopy.subscribe(async (contents) => {
      await writeText(contents)
    })

    window.vide.ports.requestPaste.subscribe(async () => {
      window.vide.ports.receivePaste.send(await readText())
    })

    window.vide.ports.requestCreateFile.subscribe(async (file) => {
      await this.createFile(emit, file)
    })

    window.vide.ports.requestCreateDirectory.subscribe(async (directory) => {
      try {
        await this.createDirectory(directory)
        await this.refreshDirectory(state.directory)
      } catch (e) {
        if (e.code === 'EEXIST' || e.code === 'EISDIR') {
          this.sendVideError({
            type: 'FILE_TREE_CREATE_DIRECTORY_ALREADY_EXISTS',
            message: `A directory with name already exists`
          })
        }
      }
    })

    window.vide.ports.requestDelete.subscribe(async (filesAndDirectories) => {
      // no-op for now
    })
  },
}
