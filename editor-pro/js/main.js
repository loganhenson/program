import editor from './editor'
import { emit, listen } from '@tauri-apps/api/event'

(async () => {
  await editor.initialize({directory: ""}, listen, emit)

  await listen('web', event => {
    window.location = event.payload;
  })
})()
