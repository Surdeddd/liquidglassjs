import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { deltaE2000, srgbToLab } from './color.mjs'
import { decodePng, encodePng } from './png.mjs'
import { ARTIFACTS, loadScenes, parseArgs, selectCaptures } from './scenes.mjs'

const SCALE = 3
const MARGIN = 16 * SCALE
const EDGE = 8 * SCALE
const INSET = 2

export function sdRoundRect(px, py, shape) {
  const hw = (shape.width * SCALE) / 2
  const hh = (shape.height * SCALE) / 2
  const r = Math.min(shape.radius * SCALE, hw, hh)
  const qx = Math.abs(px - (shape.x * SCALE + hw)) - hw + r
  const qy = Math.abs(py - (shape.y * SCALE + hh)) - hh + r
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}

export function regionOf(sd) {
  if (sd < -EDGE) return 'core'
  if (sd < -INSET) return 'edge'
  if (sd > INSET && sd < MARGIN) return 'halo'
  return null
}

const REGION_CODES = { core: 1, edge: 2, halo: 3 }

export function prepareTarget(scene, native) {
  const roi = roiOf(scene, native.width, native.height)
  const labs = new Float32Array(roi.w * roi.h * 3)
  const regions = new Uint8Array(roi.w * roi.h)
  for (let y = 0; y < roi.h; y++) {
    for (let x = 0; x < roi.w; x++) {
      const px = roi.x + x
      const py = roi.y + y
      const index = (py * native.width + px) * 4
      const lab = srgbToLab(native.rgba[index], native.rgba[index + 1], native.rgba[index + 2])
      const offset = y * roi.w + x
      labs.set(lab, offset * 3)
      let sd = Infinity
      for (const shape of scene.shapes) sd = Math.min(sd, sdRoundRect(px + 0.5, py + 0.5, shape))
      regions[offset] = REGION_CODES[regionOf(sd)] ?? 0
    }
  }
  return { roi, labs, regions }
}

export function scoreAgainst(target, web) {
  const sums = [0, 0, 0, 0]
  const counts = [0, 0, 0, 0]
  for (let offset = 0; offset < target.regions.length; offset++) {
    const region = target.regions[offset]
    if (region === 0) continue
    const index = offset * 4
    const lab = srgbToLab(web.rgba[index], web.rgba[index + 1], web.rgba[index + 2])
    const native = [target.labs[offset * 3], target.labs[offset * 3 + 1], target.labs[offset * 3 + 2]]
    sums[region] += deltaE2000(native, lab)
    counts[region] += 1
  }
  const mean = region => (counts[region] ? sums[region] / counts[region] : 0)
  const core = mean(1)
  const edge = counts[2] ? mean(2) : core
  const halo = mean(3)
  return { core, edge, halo, score: (counts[1] ? (core + edge) / 2 : edge) + 0.25 * halo }
}

export function roiOf(scene, width, height) {
  if (scene.container === 'tabview') return { x: 0, y: 730 * SCALE, w: width, h: height - 730 * SCALE }
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const shape of scene.shapes) {
    left = Math.min(left, shape.x * SCALE)
    top = Math.min(top, shape.y * SCALE)
    right = Math.max(right, (shape.x + shape.width) * SCALE)
    bottom = Math.max(bottom, (shape.y + shape.height) * SCALE)
  }
  const x = Math.max(0, Math.floor(left - MARGIN))
  const y = Math.max(0, Math.floor(top - MARGIN))
  return {
    x,
    y,
    w: Math.min(width, Math.ceil(right + MARGIN)) - x,
    h: Math.min(height, Math.ceil(bottom + MARGIN)) - y
  }
}

function heat(value) {
  const t = Math.min(value / 12, 1)
  if (t < 0.5) return [Math.round(510 * t), 0, 0]
  return [255, Math.round(510 * (t - 0.5)), Math.round(255 * Math.max(0, t - 0.75) * 4)]
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
}

function summarize(stats) {
  const out = {}
  for (const [name, entry] of Object.entries(stats)) {
    if (entry.de.length === 0) continue
    const sorted = Float64Array.from(entry.de).sort()
    const n = entry.de.length
    out[name] = {
      pixels: n,
      deMean: round(entry.de.reduce((sum, v) => sum + v, 0) / n),
      deP95: round(percentile(sorted, 0.95)),
      nativeL: round(entry.nl / n),
      webL: round(entry.wl / n),
      nativeC: round(entry.nc / n),
      webC: round(entry.wc / n)
    }
  }
  return out
}

function round(value) {
  return Math.round(value * 100) / 100
}

