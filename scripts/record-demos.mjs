import { chromium } from '@playwright/test'

const OUT = process.argv[2]
const BASE = 'http://localhost:4179'

const browser = await chromium.launch({ headless: true })

async function record(name, run) {
  const context = await browser.newContext({
    viewport: { width: 960, height: 560 },
    recordVideo: { dir: OUT, size: { width: 960, height: 560 } }
  })
  const page = await context.newPage()
  await run(page)
  const video = page.video()
  await context.close()
  const path = await video.path()
  const { rename } = await import('node:fs/promises')
  await rename(path, `${OUT}/${name}.webm`)
  console.log('recorded', name)
}

await record('metaballs', async page => {
  await page.goto(`${BASE}/?rec=1`)
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto'
    history.scrollRestoration = 'manual'
  })
  await page.waitForTimeout(1200)
  const stage = page.locator('.merge-stage')
  await stage.scrollIntoViewIfNeeded()
  await page.waitForTimeout(2600)
  const dock = page.locator('.dock-stage')
  await dock.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  for (const i of [3, 1, 2]) {
    await page.locator(`button[data-dock="${i}"]`).click({ force: true })
    await page.waitForTimeout(1100)
  }
})

await record('press', async page => {
  await page.goto(`${BASE}/?rec=2#physics`)
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto'
  })
  await page.waitForTimeout(1400)
  await page.locator('#physics .physics-lens').scrollIntoViewIfNeeded()
  await page.waitForTimeout(600)
  const lens = page.locator('.physics-lens')
  const box = await lens.boundingBox()
  for (const t of [0.3, 0.65]) {
    await page.mouse.move(box.x + box.width * t, box.y + box.height * 0.5, { steps: 14 })
    await page.mouse.down()
    await page.waitForTimeout(650)
    await page.mouse.up()
    await page.waitForTimeout(750)
  }
})

await record('ios', async page => {
  await page.goto(`${BASE}/?rec=3#ios`)
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto'
  })
  await page.waitForTimeout(1500)
  await page.locator('.ios-cc').scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  const grid = await page.locator('.ios-cc-grid').boundingBox()
  await page.mouse.move(grid.x - 60, grid.y - 40, { steps: 5 })
  await page.mouse.move(grid.x + grid.width + 70, grid.y + grid.height * 0.4, { steps: 45 })
  await page.mouse.move(grid.x + grid.width * 0.5, grid.y + grid.height + 60, { steps: 35 })
  const tabs = page.locator('.ios-tabbar-stage')
  await tabs.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  for (const i of [2, 0]) {
    await page.locator(`button[data-ios-tab="${i}"]`).click({ force: true })
    await page.waitForTimeout(1000)
  }
})

await browser.close()
console.log('done')
