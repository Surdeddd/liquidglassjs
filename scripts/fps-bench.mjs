import { chromium } from '@playwright/test'

const headed = process.argv.includes('--headed')
const browser = await chromium.launch({ headless: !headed })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://127.0.0.1:4173/bench.html')
await page.waitForFunction(() => typeof window.__fps === 'number', null, { timeout: 40000 })
const result = await page.evaluate(() => ({
  settled: window.__fps,
  initial: window.__initialFps,
  quality: window.__quality?.()
}))
await browser.close()

const threshold = 55
const tier = result.quality?.tier ?? 'unknown'
const passes = result.quality?.caPasses ?? '?'
console.log(
  `fps bench: 10 lenses, continuous scroll -> ${result.initial} fps cold, ${result.settled} fps settled ` +
    `(tier ${tier}, ${passes} dispersion pass${passes === 1 ? '' : 'es'}, target >= ${threshold})`
)
if (result.settled < threshold) {
  console.log('below target')
  process.exit(1)
}
