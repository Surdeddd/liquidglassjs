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
  await page.locator('button[data-preset="frosted"]').evaluate(el => (el as HTMLElement).click())
  await expect(lens).toHaveAttribute('data-liquid-glass', 'frosted')
  await expect(page.locator('[data-snippet]')).toContainText("preset: 'frosted'")
})

test('dock pill springs between tabs and shares the merge group', async ({ page }) => {
  await page.goto(DOCS)
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' })
  await page.locator('.dock-stage').scrollIntoViewIfNeeded()
  await expect(page.locator('#metaballs')).toHaveClass(/in/)
  const pill = page.locator('.dock-pill')
  await expect(pill).toHaveAttribute('data-liquid-glass-backend', /webgl-overlay|svg-content/)
  await page.locator('button[data-dock="3"]').click({ force: true })
  await expect
    .poll(async () => parseFloat(await pill.evaluate(el => el.style.left || '0')), {
      timeout: 8000
    })
    .toBeGreaterThan(50)
})

test('every playground control announces what it changes', async ({ page }) => {
  await page.goto(DOCS)
  await page.locator('#playground').scrollIntoViewIfNeeded()
  const names = await page
    .locator('.pg-controls input')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-param') ?? 'tint'))
  expect(names.length).toBeGreaterThanOrEqual(12)
  for (const label of ['blur', 'refraction', 'dispersion', 'specular', 'frost']) {
    await expect(page.getByRole('slider', { name: label, exact: true })).toHaveCount(1)
  }
  await expect(page.getByRole('checkbox', { name: 'motion light' })).toHaveCount(1)
})

test('keyboard focus stays visible and follows the control shape', async ({ page }) => {
  await page.goto(DOCS)
  const ring = await page.locator('.dock-tabs button').first().evaluate(el => {
    el.focus()
    const cs = getComputedStyle(el)
    return { radius: cs.borderRadius, outline: cs.outlineColor, width: cs.outlineWidth }
  })
  expect(parseFloat(ring.radius)).toBeGreaterThan(8)
  expect(parseFloat(ring.width)).toBeGreaterThanOrEqual(2)
})

test('adaptive cards expose their tone', async ({ page }) => {
  await page.goto(DOCS)
  const lightLens = page.locator('.adaptive-light liquid-glass')
  await expect(lightLens).toHaveAttribute('data-liquid-glass-tone', 'light')
  const darkLens = page.locator('.adaptive-dark liquid-glass')
  await expect(darkLens).toHaveAttribute('data-liquid-glass-tone', 'dark')
})
