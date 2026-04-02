<div align="center">

```
╔═══════════════════════════════════════════════════╗
║                                                   ║
║     ██████╗ ██████╗ ███████╗██╗  ██╗██╗  ██╗     ║
║    ██╔════╝██╔═══██╗██╔════╝██║ ██╔╝██║ ██╔╝     ║
║    ██║     ██║   ██║███████╗█████╔╝ █████╔╝      ║
║    ██║     ██║   ██║╚════██║██╔═██╗ ██╔═██╗      ║
║    ╚██████╗╚██████╔╝███████║██║  ██╗██║  ██╗     ║
║     ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝     ║
║                                                   ║
║   The Ultimate Environment Variable Manager        ║
║   v1.0.0                                          ║
╚═══════════════════════════════════════════════════╝
```

**Validate, Type, Encrypt, Sync, and Never Ship Broken Configs Again.**

[![npm version](https://img.shields.io/npm/v/ultraenv.svg?style=flat-square&color=0EA5E9)](https://www.npmjs.com/package/ultraenv)
[![License: MIT](https://img.shields.io/npm/l/ultraenv.svg?style=flat-square&color=22C55E)](https://github.com/Avinashvelu03/ultraenv/blob/main/LICENSE)
[![Node.js](https://img.shields.io/node/v/ultraenv.svg?style=flat-square&color=339933)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-blue.svg?style=flat-square)](https://www.npmjs.com/package/ultraenv)
[![TypeScript](https://img.shields.io/badge/types-TypeScript-3178C6.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg?style=flat-square)](https://github.com/Avinashvelu03/ultraenv/actions)

[Getting Started](#-quick-start) · [Schema Reference](#-schema-reference) · [CLI Reference](#-cli-command-reference) · [Vault Guide](#-encryption--vault) · [Docs](#documentation)

</div>

---

## 🤔 Why ultraenv?

Every project uses environment variables. Every project gets them wrong eventually.

- **Missing variables** crash production at 3 AM.
- **Wrong types** (`process.env.PORT` is always a string) cause silent bugs.
- **Leaked secrets** in `.env` files end up in git history forever.
- **Drifting `.env.example`** files lead to confusing onboarding for new developers.
- **No validation** means you find out about missing configs at runtime.

**ultraenv** solves all of these problems with a single, zero-dependency library that provides:

| Problem | ultraenv Solution |
|---|---|
| No type safety for `process.env` | Full TypeScript inference from schema |
| Secrets leaked in git | Built-in secret scanner with 55+ patterns |
| No `.env` validation | Schema engine with 30+ validators |
| Secrets in plain text | AES-256-GCM encrypted vault |
| `.env.example` out of sync | Auto-sync with watch mode |
| No multi-environment support | Multi-env management (dev, staging, prod) |
| Can't use in CI/CD | CI commands with SARIF output |
| Hard to migrate from dotenv | Drop-in replacement with `load()` |

---

## 📊 Feature Comparison

| Feature | **ultraenv** | [dotenv](https://github.com/motdotla/dotenv) | [envalid](https://github.com/af/envalid) | [@t3-oss/env](https://github.com/t3-oss/env-core) |
|---|:---:|:---:|:---:|:---:|
| **Parse `.env` files** | ✅ | ✅ | ✅ | ✅ |
| **TypeScript inference** | ✅ Full | ❌ | ✅ Partial | ✅ Full |
| **Schema validators** | ✅ 30+ | ❌ | ✅ 8 | ✅ Via zod |
| **String validators** | ✅ 20+ | ❌ | ❌ | Via zod |
| **Secret scanning** | ✅ 55+ patterns | ❌ | ❌ | ❌ |
| **Encrypted vault** | ✅ AES-256-GCM | ❌ | ❌ | ❌ |
| **Key rotation** | ✅ | ❌ | ❌ | ❌ |
| **`.env.example` sync** | ✅ Watch mode | ❌ | ❌ | ❌ |
| **Type generation** | ✅ `.d.ts` / module / JSON Schema | ❌ | ❌ | ✅ |
| **Multi-environment** | ✅ 11 file variants | ❌ | ❌ | ❌ |
| **Framework presets** | ✅ 9 presets | ❌ | ❌ | ❌ |
| **CI/CD integration** | ✅ SARIF output | ❌ | ❌ | ❌ |
| **Variable interpolation** | ✅ `$VAR` / `${VAR}` | ✅ | ❌ | ❌ |
| **File cascade** | ✅ Priority-based | ❌ | ❌ | ❌ |
| **Hot reload watcher** | ✅ | ❌ | ❌ | ❌ |
| **Health check API** | ✅ | ❌ | ❌ | ❌ |
| **Express middleware** | ✅ | ❌ | ❌ | ❌ |
| **Fastify plugin** | ✅ | ❌ | ❌ | ❌ |
| **SARIF output** | ✅ | ❌ | ❌ | ❌ |
| **Git hook integration** | ✅ | ❌ | ❌ | ❌ |
| **dotenv-compatible API** | ✅ | — | ❌ | ❌ |
| **Zero dependencies** | ✅ | ✅ | ❌ | ❌ |
| **Node.js** | ≥ 18 | ≥ 12 | ≥ 14 | ≥ 18 |

---

## 🚀 Quick Start

Get started in three steps:

### Step 1 — Install

```bash
npm install ultraenv
```

### Step 2 — Define your schema

Create an `env.ts` file:

```typescript
import { defineEnv, t } from 'ultraenv';

const env = defineEnv({
  // Required string with URL validation
  DATABASE_URL: t.string().format('url').required(),

  // Number with port validation and a default
  PORT: t.number().port().default(3000),

  // Enum with literal union types
  NODE_ENV: t.enum(['development', 'staging', 'production'] as const).required(),

  // Boolean with default
  DEBUG: t.boolean().default(false),

  // Optional email
  ADMIN_EMAIL: t.email().optional(),

  // Array with custom separator
  ALLOWED_ORIGINS: t.array().separator(';').default(['http://localhost:3000']),

  // Duration string
  CACHE_TTL: t.duration().default('1h'),

  // Bytes string
  MAX_UPLOAD_SIZE: t.bytes().default('10MB'),
});

export default env;

// TypeScript knows the exact types:
// env.DATABASE_URL  → string
// env.PORT          → number  (not string!)
// env.NODE_ENV      → 'development' | 'staging' | 'production'
// env.DEBUG         → boolean
// env.ADMIN_EMAIL   → string | undefined
// env.ALLOWED_ORIGINS → readonly string[]
// env.CACHE_TTL     → string
// env.MAX_UPLOAD_SIZE → string
```

### Step 3 — Use your typed env everywhere

```typescript
// Any file in your project:
import env from './env';

// Fully typed — no more `process.env.PORT as unknown as number`
const server = createServer({
  port: env.PORT,           // number
  host: env.HOST,           // string
  databaseUrl: env.DATABASE_URL,  // string (URL-validated)
});

if (env.NODE_ENV === 'development') {
  // TypeScript knows the exact enum values!
  console.log('Development mode:', env.DEBUG);
}
```

That's it. Your environment is validated, typed, and safe.

---

## 📦 Installation

### npm

```bash
npm install ultraenv
```

### pnpm

```bash
pnpm add ultraenv
```

### yarn

```bash
yarn add ultraenv
```

### bun

```bash
bun add ultraenv
```

### Global CLI (optional)

```bash
npm install -g ultraenv

# Then use the CLI anywhere
ultraenv init
ultraenv validate
ultraenv scan
```

### Verify Installation

```bash
npx ultraenv --version
# → ultraenv v1.0.0
```

---

## 🔧 CLI Command Reference

ultraenv ships with a powerful CLI for managing your environment files from the terminal.

### Core Commands

| Command | Description |
|---|---|
| `ultraenv init` | Initialize project with config, `.env`, `.env.example`, and `.gitignore` |
| `ultraenv validate` | Load and validate environment variables |
| `ultraenv typegen` | Generate TypeScript types from schema |
| `ultraenv sync` | Sync `.env.example` with `.env` (check, generate, interactive, watch modes) |
| `ultraenv scan` | Scan codebase for leaked secrets |
| `ultraenv debug` | Show diagnostics and debugging info |
| `ultraenv protect` | Check and update `.gitignore` for secret protection |
| `ultraenv doctor` | Run self-checks and diagnose common issues |
| `ultraenv help` | Show help for any command |

### Vault Commands

| Command | Description |
|---|---|
| `ultraenv vault init` | Initialize encrypted vault |
| `ultraenv vault encrypt` | Encrypt environment to vault |
| `ultraenv vault decrypt` | Decrypt environment from vault |
| `ultraenv vault rekey` | Rotate encryption keys |
| `ultraenv vault status` | Show vault status |
| `ultraenv vault diff` | Compare local env vs vault |
| `ultraenv vault verify` | Verify vault integrity |

### Environment Commands

| Command | Description |
|---|---|
| `ultraenv envs list` | List all environments |
| `ultraenv envs compare` | Compare two environments |
| `ultraenv envs validate` | Validate all environments |
| `ultraenv envs create` | Create a new environment |
| `ultraenv envs switch` | Switch active environment |

### CI Commands

| Command | Description |
|---|---|
| `ultraenv ci validate` | Validate environment in CI (strict mode) |
| `ultraenv ci check-sync` | Check `.env` ↔ `.env.example` sync |
| `ultraenv ci scan` | Scan for secrets (SARIF output) |
| `ultraenv ci setup` | Generate CI config files |

### Utility Commands

| Command | Description |
|---|---|
| `ultraenv install-hook` | Install git pre-commit hook |
| `ultraenv completion` | Generate shell completions |

### Global Flags

| Flag | Description |
|---|---|
| `--config <path>` | Path to config file |
| `--cwd <path>` | Working directory |
| `--format <fmt>` | Output format: `terminal`, `json`, `silent` |
| `--debug` | Enable debug output |
| `--no-color` | Disable color output |
| `-q`, `--quiet` | Suppress non-error output |
| `-v`, `--version` | Show version |
| `-h`, `--help` | Show help |

### Examples

```bash
# Initialize a new project
ultraenv init

# Validate current environment
ultraenv validate --format json

# Generate TypeScript types
ultraenv typegen --format declaration --out src/env.d.ts

# Scan for secrets (terminal output)
ultraenv scan --scope files

# Scan for secrets (SARIF for GitHub)
ultraenv scan --scope all --format sarif --output results.sarif

# Sync .env.example
ultraenv sync --mode generate
ultraenv sync --mode watch

# Vault operations
ultraenv vault init --env production
ultraenv vault encrypt --env production
ultraenv vault decrypt --env production

# Setup CI pipeline
ultraenv ci setup --platform github

# Install pre-commit hook
ultraenv install-hook
```

---

## 📐 Schema Reference

The schema engine is the heart of ultraenv. It provides **30+ validators** and **10+ modifiers** for comprehensive environment variable validation with full TypeScript inference.

### The `t` Factory

All schema builders are created via the `t` factory object:

```typescript
import { defineEnv, t } from 'ultraenv';
```

---

### Core Validators

#### `t.string()` — String Validation

```typescript
// Basic string
API_KEY: t.string().required(),

// With format validation
WEBSITE_URL: t.string().format('url').required(),
ADMIN_EMAIL: t.string().format('email').optional(),
APP_ID: t.string().format('uuid').required(),

// Length constraints
USERNAME: t.string().minLength(3).maxLength(50).required(),

// Regex pattern
SLUG: t.string().pattern(/^[a-z0-9-]+$/).required(),

// Enum shorthand
LOG_LEVEL: t.string().enum(['debug', 'info', 'warn', 'error'] as const).default('info'),

// Auto-trim whitespace
TRIMMED_VALUE: t.string().trim().required(),
```

| Method | Parameter | Description |
|---|---|---|
| `.required()` | — | Field must be set |
| `.optional()` | — | Field may be undefined |
| `.default(value)` | `string` | Default when not set |
| `.description(desc)` | `string` | JSDoc description |
| `.minLength(n)` | `number` | Minimum string length |
| `.maxLength(n)` | `number` | Maximum string length |
| `.pattern(regex)` | `RegExp` | Must match regex |
| `.format(fmt)` | `string` | Predefined format shortcut |
| `.enum(values)` | `readonly string[]` | Allowed values |
| `.trim()` | `boolean?` | Trim whitespace |
| `.transform(fn)` | `(v) => v` | Transform after parse |
| `.validate(fn)` | `(v) => string \| void` | Custom validation |
| `.deprecated(msg)` | `string` | Deprecation warning |
| `.secret()` | — | Mark as secret (masked in output) |
| `.alias(name)` | `string` | Alternative variable name |
```

#### `t.number()` — Number Validation

```typescript
// Basic number (parses from string)
PORT: t.number().required(),

// Port validation (1-65535)
PORT: t.number().port().default(3000),

// Range constraints
MIN_AGE: t.number().min(0).max(150).required(),

// Integer constraint
PAGE_SIZE: t.number().integer().min(1).max(100).default(20),

// Positive / negative / non-negative
BALANCE: t.number().nonNegative().default(0),
DISCOUNT: t.number().negative().optional(),

// Finite check (no NaN or Infinity)
RATIO: t.number().finite().positive().required(),

// Custom parser
HEX_PORT: t.number().parse(v => parseInt(v, 16)).default(0x1F90),
```

| Method | Parameter | Description |
|---|---|---|
| `.min(n)` | `number` | Minimum value |
| `.max(n)` | `number` | Maximum value |
| `.integer()` | — | Must be integer |
| `.positive()` | — | Must be > 0 |
| `.negative()` | — | Must be < 0 |
| `.nonNegative()` | — | Must be >= 0 |
| `.finite()` | — | No NaN / Infinity |
| `.port()` | — | Valid port (1–65535) |
| `.parse(fn)` | `(raw) => number` | Custom parser |

---

#### `t.boolean()` — Boolean Validation

```typescript
DEBUG: t.boolean().default(false),
ENABLE_CACHE: t.boolean().required(),

// Custom truthy/falsy values
FEATURE_FLAG: t.boolean()
  .truthy(['on', 'enabled', '1', 'yes'])
  .falsy(['off', 'disabled', '0', 'no'])
  .default(false),
```

Default truthy: `'true'`, `'1'`, `'yes'`, `'on'`, `'TRUE'`, `'True'`, `'YES'`, `'ON'`

Default falsy: `'false'`, `'0'`, `'no'`, `'off'`, `'FALSE'`, `'False'`, `'NO'`, `'OFF'`, `''`

---

#### `t.enum()` — Enum / Literal Union

```typescript
// TypeScript literal union inference
NODE_ENV: t.enum(['development', 'staging', 'production'] as const).required(),
// Type: 'development' | 'staging' | 'production'

LOG_LEVEL: t.enum(['debug', 'info', 'warn', 'error', 'fatal'] as const)
  .caseInsensitive()
  .default('info'),

COLOR_SCHEME: t.enum(['light', 'dark', 'system'] as const).optional(),
```

| Method | Parameter | Description |
|---|---|---|
| `.caseInsensitive()` | `boolean?` | Case-insensitive matching |

---

### Advanced Validators

#### `t.url()` — URL Validation

```typescript
PUBLIC_URL: t.url().required(),
API_ENDPOINT: t.url({ protocols: ['https'] }).required(),
REDIRECT_URL: t.url({ allowRelative: true }).optional(),
```

Options: `protocols`, `allowRelative`, `allowQuery`, `requireTld`

---

#### `t.email()` — Email Validation

```typescript
ADMIN_EMAIL: t.email().required(),
CONTACT: t.email({ allowDisplayName: true }).optional(),
```

---

#### `t.ip()` — IP Address Validation

```typescript
SERVER_IP: t.ip().required(),             // IPv4 or IPv6
BIND_ADDRESS: t.ipv4().required(),        // IPv4 only
LISTEN_IPV6: t.ipv6().optional(),         // IPv6 only
```

---

#### `t.hostname()` — Hostname Validation

```typescript
SERVER_HOST: t.hostname().default('localhost'),
ALLOWED_HOST: t.hostname({ allowWildcard: true }).required(),
```

---

#### `t.port()` — Port Validation

```typescript
PORT: t.port().default(3000),
REDIS_PORT: t.port().default(6379),
```

Validates 1–65535 range.

---

#### `t.uuid()` — UUID Validation

```typescript
REQUEST_ID: t.uuid().required(),
SESSION_ID: t.uuid({ version: 4 }).required(),
```

Supports versions: 1, 3, 4, 5, or `null` for any.

---

#### `t.array()` — Array (Delimited String)

```typescript
ALLOWED_ORIGINS: t.array().required(),                    // comma-separated
TAGS: t.array().separator(';').required(),                // semicolon-separated
FEATURES: t.array().trimItems().filterEmpty().required(), // clean items
ROLES: t.array().minItems(1).maxItems(10).unique().required(),
```

| Method | Parameter | Description |
|---|---|---|
| `.separator(sep)` | `string` | Split character (default: `,`) |
| `.trimItems()` | `boolean?` | Trim whitespace from items |
| `.filterEmpty()` | `boolean?` | Remove empty strings |
| `.minItems(n)` | `number` | Minimum items |
| `.maxItems(n)` | `number` | Maximum items |
| `.unique()` | — | Deduplicate items |

---

#### `t.json()` — JSON Parsing

```typescript
FEATURE_FLAGS: t.json().required(),                          // unknown
APP_CONFIG: t.json<{ theme: string; lang: string }>().required(),
MIDDLEWARE_CONFIG: t.json().reviver((key, value) => value).optional(),
```

---

#### `t.date()` — Date Validation

```typescript
START_DATE: t.date().required(),
EXPIRY: t.date().min(new Date('2024-01-01')).optional(),
CREATED: t.date().format('YYYY-MM-DD').required(),
```

---

#### `t.bigint()` — BigInt Validation

```typescript
MAX_SAFE_INTEGER: t.bigint().required(),
SATOSHIS: t.bigint().min(0n).parse(v => BigInt(v)).required(),
```

---

#### `t.regex()` — Regex Validation

```typescript
PATTERN: t.regex().required(),
ROUTE_MATCHER: t.regex({ flags: 'i' }).optional(),
```

---

### String Format Validators

#### `t.hex()` — Hexadecimal String

```typescript
COLOR: t.hex().required(),
API_KEY_HEX: t.hex({ minLength: 32, maxLength: 64 }).required(),
```

---

#### `t.base64()` — Base64 String

```typescript
ENCODED_DATA: t.base64().required(),
CERT_B64: t.base64({ paddingRequired: true }).required(),
```

---

#### `t.semver()` — Semantic Version

```typescript
APP_VERSION: t.semver().required(),
MIN_VERSION: t.semver({ loose: true }).optional(),
```

---

#### `t.cron()` — Cron Expression

```typescript
SCHEDULE: t.cron().required(),
BACKUP_CRON: t.cron({ allowSeconds: true }).default('0 2 * * *'),
```

---

#### `t.duration()` — Duration String

```typescript
TIMEOUT: t.duration().default('30s'),
CACHE_TTL: t.duration().default('1h'),
LEASE_TIME: t.duration().default('24h'),
GRACE_PERIOD: t.duration().default('500ms'),
```

Supported units: `ms`, `s`, `m`, `h`, `d`, `w`

---

#### `t.bytes()` — Bytes String

```typescript
MAX_UPLOAD: t.bytes().default('10MB'),
MEMORY_LIMIT: t.bytes().default('512MB'),
DISK_QUOTA: t.bytes().default('1GB'),
```

Supported units: `B`, `KB`, `MB`, `GB`, `TB`, `PB`

---

#### `t.color()` — Color String

```typescript
BRAND_COLOR: t.color().required(),
ACCENT: t.color({ formats: ['hex', 'rgb'] }).default('#0ea5e9'),
```

---

#### `t.locale()` — Locale Code

```typescript
DEFAULT_LOCALE: t.locale().default('en-US'),
SUPPORTED_LOCALES: t.locale().required(),
```

---

#### `t.timezone()` — IANA Timezone

```typescript
TZ: t.timezone().default('UTC'),
USER_TIMEZONE: t.timezone().required(),
```

Validates against the full IANA timezone database.

---

#### `t.country()` — ISO Country Code

```typescript
COUNTRY: t.country().required(),           // ISO 3166-1 alpha-2
REGION: t.country({ format: 'alpha-3' }).optional(),  // ISO 3166-1 alpha-3
```

---

#### `t.currency()` — ISO Currency Code

```typescript
CURRENCY: t.currency().required(),
```

---

#### `t.path()` — File System Path

```typescript
CONFIG_PATH: t.path().required(),
OUTPUT_DIR: t.path({ mustExist: false }).optional(),
LOG_FILE: t.path({ mustExist: false, resolve: true }).default('/var/log/app.log'),
```

---

### Schema Modifiers

All validators support these common modifiers:

#### `.required()` / `.optional()`

```typescript
REQUIRED_VAR: t.string().required(),    // throws if missing
OPTIONAL_VAR: t.string().optional(),    // value is string | undefined
```

#### `.default(value)`

```typescript
PORT: t.number().default(3000),
HOST: t.string().default('localhost'),
ENABLED: t.boolean().default(false),
```

#### `.description(desc)`

```typescript
DATABASE_URL: t.string()
  .format('url')
  .description('Primary PostgreSQL connection string')
  .required(),
```

Generates JSDoc comments in type generation and descriptions in `.env.example`.

#### `.transform(fn)`

```typescript
PORT: t.number()
  .transform(v => Math.floor(v))
  .default(3000),

URL: t.string()
  .transform(v => v.replace(/\/$/, ''))
  .required(),
```

#### `.validate(fn)`

```typescript
PASSWORD: t.string()
  .minLength(12)
  .validate(v => {
    if (!/[A-Z]/.test(v)) return 'Must contain an uppercase letter';
    if (!/[0-9]/.test(v)) return 'Must contain a number';
    return undefined; // passes validation
  })
  .required(),
```

#### `.deprecated(msg)`

```typescript
OLD_API_KEY: t.string()
  .deprecated('Use NEW_API_KEY instead — will be removed in v2.0')
  .optional(),
```

#### `.secret()`

```typescript
DATABASE_PASSWORD: t.string().secret().required(),
```

Secret values are masked in logs, scan results, and CLI output.

#### `.alias(name)`

```typescript
DB_URL: t.string()
  .alias('DATABASE_URL')
  .format('url')
  .required(),
```

Allows the variable to be referenced by an alternative name.

#### `.conditional(config)`

```typescript
STRIPE_KEY: t.string()
  .conditional({
    check: (env) => env.PAYMENT_PROVIDER === 'stripe',
    then: (schema) => schema.required(),
    otherwise: (schema) => schema.optional(),
  }),
```

Apply different requirements based on other env values.

---

### Complete Schema Example

Here's a comprehensive real-world schema:

```typescript
import { defineEnv, t } from 'ultraenv';

const env = defineEnv({
  // ── Application ──────────────────────────────────
  NODE_ENV: t.enum(['development', 'staging', 'production'] as const)
    .description('Application environment')
    .default('development'),

  APP_NAME: t.string()
    .minLength(1)
    .maxLength(100)
    .description('Application name')
    .required(),

  APP_URL: t.url()
    .description('Canonical application URL')
    .required(),

  // ── Server ───────────────────────────────────────
  PORT: t.number()
    .port()
    .description('Server listening port')
    .default(3000),

  HOST: t.string()
    .hostname()
    .description('Server bind address')
    .default('localhost'),

  // ── Database ─────────────────────────────────────
  DATABASE_URL: t.string()
    .format('url')
    .description('PostgreSQL connection string')
    .secret()
    .required(),

  DATABASE_POOL_SIZE: t.number()
    .integer()
    .min(1)
    .max(100)
    .default(10),

  // ── Authentication ───────────────────────────────
  JWT_SECRET: t.string()
    .minLength(32)
    .description('JWT signing secret')
    .secret()
    .required(),

  JWT_EXPIRY: t.duration()
    .description('JWT token expiry duration')
    .default('15m'),

  REFRESH_TOKEN_EXPIRY: t.duration()
    .description('Refresh token expiry duration')
    .default('7d'),

  // ── Redis ────────────────────────────────────────
  REDIS_URL: t.string()
    .format('url')
    .optional()
    .description('Redis connection URL'),

  REDIS_TTL: t.duration()
    .default('1h')
    .description('Default Redis key TTL'),

  // ── Email ────────────────────────────────────────
  SMTP_HOST: t.string()
    .hostname()
    .optional(),

  SMTP_PORT: t.number()
    .port()
    .default(587),

  SMTP_USER: t.email()
    .optional(),

  SMTP_PASSWORD: t.string()
    .secret()
    .optional(),

  // ── File Uploads ─────────────────────────────────
  MAX_UPLOAD_SIZE: t.bytes()
    .default('10MB')
    .description('Maximum file upload size'),

  UPLOAD_DIR: t.path({ mustExist: false })
    .default('./uploads'),

  // ── External APIs ────────────────────────────────
  STRIPE_SECRET_KEY: t.string()
    .secret()
    .optional()
    .deprecated('Use STRIPE_API_KEY instead'),

  STRIPE_API_KEY: t.string()
    .secret()
    .optional(),

  STRIPE_WEBHOOK_SECRET: t.string()
    .secret()
    .optional(),

  // ── Internationalization ─────────────────────────
  DEFAULT_LOCALE: t.locale()
    .default('en-US'),

  DEFAULT_TIMEZONE: t.timezone()
    .default('UTC'),

  // ── Feature Flags ────────────────────────────────
  ENABLE_ANALYTICS: t.boolean()
    .default(false),

  ENABLE_RATE_LIMITING: t.boolean()
    .default(true),

  RATE_LIMIT_MAX: t.number()
    .positive()
    .default(100),

  // ── Logging ──────────────────────────────────────
  LOG_LEVEL: t.enum(['debug', 'info', 'warn', 'error', 'fatal'] as const)
    .default('info'),

  LOG_FORMAT: t.enum(['json', 'text', 'pretty'] as const)
    .default('json'),

  // ── CORS ─────────────────────────────────────────
  ALLOWED_ORIGINS: t.array()
    .separator(';')
    .trimItems()
    .default(['http://localhost:3000']),

  // ── Health & Monitoring ──────────────────────────
  HEALTH_CHECK_PATH: t.string()
    .default('/health'),

  SENTRY_DSN: t.url({ allowRelative: false })
    .optional(),

  // ── Cron Jobs ────────────────────────────────────
  CLEANUP_CRON: t.cron()
    .default('0 3 * * *')
    .description('Daily cleanup schedule (3 AM)'),
});

export default env;

// All values are fully typed:
// env.DATABASE_URL   → string
// env.PORT           → number
// env.NODE_ENV       → 'development' | 'staging' | 'production'
// env.MAX_UPLOAD_SIZE → string
// env.JWT_EXPIRY     → string
// env.ALLOWED_ORIGINS → readonly string[]
// env.STRIPE_API_KEY → string | undefined
```

---

## 🔐 Encryption & Vault

ultraenv includes a built-in encrypted vault for securely managing secrets across environments.

### Quick Setup

```bash
# 1. Initialize the vault
ultraenv vault init --env production

# 2. Encrypt your environment
ultraenv vault encrypt --env production

# 3. Commit the vault (safe — it's encrypted!)
git add .env.vault
git commit -m "Add encrypted production vault"

# 4. Team members decrypt with the key
ultraenv vault decrypt --env production
```

### Programmatic API

```typescript
import {
  encryptValue,
  decryptValue,
  isEncryptedValue,
  generateMasterKey,
  formatKey,
} from 'ultraenv';

// Generate a new master key
const key = generateMasterKey();          // Buffer (32 bytes)
const keyFormatted = formatKey(key);       // "ultraenv_key_v1_..."

// Encrypt a single value
const encrypted = await encryptValue(
  'my-super-secret-password',
  key,
);
// → "encrypted:v1:aes-256-gcm:...base64..."

// Check if a value is encrypted
isEncryptedValue(encrypted);  // true

// Decrypt
const decrypted = await decryptValue(encrypted, key);
// → "my-super-secret-password"
```

### Vault Workflow

```bash
# Full workflow
ultraenv vault init --env development
ultraenv vault init --env staging
ultraenv vault init --env production

ultraenv vault encrypt --env production

# Check status
ultraenv vault status

# Compare local vs vault
ultraenv vault diff

# Verify integrity
ultraenv vault verify

# Rotate keys (re-encrypt with new key)
ultraenv vault rekey --env production
```

### Vault Files

| File | Description | Git |
|---|---|---|
| `.env.vault` | Encrypted secrets (safe to commit) | ✅ Commit |
| `.env.keys` | Decryption keys (NEVER commit) | ❌ Gitignore |

### Encryption Details

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key derivation**: HKDF with random salt
- **IV**: 12-byte random nonce per value
- **Auth tag**: 16-byte GCM authentication tag
- **Key format**: `ultraenv_key_v1_<base64>` (32-byte / 256-bit key)

> 📖 See [docs/VAULT_GUIDE.md](docs/VAULT_GUIDE.md) for the complete vault documentation.

---

## 🔍 Secret Scanning

ultraenv includes a powerful secret scanner that detects **55+ patterns** for leaked credentials, API keys, tokens, and secrets in your codebase.

### Quick Scan

```bash
# Scan current directory
ultraenv scan

# Scan specific paths
ultraenv scan src/ config/

# Scan git history (thorough)
ultraenv scan --scope git-history

# Scan staged files (pre-commit)
ultraenv scan --scope staged

# Scan diff against main
ultraenv scan --scope diff --from main

# Scan everything
ultraenv scan --scope all
```

### Output Formats

```bash
# Terminal (default — human-readable)
ultraenv scan --format terminal

# JSON (for integrations)
ultraenv scan --format json

# SARIF (for GitHub Code Scanning)
ultraenv scan --format sarif --output results.sarif
```

### Detected Secret Categories

| Category | Patterns | Examples |
|---|---|---|
| **AWS** | 4 | Access Key ID, Secret Key, Session Token, Account ID |
| **GitHub** | 6 | PAT, OAuth Token, App Token, Refresh Token, Webhook Secret |
| **Google** | 5 | API Key, OAuth Client ID/Secret, Firebase Key, Service Account |
| **Stripe** | 3 | Secret Key, Publishable Key, Restricted Key |
| **Slack** | 4 | Bot Token, User Token, App Token, Webhook URL |
| **Private Keys** | 8 | RSA, EC, DSA, OpenSSH, PGP, PKCS#8, Encrypted, Certificate |
| **Database** | 5 | MongoDB, PostgreSQL, MySQL, Redis, CouchDB URLs |
| **Cloud** | 4 | Azure, DigitalOcean, Heroku, Cloudflare |
| **Auth** | 4 | JWT, Base64 Creds, Auth0, Generic Secret |
| **Messaging** | 2 | Telegram Bot, Discord Bot |
| **Email** | 2 | SendGrid, Mailgun |
| **DevOps** | 2 | PagerDuty, Datadog |
| **Generic** | 5+ | API Key, Token, Password, High-Entropy Strings |
| **.env** | 1 | Secret-like variable patterns |

### Programmatic API

```typescript
import { scan, formatScanResult, addCustomPattern } from 'ultraenv';

// Add a custom pattern
addCustomPattern({
  id: 'my-company-api-key',
  name: 'My Company API Key',
  pattern: /MCKEY_[A-Za-z0-9]{32}/g,
  confidence: 0.9,
  severity: 'critical',
  description: 'Company-specific API key',
  remediation: 'Rotate the key and store in a vault.',
  category: 'internal',
});

// Run a scan
const result = await scan({
  cwd: '/path/to/project',
  include: ['src/', 'config/'],
  exclude: ['**/*.test.ts', '**/node_modules/**'],
  scanGitHistory: false,
});

if (result.found) {
  console.log(`Found ${result.secrets.length} potential secrets!`);
  for (const secret of result.secrets) {
    console.log(`  ${secret.type} in ${secret.file}:${secret.line}`);
    console.log(`  Confidence: ${(secret.confidence * 100).toFixed(0)}%`);
    console.log(`  Remediation: ${secret.pattern.remediation}`);
  }
}
```

### Git Hook Integration

```bash
# Install pre-commit hook
ultraenv install-hook

# This runs `ultraenv scan --scope staged` before every commit
# Commits with detected secrets will be blocked
```

> 📖 See [docs/SECRET_SCANNING.md](docs/SECRET_SCANNING.md) for the complete scanning documentation.

---

## 📝 TypeScript Type Generation

ultraenv can automatically generate TypeScript type definitions from your schema.

### Declaration File (`.d.ts`)

```bash
ultraenv typegen --format declaration --out src/env.d.ts
```

Generates:

```typescript
// Auto-generated by ultraenv — DO NOT EDIT
declare namespace NodeJS {
  interface ProcessEnv {
    /** Application environment */
    NODE_ENV: 'development' | 'staging' | 'production';

    /** Primary PostgreSQL connection string */
    DATABASE_URL: string;

    /** Server listening port */
    PORT: number;

    /** Application URL */
    APP_URL: string;

    /** JWT signing secret */
    JWT_SECRET: string;

    /** Optional admin email */
    ADMIN_EMAIL?: string;

    // ... all your env vars with types and JSDoc
  }
}
```

### TypeScript Module

```bash
ultraenv typegen --format module --out src/env.ts
```

Generates a typed module with runtime values:

```typescript
// Auto-generated by ultraenv — DO NOT EDIT
export interface Env {
  /** Application environment */
  readonly NODE_ENV: 'development' | 'staging' | 'production';
  /** Primary PostgreSQL connection string */
  readonly DATABASE_URL: string;
  // ...
}

export const env: Env = {
  NODE_ENV: process.env.NODE_ENV as Env['NODE_ENV'],
  DATABASE_URL: process.env.DATABASE_URL as string,
  // ...
};

export default env;
```

### JSON Schema

```bash
ultraenv typegen --format json-schema --out env.schema.json
```

Generates a standard JSON Schema for tool integrations.

### Watch Mode

```bash
ultraenv typegen --format declaration --out src/env.d.ts --watch
```

Automatically regenerates types when your `.env` or config changes.

### Programmatic API

```typescript
import {
  generateDeclaration,
  generateModule,
  generateJsonSchema,
} from 'ultraenv';

// Generate declaration content
const dts = generateDeclaration(envVars, schema, {
  interfaceName: 'Env',
  jsdoc: true,
  indent: 4,
});

// Generate module content
const moduleContent = generateModule(schema, {
  interfaceName: 'Env',
  jsdoc: true,
  indent: 2,
});

// Generate JSON Schema
const jsonSchema = generateJsonSchema(schema, {
  includeDescriptions: true,
  indent: 2,
});
```

> 📖 See [docs/TYPE_GENERATION.md](docs/TYPE_GENERATION.md) for the complete type generation documentation.

---

## 🔄 .env.example Sync

Never let your `.env.example` drift out of sync with your `.env` file again.

### Check Sync

```bash
ultraenv sync --mode check
```

Output:

```
🔄 .env Sync Check

  ✅ 12 variables match
  ⚠️  2 variables missing from .env.example:
      - STRIPE_API_KEY
      - REDIS_URL
  ℹ️  1 variable in .env.example but not in .env:
      - OLD_FEATURE_FLAG

  ACTION NEEDED
  Your .env is out of sync with .env.example.
  Run "ultraenv sync --mode generate" to update .env.example
```

### Generate

```bash
ultraenv sync --mode generate
```

Auto-generates `.env.example` with types, defaults, and descriptions.

### Interactive Mode

```bash
ultraenv sync --mode interactive
```

Shows differences and lets you review before updating.

### Watch Mode

```bash
ultraenv sync --mode watch
```

Watches `.env` for changes and auto-updates `.env.example`.

---

## 🌍 Multi-Environment Management

ultraenv supports **11 `.env` file variants** with proper priority cascading.

### Supported Files (Lowest → Highest Priority)

| File | Use Case |
|---|---|
| `.env` | Default, shared across all environments |
| `.env.local` | Local overrides (gitignored) |
| `.env.development` | Development-specific |
| `.env.development.local` | Local dev overrides (gitignored) |
| `.env.test` | Test-specific |
| `.env.test.local` | Local test overrides (gitignored) |
| `.env.production` | Production-specific |
| `.env.production.local` | Local prod overrides (gitignored) |
| `.env.staging` | Staging-specific |
| `.env.staging.local` | Local staging overrides (gitignored) |
| `.env.ci` | CI/CD-specific |

### Cascade Order

Variables are merged in priority order — **higher-priority files override lower**:

```
.env → .env.local → .env.development → .env.development.local → .env.production → ...
```

### CLI Commands

```bash
# List all environments
ultraenv envs list

# Compare two environments
ultraenv envs compare development production

# Validate all environments
ultraenv envs validate

# Create a new environment
ultraenv envs create staging

# Switch active environment
ultraenv envs switch production
```

---

## 🧩 Framework Presets

ultraenv ships with **9 built-in framework presets** that provide ready-made schemas, file loading order, and framework-specific validation.

### Available Presets

| Preset | ID | Tags |
|---|---|---|
| **Next.js** | `nextjs` | `framework`, `react`, `ssr`, `fullstack` |
| **Vite** | `vite` | `framework`, `build-tool` |
| **Nuxt** | `nuxt` | `framework`, `vue`, `ssr` |
| **Remix** | `remix` | `framework`, `react`, `ssr` |
| **SvelteKit** | `sveltekit` | `framework`, `svelte`, `ssr` |
| **Express** | `express` | `backend`, `server` |
| **Fastify** | `fastify` | `backend`, `server` |
| **Docker** | `docker` | `container`, `devops` |
| **AWS Lambda** | `aws-lambda` | `serverless`, `cloud` |

### Using Presets

```typescript
import { defineEnv, t, getPreset } from 'ultraenv';

// Get the Next.js preset schema
const nextjsPreset = getPreset('nextjs');

// Use it directly
const env = defineEnv(nextjsPreset.schema);

// Or extend it with your own variables
const env = defineEnv({
  ...nextjsPreset.schema,

  // Your custom variables
  CUSTOM_FEATURE: t.boolean().default(false),
  ANALYTICS_KEY: t.string().secret().optional(),
});
```

### Next.js Preset Features

The Next.js preset includes:

- **Client/server variable separation** — warns if secrets are in `NEXT_PUBLIC_*` vars
- **Common Next.js variables** — `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXT_TELEMETRY_DISABLED`, etc.
- **Image optimization** — `NEXT_PUBLIC_IMAGE_DOMAINS`, `NEXT_PUBLIC_IMAGE_REMOTE_PATTERNS`
- **Proper file loading order** — `.env`, `.env.local`, `.env.development`, `.env.production`

### Client Leak Detection

```typescript
import { detectClientLeakCandidates } from 'ultraenv';

const warnings = detectClientLeakCandidates(process.env);
// → ['NEXT_PUBLIC_SECRET_KEY: appears to be a secret exposed to the client bundle']
```

> 📖 See [docs/FRAMEWORK_PRESETS.md](docs/FRAMEWORK_PRESETS.md) for complete preset documentation.

---

## 🔄 CI/CD Integration

### GitHub Actions Setup

```bash
ultraenv ci setup --platform github
```

Generates `.github/workflows/ultraenv.yml`:

```yaml
name: Ultraenv CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install ultraenv
        run: npm install -g ultraenv

      - name: Validate environment
        run: ultraenv ci validate --strict

      - name: Check .env sync
        run: ultraenv ci check-sync

      - name: Scan for secrets
        run: ultraenv ci scan --format sarif --output results.sarif
        continue-on-error: true

      - name: Upload SARIF results
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
        continue-on-error: true
```

### GitLab CI Setup

```bash
ultraenv ci setup --platform gitlab
```

### CI Commands

```bash
# Validate in strict mode (fails on warnings)
ultraenv ci validate --strict

# Check .env ↔ .env.example sync
ultraenv ci check-sync

# Scan for secrets with SARIF output
ultraenv ci scan --format sarif --output results.sarif
```

### GitHub Code Scanning Integration

The SARIF output integrates directly with [GitHub Code Scanning](https://docs.github.com/en/code-security/code-scanning):

```yaml
- name: Scan for secrets
  run: ultraenv ci scan --format sarif --output results.sarif

- name: Upload SARIF results
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: results.sarif
```

> 📖 See [docs/CI_CD_INTEGRATION.md](docs/CI_CD_INTEGRATION.md) for the complete CI/CD documentation.

---

## 📚 Programmatic API Reference

### Core Loading

```typescript
import { load, loadSync, loadWithResult } from 'ultraenv';

// Simple load (dotenv-compatible)
load();
// Reads .env, sets process.env

// With options
load({
  envDir: './config',
  expandVariables: true,
  overrideProcessEnv: true,
  mergeStrategy: 'last-wins',
});

// Full result
const result = loadWithResult();
result.env        // Record<string, string>
result.metadata   // { totalVars, filesParsed, loadTimeMs, ... }
result.parsed     // ParsedEnvFile[]
```

### Schema Validation

```typescript
import { defineEnv, tryDefineEnv, validate, t } from 'ultraenv';

// Strict: throws on validation failure
const env = defineEnv({
  PORT: t.number().port().default(3000),
  NODE_ENV: t.enum(['development', 'production'] as const).required(),
});

// Non-throwing variant
const result = tryDefineEnv({
  PORT: t.number().port().default(3000),
  NODE_ENV: t.enum(['development', 'production'] as const).required(),
});

if (result.valid) {
  console.log(result.values);    // typed values
} else {
  console.log(result.errors);    // validation errors
  console.log(result.unknown);   // unknown variables
}
```

### Watching for Changes

```typescript
import { createWatcher } from 'ultraenv';

const watcher = createWatcher({
  files: ['.env', '.env.local'],
  recursive: false,
  debounceMs: 100,
  initial: true,
});

watcher.on('change', (event) => {
  console.log(`File ${event.path} was ${event.type}`);
  // Reload your environment here
});

watcher.start();

// Later...
watcher.stop();
```

### Health Checks

```typescript
import {
  healthCheck,
  liveCheck,
  readinessCheck,
} from 'ultraenv';

// Full health check (safe to expose via HTTP)
const health = healthCheck();
// → { status: 'ok', loaded: 42, valid: 42, environment: 'production', ... }

// Liveness probe (minimal)
const live = liveCheck();
// → { status: 'ok', timestamp: '...' }

// Readiness probe (checks specific vars)
const ready = readinessCheck(['DATABASE_URL', 'REDIS_URL']);
// → { status: 'ok', ready: true, missing: [], timestamp: '...' }
```

### Express Middleware

```typescript
import express from 'express';
import { ultraenvMiddleware, healthCheckRoute } from 'ultraenv';

const app = express();

// Load and validate env
app.use(ultraenvMiddleware({
  schema: {
    PORT: { type: 'number', port: true, default: 3000 },
  },
}));

// Health check endpoint
app.get('/health', healthCheckRoute());

// readiness endpoint
app.get('/ready', readinessCheck(['DATABASE_URL']));
```

### Fastify Plugin

```typescript
import Fastify from 'fastify';
import { createUltraenvPlugin } from 'ultraenv/fastify';

const app = Fastify();

app.register(createUltraenvPlugin({
  schema: {
    DATABASE_URL: { type: 'string', format: 'url' },
  },
}));
```

### Error Handling

```typescript
import {
  UltraenvError,
  ValidationError,
  ParseError,
  EncryptionError,
  VaultError,
  ScanError,
  ConfigError,
  isUltraenvError,
} from 'ultraenv';

try {
  // ... ultraenv operations
} catch (error) {
  if (isUltraenvError(error)) {
    console.log(error.code);      // 'VALIDATION_ERROR'
    console.log(error.message);   // Human-readable message
    console.log(error.hint);      // Actionable fix suggestion
  }
}
```

### Vault API

```typescript
import {
  encryptEnvironment,
  decryptEnvironment,
  encryptValue,
  decryptValue,
  isEncryptedValue,
  generateMasterKey,
  deriveEnvironmentKey,
  formatKey,
  parseKey,
  generateKeysFile,
  parseKeysFile,
  rotateKey,
} from 'ultraenv';
```

### Scanner API

```typescript
import {
  scan,
  scanFiles,
  scanGitHistory,
  scanStagedFiles,
  scanDiff,
  matchPatterns,
  addCustomPattern,
  removeCustomPattern,
  resetPatterns,
  detectHighEntropyStrings,
  formatScanResult,
} from 'ultraenv';
```

### Sync API

```typescript
import {
  generateExampleFile,
  generateExampleContent,
  needsUpdate,
  compareSync,
  compareValues,
  createSyncWatcher,
} from 'ultraenv';
```

### Type Generation API

```typescript
import {
  generateDeclaration,
  generateModule,
  generateJsonSchema,
  createTypegenWatcher,
} from 'ultraenv';
```

### Environment Management API

```typescript
import {
  listEnvironments,
  validateAllEnvironments,
  switchEnvironment,
  getActiveEnvironment,
  discoverEnvironments,
  compareEnvironments,
  formatComparison,
  createEnvironment,
  removeEnvironment,
  duplicateEnvironment,
} from 'ultraenv';
```

### Parser API (Advanced)

```typescript
import {
  parseEnvFile,
  expandVariables,
  resolveCascade,
  mergeCascade,
} from 'ultraenv';

// Parse raw .env content
const parsed = parseEnvFile(content, filePath);
// → { path, vars: [{ key, value, raw, source, lineNumber, comment }], exists }

// Expand variable references
const expanded = expandVariables(env, env, { maxDepth: 10 });
```

> 📖 See [docs/API_REFERENCE.md](docs/API_REFERENCE.md) for the complete API documentation.

---

## 🔀 Migration from dotenv

ultraenv is a **drop-in replacement** for dotenv. Migration takes just minutes.

### Before (dotenv)

```typescript
// Load .env
import dotenv from 'dotenv';
dotenv.config();

// Use env vars (always strings!)
const port = parseInt(process.env.PORT || '3000', 10);
const dbUrl = process.env.DATABASE_URL!;
const debug = process.env.DEBUG === 'true';
```

### After (ultraenv)

```typescript
// Option 1: Simple drop-in replacement
import { load } from 'ultraenv';
load();  // That's it!

// Option 2: Full type safety
import { defineEnv, t } from 'ultraenv';

const env = defineEnv({
  PORT: t.number().port().default(3000),
  DATABASE_URL: t.string().format('url').required(),
  DEBUG: t.boolean().default(false),
});

// Now everything is typed!
const port = env.PORT;          // number
const dbUrl = env.DATABASE_URL; // string
const debug = env.DEBUG;        // boolean
```

### Migration Checklist

- [ ] Replace `import dotenv from 'dotenv'` with `import { load } from 'ultraenv'`
- [ ] Replace `dotenv.config()` with `load()`
- [ ] (Optional) Add a schema with `defineEnv()` for type safety
- [ ] (Optional) Replace all `process.env.X` references with typed `env.X`
- [ ] (Optional) Run `ultraenv scan` to find leaked secrets
- [ ] (Optional) Run `ultraenv sync` to generate `.env.example`
- [ ] (Optional) Set up `ultraenv ci setup` for CI/CD

> 📖 See [docs/MIGRATION_FROM_DOTENV.md](docs/MIGRATION_FROM_DOTENV.md) for the complete migration guide.

---

## ⚙️ Configuration Reference

### Config File Locations (searched in order)

1. `.ultraenvrc.json`
2. `.ultraenvrc.yaml`
3. `.ultraenvrc.yml`
4. `ultraenv.config.js`
5. `ultraenv.config.cjs`
6. `"ultraenv"` key in `package.json`

### Example Configuration

```json
{
  "envDir": ".",
  "files": [".env", ".env.local", ".env.production"],
  "encoding": "utf-8",
  "expandVariables": true,
  "overrideProcessEnv": false,
  "mergeStrategy": "last-wins",
  "prefixErrors": true,
  "silent": false,
  "outputFormat": "terminal",
  "debug": false,
  "maxValueLength": 1048576,
  "maxInterpolationDepth": 10,
  "schema": {
    "PORT": { "type": "number", "port": true, "default": 3000 },
    "DATABASE_URL": { "type": "string", "format": "url" }
  },
  "vault": {
    "vaultFile": ".env.vault",
    "keysFile": ".env.keys",
    "environment": "production",
    "autoGenerateKey": true
  },
  "scan": {
    "include": ["src/", "config/"],
    "exclude": ["**/*.test.ts", "node_modules/**"],
    "scanGitHistory": false,
    "maxFileSize": 1048576,
    "failFast": false
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|---|---|---|---|
| `envDir` | `string` | `'.'` | Directory containing `.env` files |
| `files` | `string[]` | `[]` | Specific `.env` files to load |
| `encoding` | `string` | `'utf-8'` | File encoding |
| `expandVariables` | `boolean` | `true` | Expand `$VAR` references |
| `overrideProcessEnv` | `boolean` | `false` | Override existing `process.env` values |
| `mergeStrategy` | `string` | `'last-wins'` | Merge strategy: `first-wins`, `last-wins`, `error-on-conflict` |
| `prefixErrors` | `boolean` | `true` | Prefix error messages with "ultraenv" |
| `silent` | `boolean` | `false` | Suppress all output |
| `outputFormat` | `string` | `'terminal'` | Output format: `terminal`, `json`, `silent` |
| `debug` | `boolean` | `false` | Enable debug logging |
| `maxValueLength` | `number` | `1048576` | Max value length in bytes (1 MB) |
| `maxInterpolationDepth` | `number` | `10` | Max variable expansion depth |

---

## ❓ FAQ

### General

**Q: Is ultraenv really zero dependencies?**

A: Yes! ultraenv has zero runtime dependencies. The entire library (parser, validator, scanner, vault, CLI, typegen) is built with Node.js built-in modules only. Dev dependencies (TypeScript, Vitest, ESLint, tsup) are only used during development.

**Q: Does it work with ESM and CommonJS?**

A: Yes! ultraenv ships dual CJS/ESM builds:
- `import { load } from 'ultraenv'` (ESM)
- `const { load } = require('ultraenv')` (CJS)

**Q: What Node.js versions are supported?**

A: Node.js >= 18.0.0. This aligns with the current Node.js LTS cycle.

### Schema & Validation

**Q: Can I use zod schemas with ultraenv?**

A: ultraenv has its own schema engine that's purpose-built for env vars. It's lighter and has env-specific validators (port, URL, duration, bytes, etc.) that zod doesn't provide out of the box. However, you can convert between them if needed.

**Q: What happens when validation fails?**

A: `defineEnv()` throws a detailed error with all validation failures. Use `tryDefineEnv()` for a non-throwing variant that returns `{ valid, errors, warnings, values }`.

**Q: Can I validate without throwing?**

A: Yes! Use `tryDefineEnv()`:

```typescript
const result = tryDefineEnv(schema);
if (!result.valid) {
  console.log(result.errors);
}
```

**Q: How do default values work?**

A: If a variable is not set in the environment, the default value is used. If no default is set and the variable is not optional, validation fails.

### Vault & Security

**Q: Is the vault safe to commit to git?**

A: Yes! The `.env.vault` file contains only AES-256-GCM encrypted data. Without the decryption key (stored in `.env.keys`, which is gitignored), the vault contents are unreadable.

**Q: What if I lose my encryption key?**

A: You cannot recover encrypted values without the key. This is by design. Use `ultraenv vault rekey` to rotate keys, and always store keys in a secure secrets manager (e.g., GitHub Secrets, AWS Secrets Manager, HashiCorp Vault).

**Q: How does key rotation work?**

A: `ultraenv vault rekey` generates a new key and re-encrypts all values in the vault. Update your `.env.keys` file and CI secrets with the new key.

### Secret Scanning

**Q: How accurate is the secret scanner?**

A: The scanner uses a combination of regex pattern matching (55+ patterns) and Shannon entropy analysis. Each pattern has a confidence score. High-confidence patterns (>0.9) are very accurate; lower-confidence patterns may have false positives.

**Q: Can I add custom patterns?**

A: Yes! Use `addCustomPattern()`:

```typescript
import { addCustomPattern } from 'ultraenv';
addCustomPattern({
  id: 'my-company-token',
  name: 'My Company Token',
  pattern: /MYCO_[A-Za-z0-9]{32}/g,
  confidence: 0.9,
  severity: 'critical',
  description: 'Company internal API token',
  remediation: 'Rotate and store in vault.',
  category: 'internal',
});
```

**Q: Can I suppress false positives?**

A: Add a comment `// ultraenv-ignore` or `# ultraenv-ignore` on the line before or on the same line as the detected secret.

### CI/CD

**Q: How do I use ultraenv in CI?**

A: Run `ultraenv ci setup --platform github` or `--platform gitlab` to generate CI config files. Or manually add the CI commands to your pipeline.

**Q: Does ultraenv scan integrate with GitHub Code Scanning?**

A: Yes! Use `ultraenv scan --format sarif --output results.sarif` and upload with the `github/codeql-action/upload-sarif` action.

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Start

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/ultraenv.git`
3. Install dependencies: `npm install`
4. Build: `npm run build`
5. Run tests: `npm test`
6. Run linter: `npm run lint`

### Development Scripts

| Script | Description |
|---|---|
| `npm run build` | Build the library |
| `npm run dev` | Build in watch mode |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run format` | Format with Prettier |
| `npm run typecheck` | TypeScript type checking |

---

## 📜 License

[MIT](LICENSE) © 2024 [Avinash Velu](https://github.com/Avinashvelu03)

---

## 🙏 Acknowledgments

- [dotenv](https://github.com/motdotla/dotenv) — Inspiration for the core `.env` parsing
- [envalid](https://github.com/af/envalid) — Inspiration for schema-based validation
- [@t3-oss/env](https://github.com/t3-oss/env-core) — Inspiration for TypeScript inference
- [gitleaks](https://github.com/gitleaks/gitleaks) — Inspiration for secret scanning patterns
- [trufflehog](https://github.com/trufflesecurity/trufflehog) — Inspiration for secret detection

---

## ⭐ Star History

If you find ultraenv useful, please consider giving it a star on [GitHub](https://github.com/Avinashvelu03/ultraenv). It helps the project grow and reach more developers!

<div align="center">

**Made with ❤️ by [Avinash Velu](https://github.com/Avinashvelu03)**

[Report Bug](https://github.com/Avinashvelu03/ultraenv/issues) · [Request Feature](https://github.com/Avinashvelu03/ultraenv/issues) · [Discussions](https://github.com/Avinashvelu03/ultraenv/discussions)

</div>
