import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
import { chromium, webkit } from '@playwright/test'
import { ARTIFACTS, ROOT, loadScenes, parseArgs, selectCaptures } from './scenes.mjs'

const args = parseArgs(process.argv.slice(2))
const port = Number(args.port ?? 4317)
const label = args.label ?? 'current'
const outDir = `${ARTIFACTS}/web/${label}`
const captures = selectCaptures(loadScenes(), args)
mkdirSync(outDir, { recursive: true })

async function waitForServer(url) {
  for (let attempt = 0; attempt < 120; attempt++) {
    const ok = await fetch(url).then(response => response.ok, () => false)
    if (ok) return
    await sleep(250)
  }
  throw new Error(`server did not start at ${url}`)
}

const server = spawn('pnpm', ['--filter', 'glass-match', 'exec', 'vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: ROOT,
  stdio: ['ignore', 'ignore', 'inherit']
})

const manifest = []
try {
  await waitForServer(`http://127.0.0.1:${port}/`)
  const browser = args.browser === 'webkit'
    ? await webkit.launch({ headless: args.headed !== 'true' })
    : await chromium.launch({ headless: args.headed !== 'true', channel: args.channel, args: ['--force-color-profile=srgb'] })
  for (const appearance of ['light', 'dark']) {
    const batch = captures.filter(capture => capture.appearance === appearance)
    if (batch.length === 0) continue
    const context = await browser.newContext({
      viewport: { width: 402, height: 874 },
      deviceScaleFactor: Number(args.dpr ?? 3),
      colorScheme: appearance
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(String(error)))
    for (const capture of batch) {
      const backend = args.backend ? `&backend=${args.backend}` : ''
      const extra = args.params ? `&params=${encodeURIComponent(args.params)}` : ''
      await page.goto(`http://127.0.0.1:${port}/?scene=${encodeURIComponent(capture.scene.id)}&appearance=${appearance}${backend}${extra}`)
      await page.waitForFunction(() => window.__glass?.().ready === true, null, { timeout: 20000 })
      await sleep(400)
      let previous = await page.screenshot()
      let stable = false
      for (let attempt = 0; attempt < 8 && !stable; attempt++) {
        await sleep(250)
        const next = await page.screenshot()
        stable = next.equals(previous)
        previous = next
      }
      const state = await page.evaluate(() => window.__glass())
      writeFileSync(`${outDir}/${capture.name}.png`, previous)
      manifest.push({ name: capture.name, stable, ...state, errors: errors.splice(0) })
      process.stdout.write(`${capture.name} ${stable ? 'stable' : 'UNSTABLE'} ${state.actual.join(',')}\n`)
    }
    await context.close()
  }
  await browser.close()
} finally {
  server.kill('SIGTERM')
}

writeFileSync(`${outDir}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`)
