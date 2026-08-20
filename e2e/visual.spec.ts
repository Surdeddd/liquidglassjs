import { expect, test } from '@playwright/test'

test.describe('lens optics visual regression', () => {
  test.skip(
    !['darwin', 'linux'].includes(process.platform),
    'pixel baselines exist for macOS and the linux CI runner'
  )

  test('rim bends stripes and interior stays flat', async ({ page }) => {
    await page.goto('/?static=1')
    const panel = page.locator('liquid-glass[preset="clear"][backdrop=".stripes"]').first()
    await panel.waitFor()
    await panel.scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)
    const box = await panel.boundingBox()
    if (!box) throw new Error('clear panel not laid out')

    await expect(page).toHaveScreenshot('rim-left.png', {
      clip: { x: box.x - 10, y: box.y + box.height / 2 - 28, width: 56, height: 56 }
    })

    await expect(page).toHaveScreenshot('lens-center.png', {
      clip: {
        x: box.x + box.width / 2 - 28,
        y: box.y + box.height / 2 - 28,
        width: 56,
        height: 56
      }
    })
  })

  // The crops above sit on `preset="clear"`, whose 2px blur leaves the heavy-blur
  // path uncovered entirely. This one guards the frosted rim at 10px. It does not
  // distinguish blurring before the displacement from blurring after — measured,
  // those differ by at most 8 levels out of 255 on 3.68% of the panel — so treat
  // it as coverage for the tier, not as a guard on filter order.
  test('a heavily blurred rim still resolves the backdrop behind it', async ({ page }) => {
    await page.goto('/?static=1')
    const panel = page.locator('liquid-glass.panel--frosted').first()
    await panel.waitFor()
    await panel.scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)
    const box = await panel.boundingBox()
    if (!box) throw new Error('frosted panel not laid out')

    await expect(page).toHaveScreenshot('frosted-rim.png', {
      clip: { x: box.x - 10, y: box.y + box.height / 2 - 28, width: 56, height: 56 }
    })
  })

  test('squircle rim renders the bezel ring', async ({ page }) => {
    await page.goto('/?static=1')
    const panel = page.locator('liquid-glass[shape="squircle"]').first()
    await panel.waitFor()
    await panel.scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)
    const box = await panel.boundingBox()
    if (!box) throw new Error('squircle panel not laid out')

    await expect(page).toHaveScreenshot('squircle-top.png', {
      clip: { x: box.x + box.width / 2 - 28, y: box.y - 10, width: 56, height: 56 }
    })
  })
})
