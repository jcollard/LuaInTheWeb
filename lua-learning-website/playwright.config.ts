import { defineConfig, devices } from '@playwright/test'

// E2E tests use a dedicated high port to avoid conflicts with dev servers
const E2E_PORT = 52086

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: 'html',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: 'on-first-retry',
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
