import { readFileSync } from 'node:fs'
import { ARTIFACTS, parseArgs } from './scenes.mjs'

const args = parseArgs(process.argv.slice(2))
const load = label => new Map(JSON.parse(readFileSync(`${ARTIFACTS}/report/${label}/results.json`, 'utf8')).map(row => [row.name, row.score]))
const before = load(args.before ?? 'baseline')
const after = load(args.after ?? 'current')
const families = new Map()
for (const [name, score] of after) {
  if (!before.has(name)) continue
  const [family] = name.split('.')
  const appearance = name.split('.').at(-1)
  const key = `${family}.${appearance}`
  const entry = families.get(key) ?? { before: [], after: [] }
  entry.before.push(before.get(name))
  entry.after.push(score)
  families.set(key, entry)
}
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length
let all = { before: [], after: [] }
for (const [key, entry] of [...families].sort()) {
  all.before.push(...entry.before)
  all.after.push(...entry.after)
  const b = mean(entry.before)
  const a = mean(entry.after)
  const mark = a < b - 0.05 ? 'better' : a > b + 0.05 ? 'WORSE' : 'same'
  process.stdout.write(`${key.padEnd(10)} ${b.toFixed(2).padStart(6)} → ${a.toFixed(2).padStart(6)}  max ${Math.max(...entry.after).toFixed(2).padStart(6)}  ${mark}\n`)
}
process.stdout.write(`ALL        ${mean(all.before).toFixed(2).padStart(6)} → ${mean(all.after).toFixed(2).padStart(6)}  (${all.after.length} captures)\n`)
