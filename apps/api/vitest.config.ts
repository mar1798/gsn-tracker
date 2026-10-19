import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration tests share one Postgres database (recreated by the global setup).
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false,
  },
});
