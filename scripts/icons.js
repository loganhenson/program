#!/usr/bin/env node
// Regenerate the icon sets of both apps from their vector sources
// (<app>/src-tauri/icons/icon.svg).
//
//   node scripts/icons.js
//
// The SVG is rendered at 1024x1024 with a transparent background in headless
// WebKit (the browser terminal-test already installs for its browser tests:
// `cd terminal-test && npm ci && npx playwright install webkit`), and
// `tauri icon` turns that into the .icns, .ico and PNG sizes.

const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const root = path.join(__dirname, '..')
const { webkit } = require(path.join(root, 'terminal-test/node_modules/playwright'))

;(async () => {
  const browser = await webkit.launch()
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 })

  for (const app of ['terminal-pro', 'editor-pro']) {
    const icons = path.join(root, app, 'src-tauri/icons')
    const svg = fs.readFileSync(path.join(icons, 'icon.svg'), 'utf8')
    const png = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'icon-')), 'icon.png')

    await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`)
    await page.screenshot({ path: png, omitBackground: true })

    execFileSync('npx', ['tauri', 'icon', png], { cwd: path.join(root, app), stdio: 'ignore' })

    // only the desktop icons are used
    for (const extra of ['android', 'ios', '64x64.png']) {
      fs.rmSync(path.join(icons, extra), { recursive: true, force: true })
    }
    console.log(`${app}: icons regenerated`)
  }

  await browser.close()
})()
