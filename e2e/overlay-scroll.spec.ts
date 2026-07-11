import { expect, test } from '@playwright/test'

test('overlay canvas stays glued to the content through fast scroll', async ({ page }) => {
  await page.goto('/')
  const blob = page.locator('liquid-glass[merge]').first()
  await blob.waitFor()
  const backend = await blob.getAttribute('data-liquid-glass-backend')
  test.skip(backend !== 'webgl-overlay', 'runtime lacks webgl2, tier fallback engaged')

  const overlay = page.locator('canvas[data-liquid-glass-overlay]')
  await expect(overlay).toBeAttached()
  await page.waitForTimeout(400)

  const offsets = await page.evaluate(async () => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-liquid-glass-overlay]')!
    const glass = document.querySelector('liquid-glass[merge]')!
    const gap = () => canvas.getBoundingClientRect().top - glass.getBoundingClientRect().top
    const samples: number[] = [gap()]
    for (const step of [180, 260, 340, -220, -180]) {
      window.scrollBy(0, step)
      window.dispatchEvent(new Event('scroll'))
      samples.push(gap())
    }
    return samples
  })

  const first = offsets[0]!
  for (const sample of offsets) {
    expect(Math.abs(sample - first)).toBeLessThanOrEqual(1)
  }

  await expect(overlay).toHaveCSS('position', 'absolute')
})
