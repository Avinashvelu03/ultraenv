import { defineEnv, t, createWatcher } from 'ultraenv';

// ─────────────────────────────────────────────────────────────────────────────
// Watch Mode Example
// ─────────────────────────────────────────────────────────────────────────────
// This example demonstrates ultraenv's file watching capabilities, which
// automatically reload environment variables when .env files change during
// development.
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Define your environment schema ────────────────────────────────────────

const env = defineEnv({
  // Server
  PORT: t.number().port().default(3000),
  HOST: t.string().hostname().default('localhost'),
  NODE_ENV: t.enum(['development', 'staging', 'production'] as const).required(),

  // Database
  DATABASE_URL: t.string().url().required(),
  DATABASE_POOL_SIZE: t.number().min(1).max(100).default(10),

  // Cache
  REDIS_URL: t.string().url().optional().secret(),
  CACHE_TTL: t.number().default(3600),

  // Feature flags
  ENABLE_CACHING: t.boolean().default(true),
  ENABLE_RATE_LIMITING: t.boolean().default(true),
  ENABLE_DEBUG_ENDPOINTS: t.boolean().default(false),

  // Logging
  LOG_LEVEL: t.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const).default('info'),
});

// ── 2. Create a watcher ─────────────────────────────────────────────────────

const watcher = createWatcher(env, {
  // Which .env files to watch (supports glob patterns)
  files: ['.env', '.env.local', `.env.${env.NODE_ENV}`],

  // Debounce time in milliseconds (avoid rapid re-validation)
  debounce: 300,

  // What to do on change
  onChange(event) {
    const timestamp = new Date().toLocaleTimeString();

    switch (event.type) {
      case 'change':
        console.log(`\n[${timestamp}] 🔄 .env file changed: ${event.file}`);
        console.log(`  Updated variables: ${event.changedKeys.join(', ')}`);
        console.log(`  PORT is now: ${event.newEnv.PORT}`);
        console.log(`  LOG_LEVEL is now: ${event.newEnv.LOG_LEVEL}`);
        break;

      case 'validation-error':
        console.error(`\n[${timestamp}] ❌ Validation error in ${event.file}:`);
        for (const err of event.errors) {
          console.error(`  - ${err.key}: ${err.message}`);
        }
        console.log('  Keeping previous valid configuration.');
        break;

      case 'load-error':
        console.error(`\n[${timestamp}] ⚠️  Failed to load ${event.file}: ${event.message}`);
        break;

      case 'removed':
        console.log(`\n[${timestamp}] 🗑️  File removed: ${event.file}`);
        break;
    }
  },

  // Validate before applying changes (fail-safe)
  validateBeforeApply: true,

  // Watch recursively
  recursive: false,
});

// ── 3. Start watching ───────────────────────────────────────────────────────

async function main() {
  console.log('================================================');
  console.log('  ultraenv Watch Mode');
  console.log('================================================');
  console.log('');
  console.log(`  Environment: ${env.NODE_ENV}`);
  console.log(`  Port:        ${env.PORT}`);
  console.log(`  Host:        ${env.HOST}`);
  console.log(`  Log level:   ${env.LOG_LEVEL}`);
  console.log(`  Caching:     ${env.ENABLE_CACHING}`);
  console.log('');
  console.log('  Watching for .env file changes...');
  console.log('  Press Ctrl+C to stop.');
  console.log('------------------------------------------------');

  // Start the watcher
  await watcher.start();

  // Handle graceful shutdown
  const cleanup = async () => {
    console.log('\n\n👋 Shutting down watch mode...');
    await watcher.stop();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
