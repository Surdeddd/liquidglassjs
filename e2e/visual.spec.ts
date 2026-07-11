import { expect, test } from '@playwright/test'

test.describe('lens optics visual regression', () => {
  test('rim bends stripes and interior stays flat', async ({ page }) => {
    await page.goto('/')
    const panel = page.locator('liquid-glass[preset="clear"][backdrop=".stripes"]').first()
    await panel.waitFor()
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

  test('squircle rim renders the bezel ring', async ({ page }) => {
    await page.goto('/')
    const panel = page.locator('liquid-glass[shape="squircle"]').first()
    await panel.waitFor()
    await page.waitForTimeout(600)
    const box = await panel.boundingBox()
    if (!box) throw new Error('squircle panel not laid out')

    await expect(page).toHaveScreenshot('squircle-top.png', {
      clip: { x: box.x + box.width / 2 - 28, y: box.y - 10, width: 56, height: 56 }
    })
  })
})
