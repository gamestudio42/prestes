import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  // One worker: two at once made timing-sensitive tests fail for a ~20% gain.
  workers: 1,
  expect: { timeout: 10_000 },
  // Baselines are shared by the projects: no project name in their file names.
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{-snapshotSuffix}{ext}',
  use: {
    baseURL: 'http://127.0.0.1:4317',
    headless: true,
    viewport: { width: 1440, height: 900 },
    // ambient-sound-and-voices D11: the content warning was already answered,
    // so every spec opens on the desk; content-warning.spec.ts clears this.
    storageState: {
      cookies: [],
      origins: [{ origin: 'http://127.0.0.1:4317', localStorage: [{ name: 'prestes.contentWarning.v1', value: '{"version":1}' }] }],
    },
    // Render on the GPU (ANGLE over Direct3D 11): headless Chromium otherwise
    // draws the skinned soldiers in software, on the CPU. Without a usable GPU
    // Chromium falls back to software by itself.
    launchOptions: { args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] },
  },
  // prepare-online-release D7: the slow-network test runs on the built game, as published.
  projects: [
    { name: 'dev', testIgnore: /slow-network\.spec\.ts/ },
    {
      name: 'release',
      testMatch: /slow-network\.spec\.ts/,
      use: {
        baseURL: 'http://127.0.0.1:4318',
        storageState: { cookies: [], origins: [] },
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @prestes/game dev:test',
      url: 'http://127.0.0.1:4317',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // Serves apps/game/dist: run `pnpm build` first (pnpm verify builds before the e2e step).
      command: 'pnpm --filter @prestes/game preview:release',
      url: 'http://127.0.0.1:4318',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});



