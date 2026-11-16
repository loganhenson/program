// EditorPro: this repository open, a file from it, tests and Claude Code in
// the integrated terminal, and a second project in its own top-level tab.
//
//   node scripts/recordings/editor.js            writes docs/editor-pro.gif
//
// DEMO_PROJECT is the second project, a path below the home directory
// (default Desktop/getcaloric); its `artisan` file is opened.
const fs = require('fs')
const path = require('path')
const { start } = require('./rec')
;(async () => {
  const program = fs.realpathSync(path.join(__dirname, '../..'))
  const laravel = path.join(process.env.HOME, process.env.DEMO_PROJECT || 'Desktop/getcaloric')
  const name = path.basename(program), other = path.basename(laravel)
  const rec = await start({ app: 'editor-pro', cwd: program, width: 1080, height: 960, scale: 1.25, framesDir: __dirname + '/out/editor-frames', recents: [program, laravel], pick: laravel })
  const enter = async (text, delay) => { await rec.type(text, delay); await rec.pause(250); await rec.press('Enter') }
  const openFolder = p => rec.page.locator(`[id="${p}"]`).locator('xpath=preceding-sibling::*[1]').click()
  const openFile = name => rec.page.getByText(name, { exact: true }).first().dblclick()
  const seen = []

  await rec.waitText(new RegExp('➜\\s+' + name + ' git'))
  await rec.pause(400)
  rec.reset()
  await rec.pause(900)

  // a file from the project
  await openFolder(program + '/terminal-server'); await rec.pause(650)
  await openFolder(program + '/terminal-server/src'); await rec.pause(650)
  await openFile('terminal.rs')
  await rec.waitText(/portable_pty/)
  await rec.pause(2200)

  // the tests, in the integrated terminal
  await rec.press('Meta+Digit2')
  await rec.pause(500)
  await enter('cd terminal-server && cargo test')
  await rec.waitText(/test result: ok[^\n]*\n[\s\S]*➜\s+terminal-server git[^\n]*\s*$/, { timeout: 300000 })
  seen.push(await rec.text())
  await rec.pause(2400)

  // Claude Code in a second terminal of the same project
  await rec.click('[title="Open another terminal in this project"]')
  await rec.waitText(new RegExp('➜\\s+' + name + ' git[^\\n]*\\s*$'))
  await rec.pause(500)
  await enter('claude')
  await rec.waitText(/Claude Code v[\s\S]*❯/)
  seen.push(await rec.text())
  await rec.pause(2800)

  // another project, in its own top-level tab
  await rec.click('[title="Open another project"]')
  await rec.waitText(new RegExp('artisan[\\s\\S]*➜\\s+' + other + ' git'))
  await rec.pause(1500)
  await openFile('artisan')
  await rec.waitText(/Illuminate|LARAVEL_START/)
  seen.push(await rec.text())
  await rec.pause(2600)

  // and back
  await rec.click(`[title="${program}"]`)
  await rec.pause(2600)
  // what was on screen, as text: read it before publishing a recording
  fs.writeFileSync(__dirname + '/out/editor-text.txt', seen.join('\n=====\n'))
  await rec.finish(path.join(__dirname, '../../docs/editor-pro.gif'))
})().catch(e => { console.error(e.message.slice(0, 1800)); process.exit(1) })
