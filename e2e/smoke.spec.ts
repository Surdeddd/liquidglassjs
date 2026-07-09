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

test('engine picks the best backend per browser', async ({ page, browserName }) => {
  await page.goto('/')
  const panel = page.locator('liquid-glass').first()
  const expected = browserName === 'chromium' ? 'css-svg' : 'svg-content'
  await expect(panel).toHaveAttribute('data-liquid-glass-backend', expected)
})

test('safari and firefox refract through a backdrop copy layer', async ({ page, browserName }) => {
  test.skip(browserName === 'chromium', 'chromium refracts the real backdrop directly')
  await page.goto('/')
  const layer = page.locator('liquid-glass [data-liquid-glass-layer="refract"]').first()
  await expect(layer).toBeAttached()
  const filter = await layer.evaluate(el => getComputedStyle(el).filter)
  expect(filter).toContain('url(')
  const cloneCount = await page
    .locator('liquid-glass [data-liquid-glass-layer="refract"] > *')
    .count()
  expect(cloneCount).toBeGreaterThanOrEqual(3)
})

test('engine renders glass through a backend', async ({ page, browserName }) => {
  await page.goto('/')
  const panel = page.locator('liquid-glass').first()
  const filter = await panel.evaluate(el => {
    const computed = getComputedStyle(el)
    return computed.backdropFilter || computed.getPropertyValue('-webkit-backdrop-filter')
  })
  if (browserName === 'chromium') {
    expect(filter).toContain('url(')
  } else {
    expect(filter).toContain('blur')
  }
  const background = await panel.evaluate(el => getComputedStyle(el).backgroundColor)
  expect(background).not.toBe('rgba(0, 0, 0, 0)')
})

test('chromium filter carries a displacement map', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'svg backdrop filters are chromium-only')
  await page.goto('/')
  const href = await page
    .locator('svg defs filter feImage')
    .first()
    .evaluate(el => el.getAttribute('href') ?? '')
  expect(href).toContain('data:image/png')
})
