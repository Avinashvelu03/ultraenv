import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'html', 'json-summary', 'json'],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      include: ['src/core/**/*.ts', 'src/vault/**/*.ts'],
      exclude: ['src/core/types.ts', 'src/core/constants.ts', 'src/data/**', 'src/core/watcher.ts', 'src/core/config.ts'],
    },
    include: ['tests/**/*.test.ts'],
    mockReset: true,
    restoreMocks: true,
    testTimeout: 10000,
  },
});
