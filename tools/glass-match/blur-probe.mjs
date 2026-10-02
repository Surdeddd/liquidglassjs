import { readFileSync } from 'node:fs'
import { decodePng } from './png.mjs'
import { ARTIFACTS, ROOT, parseArgs } from './scenes.mjs'

const args = parseArgs(process.argv.slice(2))
const SCALE = 3
const capture = args.capture ?? 'S1.height-220.light'
const background = args.background ?? 'phase-grid.png'
const row = Math.round(Number(args.y ?? 452) * SCALE)
const from = Math.round(Number(args.from ?? 140) * SCALE)
const to = Math.round(Number(args.to ?? 262) * SCALE)
const source = args.source ?? `${ARTIFACTS}/native/baseline`

function luma(image, x, y) {
  const i = (y * image.width + x) * 4
  return 0.2126 * image.rgba[i] + 0.7152 * image.rgba[i + 1] + 0.0722 * image.rgba[i + 2]
}

export function profile(image, y, x0, x1, rows = 3) {
  const values = []
  for (let x = x0; x < x1; x++) {
    let sum = 0
    for (let dy = -rows; dy <= rows; dy++) sum += luma(image, x, y + dy)
    values.push(sum / (rows * 2 + 1))
  }
  return values
}

export function gaussianBlur(values, sigma) {
  if (sigma < 0.05) return values.slice()
  const radius = Math.ceil(sigma * 3)
  const kernel = Array.from({ length: radius * 2 + 1 }, (_, i) => Math.exp(-((i - radius) ** 2) / (2 * sigma * sigma)))
  const total = kernel.reduce((a, b) => a + b, 0)
  return values.map((_, x) => {
    let sum = 0
    for (let k = -radius; k <= radius; k++) {
      const index = Math.min(values.length - 1, Math.max(0, x + k))
      sum += values[index] * kernel[k + radius]
    }
    return sum / total
  })
}

export function bestBlur(reference, observed, maxShift = 6) {
  let best = { error: Infinity }
  for (let sigma = 0; sigma <= 30; sigma += 0.25) {
    const blurred = gaussianBlur(reference, sigma)
    for (let shift = -maxShift; shift <= maxShift; shift++) {
      const pairs = []
      for (let x = maxShift; x < blurred.length - maxShift; x++) pairs.push([blurred[x + shift], observed[x]])
      const n = pairs.length
      const mx = pairs.reduce((s, p) => s + p[0], 0) / n
      const my = pairs.reduce((s, p) => s + p[1], 0) / n
      let sxy = 0
      let sxx = 0
      for (const [px, py] of pairs) {
        sxy += (px - mx) * (py - my)
        sxx += (px - mx) ** 2
      }
      const gain = sxx > 0 ? sxy / sxx : 0
      const offset = my - gain * mx
      const error = pairs.reduce((s, [px, py]) => s + (gain * px + offset - py) ** 2, 0) / n
      if (error < best.error) best = { error, sigma, shift, gain, offset }
    }
  }
  return best
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const native = decodePng(readFileSync(`${source}/${capture}.png`))
  const bg = decodePng(readFileSync(`${ROOT}e2e/fixtures/apple-glass/backgrounds/${background}`))
  const reference = profile(bg, row, from, to)
  const observed = profile(native, row, from, to)
  const fit = bestBlur(reference, observed)
  process.stdout.write(`${capture} row ${row / SCALE}pt: sigma ${fit.sigma}px (${(fit.sigma / SCALE).toFixed(2)}pt) shift ${fit.shift}px gain ${fit.gain.toFixed(3)} offset ${fit.offset.toFixed(1)} rms ${Math.sqrt(fit.error).toFixed(2)}\n`)
}
