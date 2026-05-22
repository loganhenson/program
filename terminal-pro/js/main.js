import vterm from './vterm'
import { emit, listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { gate } from './preflight-ui'

(async () => {
  const report = await invoke('preflight')
  gate(report, () => proceed())
})()

async function proceed() {
  await vterm.initialize({ directory: '' }, listen, emit)

  await listen('web', event => {
    window.location = event.payload
  })

  await emit('frontend-ready', null)
}
