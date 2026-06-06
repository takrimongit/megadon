import { defineConfig } from 'vitest/config';

// Paid full-pipeline e2e config. Submits a real Brief, waits ≤90s for
// the worker to call kie.ai + upload to Cloud Storage + flip the batch
// to pending_review. Run only via `npm run test:e2e:full` or the
// workflow_dispatch prod-promote gate.
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/e2e/**/*.full.e2e.test.ts'],
    exclude: ['node_modules/**'],
    testTimeout: 150_000,
    hookTimeout: 60_000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@megadon/types': new URL('../../packages/types/src/index.ts', import.meta.url).pathname,
    },
  },
});
