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
      include: ['src/**/*.ts'],
      exclude: [
        // Type-only / constants files — no executable branches
        'src/core/types.ts',
        'src/core/constants.ts',
        // File system watcher — requires real FS runtime, tested in integration
        'src/core/watcher.ts',
        // CLI entry point — integration tested separately
        'src/cli/**/*.ts',
        // Static data assets — no logic to test
        'src/data/**/*.ts',
        // Re-export barrels
        'src/**/index.ts',
      ],
    },
    include: ['tests/**/*.test.ts'],
    mockReset: true,
    restoreMocks: true,
    testTimeout: 10000,
  },
});
