import { expect, test } from '@playwright/test'

test('demo mounts liquid glass surfaces', async ({ page }) => {
  await page.goto('/')
  const panels = page.locator('liquid-glass')
  await expect(panels).toHaveCount(3)
  await expect(panels.first()).toHaveAttribute('data-liquid-glass', 'frosted')
})

test('preset attribute drives the engine', async ({ page }) => {
  await page.goto('/')
  const panel = page.locator('liquid-glass').first()
  await panel.evaluate(el => el.setAttribute('preset', 'tinted'))
  await expect(panel).toHaveAttribute('data-liquid-glass', 'tinted')
})
