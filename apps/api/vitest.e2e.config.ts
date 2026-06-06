import { defineConfig } from 'vitest/config';

// Default e2e config — runs every push after staging deploy. Excludes the
// paid full-pipeline test (file pattern *.full.e2e.test.ts), which is
// invoked explicitly by `npm run test:e2e:full`.
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/e2e/**/*.e2e.test.ts'],
    exclude: ['**/*.full.e2e.test.ts', 'node_modules/**'],
    testTimeout: 30_000,
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
