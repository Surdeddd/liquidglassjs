import { readFileSync } from 'node:fs'
import { defineConfig } from 'tsup'

const workerBundle = new URL('./dist-worker/lens-worker.global.js', import.meta.url)

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  esbuildPlugins: [
    {
      name: 'lens-worker-text',
      setup(build) {
        build.onResolve({ filter: /^virtual:lens-worker$/ }, () => ({
          path: 'virtual:lens-worker',
          namespace: 'lens-worker'
        }))
        build.onLoad({ filter: /.*/, namespace: 'lens-worker' }, () => ({
          contents: readFileSync(workerBundle, 'utf8'),
          loader: 'text'
        }))
      }
    }
  ]
})