export function compareCapture(scene, native, web) {
  const roi = roiOf(scene, native.width, native.height)
  const stats = { core: newStat(), edge: newStat(), halo: newStat(), roi: newStat() }
  const gap = 6
  const strip = { width: roi.w * 3 + gap * 2, height: roi.h, rgba: new Uint8Array((roi.w * 3 + gap * 2) * roi.h * 4) }
  strip.rgba.fill(255)
  const useShapes = scene.container !== 'tabview' && scene.shapes.length > 0
  for (let y = 0; y < roi.h; y++) {
    for (let x = 0; x < roi.w; x++) {
      const px = roi.x + x
      const py = roi.y + y
      const index = (py * native.width + px) * 4
      const nr = native.rgba[index]
      const ng = native.rgba[index + 1]
      const nb = native.rgba[index + 2]
      const wr = web.rgba[index]
      const wg = web.rgba[index + 1]
      const wb = web.rgba[index + 2]
      const nLab = srgbToLab(nr, ng, nb)
      const wLab = srgbToLab(wr, wg, wb)
      const de = deltaE2000(nLab, wLab)
      add(stats.roi, de, nLab, wLab)
      if (useShapes) {
        let sd = Infinity
        for (const shape of scene.shapes) sd = Math.min(sd, sdRoundRect(px + 0.5, py + 0.5, shape))
        const region = regionOf(sd)
        if (region) add(stats[region], de, nLab, wLab)
      }
      const row = (y * strip.width) * 4
      put(strip.rgba, row + x * 4, nr, ng, nb)
      put(strip.rgba, row + (roi.w + gap + x) * 4, wr, wg, wb)
      const [hr, hg, hb] = heat(de)
      put(strip.rgba, row + (roi.w * 2 + gap * 2 + x) * 4, hr, hg, hb)
    }
  }
  return { roi, regions: summarize(stats), strip }
}

function newStat() {
  return { de: [], nl: 0, wl: 0, nc: 0, wc: 0 }
}

function add(entry, de, nLab, wLab) {
  entry.de.push(de)
  entry.nl += nLab[0]
  entry.wl += wLab[0]
  entry.nc += Math.hypot(nLab[1], nLab[2])
  entry.wc += Math.hypot(wLab[1], wLab[2])
}

function put(rgba, offset, r, g, b) {
  rgba[offset] = r
  rgba[offset + 1] = g
  rgba[offset + 2] = b
  rgba[offset + 3] = 255
}

function renderReport(rows, title) {
  const cell = value => (value === undefined ? '' : value)
  const body = rows.map(row => {
    const core = row.regions.core ?? row.regions.roi
    const edge = row.regions.edge ?? {}
    const halo = row.regions.halo ?? {}
    return `<tr><td><b>${row.name}</b><br>score ${row.score}</td>` +
      `<td>${cell(core.deMean)} / ${cell(core.deP95)}<br>L ${cell(core.nativeL)} → ${cell(core.webL)}<br>C ${cell(core.nativeC)} → ${cell(core.webC)}</td>` +
      `<td>${cell(edge.deMean)} / ${cell(edge.deP95)}<br>L ${cell(edge.nativeL)} → ${cell(edge.webL)}</td>` +
      `<td>${cell(halo.deMean)} / ${cell(halo.deP95)}<br>L ${cell(halo.nativeL)} → ${cell(halo.webL)}</td>` +
      `<td><img src="${row.image}" loading="lazy"></td></tr>`
  }).join('\n')
  return `<!doctype html><meta charset="utf-8"><title>${title}</title>
<style>body{font:13px system-ui;margin:16px;background:#f4f4f6;color:#111}table{border-collapse:collapse}
td,th{border-bottom:1px solid #ddd;padding:6px 10px;vertical-align:top;text-align:left}img{max-width:900px;image-rendering:auto}</style>
<h1>${title}</h1><p>ΔE2000 mean / p95 per region; L and C are native → web. Strip: Apple | web | ΔE heat (black 0, red 6, white ≥12).</p>
<table><tr><th>capture</th><th>core</th><th>edge 8pt</th><th>halo 16pt</th><th>Apple | web | ΔE</th></tr>
${body}</table>`
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2))
  const nativeDir = args.native ?? `${ARTIFACTS}/native/current`
  const webDir = args.web ?? `${ARTIFACTS}/web/current`
  const outDir = args.out ?? `${ARTIFACTS}/report/${args.label ?? 'current'}`
  mkdirSync(`${outDir}/strips`, { recursive: true })
  const rows = []
  for (const capture of selectCaptures(loadScenes(), args)) {
    if (capture.scene.material === 'none') continue
    const nativePath = `${nativeDir}/${capture.name}.png`
    const webPath = `${webDir}/${capture.name}.png`
    if (!existsSync(nativePath) || !existsSync(webPath)) continue
    const result = compareCapture(capture.scene, decodePng(readFileSync(nativePath)), decodePng(readFileSync(webPath)))
    const image = `strips/${capture.name}.png`
    writeFileSync(`${outDir}/${image}`, encodePng(result.strip))
    const core = result.regions.core ?? result.regions.roi
    const edge = result.regions.edge ?? core
    const score = round((core.deMean + edge.deMean) / 2)
    rows.push({ name: capture.name, scene: capture.scene.id, appearance: capture.appearance, score, roi: result.roi, regions: result.regions, image })
    process.stdout.write(`${capture.name} score ${score} core ${core.deMean} edge ${edge.deMean} halo ${result.regions.halo?.deMean ?? '-'}\n`)
  }
  rows.sort((a, b) => b.score - a.score)
  writeFileSync(`${outDir}/results.json`, `${JSON.stringify(rows, null, 2)}\n`)
  writeFileSync(`${outDir}/report.html`, renderReport(rows, `glass-match ${args.label ?? 'current'}`))
  const mean = rows.length ? round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 0
  process.stdout.write(`captures ${rows.length} mean score ${mean}\n`)
}
