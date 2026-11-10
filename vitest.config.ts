import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'tests/e2e/**'],
    environment: 'node',
    setupFiles: ['tests/setup-test-map.ts'],
    // Simulation tests run whole battles; under a full parallel run the 5 s
    // default timed out tests that take half a second alone.
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      include: ['packages/{kernel,shared,simulation,content}/src/**/*.ts'],
      reporter: ['text-summary', 'html'],
      reportsDirectory: 'coverage',
      thresholds: { lines: 90 },
    },
  },
});
