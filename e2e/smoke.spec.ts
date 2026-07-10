import { expect, test } from '@playwright/test'

test('demo mounts liquid glass surfaces', async ({ page }) => {
  await page.goto('/')
  const panels = page.locator('liquid-glass')
  await expect(panels).toHaveCount(9)
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

test('webgl-scene renders into a canvas layer', async ({ page }) => {
  await page.goto('/')
  const lens = page.locator('liquid-glass.hero-lens')
  await expect(lens).toHaveAttribute('data-liquid-glass-backend', /webgl-scene|svg-content/)
  const backend = await lens.getAttribute('data-liquid-glass-backend')
  test.skip(backend !== 'webgl-scene', 'runtime lacks webgl2, tier fallback engaged')
  await expect(lens.locator('canvas[data-liquid-glass-layer="scene"]')).toBeAttached()
  const size = await lens
    .locator('canvas[data-liquid-glass-layer="scene"]')
    .evaluate(el => ({ w: (el as HTMLCanvasElement).width, h: (el as HTMLCanvasElement).height }))
  expect(size.w).toBeGreaterThan(0)
  expect(size.h).toBeGreaterThan(0)
})

test('webgl-overlay shares one viewport canvas', async ({ page }) => {
  await page.goto('/')
  const lens = page.locator('liquid-glass.panel[backend="webgl-overlay"]')
  await expect(lens).toHaveAttribute('data-liquid-glass-backend', /webgl-overlay|svg-content/)
  const backend = await lens.getAttribute('data-liquid-glass-backend')
  test.skip(backend !== 'webgl-overlay', 'runtime lacks webgl2, tier fallback engaged')
  const overlay = page.locator('canvas[data-liquid-glass-overlay]')
  await expect(overlay).toHaveCount(1)
  const size = await overlay.evaluate(el => ({
    w: (el as HTMLCanvasElement).width,
    h: (el as HTMLCanvasElement).height
  }))
  expect(size.w).toBeGreaterThan(0)
  expect(size.h).toBeGreaterThan(0)
})

test('adaptive contrast flags the backdrop tone', async ({ page }) => {
  await page.goto('/')
  const lightLens = page.locator('liquid-glass.light-lens')
  await expect(lightLens).toHaveAttribute('data-liquid-glass-tone', 'light')
  const stripedPanel = page.locator('liquid-glass.panel').first()
  await expect(stripedPanel).not.toHaveAttribute('data-liquid-glass-tone', /.+/)
})

test('injected engine layers stay hidden from assistive tech', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(500)
  const unlabeled = await page.evaluate(() => {
    const injected = document.querySelectorAll(
      '[data-liquid-glass-layer], [data-liquid-glass-overlay], svg defs'
    )
    let bad = 0
    for (const node of injected) {
      const host = node.closest('svg') ?? node
      if (host.getAttribute('aria-hidden') !== 'true') bad++
    }
    return bad
  })
  expect(unlabeled).toBe(0)
})

test('merge group melts lenses on the shared overlay', async ({ page }) => {
  await page.goto('/')
  const blobs = page.locator('liquid-glass[merge="demo"]')
  await expect(blobs).toHaveCount(2)
  await expect(blobs.first()).toHaveAttribute('data-liquid-glass-backend', /webgl-overlay|svg-content/)
  const backend = await blobs.first().getAttribute('data-liquid-glass-backend')
  test.skip(backend !== 'webgl-overlay', 'runtime lacks webgl2, tier fallback engaged')
  await expect(blobs.nth(1)).toHaveAttribute('data-liquid-glass-backend', 'webgl-overlay')
  const overlay = page.locator('canvas[data-liquid-glass-overlay]')
  await expect(overlay).toHaveCount(1)
})

test('squircle shape clips the surface with a superellipse', async ({ page }) => {
  await page.goto('/')
  const lens = page.locator('liquid-glass[shape="squircle"]')
  const clip = await lens.evaluate(el => getComputedStyle(el).clipPath)
  expect(clip).toContain('polygon')
})

test('press squashes the glass with spring physics', async ({ page }) => {
  await page.goto('/')
  const panel = page.locator('liquid-glass').first()
  const box = await panel.boundingBox()
  if (!box) throw new Error('panel not laid out')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(250)
  const transform = await panel.evaluate(el => getComputedStyle(el).transform)
  expect(transform).not.toBe('none')
  await page.mouse.up()
})

test('reduced motion disables physics', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const panel = page.locator('liquid-glass').first()
  const box = await panel.boundingBox()
  if (!box) throw new Error('panel not laid out')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(250)
  const transform = await panel.evaluate(el => getComputedStyle(el).transform)
  expect(transform).toBe('none')
  await page.mouse.up()
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
