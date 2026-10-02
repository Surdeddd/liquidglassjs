import { readFileSync } from 'node:fs'
import { ARTIFACTS, parseArgs } from './scenes.mjs'

const args = parseArgs(process.argv.slice(2))
const report = JSON.parse(readFileSync(`${ARTIFACTS}/lens-field-${args.label ?? 'lens'}.json`, 'utf8'))
const BAND_MAX = 20
const PERIOD = 48

function unwrap(profile) {
  const rows = profile.filter(row => row.depthPt <= 22).sort((a, b) => b.depthPt - a.depthPt)
  let offset = 0
  let previous = null
  return rows.map(row => {
    let value = row.normalPt + offset
    if (previous !== null && Math.abs(value - previous) > PERIOD / 2) {
      offset += value > previous ? -PERIOD : PERIOD
      value = row.normalPt + offset
    }
    previous = value
    return { depth: row.depthPt, inward: -value }
  })
}

const samples = []
for (const entry of Object.values(report)) {
  const halfMin = Math.min(entry.shape.width, entry.shape.height) / 2
  for (const point of unwrap(entry.native.profile)) {
    if (point.depth < Number(args.from ?? 3)) continue
    samples.push({ halfMin, ...point })
  }
}

export function shape(s, tau) {
  if (s >= 1) return 0
  const floor = Math.exp(-1 / tau)
  return (Math.exp(-s / tau) - floor) / (1 - floor)
}

let best = { error: Infinity }
for (let ratio = 0.5; ratio <= 0.9; ratio += 0.01) {
  for (let tau = 0.15; tau <= 0.6; tau += 0.005) {
    for (let rim = 1.5; rim <= 3; rim += 0.01) {
      let error = 0
      for (const sample of samples) {
        const band = Math.min(BAND_MAX, ratio * sample.halfMin)
        const model = rim * band * shape(sample.depth / band, tau)
        error += (model - sample.inward) ** 2
      }
      if (error < best.error) best = { error, ratio, tau, rim }
    }
  }
}
process.stdout.write(`band = min(${BAND_MAX}, ${best.ratio.toFixed(2)}·halfMin)  tau ${best.tau.toFixed(3)}·band  rim ${best.rim.toFixed(2)}·band  rms ${Math.sqrt(best.error / samples.length).toFixed(2)}pt over ${samples.length}\n`)
for (const sample of samples.filter((_, i) => i % 7 === 0)) {
  const band = Math.min(BAND_MAX, best.ratio * sample.halfMin)
  process.stdout.write(`  half ${sample.halfMin} depth ${sample.depth} apple ${sample.inward.toFixed(2)} model ${(best.rim * band * shape(sample.depth / band, best.tau)).toFixed(2)}\n`)
}
