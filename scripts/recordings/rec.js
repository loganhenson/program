// Records an app for the readme.
//
// What runs is the app's own built frontend (its JavaScript, the Elm code, the
// CSS) in headless WebKit, the engine Tauri uses on macOS. Only the Tauri IPC
// is replaced, by a stand-in that does what the Rust backends do:
//   - terminals are real shells in real PTYs (`terminal-headless pty`),
//   - EditorPro's file tree comes from its own walker (the `filetree` crate),
//     and files are read from disk.
// It is not a capture of the app's window: there is no title bar, no mouse
// pointer, and the native folder picker is answered directly. While a slow
// program is being waited for, the recording is paused.
//
//   const rec = await require('./rec').start({ app: 'terminal-pro', width, height })
//   await rec.type('ls'); await rec.press('Enter'); await rec.waitText(/\$ $/); await rec.finish('out.gif')
const path = require('path')
const REPO = path.join(__dirname, '../..')
const { webkit } = require(path.join(REPO, 'terminal-test/node_modules/playwright'))
const { spawn, execFileSync } = require('child_process')
const crypto = require('crypto')
const fs = require('fs')

const HEADLESS = REPO + '/terminal-server/target/debug/terminal-headless'
const FILETREE = __dirname + '/filetree-cli/target/release/filetree-cli'
const OUT = path.join(__dirname, 'out')
const sleep = ms => new Promise(r => setTimeout(r, ms))

