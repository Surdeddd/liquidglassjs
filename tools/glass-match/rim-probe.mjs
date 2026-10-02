import { readFileSync } from 'node:fs'
import { srgbToLab } from './color.mjs'
import { decodePng } from './png.mjs'
import { ARTIFACTS, loadScenes, parseArgs } from './scenes.mjs'

const SCALE = 3
const args = parseArgs(process.argv.slice(2))
const capture = args.capture ?? 'K2.patches.light'
const source = args.source ?? `${ARTIFACTS}/native/baseline`
const shapeId = args.shape ?? 'patch-1-0'
const scene = loadScenes().find(s => capture.startsWith(`${s.id}.`))
const shape = scene.shapes.find(s => s.id === shapeId)
const image = decodePng(readFileSync(`${source}/${capture}.png`))
const cx = (shape.x + shape.width / 2) * SCALE
const cy = (shape.y + shape.height / 2) * SCALE
const radius = (shape.width / 2) * SCALE

function sample(x, y) {
  const i = (Math.round(y) * image.width + Math.round(x)) * 4
  return srgbToLab(image.rgba[i], image.rgba[i + 1], image.rgba[i + 2])
}

const offsets = []
for (let d = -10; d <= 3; d++) offsets.push(d)
process.stdout.write(`${capture} ${shapeId}  ΔL/ΔC vs interior, columns = px from rim (−inside)\n`)
process.stdout.write(`angle ${offsets.map(d => String(d).padStart(9)).join('')}\n`)
for (let angle = 0; angle < 360; angle += 45) {
  const rad = (angle * Math.PI) / 180
  const dx = Math.cos(rad)
  const dy = -Math.sin(rad)
  const ref = sample(cx + dx * (radius - 18), cy + dy * (radius - 18))
  const cells = offsets.map(d => {
    const lab = sample(cx + dx * (radius + d), cy + dy * (radius + d))
    const dl = lab[0] - ref[0]
    const dc = Math.hypot(lab[1], lab[2]) - Math.hypot(ref[1], ref[2])
    return `${dl.toFixed(0)}/${dc.toFixed(0)}`.padStart(9)
  })
  process.stdout.write(`${String(angle).padStart(5)} ${cells.join('')}\n`)
}
