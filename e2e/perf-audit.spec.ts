import { expect, test } from '@playwright/test'

// A shared runner renders WebKit in software on two cores: the docs hero measures
// 3-4 fps there against 61 on a laptop. So the CI floor is set to catch a material
// that stopped drawing at all, not to judge speed — `pnpm bench` is where the fps
// numbers mean something. Override with PERF_FLOOR_FPS when running somewhere known.
const FLOOR_FPS = Number(process.env['PERF_FLOOR_FPS'] ?? (process.env['CI'] ? 2 : 24))

test('webkit perf profile of the docs landing', async ({ page, browserName }) => {
  test.skip(browserName !== 'webkit', 'safari profiling tool')
  test.setTimeout(120000)
  await page.goto('http://127.0.0.1:4175/')
  await page.waitForTimeout(1500)

  const metrics = await page.evaluate(async () => {
    const out: Record<string, number> = {}
    const fpsAt = async (y: number, label: string) => {
      window.scrollTo(0, y)
      await new Promise(r => setTimeout(r, 700))
      let frames = 0
      const t0 = performance.now()
      await new Promise<void>(done => {
        const step = () => {
          frames++
          if (performance.now() - t0 < 2000) requestAnimationFrame(step)
          else done()
        }
        requestAnimationFrame(step)
      })
      out[label] = Math.round(frames / 2)
    }
    await fpsAt(0, 'fps_hero')
    await fpsAt(document.getElementById('metaballs')!.offsetTop - 100, 'fps_metaballs')
    await fpsAt(document.getElementById('ios')!.offsetTop - 60, 'fps_ios')

    window.scrollTo(0, document.getElementById('ios')!.offsetTop - 900)
    await new Promise(r => setTimeout(r, 400))
    let scrollFrames = 0
    const t1 = performance.now()
    await new Promise<void>(done => {
      const step = () => {
        scrollFrames++
        window.scrollBy(0, 14)
        if (performance.now() - t1 < 2500) requestAnimationFrame(step)
        else done()
      }
      requestAnimationFrame(step)
    })
    out['fps_scrolling_into_ios'] = Math.round(scrollFrames / 2.5)
    out['clones'] = document.querySelectorAll('[data-liquid-glass-layer="refract"]').length
    return out
  })
  console.log('WEBKIT_PERF ' + JSON.stringify(metrics))

  const samples = Object.entries(metrics).filter(([label]) => label.startsWith('fps_'))
  expect(samples.length).toBeGreaterThanOrEqual(4)
  expect(metrics['clones'], 'svg-content produced no refraction layers').toBeGreaterThan(0)
  for (const [label, value] of samples) {
    expect(value, `${label} produced no frames at all`).toBeGreaterThan(0)
  }
  for (const [label, value] of samples) {
    expect(value, `${label} collapsed to ${value} fps`).toBeGreaterThan(FLOOR_FPS)
  }
})
