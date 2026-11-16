// TerminalPro: an artisan command, Claude Code and Codex in three tabs of a
// Laravel project, then switching between them.
//
//   node scripts/recordings/terminal.js          writes docs/terminal-pro.gif
//
// DEMO_PROJECT is the Laravel project, a path below the home directory
// (default Desktop/getcaloric). With ASK_CLAUDE=1 Claude Code is asked a
// question instead of showing its help; that needs a `claude` login that can
// make requests.
const path = require('path')
const { start } = require('./rec')
const PROJECT = process.env.DEMO_PROJECT || 'Desktop/getcaloric'
const NAME = path.basename(PROJECT)
;(async () => {
  const rec = await start({ app: 'terminal-pro', width: 860, height: 560, framesDir: __dirname + '/out/terminal-frames' })
  const seen = []
  const enter = async (text, delay) => { await rec.type(text, delay); await rec.pause(250); await rec.press('Enter') }
  const project = async () => { await rec.waitText(/➜\s+~/); await rec.pause(500); await enter('cd ' + PROJECT); await rec.waitText(new RegExp(NAME + ' git')); await rec.pause(500) }

  await rec.waitText(/➜\s+~/)
  await rec.pause(400)
  rec.reset()
  await rec.pause(700)
  await project()
  await enter('php artisan about')
  await rec.waitText(new RegExp('public/storage[\\s\\S]*' + NAME + ' git'))
  seen.push(await rec.text())
  await rec.pause(2400)

  await rec.click('[title="Open another terminal"]')
  await project()
  await enter('claude')
  await rec.waitText(/Claude Code v[\s\S]*❯/)
  await rec.pause(1300)
  if (process.env.ASK_CLAUDE) {
    await enter('Which Laravel version is this app on? One short sentence.', 30)
    await rec.waitText(/\n\s*[⏺●][^\n]*13/)
  } else {
    await enter('/help', 90)
    await rec.waitText(/shortcuts|commands/i)
  }
  seen.push(await rec.text())
  await rec.pause(2800)

  await rec.click('[title="Open another terminal"]')
  await project()
  await enter('codex')
  await rec.waitText(/OpenAI Codex[\s\S]*Ask Codex/)
  await rec.pause(1300)
  await enter('Which PHP version does composer.json require? One short sentence.', 30)
  await rec.waitText(/Worked for \d+/)
  seen.push(await rec.text())
  await rec.pause(2800)

  for (const tab of ['term-0', 'term-1', 'term-2']) {
    await rec.click(`[title="${tab}"]`)
    await rec.pause(2000)
  }
  // what was on screen, as text: read it before publishing a recording
  require('fs').writeFileSync(__dirname + '/out/terminal-text.txt', seen.join('\n=====\n'))
  await rec.finish(path.join(__dirname, '../../docs/terminal-pro.gif'))
})().catch(e => { console.error(e.message.slice(0, 1500)); process.exit(1) })
