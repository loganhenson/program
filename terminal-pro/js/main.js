import vterm from './vterm'
import { emit, listen } from '@tauri-apps/api/event'

(async () => {
  await vterm.initialize({directory: ""}, listen, emit)

  await listen('web', event => {
    window.location = event.payload;
  })
})()
