import { availableParallelism } from 'node:os';
import { defineConfig } from 'vitest/config';

// Timing tests assert a wall-clock budget; they run first, alone, so whole
// battles in other workers do not count against them.
const TIMING_TESTS = ['tests/simulation/preview-cost.test.ts'];

// Simulation tests run whole battles, one core each. A worker per logical core
// oversubscribes the machine (efficiency cores, hyper-threads) and the long
// files then time out; a third of the cores keeps each battle near its solo
// time. PRESTES_TEST_WORKERS overrides it.
const workers = Number(process.env.PRESTES_TEST_WORKERS) || Math.max(2, Math.floor(availableParallelism() / 3));

const EXCLUDED = ['**/node_modules/**', 'tests/e2e/**'];
const shared = {
  environment: 'node' as const,
  setupFiles: ['tests/setup-test-map.ts'],
  // A guard against a hung test, not a speed check: whole battles take 5 to
  // 10 s alone and three times that on a loaded machine.
  testTimeout: 60_000,
};

export default defineConfig({
  test: {
    maxWorkers: workers,
    minWorkers: 1,
    coverage: {
      provider: 'v8',
      include: ['packages/{kernel,shared,simulation,content}/src/**/*.ts'],
      reporter: ['text-summary', 'html'],
      reportsDirectory: 'coverage',
      thresholds: { lines: 90 },
    },
    projects: [
      {
        test: {
          ...shared,
          name: 'timing',
          include: TIMING_TESTS,
          exclude: EXCLUDED,
          sequence: { groupOrder: 0 },
        },
      },
      {
        test: {
          ...shared,
          name: 'unit',
          include: ['packages/*/test/**/*.test.ts', 'tests/**/*.test.ts'],
          exclude: [...EXCLUDED, ...TIMING_TESTS],
          sequence: { groupOrder: 1 },
        },
      },
    ],
  },
});
