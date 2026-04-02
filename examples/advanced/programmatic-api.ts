import {
  createSchema,
  loadEnv,
  validateEnv,
  generateTypes,
  scanForSecrets,
  createDiffReporter,
  type EnvSchema,
  type ValidationResult,
  type SecretScanResult,
} from 'ultraenv';
import { t } from 'ultraenv';

// ─────────────────────────────────────────────────────────────────────────────
// Programmatic API Example
// ─────────────────────────────────────────────────────────────────────────────
// This example demonstrates ultraenv's programmatic API for advanced use cases
// like CLI tools, build scripts, deployment pipelines, and custom integrations.
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Build schemas programmatically ────────────────────────────────────────

interface AppEnvConfig {
  PORT: number;
  HOST: string;
  DATABASE_URL: string;
  NODE_ENV: 'development' | 'staging' | 'production';
  ENABLE_CACHE: boolean;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

async function buildSchema(): Promise<EnvSchema<AppEnvConfig>> {
  return createSchema<AppEnvConfig>({
    PORT: {
      type: 'number',
      validator: t.number().port(),
      default: 3000,
      description: 'Server port number',
    },
    HOST: {
      type: 'string',
      validator: t.string().hostname(),
      default: '0.0.0.0',
      description: 'Server bind address',
    },
    DATABASE_URL: {
      type: 'string',
      validator: t.string().url(),
      required: true,
      secret: true,
      description: 'PostgreSQL connection string',
    },
    NODE_ENV: {
      type: 'string',
      validator: t.enum(['development', 'staging', 'production'] as const),
      required: true,
      description: 'Application environment',
    },
    ENABLE_CACHE: {
      type: 'boolean',
      default: true,
      description: 'Enable response caching',
    },
    LOG_LEVEL: {
      type: 'string',
      validator: t.enum(['debug', 'info', 'warn', 'error'] as const),
      default: 'info',
      description: 'Logging verbosity',
    },
  });
}

// ── 2. Load and validate environment variables ───────────────────────────────

async function loadAndValidate(
  schema: EnvSchema<AppEnvConfig>,
  envFile?: string,
): Promise<ValidationResult<AppEnvConfig>> {
  // Load environment variables from file (optional, falls back to process.env)
  if (envFile) {
    await loadEnv(envFile, { override: true });
  }

  // Validate current environment against schema
  return validateEnv(schema, {
    // Options
    strict: true,          // Fail on extra/unknown variables
    allowExtra: false,     // Disallow variables not in schema
    maskSecrets: true,     // Mask secret values in error output
  });
}

// ── 3. Generate TypeScript types ────────────────────────────────────────────

async function generateEnvTypes(schema: EnvSchema<AppEnvConfig>) {
  const result = await generateTypes(schema, {
    outDir: './generated',
    filename: 'env.d.ts',
    format: 'typescript',
    exportName: 'EnvConfig',
    includeDefaults: true,
    includeDescriptions: true,
  });

  if (result.success) {
    console.log(`✅ Types generated: ${result.outputPath}`);
  } else {
    console.error(`❌ Failed to generate types: ${result.error}`);
  }
}

// ── 4. Scan for hardcoded secrets in codebase ────────────────────────────────

async function performSecretScan(): Promise<SecretScanResult> {
  const result = await scanForSecrets({
    directories: ['./src', './lib', './scripts'],
    ignorePatterns: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**', '**/dist/**'],
    entropyThreshold: 3.5,
    maxFileSize: 100_000,  // 100KB
    includeBinary: false,
  });

  return result;
}

// ── 5. Compare environments (e.g., .env.staging vs .env.production) ─────────

async function compareEnvironments() {
  const reporter = createDiffReporter({
    files: ['.env.staging', '.env.production'],
    maskSecrets: true,
    format: 'table',
  });

  const diff = await reporter.compare();
  return diff;
}

// ── 6. Put it all together ──────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(60));
  console.log('  ultraenv Programmatic API Demo');
  console.log('═'.repeat(60));

  // Step 1: Build schema
  console.log('\n📦 Building schema...');
  const schema = await buildSchema();
  console.log('   Schema built with fields:', Object.keys(schema.fields).join(', '));

  // Step 2: Load and validate
  console.log('\n🔍 Validating environment...');
  const result = await loadAndValidate(schema, '.env');

  if (result.valid && result.env) {
    console.log('   ✅ Environment valid!');
    console.log('   PORT:', result.env.PORT);
    console.log('   HOST:', result.env.HOST);
    console.log('   NODE_ENV:', result.env.NODE_ENV);
    console.log('   ENABLE_CACHE:', result.env.ENABLE_CACHE);
    console.log('   LOG_LEVEL:', result.env.LOG_LEVEL);
    console.log('   DATABASE_URL: ***masked***');
  } else {
    console.log('   ❌ Validation errors:');
    for (const error of result.errors ?? []) {
      console.log(`   - ${error.key}: ${error.message}`);
    }
  }

  // Step 3: Generate types
  console.log('\n🔧 Generating TypeScript types...');
  await generateEnvTypes(schema);

  // Step 4: Scan for secrets
  console.log('\n🔐 Scanning codebase for secrets...');
  const scanResult = await performSecretScan();
  if (scanResult.findings.length === 0) {
    console.log('   ✅ No secrets found!');
  } else {
    console.log(`   ⚠️  Found ${scanResult.findings.length} potential secret(s):`);
    for (const finding of scanResult.findings.slice(0, 5)) {
      console.log(`   - ${finding.file}:${finding.line} [${finding.type}] ${finding.matchedPattern}`);
    }
    if (scanResult.findings.length > 5) {
      console.log(`   ... and ${scanResult.findings.length - 5} more`);
    }
  }

  // Step 5: Compare environments
  console.log('\n📊 Comparing environments...');
  try {
    const diff = await compareEnvironments();
    console.log(`   ${diff.added.length} added, ${diff.removed.length} removed, ${diff.changed.length} changed`);
    for (const change of diff.changed) {
      console.log(`   - ${change.key}: "${change.oldValue}" → "${change.newValue}"`);
    }
  } catch {
    console.log('   ℹ️  Environment comparison files not found (expected .env.staging, .env.production)');
  }

  console.log('\n' + '═'.repeat(60));
  console.log('  Done!');
  console.log('═'.repeat(60));
}

main().catch(console.error);
