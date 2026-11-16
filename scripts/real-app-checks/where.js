// Where things are in the real window: lay out the page the app says it is
// showing (its DOM dump) with the app's own styles at the window's size, and
// report the rectangles asked for.
//   node where.js DUMP WIDTH HEIGHT  'id:<element id>' | 'text:<exact text>' ...
const fs = require('fs'), path = require('path'), http = require('http')
const { webkit } = require(path.join(__dirname, '../../terminal-test/node_modules/playwright'))
const [dump, width, height, ...wanted] = process.argv.slice(2)
const root = path.join(__dirname, '../../editor-pro/built')
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml', png: 'image/png', woff2: 'font/woff2', ttf: 'font/ttf' }
;(async () => {
  const html = fs.readFileSync(dump, 'utf8').replace(/<script\b[\s\S]*?<\/script>/g, '')
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0])
    if (url === '/index.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(html) }
    const file = path.join(root, url)
    if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end() }
    res.writeHead(200, { 'content-type': types[file.split('.').pop()] || 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  await new Promise(r => server.listen(0, '127.0.0.1', r))
  const browser = await webkit.launch()
  const page = await browser.newPage({ viewport: { width: +width, height: +height } })
  await page.goto('http://127.0.0.1:' + server.address().port + '/index.html')
  await page.waitForTimeout(400)
  const found = await page.evaluate(wanted => wanted.map(want => {
    const [kind, ...rest] = want.split(':'); const value = rest.join(':')
    let element = null
    if (kind === 'id') element = document.getElementById(value)
    else {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT)
      // the innermost element whose own text is exactly this
      while (walker.nextNode()) { const e = walker.currentNode; if (e.textContent.trim() === value && e.getClientRects().length) element = e }
    }
    if (!element) return { want, found: false }
    const r = element.getBoundingClientRect()
    return { want, found: true, x: r.x, y: r.y, width: r.width, height: r.height, tag: element.tagName, cls: element.className }
  }), wanted)
  console.log(JSON.stringify(found))
  await browser.close(); server.close()
})()
