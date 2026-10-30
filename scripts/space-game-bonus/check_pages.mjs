// Render bonus pages inside a sandboxed srcdoc iframe (like the IDE's HtmlViewer),
// click every hint/solution/stuck button, report JS errors, and save screenshots.
// Usage: node scripts/space-game-bonus/check_pages.mjs [out_dir] [file...]
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..', '..')
const require = createRequire(path.join(root, 'lua-learning-website', 'package.json'))
const { chromium } = require('playwright')

const bonusDir = path.join(root, 'lua-learning-website', 'public', 'projects', 'space_game_project', 'bonus')
const [outDir = path.join(root, 'tmp', 'bonus-shots'), ...only] = process.argv.slice(2)
fs.mkdirSync(outDir, { recursive: true })
const files = only.length ? only : fs.readdirSync(bonusDir).filter(f => f.endsWith('.html')).sort()

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 900, height: 1100 } })
let failures = 0
for (const f of files) {
  const html = fs.readFileSync(path.join(bonusDir, f), 'utf8')
  const errors = []
  page.removeAllListeners('pageerror')
  page.on('pageerror', e => errors.push(String(e)))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.setContent('<iframe id="v" sandbox="allow-scripts" style="width:880px;height:1080px;border:0"></iframe>')
  await page.$eval('#v', (el, h) => { el.srcdoc = h }, html)
  await page.waitForTimeout(400)
  const frame = page.frames().find(fr => fr !== page.mainFrame())
  await page.screenshot({ path: path.join(outDir, f.replace('.html', '_top.png')) })
  // Click through every hint, then every solution, then stuck buttons
  const counts = await frame.evaluate(() => {
    let hints = 0, sols = 0
    document.querySelectorAll('.btn-hint').forEach(b => {
      const n = parseInt(b.getAttribute('data-total'), 10)
      const actual = b.closest('.step').querySelectorAll('.hints-container .hint').length
      if (n !== actual) throw new Error('data-total ' + n + ' != hints ' + actual)
      for (let i = 0; i < n; i++) { b.click(); hints++ }
    })
    document.querySelectorAll('.btn-solution').forEach(b => { b.click(); sols++ })
    document.querySelectorAll('.btn-stuck').forEach(b => b.click())
    const hiddenHints = document.querySelectorAll('.hint[hidden]').length
    const unhl = [...document.querySelectorAll('code.lua')].filter(c => !c.querySelector('span') && c.textContent.trim().length > 20).length
    return { hints, sols, hiddenHints, unhl, steps: document.querySelectorAll('.step').length }
  }).catch(e => { errors.push(String(e)); return null })
  await page.waitForTimeout(100)
  const status = errors.length ? 'FAIL' : 'OK'
  if (errors.length) failures++
  console.log(status, f, JSON.stringify(counts), errors.join(' | '))
}
await browser.close()
process.exit(failures ? 1 : 0)
