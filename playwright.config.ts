import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  // One worker: two at once made timing-sensitive tests fail for a ~20% gain.
  workers: 1,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:4317',
    headless: true,
    viewport: { width: 1440, height: 900 },
    // Render on the GPU (ANGLE over Direct3D 11): headless Chromium otherwise
    // draws the skinned soldiers in software, on the CPU. Without a usable GPU
    // Chromium falls back to software by itself.
    launchOptions: { args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] },
  },
  webServer: {
    command: 'pnpm --filter @prestes/game dev:test',
    url: 'http://127.0.0.1:4317',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});



