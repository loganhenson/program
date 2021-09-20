import editor from './editor'
import { emit, listen } from '@tauri-apps/api/event'

(async () => {
  await listen('initialize', async event => {
    await editor.initialize({directory: event.payload}, listen, emit)
  })

  await listen('web', event => {
    window.location = event.payload;
  })
})()
