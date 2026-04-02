# Migration from dotenv

Step-by-step guide to migrate from dotenv to ultraenv.

## Table of Contents

- [Overview](#overview)
- [Why Migrate?](#why-migrate)
- [Quick Migration (5 minutes)](#quick-migration-5-minutes)
- [Step-by-Step Migration](#step-by-step-migration)
- [dotenv API Compatibility](#dotenv-api-compatibility)
- [Advanced Migration](#advanced-migration)
- [Troubleshooting](#troubleshooting)

---

## Overview

ultraenv is a **drop-in replacement** for dotenv. Your existing `.env` files work without changes, and the basic API is compatible.

## Why Migrate?

| Feature | dotenv | ultraenv |
|---|---|---|
| Parse `.env` files | ✅ | ✅ |
| Type safety | ❌ | ✅ Full inference |
| Validation | ❌ | ✅ 30+ validators |
| Secret scanning | ❌ | ✅ 55+ patterns |
| Encryption | ❌ | ✅ AES-256-GCM |
| `.env.example` sync | ❌ | ✅ |
| TypeScript types | ❌ | ✅ Auto-generated |
| Zero dependencies | ✅ | ✅ |
| File cascade | ❌ | ✅ |
| Variable interpolation | ✅ | ✅ |

---

## Quick Migration (5 minutes)

### Step 1: Install

```bash
npm uninstall dotenv
npm install ultraenv
```

### Step 2: Replace Import

```diff
- import dotenv from 'dotenv';
- dotenv.config();
+ import { load } from 'ultraenv';
+ load();
```

### Step 3: Test

```bash
npm test
npm run build
```

That's it! Your app works exactly as before.

---

## Step-by-Step Migration

### Phase 1: Drop-In Replacement

#### Before (dotenv)

```typescript
import dotenv from 'dotenv';
dotenv.config();

const port = parseInt(process.env.PORT || '3000', 10);
const dbUrl = process.env.DATABASE_URL!;
const debug = process.env.DEBUG === 'true';
```

#### After (ultraenv)

```typescript
import { load } from 'ultraenv';
load();

const port = parseInt(process.env.PORT || '3000', 10);
const dbUrl = process.env.DATABASE_URL!;
const debug = process.env.DEBUG === 'true';
```

### Phase 2: Add Configuration Options

```typescript
// dotenv
dotenv.config({ path: './config/.env' });

// ultraenv
load({
  envDir: './config',
  expandVariables: true,
  overrideProcessEnv: false,
});
```

### Phase 3: Add Type Safety (Recommended)

#### Before

```typescript
const port = parseInt(process.env.PORT || '3000', 10); // 😬 manual parsing
const debug = process.env.DEBUG === 'true';             // 😬 manual boolean
const env = process.env.NODE_ENV || 'development';     // 😬 no autocomplete
```

#### After

```typescript
import { defineEnv, t } from 'ultraenv';

const env = defineEnv({
  PORT: t.number().port().default(3000),           // ✅ number type
  DEBUG: t.boolean().default(false),                // ✅ boolean type
  NODE_ENV: t.enum(['development', 'production'] as const).required(),  // ✅ literal union
});

const port = env.PORT;        // ✅ number (not string!)
const debug = env.DEBUG;      // ✅ boolean
const nodeEnv = env.NODE_ENV; // ✅ 'development' | 'production'
```

### Phase 4: Replace process.env References

Gradually replace `process.env.X` with typed `env.X`:

```diff
- const dbUrl = process.env.DATABASE_URL!;
- const port = parseInt(process.env.PORT || '3000', 10);
+ import env from './env';
+ const dbUrl = env.DATABASE_URL;
+ const port = env.PORT;
```

### Phase 5: Add Secret Scanning

```bash
ultraenv scan
ultraenv install-hook
```

### Phase 6: Add .env.example Sync

```bash
ultraenv sync --mode generate
ultraenv sync --mode watch  # (optional)
```

### Phase 7: Add CI/CD Checks

```bash
ultraenv ci setup --platform github
```

---

## dotenv API Compatibility

### config() → load()

```typescript
// dotenv
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.production', override: true });

// ultraenv
import { load } from 'ultraenv';
load();
load({ envDir: '.', overrideProcessEnv: true });
```

### config() return value → loadWithResult()

```typescript
// dotenv
const result = dotenv.config();
if (result.error) {
  console.error(result.error);
}
console.log(result.parsed); // { KEY: 'value' }

// ultraenv
import { loadWithResult } from 'ultraenv';
const result = loadWithResult();
console.log(result.env);       // { KEY: 'value' }
console.log(result.metadata);  // { totalVars, filesParsed, ... }
```

### parse() → parseEnvFile()

```typescript
// dotenv
import { parse } from 'dotenv';
const obj = parse('KEY=value\nFOO=bar');

// ultraenv
import { parseEnvFile } from 'ultraenv';
const parsed = parseEnvFile('KEY=value\nFOO=bar', 'inline');
console.log(parsed.vars); // [{ key: 'KEY', value: 'value', ... }]
```

### populate() → process.env merge

```typescript
// dotenv
import { populate } from 'dotenv';
populate({ PROCESS_VAR: 'value' }, { override: true });

// ultraenv
import { load } from 'ultraenv';
load({ overrideProcessEnv: true });
```

### Options Mapping

| dotenv Option | ultraenv Option |
|---|---|
| `path` | `envDir` |
| `encoding` | `encoding` |
| `debug` | `debug` |
| `override` | `overrideProcessEnv` |
| `processEnv` | `processEnv` |
| — | `expandVariables` |
| — | `mergeStrategy` |
| — | `schema` |

---

## Advanced Migration

### Multiple .env Files

```typescript
// dotenv (manual)
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });
dotenv.config({ path: `.env.${process.env.NODE_ENV}`, override: true });

// ultraenv (automatic cascade)
import { load } from 'ultraenv';
load(); // Automatically loads .env, .env.local, .env.development, etc.
```

### Next.js Migration

```typescript
// Before (Next.js + dotenv)
import dotenv from 'dotenv';
dotenv.config();

export default async function handler(req, res) {
  const dbUrl = process.env.DATABASE_URL;
}

// After (Next.js + ultraenv)
import { defineEnv, t } from 'ultraenv';

const env = defineEnv({
  DATABASE_URL: t.string().format('url').required(),
});

export default async function handler(req, res) {
  const dbUrl = env.DATABASE_URL; // typed!
}
```

### Express Migration

```typescript
// Before (Express + dotenv)
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
app.listen(port);

// After (Express + ultraenv)
import { defineEnv, t } from 'ultraenv';

const env = defineEnv({
  PORT: t.number().port().default(3000),
});

const app = express();
app.listen(env.PORT); // typed number!
```

---

## Troubleshooting

### "Module not found" after uninstalling dotenv

Make sure you've updated all import statements:

```bash
rg "from 'dotenv'" src/
rg "require\('dotenv'\)" src/
```

### Types are not inferred

Ensure you have a schema defined:

```typescript
// This won't infer types:
const env = process.env;

// This will:
import { defineEnv, t } from 'ultraenv';
const env = defineEnv({ PORT: t.number().port().default(3000) });
```

### Variables not loading

Check file locations:

```bash
ultraenv validate --debug
ultraenv doctor
```
