import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const require = createRequire(`${process.cwd()}/`)
const cwdUrl = pathToFileURL(`${process.cwd()}/`)
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const root = require('./dist/index.cjs')

if (root.VERSION !== pkg.version) {
  throw new Error(`dist VERSION "${root.VERSION}" does not match package.json "${pkg.version}"`)
}

for (const entry of ['element', 'react', 'vue', 'svelte']) {
  const cjs = readFileSync(`dist/${entry}.cjs`, 'utf8')
  if (!/require\(["']\.\/index\.cjs["']\)/.test(cjs)) {
    throw new Error(`dist/${entry}.cjs must reuse ./index.cjs instead of bundling its own core copy`)
  }
  const esm = readFileSync(`dist/${entry}.js`, 'utf8')
  if (!/from\s*["']\.\/index\.js["']/.test(esm)) {
    throw new Error(`dist/${entry}.js must reuse ./index.js instead of bundling its own core copy`)
  }
  const sub = require(`./dist/${entry}.cjs`)
  if (typeof sub.attach !== 'function' || sub.attach !== root.attach) {
    throw new Error(`dist/${entry}.cjs must re-export the shared core api`)
  }
  const dts = readFileSync(`dist/${entry}.d.ts`, 'utf8')
  if (!dts.includes('attach')) {
    throw new Error(`dist/${entry}.d.ts must include the full core type surface`)
  }
}

const surfaces = await Promise.all(
  ['element', 'react', 'vue', 'svelte'].map(entry => import(new URL(`dist/${entry}.js`, cwdUrl).href))
)
const rootEsm = await import(new URL('dist/index.js', cwdUrl).href)
surfaces.forEach((mod, i) => {
  if (mod.attach !== rootEsm.attach) {
    throw new Error(`dist esm subpath #${i} does not share the root core instance`)
  }
})

const globalJs = readFileSync('dist/liquidglass.global.js', 'utf8')
if (!globalJs.includes('LiquidGlass')) {
  throw new Error('dist/liquidglass.global.js must define the LiquidGlass global')
}
const vm = await import('node:vm')
const sandbox = { window: undefined }
vm.createContext(sandbox)
vm.runInContext(`${globalJs}\nglobalThis.__lg = LiquidGlass`, sandbox)
const globalApi = sandbox.__lg
if (typeof globalApi?.attach !== 'function' || typeof globalApi?.autoAttach !== 'function') {
  throw new Error('LiquidGlass global must expose attach and autoAttach')
}
if (!rootEsm.VERSION || rootEsm.VERSION === '0.0.0-dev') {
  throw new Error('dist VERSION must be injected at build time')
}
for (const entry of ['index', 'element']) {
  const esm = readFileSync(`dist/${entry === 'index' ? 'index' : 'element'}.js`, 'utf8')
  if (entry === 'index' && !esm.includes('onmessage')) {
    throw new Error('lens worker source must be inlined into dist/index.js')
  }
}

console.log(`liquidglass dist ok: VERSION ${root.VERSION}, subpath entries share ./index`)
