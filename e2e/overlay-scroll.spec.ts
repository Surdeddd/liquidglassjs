import { expect, test } from '@playwright/test'

test('overlay canvas glues to fast scroll and settles after render', async ({ page }) => {
  await page.goto('/')
  const blob = page.locator('liquid-glass[merge]').first()
  await blob.waitFor()
  const backend = await blob.getAttribute('data-liquid-glass-backend')
  test.skip(backend !== 'webgl-overlay', 'runtime lacks webgl2, tier fallback engaged')

  const overlay = page.locator('canvas[data-liquid-glass-overlay]')
  await expect(overlay).toBeAttached()
  await page.waitForTimeout(400)

  const glued = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-liquid-glass-overlay]')!
    window.scrollTo(0, window.scrollY + 420)
    window.dispatchEvent(new Event('scroll'))
    return canvas.style.transform
  })
  expect(glued).toMatch(/translate\(0px, -?\d+(\.\d+)?px\)/)
  expect(glued).toContain('-420px')

  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            document.querySelector<HTMLCanvasElement>('canvas[data-liquid-glass-overlay]')!.style
              .transform
        ),
      { timeout: 4000 }
    )
    .toBe('')
})
