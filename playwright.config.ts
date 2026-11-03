import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  workers: 1,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:4317',
    headless: true,
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: 'pnpm --filter @prestes/game dev:test',
    url: 'http://127.0.0.1:4317',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});



