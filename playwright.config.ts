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
  // A shared runner software-renders WebKit on two cores and measures this page at
  // 0-4 fps, so the profile there describes the runner rather than the library and
  // no threshold above it holds. It stays strict locally, where the numbers mean
  // something, and `pnpm bench` is the gate for frame rate.
  testIgnore: process.env.CI ? ['**/perf-audit.spec.ts'] : [],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled' }
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    colorScheme: 'dark',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 15'] },
      testIgnore: ['**/visual.spec.ts', '**/perf-audit.spec.ts']
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      testIgnore: ['**/visual.spec.ts', '**/perf-audit.spec.ts']
    }
  ],
  webServer: [server('demo', 4173), server('docs', 4175)]
})
