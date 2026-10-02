import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { deltaE2000, srgbToLab } from '../color.mjs'
import { regionOf, sdRoundRect } from '../compare.mjs'
import { decodePng, encodePng } from '../png.mjs'
import { PHASE_CENTER, PHASE_PERIOD_PT, decodePhase, decodePhaseQuad, phaseImage, phaseToCoordinate, wrappedShift } from '../phase.mjs'

test('png survives an encode/decode round trip', () => {
  const width = 7
  const height = 5
  const rgba = Uint8Array.from({ length: width * height * 4 }, (_, i) => (i * 37 + 11) % 256)
  const decoded = decodePng(encodePng({ width, height, rgba }))
  assert.equal(decoded.width, width)
  assert.equal(decoded.height, height)
  assert.deepEqual(decoded.rgba, rgba)
})

test('project backgrounds decode at the oracle framebuffer size', () => {
  const image = decodePng(readFileSync(new URL('../../../e2e/fixtures/apple-glass/backgrounds/phase-grid.png', import.meta.url)))
  assert.equal(image.width, 1206)
  assert.equal(image.height, 2622)
  assert.equal(image.iccProfile, false)
})

test('srgb white and black land on the Lab poles', () => {
  const white = srgbToLab(255, 255, 255)
  assert.ok(Math.abs(white[0] - 100) < 0.01)
  assert.ok(Math.abs(white[1]) < 0.01 && Math.abs(white[2]) < 0.01)
  assert.deepEqual(srgbToLab(0, 0, 0).map(v => Math.round(v * 1000) / 1000), [0, 0, 0])
})

test('deltaE2000 matches the Sharma reference pairs', () => {
  const pairs = [
    [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
    [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
    [[50, 2.8361, -74.02], [50, 0, -82.7485], 3.4412],
    [[50, 2.5, 0], [73, 25, -18], 27.1492],
    [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
    [[2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514], 0.9082]
  ]
  for (const [a, b, expected] of pairs) {
    assert.ok(Math.abs(deltaE2000(a, b) - expected) < 0.0005, `${a} vs ${b}`)
  }
})

test('rounded-rect distance is negative inside, zero on the edge', () => {
  const capsule = { x: 0, y: 0, width: 96, height: 44, radius: 22 }
  assert.ok(Math.abs(sdRoundRect(144, 66, capsule) + 66) < 1e-9)
  assert.ok(Math.abs(sdRoundRect(144, 0, capsule)) < 1e-9)
  assert.ok(sdRoundRect(-3, 66, capsule) > 0)
})

test('phase backgrounds decode back to their coordinate, through blur and an affine lift', () => {
  const image = phaseImage('x')
  const period = PHASE_PERIOD_PT * 3
  const row = 700
  const at = x => {
    const i = (row * image.width + x) * 4
    return [image.rgba[i], image.rgba[i + 1]]
  }
  for (const x of [10, 77, 143, 400]) {
    const [r, g] = at(x)
    assert.ok(Math.abs(wrappedShift(phaseToCoordinate(decodePhase(r, g, PHASE_CENTER)), x + 0.5)) < 0.6, `x ${x}`)
  }
  const sigma = 6
  const blurred = (x, channel) => {
    let sum = 0
    let weight = 0
    for (let k = -18; k <= 18; k++) {
      const w = Math.exp(-(k * k) / (2 * sigma * sigma))
      sum += w * at(x + k)[channel]
      weight += w
    }
    return (sum / weight) * 1.035 + 19.5
  }
  const lifted = PHASE_CENTER * 1.035 + 19.5
  const decoded = phaseToCoordinate(decodePhase(blurred(260, 0), blurred(260, 1), lifted))
  assert.ok(Math.abs(wrappedShift(decoded, 260.5)) < 0.8)
  assert.ok(period > 0)
})

test('the quadrature decode survives a frost that compresses luminance and scales chroma', () => {
  const image = phaseImage('y')
  const frost = ([r, g, b]) => {
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    const lifted = 219 + 0.131 * y
    return [r, g, b].map(c => lifted + 0.72 * (c - y))
  }
  for (const y of [40, 333, 901]) {
    const i = (y * image.width + 50) * 4
    const [r, g, b] = frost([image.rgba[i], image.rgba[i + 1], image.rgba[i + 2]])
    assert.ok(Math.abs(wrappedShift(phaseToCoordinate(decodePhaseQuad(r, g, b)), y + 0.5)) < 0.8, `y ${y}`)
  }
})

test('regions split core, an 8pt edge band and a 16pt halo', () => {
  assert.equal(regionOf(-30), 'core')
  assert.equal(regionOf(-10), 'edge')
  assert.equal(regionOf(0), null)
  assert.equal(regionOf(20), 'halo')
  assert.equal(regionOf(60), null)
})
