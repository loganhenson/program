import editor from './editor'
import { emit, listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { gate } from './preflight-ui'

(async () => {
  const report = await invoke('preflight')
  gate(report, () => proceed())
})()

async function proceed() {
  // Mount the editor once with empty state — Elm shows the welcome screen
  // until a workspace arrives. Subsequent `initialize` events from Rust
  // are forwarded to Elm via the receiveWorkspaceInitialized port (NOT
  // re-mounting), so opening additional projects doesn't wipe state.
  await editor.initialize({ workspaceId: '', directory: '' }, listen, emit)

  await listen('initialize', async event => {
    const payload = event.payload || {}
    const wsId = payload.workspaceId || ''
    if (!wsId) {
      // welcome-state init from Rust — nothing to do
      return
    }
    // Tell Elm to add/focus this workspace
    window.vide.ports.receiveWorkspaceInitialized.send({
      workspaceId: wsId,
      directory: payload.directory || wsId,
    })
    // Tell Rust's filetree worker for this workspace to start walking
    await emit('initialized', { workspaceId: wsId, directory: payload.directory || wsId })
  })

  await listen('web', event => {
    window.location = event.payload
  })

  await emit('frontend-ready', null)

  // Diagnostics, off unless EDITOR_DOM_DUMP is set (see `dom_dump` in main.rs)
  if (await invoke('dom_dump', { html: null })) {
    // (how far the editor is scrolled is not part of the DOM's text, so it is added)
    const scrolled = () => {
      const editor = document.getElementById('editor-container')
      return editor ? `<!-- editor-container scrollTop=${Math.round(editor.scrollTop)} scrollHeight=${editor.scrollHeight} clientHeight=${editor.clientHeight} -->` : ''
    }
    setInterval(() => invoke('dom_dump', { html: document.documentElement.outerHTML + scrolled() }), 1000)
  }

  // `DEV_DIRECTORY=some/project npm start` opens that project right away
  const directory = await invoke('startup_directory')
  if (directory) {
    await emit('requestOpenProject', { directory })
  }
}
