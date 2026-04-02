# Framework Presets Guide

Ready-made configuration presets for popular frameworks and platforms.

## Table of Contents

- [Overview](#overview)
- [Available Presets](#available-presets)
- [Using Presets](#using-presets)
- [Next.js Preset](#nextjs-preset)
- [Vite Preset](#vite-preset)
- [Nuxt Preset](#nuxt-preset)
- [Remix Preset](#remix-preset)
- [SvelteKit Preset](#sveltekit-preset)
- [Express Preset](#express-preset)
- [Fastify Preset](#fastify-preset)
- [Docker Preset](#docker-preset)
- [AWS Lambda Preset](#aws-lambda-preset)
- [Creating Custom Presets](#creating-custom-presets)
- [Preset Registry API](#preset-registry-api)

---

## Overview

Framework presets provide:

- **Ready-made schemas** — Common variables for each framework
- **File loading order** — Correct `.env` file priority cascade
- **Security helpers** — Client/server variable separation
- **Best practices** — Framework-specific conventions

---

## Available Presets

| Preset | ID | Tags |
|---|---|---|
| Next.js | `nextjs` | `framework`, `react`, `ssr`, `fullstack` |
| Vite | `vite` | `framework`, `build-tool` |
| Nuxt | `nuxt` | `framework`, `vue`, `ssr` |
| Remix | `remix` | `framework`, `react`, `ssr` |
| SvelteKit | `sveltekit` | `framework`, `svelte`, `ssr` |
| Express | `express` | `backend`, `server` |
| Fastify | `fastify` | `backend`, `server` |
| Docker | `docker` | `container`, `devops` |
| AWS Lambda | `aws-lambda` | `serverless`, `cloud` |

---

## Using Presets

### Basic Usage

```typescript
import { defineEnv, t, getPreset } from 'ultraenv';

// Get a preset
const nextjsPreset = getPreset('nextjs');

// Use it directly
const env = defineEnv(nextjsPreset.schema);
```

### Extend a Preset

```typescript
const nextjsPreset = getPreset('nextjs');

const env = defineEnv({
  ...nextjsPreset.schema,

  // Add your custom variables
  CUSTOM_FEATURE: t.boolean().default(false),
  ANALYTICS_KEY: t.string().secret().optional(),
  RATE_LIMIT: t.number().positive().default(100),
});
```

### Check Available Presets

```typescript
import { listPresets, hasPreset } from 'ultraenv';

// List all registered presets
console.log(listPresets());
// → ['nextjs', 'vite', 'nuxt', 'remix', 'sveltekit', 'express', 'fastify', 'docker', 'aws-lambda']

// Check if a preset exists
hasPreset('nextjs');  // true
hasPreset('rails');   // false
```

---

## Next.js Preset

### Schema Variables

| Variable | Type | Required | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | url | — | Public API base URL |
| `NEXT_PUBLIC_SITE_URL` | url | — | Canonical site URL |
| `NEXT_PUBLIC_VERCEL_URL` | url | opt | Vercel deployment URL |
| `NEXT_PUBLIC_GA_ID` | string | opt | Google Analytics ID |
| `NEXT_PUBLIC_SENTRY_DSN` | url | opt | Sentry DSN |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | string | opt | Stripe publishable key |
| `DATABASE_URL` | url | — | Database connection URL (server) |
| `DATABASE_URL_UNPOOLED` | url | opt | Unpooled DB URL for migrations |
| `NODE_ENV` | enum | — | `development` / `production` / `test` |
| `NEXT_TELEMETRY_DISABLED` | boolean | opt | Disable Next.js telemetry |
| `NEXTAUTH_URL` | url | opt | NextAuth callback URL |
| `NEXTAUTH_SECRET` | string | opt | NextAuth signing secret |
| `NEXTAUTH_CLIENT_ID` | string | opt | OAuth client ID |
| `NEXTAUTH_CLIENT_SECRET` | string | opt | OAuth client secret |
| `NEXT_PUBLIC_IMAGE_DOMAINS` | array | opt | Image optimization domains |

### Client Leak Detection

```typescript
import { isNextPublicVar, isServerOnlyVar, detectClientLeakCandidates } from 'ultraenv';

// Check if a variable is client-exposed
isNextPublicVar('NEXT_PUBLIC_API_URL');  // true
isNextPublicVar('DATABASE_URL');          // false

// Check if a variable should be server-only
isServerOnlyVar('DATABASE_URL');    // true
isServerOnlyVar('NODE_ENV');        // false (built-in)

// Detect dangerous client-exposed secrets
const warnings = detectClientLeakCandidates(process.env);
// → ['NEXT_PUBLIC_SECRET_KEY: appears to be a secret exposed to client bundle']
```

### File Loading Order

```
.env → .env.local → .env.development → .env.development.local
→ .env.test → .env.test.local
→ .env.production → .env.production.local
```

---

## Vite Preset

### Schema Variables

| Variable | Type | Required | Description |
|---|---|---|---|
| `VITE_API_URL` | url | — | API base URL |
| `VITE_APP_TITLE` | string | — | Application title |
| `VITE_SENTRY_DSN` | url | opt | Sentry DSN |

### Client Leak Detection

```typescript
import { isVitePublicVar, detectViteClientLeakCandidates } from 'ultraenv';

isVitePublicVar('VITE_API_URL');  // true
isVitePublicVar('DATABASE_URL');   // false
```

---

## Nuxt Preset

### Schema Variables

| Variable | Type | Required | Description |
|---|---|---|---|
| `NUXT_PUBLIC_API_URL` | url | — | Public API URL |
| `NUXT_PUBLIC_SITE_URL` | url | — | Site URL |
| `DATABASE_URL` | url | — | Database URL (server) |
| `NUXT_SESSION_SECRET` | string | — | Session secret |

### Helpers

```typescript
import { classifyNuxtVar, isNuxtPublicVar, isNitroVar } from 'ultraenv';

classifyNuxtVar('NUXT_PUBLIC_API_URL');  // { type: 'public', prefix: 'NUXT_PUBLIC_' }
classifyNuxtVar('DATABASE_URL');          // { type: 'server', prefix: null }

isNuxtPublicVar('NUXT_PUBLIC_API_URL');  // true
isNitroVar('NITRO_PORT');               // true
```

---

## Remix Preset

Includes standard variables for Remix applications with session management, database, and deployment configuration.

---

## SvelteKit Preset

### Helpers

```typescript
import { isSveltekitPublicVar, detectSveltekitClientLeakCandidates } from 'ultraenv';

isSveltekitPublicVar('PUBLIC_API_URL');  // true
isSveltekitPublicVar('DATABASE_URL');     // false
```

---

## Express Preset

### Schema Variables

| Variable | Type | Required | Description |
|---|---|---|---|
| `PORT` | port | — | Server port (default: 3000) |
| `HOST` | hostname | — | Bind address (default: localhost) |
| `TRUST_PROXY` | boolean | opt | Enable trust proxy |
| `CORS_ORIGIN` | url | opt | CORS origin |
| `RATE_LIMIT_WINDOW_MS` | duration | opt | Rate limit window |
| `RATE_LIMIT_MAX` | number | opt | Max requests per window |

### Express Middleware

```typescript
import express from 'express';
import { ultraenvMiddleware, healthCheckRoute } from 'ultraenv';

const app = express();

// Validate env and expose health check
app.use(ultraenvMiddleware({ schema: expressPreset.schema }));
app.get('/health', healthCheckRoute());
```

---

## Fastify Preset

### Fastify Plugin

```typescript
import Fastify from 'fastify';
import { createUltraenvPlugin } from 'ultraenv/fastify';

const app = Fastify();

app.register(createUltraenvPlugin({
  schema: fastifyPreset.schema,
}));
```

---

## Docker Preset

### Schema Variables

| Variable | Type | Required | Description |
|---|---|---|---|
| `DOCKER_HOST` | string | opt | Docker daemon host |
| `COMPOSE_PROJECT_NAME` | string | opt | Compose project name |
| `COMPOSE_FILE` | path | opt | Compose file path |

### Helpers

```typescript
import { isDockerArg, isDockerEnv } from 'ultraenv';

isDockerArg('-e');        // true
isDockerArg('--env-file'); // true
isDockerEnv('MYSQL_ROOT_PASSWORD'); // true
```

---

## AWS Lambda Preset

### Schema Variables

| Variable | Type | Required | Description |
|---|---|---|---|
| `AWS_REGION` | string | — | AWS region |
| `AWS_LAMBDA_FUNCTION_NAME` | string | opt | Lambda function name |
| `AWS_LAMBDA_FUNCTION_VERSION` | string | opt | Function version |
| `AWS_LAMBDA_MEMORY_SIZE` | number | opt | Memory allocation (MB) |
| `AWS_LAMBDA_TIMEOUT` | duration | opt | Function timeout |

### Helpers

```typescript
import { isAwsSystemVar, isAwsVar, getLambdaContext } from 'ultraenv';

isAwsSystemVar('AWS_REGION');  // true
isAwsSystemVar('AWS_ACCESS_KEY_ID'); // true
isAwsVar('CUSTOM_AWS_VAR');    // false (custom)
```

---

## Creating Custom Presets

```typescript
import { registerPreset, type Preset } from 'ultraenv';
import type { SchemaDefinition } from 'ultraenv';
import { EnvFileType } from 'ultraenv';

const myFrameworkPreset: Preset = {
  id: 'my-framework',
  name: 'My Framework',
  description: 'Configuration preset for My Framework',
  schema: {
    MY_APP_URL: {
      type: 'string',
      format: 'url',
      description: 'Application URL',
    },
    MY_API_KEY: {
      type: 'string',
      minLength: 32,
      description: 'API key for external service',
    },
    MY_DEBUG: {
      type: 'boolean',
      default: false,
      description: 'Enable debug mode',
    },
  } satisfies SchemaDefinition,
  files: [
    EnvFileType.Env,
    EnvFileType.EnvLocal,
    EnvFileType.EnvDevelopment,
    EnvFileType.EnvProduction,
  ],
  tags: ['framework', 'custom'],
};

// Register the preset
registerPreset('my-framework', myFrameworkPreset);
```

---

## Preset Registry API

```typescript
import {
  registerPreset,
  getPreset,
  listPresets,
  hasPreset,
  unregisterPreset,
  getAllPresets,
} from 'ultraenv';

// Register
registerPreset('my-preset', preset);

// Get
const preset = getPreset('my-preset');

// List
const names = listPresets();

// Check
const exists = hasPreset('my-preset');

// Unregister
unregisterPreset('my-preset');

// Get all
const all = getAllPresets();
// → { nextjs: {...}, vite: {...}, ... }
```
