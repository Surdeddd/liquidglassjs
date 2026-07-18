import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { 'lens-worker': 'src/worker/lens-worker.ts' },
  format: ['iife'],
  outDir: 'dist-worker',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  clean: true,
  sourcemap: false,
  dts: false
})
