import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'tests/e2e/**'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['packages/{kernel,shared,simulation,content}/src/**/*.ts'],
      reporter: ['text-summary', 'html'],
      reportsDirectory: 'coverage',
      thresholds: { lines: 90 },
    },
  },
});
