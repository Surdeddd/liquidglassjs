import { expect, test } from '@playwright/test'

const DOCS = 'http://127.0.0.1:4175/'

test('landing renders live glass everywhere', async ({ page }) => {
  await page.goto(DOCS)
  const lenses = page.locator('liquid-glass[data-liquid-glass]')
  await expect(lenses.first()).toBeAttached()
  expect(await lenses.count()).toBeGreaterThanOrEqual(7)
})

test('detected backend chip matches the probe lens', async ({ page, browserName }) => {
  await page.goto(DOCS)
  const expected = browserName === 'chromium' ? 'css-svg' : 'svg-content'
  await expect(page.locator('[data-backend-chip]')).toHaveText(expected)
  await expect(page.locator(`.tiers li[data-tier="${expected}"]`)).toHaveClass(/active/)
})

test('playground drives the lens and exports the config', async ({ page }) => {
  await page.goto(DOCS)
  await page.locator('#playground').scrollIntoViewIfNeeded()
  await expect(page.locator('#playground')).toHaveClass(/in/)
  const blur = page.locator('input[data-param="blur"]')
  await blur.evaluate(el => {
    const input = el as HTMLInputElement
    input.value = '33'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(page.locator('[data-snippet]')).toContainText('blur: 33')
  const lens = page.locator('[data-pg-lens]')
  await expect(lens).toHaveAttribute('data-liquid-glass', 'clear')
  await page.locator('button[data-preset="frosted"]').click()
  await expect(lens).toHaveAttribute('data-liquid-glass', 'frosted')
  await expect(page.locator('[data-snippet]')).toContainText("preset: 'frosted'")
})

test('adaptive cards expose their tone', async ({ page }) => {
  await page.goto(DOCS)
  const lightLens = page.locator('.adaptive-light liquid-glass')
  await expect(lightLens).toHaveAttribute('data-liquid-glass-tone', 'light')
  const darkLens = page.locator('.adaptive-dark liquid-glass')
  await expect(darkLens).toHaveAttribute('data-liquid-glass-tone', 'dark')
})
