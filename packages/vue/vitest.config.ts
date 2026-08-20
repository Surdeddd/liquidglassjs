import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary'],
      include: ['src/**/*.ts'],
      thresholds: {
        lines: 85,
        functions: 70,
        branches: 45,
        statements: 80
      }
    }
  }
})
