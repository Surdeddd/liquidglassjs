import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary'],
      include: ['src/**/*.ts'],
      thresholds: {
        lines: 90,
        functions: 85,
        branches: 70,
        statements: 85
      }
    }
  }
})
