import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const fromRoot = (path: string): string => fileURLToPath(new URL(`../../${path}`, import.meta.url))
const coreRoot = process.env.GLASS_CORE_SRC ?? fromRoot('packages/core/src')

export default defineConfig({
  publicDir: fromRoot('e2e/fixtures/apple-glass'),
  resolve: {
    alias: {
      '@surdeddd/liquidglass-core': `${coreRoot}/index.ts`,
      'virtual:lens-worker': `${coreRoot}/worker/virtual-source.ts`,
      'html-to-image': fromRoot('packages/core/node_modules/html-to-image')
    }
  },
  server: {
    fs: { allow: [fromRoot('')] }
  }
})
