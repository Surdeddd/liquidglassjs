import { readFileSync, writeFileSync } from 'node:fs'
import { sdRoundRect } from './compare.mjs'
import { decodePhaseQuad, phaseToCoordinate, wrappedShift } from './phase.mjs'
import { decodePng } from './png.mjs'
import { ARTIFACTS, loadScenes, parseArgs } from './scenes.mjs'

const SCALE = 3
const args = parseArgs(process.argv.slice(2))
const binPt = Number(args['bin'] ?? 1)

export function displacementField(scene, xImage, yImage) {
  const fields = []
  for (const shape of scene.shapes) {
    const samples = []
    const x0 = Math.floor(shape.x * SCALE)
    const y0 = Math.floor(shape.y * SCALE)
    for (let y = y0; y < (shape.y + shape.height) * SCALE; y++) {
      for (let x = x0; x < (shape.x + shape.width) * SCALE; x++) {
        const sd = sdRoundRect(x + 0.5, y + 0.5, shape)
        if (sd > -1.5) continue
        const i = (y * xImage.width + x) * 4
        const sx = phaseToCoordinate(decodePhaseQuad(xImage.rgba[i], xImage.rgba[i + 1], xImage.rgba[i + 2]))
        const sy = phaseToCoordinate(decodePhaseQuad(yImage.rgba[i], yImage.rgba[i + 1], yImage.rgba[i + 2]))
        const dx = wrappedShift(sx, x + 0.5)
        const dy = wrappedShift(sy, y + 0.5)
        const e = 0.5
        const gx = sdRoundRect(x + 0.5 + e, y + 0.5, shape) - sdRoundRect(x + 0.5 - e, y + 0.5, shape)
        const gy = sdRoundRect(x + 0.5, y + 0.5 + e, shape) - sdRoundRect(x + 0.5, y + 0.5 - e, shape)
        const g = Math.hypot(gx, gy) || 1
        samples.push({ x, y, depth: -sd, dx, dy, normal: (dx * gx + dy * gy) / g, tangent: (-dx * gy + dy * gx) / g })
      }
    }
    fields.push({ shape, samples })
  }
  return fields
}

export function depthProfile(samples, bin = binPt * SCALE) {
  const bins = new Map()
  for (const sample of samples) {
    const key = Math.floor(sample.depth / bin)
    const entry = bins.get(key) ?? { normal: [], tangent: [] }
    entry.normal.push(sample.normal)
    entry.tangent.push(sample.tangent)
    bins.set(key, entry)
  }
  const median = values => {
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)]
  }
  return [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([key, entry]) => ({
    depthPt: ((key + 0.5) * bin) / SCALE,
    normalPt: median(entry.normal) / SCALE,
    tangentPt: median(entry.tangent) / SCALE,
    count: entry.normal.length
  }))
}

export function centralZoom(shape, samples) {
  const cx = (shape.x + shape.width / 2) * SCALE
  const cy = (shape.y + shape.height / 2) * SCALE
  const reach = Math.min(shape.width, shape.height) * SCALE * 0.2
  let sxx = 0
  let sxd = 0
  for (const s of samples) {
    const ox = s.x + 0.5 - cx
    const oy = s.y + 0.5 - cy
    if (Math.hypot(ox, oy) > reach) continue
    sxx += ox * ox + oy * oy
    sxd += ox * s.dx + oy * s.dy
  }
  return sxx > 0 ? sxd / sxx : 0
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const label = args.label ?? 'lens'
  const families = (args.families ?? 'L1,L2').split(',')
  const appearance = args.appearance ?? 'light'
  const report = {}
  for (const family of families) {
    const scene = loadScenes().find(s => s.id === `${family}.x`)
    for (const side of ['native', 'web']) {
      const dir = `${ARTIFACTS}/${side}/${label}`
      const fields = displacementField(scene, decodePng(readFileSync(`${dir}/${family}.x.${appearance}.png`)), decodePng(readFileSync(`${dir}/${family}.y.${appearance}.png`)))
      for (const { shape, samples } of fields) {
        const key = `${family}:${shape.id}`
        report[key] ??= { shape }
        report[key][side] = { zoom: centralZoom(shape, samples), profile: depthProfile(samples) }
      }
    }
  }
  writeFileSync(`${ARTIFACTS}/lens-field-${label}.json`, `${JSON.stringify(report, null, 2)}\n`)
  for (const [key, entry] of Object.entries(report)) {
    process.stdout.write(`\n${key} ${entry.shape.width}x${entry.shape.height} r${entry.shape.radius}  centre zoom apple ${entry.native.zoom.toFixed(3)} web ${entry.web.zoom.toFixed(3)}\n`)
    process.stdout.write('  depth pt | apple normal pt | web normal pt | apple tangent\n')
    const webByDepth = new Map(entry.web.profile.map(row => [row.depthPt, row]))
    for (const row of entry.native.profile) {
      if (row.depthPt > 30) break
      const web = webByDepth.get(row.depthPt)
      process.stdout.write(`  ${row.depthPt.toFixed(1).padStart(6)} | ${row.normalPt.toFixed(2).padStart(7)} | ${(web ? web.normalPt.toFixed(2) : '-').padStart(7)} | ${row.tangentPt.toFixed(2).padStart(6)}\n`)
    }
  }
}
