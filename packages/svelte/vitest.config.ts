import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary'],
      include: ['src/**/*.ts'],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 55,
        statements: 95
      }
    }
  }
})
