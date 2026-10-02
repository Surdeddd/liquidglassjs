import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
import { chromium } from '@playwright/test'
import { prepareTarget, scoreAgainst } from './compare.mjs'
import { decodePng } from './png.mjs'
import { ARTIFACTS, ROOT, loadScenes, parseArgs, selectCaptures } from './scenes.mjs'

const args = parseArgs(process.argv.slice(2))
const port = Number(args.port ?? 4318)
const nativeDir = args.native ?? `${ARTIFACTS}/native/baseline`
const label = args.label ?? 'fit'
const maxEvals = Number(args['max-evals'] ?? 120)
const base = JSON.parse(args.base ?? '{}')
const space = (args.params ?? 'blur:0:24:2').split(',').map(entry => {
  const [name, min, max, step] = entry.split(':')
  return { name, min: Number(min), max: Number(max), step: Number(step) }
})
const start = JSON.parse(args.start ?? '{}')

export function clampToSpace(point) {
  const out = { ...point }
  for (const dim of space) out[dim.name] = Math.min(dim.max, Math.max(dim.min, out[dim.name]))
  return out
}

const captures = selectCaptures(loadScenes(), args).filter(capture => capture.scene.material !== 'none')
const server = spawn('pnpm', ['--filter', 'glass-match', 'exec', 'vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: ROOT,
  stdio: ['ignore', 'ignore', 'inherit']
})

async function waitForServer(url) {
  for (let attempt = 0; attempt < 120; attempt++) {
    const ok = await fetch(url).then(response => response.ok, () => false)
    if (ok) return
    await sleep(250)
  }
  throw new Error(`server did not start at ${url}`)
}

const log = []
try {
  await waitForServer(`http://127.0.0.1:${port}/`)
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })
  const contexts = {}
  const slots = []
  for (const capture of captures) {
    contexts[capture.appearance] ??= await browser.newContext({
      viewport: { width: 402, height: 874 },
      deviceScaleFactor: 3,
      colorScheme: capture.appearance
    })
    const page = await contexts[capture.appearance].newPage()
    const params = encodeURIComponent(JSON.stringify(base))
    await page.goto(`http://127.0.0.1:${port}/?scene=${encodeURIComponent(capture.scene.id)}&appearance=${capture.appearance}&params=${params}`)
    await page.waitForFunction(() => window.__glass?.().ready === true, null, { timeout: 20000 })
    const target = prepareTarget(capture.scene, decodePng(readFileSync(`${nativeDir}/${capture.name}.png`)))
    slots.push({ capture, page, target })
  }

  async function evaluate(point) {
    const per = {}
    let total = 0
    for (const slot of slots) {
      await slot.page.evaluate(options => window.__glassApply(options), { ...base, ...point })
      const { roi } = slot.target
      const shot = decodePng(await slot.page.screenshot({ clip: { x: roi.x / 3, y: roi.y / 3, width: roi.w / 3, height: roi.h / 3 } }))
      if (shot.width !== roi.w || shot.height !== roi.h) throw new Error(`roi mismatch for ${slot.capture.name}`)
      const result = scoreAgainst(slot.target, shot)
      per[slot.capture.name] = Math.round(result.score * 100) / 100
      total += result.score
    }
    return { score: total / slots.length, per }
  }

  let current = clampToSpace(Object.fromEntries(space.map(dim => [dim.name, start[dim.name] ?? (dim.min + dim.max) / 2])))
  let best = await evaluate(current)
  let evals = 1
  log.push({ point: current, ...best })
  process.stdout.write(`start ${best.score.toFixed(3)} ${JSON.stringify(current)}\n`)
  const steps = Object.fromEntries(space.map(dim => [dim.name, dim.step]))
  while (evals < maxEvals) {
    let improved = false
    for (const dim of space) {
      for (const direction of [1, -1]) {
        if (evals >= maxEvals) break
        const candidate = clampToSpace({ ...current, [dim.name]: current[dim.name] + direction * steps[dim.name] })
        if (candidate[dim.name] === current[dim.name]) continue
        const result = await evaluate(candidate)
        evals += 1
        log.push({ point: candidate, ...result })
        if (result.score < best.score - 1e-4) {
          current = candidate
          best = result
          improved = true
          process.stdout.write(`${evals} ${best.score.toFixed(3)} ${dim.name}=${candidate[dim.name]}\n`)
          break
        }
      }
    }
    if (!improved) {
      let halved = false
      for (const dim of space) {
        if (steps[dim.name] > dim.step / 8) {
          steps[dim.name] /= 2
          halved = true
        }
      }
      if (!halved) break
    }
  }
  process.stdout.write(`best ${best.score.toFixed(3)} ${JSON.stringify(current)}\n${JSON.stringify(best.per)}\n`)
  mkdirSync(`${ARTIFACTS}/fit`, { recursive: true })
  writeFileSync(`${ARTIFACTS}/fit/${label}.json`, `${JSON.stringify({ base, space, best: { point: current, ...best }, log }, null, 2)}\n`)
  await browser.close()
} finally {
  server.kill('SIGTERM')
}
