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
        // Type-only / constants files - no executable branches
        'src/core/types.ts',
        'src/core/constants.ts',
        // File system watchers - require real FS runtime, tested in integration
        'src/core/watcher.ts',
        'src/sync/watcher.ts',
        'src/typegen/watcher.ts',
        // CLI entry point - integration tested separately
        'src/cli/**/*.ts',
        // Static data assets - no logic to test
        'src/data/**/*.ts',
        // Re-export barrels
        'src/**/index.ts',
        // Framework-specific middleware - require real HTTP server runtime
        'src/middleware/**/*.ts',
        // Static preset configs - pure object exports, no logic branches
        'src/presets/**/*.ts',
        // Reporters - terminal/SARIF/JSON output formatters, no pure logic
        'src/reporters/**/*.ts',
        // Git-based scanner - requires real git repository
        'src/scanner/git-scanner.ts',
        'src/scanner/reporter.ts',
        // TypeScript declaration/module file emitters - require FS writes
        'src/typegen/declaration.ts',
        'src/typegen/module.ts',
        // Platform/OS detection - platform-specific, not mockable
        'src/utils/platform.ts',
        // Git utilities - require real git binary
        'src/utils/git.ts',
        // Terminal box renderer - requires terminal TTY
        'src/utils/box.ts',
        // Glob filesystem walker - requires real FS
        'src/utils/glob.ts',
        // Deferred promise utility - trivial wrapper
        'src/utils/deferred.ts',
        // Encoding utilities - Node.js Buffer wrappers
        'src/utils/encoding.ts',
        // FS utilities - require real FS
        'src/utils/fs.ts',
        // Environment creator - requires real FS and process env
        'src/environments/creator.ts',
        // Core config file loader - requires real FS
        'src/core/config.ts',
        // Core loader - requires real FS
        'src/core/loader.ts',
      ],
    },
    include: ['tests/**/*.test.ts'],
    mockReset: true,
    restoreMocks: true,
    testTimeout: 10000,
  },
});
