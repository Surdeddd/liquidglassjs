import { chromium } from '@playwright/test'

const headed = process.argv.includes('--headed')
const browser = await chromium.launch({ headless: !headed })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://127.0.0.1:4173/bench.html')
await page.waitForFunction(() => typeof window.__fps === 'number', null, { timeout: 15000 })
const fps = await page.evaluate(() => window.__fps)
await browser.close()

const threshold = 55
console.log(`fps bench: 10 lenses, 5s continuous scroll -> ${fps} fps (target >= ${threshold})`)
if (fps < threshold) {
  console.log('below target')
  process.exit(1)
}
