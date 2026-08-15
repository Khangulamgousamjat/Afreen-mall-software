import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    // Inject NODE_ENV for test environment detection
    env: {
      NODE_ENV: 'test',
    },
    // Run tests sequentially in a single fork to avoid cross-test DB race conditions
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Reasonable timeout for DB-backed integration tests
    testTimeout: 120000,
    hookTimeout: 120000,
    // Disable parallel file execution — tests share a DB
    fileParallelism: false,
  },
});

