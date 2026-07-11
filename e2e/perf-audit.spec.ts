import { test } from '@playwright/test'

test('webkit perf profile of the docs landing', async ({ page, browserName }) => {
  test.skip(browserName !== 'webkit' || Boolean(process.env.CI), 'local safari profiling tool')
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
})
