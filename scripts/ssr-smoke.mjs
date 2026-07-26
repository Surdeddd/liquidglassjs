import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const targets = [
  ['core', 'attach'],
  ['element', 'define'],
  ['react', 'LiquidGlass'],
  ['vue', 'LiquidGlass'],
  ['svelte', 'liquidGlass']
]

if (typeof window !== 'undefined' || typeof document !== 'undefined') {
  throw new Error('ssr smoke must run in a bare node environment')
}

for (const [name, exportName] of targets) {
  const mod = await import(resolve(root, 'packages', name, 'dist', 'index.js'))
  if (typeof mod[exportName] === 'undefined') {
    throw new Error(`@surdeddd/liquidglass-${name}: missing export ${exportName}`)
  }
}

const metaEntries = [
  ['index', 'attach'],
  ['element', 'define'],
  ['react', 'LiquidGlass'],
  ['vue', 'LiquidGlass'],
  ['svelte', 'liquidGlass']
]
for (const [entry, exportName] of metaEntries) {
  const mod = await import(resolve(root, 'packages', 'liquidglass', 'dist', `${entry}.js`))
  if (typeof mod[exportName] === 'undefined') {
    throw new Error(`@surdeddd/liquidglass/${entry}: missing export ${exportName}`)
  }
}

const core = await import(resolve(root, 'packages', 'core', 'dist', 'index.js'))
const caps = core.probeCapabilities()
if (caps.backdropFilter !== false || caps.webgl2 !== false) {
  throw new Error('probeCapabilities must report no capabilities without a DOM')
}

const stop = core.autoAttach()
if (typeof stop !== 'function') {
  throw new Error('autoAttach must return a stop function without a DOM')
}
stop()

if (typeof core.readReducedMotion() !== 'boolean' || typeof core.readForcedColors() !== 'boolean') {
  throw new Error('media readers must answer without a DOM')
}

const require = createRequire(import.meta.url)
for (const [entry, exportName] of metaEntries) {
  const file = resolve(root, 'packages', 'liquidglass', 'dist', `${entry}.cjs`)
  const mod = require(file)
  if (typeof mod[exportName] === 'undefined') {
    throw new Error(`@surdeddd/liquidglass/${entry} (cjs): missing export ${exportName}`)
  }
}

console.log('ssr smoke ok: esm and cjs entries load, autoAttach is inert without a DOM')
