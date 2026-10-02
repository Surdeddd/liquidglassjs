import { readFileSync } from 'node:fs'
import { gaussianBlur, profile } from './blur-probe.mjs'
import { decodePng } from './png.mjs'
import { ARTIFACTS, ROOT, parseArgs } from './scenes.mjs'

const args = parseArgs(process.argv.slice(2))
const SCALE = 3
const capture = args.capture ?? 'O5.rest.light'
const background = args.background ?? 'project-photo.png'
const source = args.source ?? `${ARTIFACTS}/native/baseline`
const rows = (args.rows ?? '400,420,437,455,475').split(',').map(v => Math.round(Number(v) * SCALE))
const from = Math.round(Number(args.from ?? 90) * SCALE)
const to = Math.round(Number(args.to ?? 312) * SCALE)
const margin = 60

function solve3(m, v) {
  const det = a => a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0])
  const d = det(m)
  if (Math.abs(d) < 1e-12) return null
  return [0, 1, 2].map(column => det(m.map((row, r) => row.map((value, c) => (c === column ? v[r] : value)))) / d)
}

const native = decodePng(readFileSync(`${source}/${capture}.png`))
const bg = decodePng(readFileSync(`${ROOT}e2e/fixtures/apple-glass/backgrounds/${background}`))
const references = rows.map(y => profile(bg, y, from - margin, to + margin))
const observed = rows.map(y => profile(native, y, from, to))

let best = { error: Infinity }
for (const narrow of [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20]) {
  const narrowBlurred = references.map(r => gaussianBlur(r, narrow))
  for (const wide of [24, 30, 40, 50, 60, 75, 90, 120, 160, 200, 260, 320]) {
    const wideBlurred = references.map(r => gaussianBlur(r, wide))
    const ata = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
    const atb = [0, 0, 0]
    const samples = []
    rows.forEach((_, r) => {
      for (let x = 0; x < observed[r].length; x++) {
        const features = [1, narrowBlurred[r][x + margin], wideBlurred[r][x + margin]]
        samples.push([features, observed[r][x]])
        for (let i = 0; i < 3; i++) {
          atb[i] += features[i] * observed[r][x]
          for (let j = 0; j < 3; j++) ata[i][j] += features[i] * features[j]
        }
      }
    })
    const coef = solve3(ata, atb)
    if (!coef) continue
    const error = samples.reduce((s, [f, y]) => s + (coef[0] * f[0] + coef[1] * f[1] + coef[2] * f[2] - y) ** 2, 0) / samples.length
    if (error < best.error) best = { error, narrow, wide, coef }
  }
}
const [offset, sharp, diffuse] = best.coef
process.stdout.write(
  `${capture}: narrow σ ${best.narrow}px (${(best.narrow / SCALE).toFixed(2)}pt) wide σ ${best.wide}px (${(best.wide / SCALE).toFixed(1)}pt) ` +
  `gain ${(sharp + diffuse).toFixed(3)} scatter ${(diffuse / (sharp + diffuse)).toFixed(2)} offset ${offset.toFixed(1)} rms ${Math.sqrt(best.error).toFixed(2)}\n`
)
