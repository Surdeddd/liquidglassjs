import { defineConfig, devices } from '@playwright/test'

const ci = Boolean(process.env.CI)

function server(app: string, port: number): { command: string; url: string; reuseExistingServer: boolean; timeout: number } {
  const dev = `pnpm --filter ${app} exec vite --host 127.0.0.1 --port ${port} --strictPort`
  const preview = `pnpm --filter ${app} exec sh -c 'vite build && vite preview --host 127.0.0.1 --port ${port} --strictPort'`
  return {
    command: ci ? preview : dev,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !ci,
    timeout: 180_000
  }
}

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled' }
  },
  use: {
    baseURL: 'http://127.0.0.1:4173'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } }
  ],
  webServer: [server('demo', 4173), server('docs', 4175)]
})