exports.start = async ({ app, cwd, width = 800, height = 500, scale = 1.5, recents = [], pick = null, record = true, framesDir }) => {
  if (!fs.existsSync(FILETREE)) execFileSync('cargo', ['build', '--release'], { cwd: __dirname + '/filetree-cli', stdio: 'inherit' })
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await webkit.launch()
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale })
  const ptys = {}
  const log = []
  page.on('pageerror', e => log.push('PAGE ERROR: ' + e.message))
  const dispatch = (event, payload) => page.evaluate(([e, p]) => window.__dispatch(e, p), [event, payload]).catch(() => {})

  const shellEnv = () => {
    // a shell without the personal configuration, history or credentials of whoever records
    const env = { ...process.env, ZDOTDIR: __dirname + '/zdot' }
    for (const k of Object.keys(env)) if (/^(CLAUDE|ANTHROPIC_|MCP_|AWS_|OPENAI_|CODEX_|GITHUB_|GH_|NPM_TOKEN)/.test(k)) delete env[k]
    return env
  }

  await page.exposeFunction('__emitted', (event, payload) => {
    if (/^(openTerminal|resize|closeTerminal)$/.test(event)) log.push(event + ' ' + JSON.stringify(payload))
    if (event === 'openTerminal') {
      // as the backends do: a project's terminal starts in the project, any other in the home directory
      const directory = payload.workspaceId || payload.cwd || process.env.HOME
      // --acks: output is held back until the page has acknowledged what it was sent, as in the apps
      const child = spawn(HEADLESS, ['pty', directory, '--acks'], { env: shellEnv(), cwd: directory, stdio: ['pipe', 'pipe', 'ignore'] })
      ptys[(payload.workspaceId || '') + '|' + payload.terminalId] = child
      let pending = ''
      child.stdout.on('data', data => {
        pending += data.toString()
        let i
        while ((i = pending.indexOf('\n')) >= 0) {
          const line = pending.slice(0, i); pending = pending.slice(i + 1)
          if (!line) continue
          const { sequence, commands } = JSON.parse(line)
          dispatch('output', { terminalId: payload.terminalId, workspaceId: payload.workspaceId, sequence, data: commands })
        }
      })
    } else if (event === 'run') {
      const child = ptys[(payload.workspaceId || '') + '|' + payload.terminalId]
      if (child) child.stdin.write(JSON.stringify({ run: payload.contents }) + '\n')
    } else if (event === 'resize') {
      const child = ptys[(payload.workspaceId || '') + '|' + payload.terminalId]
      // as the backends do: a size for a terminal that does not exist is dropped
      if (!child) return
      child.stdin.write(JSON.stringify({ resize: payload.size }) + '\n')
      dispatch('sendResizedToTerminal', payload)
    } else if (event === 'closeTerminal') {
      const child = ptys[(payload.workspaceId || '') + '|' + payload.terminalId]
      if (child) child.kill()
    } else if (event === 'requestOpenProject') {
      const directory = fs.realpathSync(payload.directory)
      dispatch('initialize', { workspaceId: directory, directory })
    } else if (event === 'initialized') {
      if (!payload.directory) return
      const raw = execFileSync(FILETREE, [payload.directory], { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 }).toString()
      dispatch('message-from-directory-tree-worker', { workspaceId: payload.workspaceId, tree: JSON.parse(raw.slice(raw.indexOf('\x1e') + 1)) })
    } else if (event === 'activateFileOrDirectory') {
      try {
        if (fs.statSync(payload.path).isFile()) dispatch('receiveActivatedFile', { workspaceId: payload.workspaceId, path: payload.path, contents: fs.readFileSync(payload.path, 'utf8') })
      } catch (e) { log.push('activate failed ' + e.message) }
    } else {
      log.push('emit ' + event + ' ' + JSON.stringify(payload).slice(0, 120))
    }
  })

  await page.exposeFunction('__acknowledged', ({ workspaceId, terminalId, sequence }) => {
    const child = ptys[(workspaceId || '') + '|' + terminalId]
    if (child && !child.killed) child.stdin.write(JSON.stringify({ ack: sequence }) + '\n')
  })

  await page.addInitScript(({ recents, pick, startup }) => {
    const listeners = {}
    window.__TAURI_INTERNALS__ = {
      metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main', windowLabel: 'main' } },
      transformCallback(callback) {
        const id = Math.floor(Math.random() * 1e9)
        window['_' + id] = callback
        return id
      },
      unregisterCallback() {},
      convertFileSrc: p => p,
      async invoke(cmd, args) {
        if (cmd === 'plugin:notification|is_permission_granted') return true
        if (cmd === 'preflight') return { all_ok: true, results: [] }
        if (cmd === 'get_recent_projects') return recents
        if (cmd === 'startup_directory') return startup
        if (cmd === 'dom_dump') return false
        if (cmd === 'acknowledge_output') { window.__acknowledged(args); return null }
        // the native folder picker: the folder that gets chosen in it
        if (cmd === 'plugin:dialog|open') return pick
        if (cmd === 'plugin:event|listen') { listeners[args.event] = args.handler; return args.handler }
        if (cmd === 'plugin:event|emit') { window.__emitted(args.event, args.payload); return null }
        if (cmd === 'plugin:clipboard-manager|read_text') return ''
        if (cmd === 'plugin:window|set_title') { window.__title = args.value ?? args.title; return null }
        return null
      },
    }
    window.__dispatch = (event, payload) => {
      const id = listeners[event]
      if (id !== undefined && window['_' + id]) window['_' + id]({ event, payload, id: 0 })
    }
  }, { recents, pick, startup: app === 'editor-pro' ? cwd : null })

  // Serve the built frontend over http, as the app's own scheme does: from
  // file:// WebKit refuses to load the scripts it starts workers from.
  const root = REPO + '/' + app + '/built'
  const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml', png: 'image/png', json: 'application/json', woff2: 'font/woff2', ttf: 'font/ttf' }
  const server = require('http').createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(req.url.split('?')[0]))
    if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end() }
    res.writeHead(200, { 'content-type': types[file.split('.').pop()] || 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  await new Promise(r => server.listen(0, '127.0.0.1', r))
  await page.goto('http://127.0.0.1:' + server.address().port + '/index.html')

  // ── frame capture ────────────────────────────────────────────────────────
  const frames = []          // { file, at } with `at` on the recording's clock
  let clock = 0, lastReal = Date.now(), lastHash = '', running = record, cutting = false
  framesDir = framesDir || fs.mkdtempSync(path.join(OUT, 'frames-'))
  fs.mkdirSync(framesDir, { recursive: true })
  const capture = (async () => {
    while (running) {
      const started = Date.now()
      let shot
      try { shot = await page.screenshot({ type: 'png' }) } catch (e) { break }
      const now = Date.now()
      // while waiting on a slow program, time stands still on the recording's clock
      if (!cutting) clock += now - lastReal
      lastReal = now
      const hash = crypto.createHash('md5').update(shot).digest('hex')
      if (hash !== lastHash && !cutting) {
        lastHash = hash
        const file = path.join(framesDir, String(frames.length).padStart(5, '0') + '.png')
        fs.writeFileSync(file, shot)
        frames.push({ file, at: clock })
      }
      const spare = 70 - (Date.now() - started)
      if (spare > 0) await sleep(spare)
    }
  })()

  const text = () => page.evaluate(() => document.body.innerText)
  const api = {
    page, log, frames, text, sleep,
    pause: ms => sleep(ms),
    // start the recording here: forget what was captured so far
    reset() { frames.length = 0; clock = 0; lastHash = ''; lastReal = Date.now() },
    async type(string, delay = 55) {
      for (const ch of string) { await page.keyboard.type(ch); await sleep(delay + Math.random() * 45) }
    },
    press: key => page.keyboard.press(key),
    click: (selector, options) => page.locator(selector).first().click(options),
    // Wait until the page's text matches. After `patience` ms of waiting the
    // recording is paused, and resumes just before the match is shown.
    async waitText(regex, { timeout = 120000, patience = 2500 } = {}) {
      const started = Date.now()
      while (Date.now() - started < timeout) {
        if (regex.test(await text())) { cutting = false; return true }
        if (Date.now() - started > patience) cutting = true
        await sleep(120)
      }
      cutting = false
      throw new Error('timed out waiting for ' + regex + '\n' + (await text()).slice(-1500))
    },
    async finish(out, { tail = 2500 } = {}) {
      await sleep(300)
      running = false
      await capture
      for (const child of Object.values(ptys)) child.kill()
      await browser.close()
      server.close()
      if (!record) return
      const list = frames.map((f, i) => {
        const next = i + 1 < frames.length ? frames[i + 1].at : f.at + tail
        return `file '${f.file}'\nduration ${(Math.max(next - f.at, 20) / 1000).toFixed(3)}`
      }).join('\n') + `\nfile '${frames[frames.length - 1].file}'\n`
      const listFile = path.join(framesDir, 'frames.txt')
      fs.writeFileSync(listFile, list)
      fs.writeFileSync(path.join(framesDir, 'frames.json'), JSON.stringify(frames))
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile,
        '-vf', 'split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle',
        '-fps_mode', 'vfr', '-loop', '0', out])
      // the same frames as a video, next to the frames (for sharing; the readme uses the GIF)
      const video = path.join(OUT, path.basename(out).replace(/\.gif$/, '.mp4'))
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile,
        '-vf', 'fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', video])
      const seconds = (frames[frames.length - 1].at + tail) / 1000
      console.log(`${out}: ${frames.length} frames, ${seconds.toFixed(1)}s, ${(fs.statSync(out).size / 1e6).toFixed(2)} MB`)
      console.log(`${video}: ${(fs.statSync(video).size / 1e6).toFixed(2)} MB`)
    },
  }
  await sleep(2500)
  return api
}
