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
}
