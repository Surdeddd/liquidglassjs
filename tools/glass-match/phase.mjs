import { writeFileSync } from 'node:fs'
import { encodePng } from './png.mjs'
import { ROOT, parseArgs } from './scenes.mjs'

export const PHASE_PERIOD_PT = 48
export const PHASE_AMPLITUDE = 100
export const PHASE_CENTER = 128
const SCALE = 3
const WIDTH = 1206
const HEIGHT = 2622

export function phaseImage(axis) {
  const rgba = new Uint8Array(WIDTH * HEIGHT * 4)
  const period = PHASE_PERIOD_PT * SCALE
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const coordinate = (axis === 'x' ? x : y) + 0.5
      const angle = (2 * Math.PI * coordinate) / period
      const i = (y * WIDTH + x) * 4
      rgba[i] = Math.round(PHASE_CENTER + PHASE_AMPLITUDE * Math.sin(angle))
      rgba[i + 1] = Math.round(PHASE_CENTER + PHASE_AMPLITUDE * Math.cos(angle))
      rgba[i + 2] = PHASE_CENTER
      rgba[i + 3] = 255
    }
  }
  return { width: WIDTH, height: HEIGHT, rgba }
}

export function decodePhase(r, g, center) {
  return Math.atan2(r - center, g - center)
}

export function decodePhaseQuad(r, g, b) {
  return Math.atan2(r - g, r + g - 2 * b) + Math.PI / 4
}

export function phaseToCoordinate(angle) {
  const period = PHASE_PERIOD_PT * SCALE
  return ((angle / (2 * Math.PI)) * period + period) % period
}

export function wrappedShift(observed, expected) {
  const period = PHASE_PERIOD_PT * SCALE
  let delta = observed - expected
  delta -= Math.round(delta / period) * period
  return delta
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2))
  for (const axis of ['x', 'y']) {
    const path = `${ROOT}e2e/fixtures/apple-glass/backgrounds/phase-${axis}.png`
    if (args.write === 'true') writeFileSync(path, encodePng(phaseImage(axis)))
  }
  process.stdout.write('ok\n')
}
