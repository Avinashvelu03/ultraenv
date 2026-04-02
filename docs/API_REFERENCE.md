# Programmatic API Reference

Complete reference for the ultraenv programmatic API.

## Table of Contents

- [Core Loading](#core-loading)
- [Schema Validation](#schema-validation)
- [File Watching](#file-watching)
- [Vault & Encryption](#vault--encryption)
- [Secret Scanning](#secret-scanning)
- [Sync (.env.example)](#sync-envexample)
- [Type Generation](#type-generation)
- [Environment Management](#environment-management)
- [Health Checks](#health-checks)
- [Middleware](#middleware)
- [Reporters](#reporters)
- [Parser (Advanced)](#parser-advanced)
- [File System Utilities](#file-system-utilities)
- [Error Handling](#error-handling)
- [Type Exports](#type-exports)

---

## Core Loading

### `load(options?)`

Load environment variables from `.env` files into `process.env`.

```typescript
import { load } from 'ultraenv';

load();
load({ envDir: './config' });
load({ expandVariables: true, overrideProcessEnv: true });
```

**Returns:** `Record<string, string>` — Merged env key-value pairs

### `loadSync(options?)`

Synchronous alias for `load()`.

### `loadWithResult(options?)`

Load with complete result metadata.

```typescript
import { loadWithResult } from 'ultraenv';

const result = loadWithResult();

result.env           // Record<string, string>
result.metadata      // LoadMetadata
result.parsed        // ParsedEnvFile[]
result.validation    // ValidationResult (if schema provided)
```

**Returns:** `LoadResult`

### `loadWithResultSync(options?)`

Synchronous alias for `loadWithResult()`.

### LoadOptions

| Option | Type | Default | Description |
|---|---|---|---|
| `envDir` | `string` | `'.'` | Directory containing `.env` files |
| `files` | `readonly EnvFileType[]` | auto | Specific files to load |
| `encoding` | `BufferEncoding` | `'utf-8'` | File encoding |
| `expandVariables` | `boolean` | `true` | Expand `$VAR` references |
| `overrideProcessEnv` | `boolean` | `false` | Override existing `process.env` |
| `mergeStrategy` | `MergeStrategy` | `'last-wins'` | How to handle conflicts |
| `schema` | `EnvSchema` | — | Schema for validation |
| `silent` | `boolean` | `false` | Suppress output |
| `maxInterpolationDepth` | `number` | `10` | Max `$VAR` nesting |
| `maxValueLength` | `number` | `1048576` | Max value in bytes |
| `processEnv` | `Record<string, string \| undefined>` | `process.env` | Custom env source |

### LoadResult

```typescript
interface LoadResult {
  env: Record<string, string>;
  metadata: LoadMetadata;
  parsed: readonly ParsedEnvFile[];
  validation?: ValidationResult;
}

interface LoadMetadata {
  totalVars: number;
  filesParsed: number;
  filesFound: number;
  loadTimeMs: number;
  timestamp: string;
  envDir: string;
  hadOverrides: boolean;
}
```

---

## Schema Validation

### `defineEnv(schema, vars?, options?)`

Define and validate environment variables. Returns fully typed object.

```typescript
import { defineEnv, t } from 'ultraenv';

const env = defineEnv({
  PORT: t.number().port().default(3000),
  DATABASE_URL: t.string().format('url').required(),
  NODE_ENV: t.enum(['development', 'production'] as const).required(),
});

// TypeScript knows:
// env.PORT → number
// env.DATABASE_URL → string
// env.NODE_ENV → 'development' | 'production'
```

**Throws:** `Error` on validation failure.

### `tryDefineEnv(schema, vars?, options?)`

Non-throwing variant. Returns result object.

```typescript
const result = tryDefineEnv(schema);

if (result.valid) {
  console.log(result.values);    // typed values
} else {
  console.log(result.errors);    // ValidationErrorEntry[]
  console.log(result.warnings);  // ValidationWarningEntry[]
  console.log(result.unknown);   // string[]
}
```

### `validate(vars, schema, options?)`

Low-level validation function.

```typescript
import { validate } from 'ultraenv';

const result = validate(process.env, {
  PORT: { type: 'number', port: true },
}, { strict: true });

result.valid      // boolean
result.values     // Record<string, unknown>
result.errors     // ValidationErrorEntry[]
result.warnings   // ValidationWarningEntry[]
result.unknown    // string[]
```

### `t` — Schema Factory

```typescript
import { t } from 'ultraenv';

t.string()          // StringSchemaBuilder
t.number()          // NumberSchemaBuilder
t.boolean()         // BooleanSchemaBuilder
t.enum(values)      // EnumSchemaBuilder
t.array()           // ArraySchemaBuilder
t.json<T>()         // JsonSchemaBuilder<T>
t.date()            // DateSchemaBuilder
t.bigint()          // BigIntSchemaBuilder
t.regex()           // RegexSchemaBuilder
t.url()             // URL validator
t.email()           // Email validator
t.ip()              // IP validator (v4 or v6)
t.ipv4()            // IPv4 validator
t.ipv6()            // IPv6 validator
t.hostname()        // Hostname validator
t.port()            // Port validator
t.path()            // File path validator
t.uuid()            // UUID validator
t.hex()             // Hex validator
t.base64()          // Base64 validator
t.semver()          // Semver validator
t.cron()            // Cron expression validator
t.duration()        // Duration string validator
t.bytes()           // Bytes string validator
t.color()           // Color validator
t.locale()          // Locale code validator
t.timezone()        // IANA timezone validator
t.country()         // ISO country code validator
t.currency()        // ISO currency code validator
```

---

## File Watching

### `createWatcher(options?)`

Watch `.env` files for changes.

```typescript
import { createWatcher } from 'ultraenv';

const watcher = createWatcher({
  files: ['.env', '.env.local'],
  debounceMs: 100,
  initial: true,
});

watcher.on('change', (event) => {
  console.log(`${event.type}: ${event.path}`);
});

watcher.on('ready', () => {
  console.log('Watching for changes...');
});

watcher.start();
// Later...
watcher.stop();
```

### WatchOptions

| Option | Type | Default |
|---|---|---|
| `files` | `readonly string[]` | `['.env']` |
| `recursive` | `boolean` | `false` |
| `debounceMs` | `number` | `100` |
| `initial` | `boolean` | `false` |
| `pollIntervalMs` | `number` | `0` |
| `ignore` | `readonly string[]` | `[]` |

---

## Vault & Encryption

### Key Management

```typescript
import {
  generateMasterKey,     // () => Buffer
  deriveEnvironmentKey, // (key, salt, env) => Buffer
  formatKey,            // (key) => string
  parseKey,             // (formatted) => Buffer
  isValidKeyFormat,     // (str) => boolean
  maskKey,              // (key) => string
  generateKeysFile,     // (envs[]) => string
  parseKeysFile,        // (content) => Record<string, string>
  rotateKey,            // (opts) => Promise<Buffer>
} from 'ultraenv';
```

### Encryption

```typescript
import {
  encryptValue,         // (plaintext, key) => Promise<string>
  decryptValue,         // (ciphertext, key) => Promise<string>
  encryptEnvironment,   // (env, key) => Promise<Record<string, string>>
  decryptEnvironment,   // (env, key) => Promise<Record<string, string>>
  isEncryptedValue,     // (value) => boolean
} from 'ultraenv';
```

### Vault File

```typescript
import {
  parseVaultFile,       // (content) => VaultFile
  serializeVaultFile,   // (vault) => string
  readVaultFile,        // (path) => Promise<VaultFile>
  writeVaultFile,       // (path, vault) => Promise<void>
  getEnvironmentData,   // (vault, env) => Record<string, string>
  getVaultEnvironments, // (vault) => string[]
} from 'ultraenv';
```

### Integrity

```typescript
import {
  computeIntegrity,       // (data) => string
  verifyIntegrity,       // (data, checksum) => boolean
  computeVaultChecksum,  // (data) => string
  verifyVaultChecksum,   // (data, checksum) => boolean
} from 'ultraenv';
```

### Secure Memory

```typescript
import {
  SecureBuffer,                  // Secure Buffer class
  SecureString,                  // Secure String class
  createSecureString,            // (str) => SecureString
  createSecureStringFromBuffer, // (Buffer) => SecureString
  wipeString,                    // (str) => void
  secureCompare,                 // (a, b) => boolean
} from 'ultraenv';
```

---

## Secret Scanning

### Main API

```typescript
import { scan } from 'ultraenv';

const result = await scan({
  cwd: '/path/to/project',
  paths: ['src/', 'config/'],
  include: ['**/*.ts'],
  exclude: ['**/*.test.ts'],
  scanGitHistory: false,
  scanStaged: false,
  failFast: false,
});

result.found          // boolean
result.secrets        // DetectedSecret[]
result.filesScanned   // string[]
result.scanTimeMs     // number
```

### Pattern API

```typescript
import {
  matchPatterns,    // (text) => DetectedSecret[]
  addCustomPattern, // (pattern) => void
  removeCustomPattern, // (id) => boolean
  resetPatterns,    // () => void
} from 'ultraenv';
```

### Scanning Functions

```typescript
import {
  scanFiles,              // (paths, opts) => Promise<ScanResult>
  scanGitHistory,         // (opts) => Promise<ScanResult>
  scanStagedFiles,        // (cwd) => Promise<DetectedSecret[]>
  scanDiff,               // (from, to?, cwd?) => Promise<DetectedSecret[]>
  detectHighEntropyStrings, // (str) => boolean
  scanLineForEntropy,     // (line) => { isHighEntropy: boolean, score: number }
  formatScanResult,       // (result, format) => string
} from 'ultraenv';
```

---

## Sync (.env.example)

```typescript
import {
  generateExampleFile,    // (envPath, examplePath, opts?) => Promise<void>
  generateExampleContent, // (envPath, opts?) => Promise<string>
  needsUpdate,            // (envPath, examplePath) => Promise<boolean>
  compareSync,            // (envPath, examplePath) => Promise<SyncDiffResult>
  compareValues,          // (env, example) => SyncDiffResult
  createSyncWatcher,      // (envPath, examplePath) => Watcher
} from 'ultraenv';
```

---

## Type Generation

```typescript
import {
  generateDeclaration,   // (vars, schema, opts) => string
  generateModule,        // (schema, opts) => string
  generateJsonSchema,    // (schema, opts) => object
  createTypegenWatcher,  // (opts) => { start, stop }
} from 'ultraenv';
```

---

## Environment Management

```typescript
import {
  listEnvironments,         // () => Promise<string[]>
  validateAllEnvironments,  // () => Promise<ValidationResult[]>
  switchEnvironment,        // (name) => Promise<void>
  getActiveEnvironment,     // () => string
  discoverEnvironments,     // () => Promise<string[]>
  compareEnvironments,      // (env1, env2) => ComparisonResult
  formatComparison,         // (result) => string
  createEnvironment,        // (name, fromEnv?) => Promise<void>
  removeEnvironment,        // (name) => Promise<void>
  duplicateEnvironment,     // (source, target) => Promise<void>
} from 'ultraenv';
```

---

## Health Checks

```typescript
import {
  healthCheck,     // (opts?) => HealthCheckResult
  liveCheck,       // () => { status, timestamp }
  readinessCheck,  // (requiredVars, source?) => { status, ready, missing, timestamp }
} from 'ultraenv';
```

---

## Middleware

### Express

```typescript
import {
  ultraenvMiddleware,  // Express middleware
  healthCheckRoute,    // Express health check handler
} from 'ultraenv';
```

### Fastify

```typescript
import {
  ultraenvPlugin,        // Fastify plugin (default export)
  createUltraenvPlugin, // Factory function
} from 'ultraenv/fastify';
```

---

## Reporter

```typescript
import {
  reportValidation,            // Terminal: validation result
  reportError,                 // Terminal: error
  reportSuccess,               // Terminal: success
  reportWarning,               // Terminal: warning
  reportInfo,                  // Terminal: info
  reportScanResultTerminal,    // Terminal: scan result
  reportValidationJson,        // JSON: validation result
  reportErrorJson,             // JSON: error
  reportScanResultJson,        // JSON: scan result
  reportScanResultSarif,       // SARIF: scan result
} from 'ultraenv';
```

---

## Parser (Advanced)

```typescript
import {
  parseEnvFile,     // (content, filePath?) => ParsedEnvFile
  expandVariables,  // (env, source?, opts?) => Record<string, string>
  resolveCascade,   // (opts) => CascadeResult
  mergeCascade,     // (parsed, cascade) => Record<string, string>
} from 'ultraenv';
```

---

## File System Utilities

```typescript
import {
  readFile,    // (path, encoding?) => Promise<string>
  writeFile,   // (path, content) => Promise<void>
  readFileSync,// (path, encoding?) => string
  exists,      // (path) => Promise<boolean>
  isFile,      // (path) => Promise<boolean>
  isDirectory, // (path) => Promise<boolean>
  ensureDir,   // (path) => Promise<void>
  removeFile,  // (path) => Promise<void>
  copyFile,    // (src, dest) => Promise<void>
  listFiles,   // (dir, pattern?) => Promise<string[]>
  findUp,      // (name, cwd?) => string | null
} from 'ultraenv';
```

---

## Error Handling

### Error Classes

```typescript
import {
  UltraenvError,            // Base error class
  ValidationError,          // Schema validation failure
  ParseError,               // .env parsing error
  InterpolationError,       // Variable expansion error
  EncryptionError,          // Encryption/decryption error
  VaultError,               // Vault operation error
  ScanError,                // Secret scanning error
  ConfigError,              // Configuration error
  FileSystemError,          // File I/O error
} from 'ultraenv';
```

### Type Guards

```typescript
import {
  isUltraenvError,    // (error) => error is UltraenvError
  isValidationError,  // (error) => error is ValidationError
  isParseError,       // (error) => error is ParseError
  isEncryptionError,  // (error) => error is EncryptionError
  isVaultError,       // (error) => error is VaultError
} from 'ultraenv';
```

### Error Properties

```typescript
interface UltraenvError {
  readonly code: string;      // 'VALIDATION_ERROR', 'PARSE_ERROR', etc.
  readonly message: string;   // Human-readable description
  readonly hint?: string;     // How to fix
  readonly cause?: Error;     // Original error
}
```

---

## Type Exports

All types are exported for use in your projects:

```typescript
import type {
  // Core
  LoadOptions, LoadResult, LoadMetadata, ParsedEnvVar, ParsedEnvFile,
  UltraenvConfig, MergeStrategy, OutputFormat,

  // Schema
  SchemaDefinition, InferSchema, InferEnv, SchemaBuilder,
  StringSchema, NumberSchema, BooleanSchema, EnumSchema, ArraySchema,
  JsonSchema, DateSchema, BigIntSchema, BaseSchema,

  // Validation
  ValidationResult, ValidationError, ValidationWarning,

  // Vault
  VaultConfig, VaultStatus, VaultEnvironment, EncryptionResult,

  // Scanning
  ScanOptions, ScanResult, DetectedSecret, SecretPattern,

  // Sync
  SyncResult, SyncDiff,

  // Type Generation
  TypegenOptions,

  // Watch
  WatchOptions, Watcher, WatcherEvent,

  // Presets
  Preset,

  // Reporters
  Reporter,
} from 'ultraenv';
```
