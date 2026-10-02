import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { relativeLuminance, srgbToLab } from './color.mjs'
import { sdRoundRect } from './compare.mjs'
import { decodePng } from './png.mjs'
import { ARTIFACTS, ROOT, loadScenes, parseArgs, selectCaptures } from './scenes.mjs'

const SCALE = 3
const args = parseArgs(process.argv.slice(2))
const nativeDir = args.native ?? `${ARTIFACTS}/native/baseline`
const webDir = args.web ?? `${ARTIFACTS}/web/baseline`
const window = Number(args.window ?? 4) * SCALE
const inset = Number(args.inset ?? 6) * SCALE
const backgrounds = new Map()

function background(file) {
  if (!backgrounds.has(file)) backgrounds.set(file, decodePng(readFileSync(`${ROOT}e2e/fixtures/apple-glass/backgrounds/${file}`)))
  return backgrounds.get(file)
}

function boxStats(image, cx, cy, half, offsetX = 0) {
  let r = 0
  let g = 0
  let b = 0
  let l2 = 0
  let l1 = 0
  let n = 0
  for (let y = cy - half; y <= cy + half; y++) {
    for (let x = cx - half; x <= cx + half; x++) {
      const sx = x - offsetX
      let pr = 255
      let pg = 255
      let pb = 255
      if (sx < 0) {
        pr = 0
        pg = 0
        pb = 0
      } else if (sx < image.width) {
        const i = (y * image.width + sx) * 4
        pr = image.rgba[i]
        pg = image.rgba[i + 1]
        pb = image.rgba[i + 2]
      }
      r += pr
      g += pg
      b += pb
      const l = relativeLuminance(pr, pg, pb)
      l1 += l
      l2 += l * l
      n += 1
    }
  }
  return { rgb: [r / n, g / n, b / n], spread: Math.sqrt(Math.max(0, l2 / n - (l1 / n) ** 2)) }
}

const rows = []
for (const capture of selectCaptures(loadScenes(), args)) {
  const { scene } = capture
  if (scene.material === 'none' || scene.container !== 'none') continue
  const nativePath = `${nativeDir}/${capture.name}.png`
  const webPath = `${webDir}/${capture.name}.png`
  if (!existsSync(nativePath) || !existsSync(webPath)) continue
  const native = decodePng(readFileSync(nativePath))
  const web = decodePng(readFileSync(webPath))
  const bg = background(scene.background)
  const offset = Math.round(scene.backgroundOffset * SCALE)
  const step = window
  for (const shape of scene.shapes) for (let y = Math.round(shape.y * SCALE); y < (shape.y + shape.height) * SCALE; y += step) {
    for (let x = Math.round(shape.x * SCALE); x < (shape.x + shape.width) * SCALE; x += step) {
      if (sdRoundRect(x + 0.5, y + 0.5, shape) > -inset) continue
      const source = boxStats(bg, x, y, window * 2, offset)
      if (source.spread > 0.004) continue
      const n = boxStats(native, x, y, Math.floor(window / 2)).rgb
      const w = boxStats(web, x, y, Math.floor(window / 2)).rgb
      rows.push({
        capture: capture.name,
        material: scene.material,
        appearance: capture.appearance,
        bg: source.rgb.map(Math.round),
        native: n.map(Math.round),
        web: w.map(Math.round),
        bgLab: srgbToLab(...source.rgb.map(Math.round)).map(v => Math.round(v * 10) / 10),
        nativeLab: srgbToLab(...n.map(Math.round)).map(v => Math.round(v * 10) / 10),
        webLab: srgbToLab(...w.map(Math.round)).map(v => Math.round(v * 10) / 10)
      })
    }
  }
}

const unique = new Map()
for (const row of rows) {
  const key = `${row.material}|${row.appearance}|${row.bg.join(',')}`
  if (!unique.has(key)) unique.set(key, row)
}
const table = [...unique.values()].sort((a, b) => a.material.localeCompare(b.material) || a.appearance.localeCompare(b.appearance) || a.bgLab[0] - b.bgLab[0])
writeFileSync(`${ARTIFACTS}/transfer.json`, `${JSON.stringify(table, null, 2)}\n`)
for (const row of table) {
  process.stdout.write(`${row.material.padEnd(8)} ${row.appearance.padEnd(5)} bg ${row.bg.join(',').padEnd(12)} → apple ${row.native.join(',').padEnd(12)} web ${row.web.join(',').padEnd(12)} L ${row.bgLab[0]} → ${row.nativeLab[0]} / ${row.webLab[0]}  C ${Math.round(Math.hypot(row.bgLab[1], row.bgLab[2]))} → ${Math.round(Math.hypot(row.nativeLab[1], row.nativeLab[2]))} / ${Math.round(Math.hypot(row.webLab[1], row.webLab[2]))}\n`)
}
