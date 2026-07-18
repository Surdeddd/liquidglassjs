import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      'virtual:lens-worker': new URL('./test/lens-worker-stub.ts', import.meta.url).pathname
    }
  },
  test: {
    environment: 'happy-dom'
  }
})
