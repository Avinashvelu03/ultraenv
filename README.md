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
  DATABASE_URL: t.string().format('url').required(),
  PORT: t.number().port().default(3000),
  NODE_ENV: t.enum(['development', 'staging', 'production'] as const).required(),
  DEBUG: t.boolean().default(false),
  ADMIN_EMAIL: t.email().optional(),
  ALLOWED_ORIGINS: t.array().separator(';').default(['http://localhost:3000']),
  CACHE_TTL: t.duration().default('1h'),
  MAX_UPLOAD_SIZE: t.bytes().default('10MB'),
});

export default env;
```

### Step 3 — Use your typed env everywhere

```typescript
import env from './env';

const server = createServer({
  port: env.PORT,           // number
  host: env.HOST,           // string
  databaseUrl: env.DATABASE_URL,
});
```

---

## 📦 Installation

```bash
npm install ultraenv
pnpm add ultraenv
yarn add ultraenv
bun add ultraenv
```

### Global CLI

```bash
npm install -g ultraenv
ultraenv init
ultraenv validate
ultraenv scan
```

---

## 🔧 CLI Command Reference

| Command | Description |
|---|---|
| `ultraenv init` | Initialize project |
| `ultraenv validate` | Validate environment variables |
| `ultraenv typegen` | Generate TypeScript types |
| `ultraenv sync` | Sync `.env.example` |
| `ultraenv scan` | Scan for leaked secrets |
| `ultraenv debug` | Show diagnostics |
| `ultraenv protect` | Check `.gitignore` protection |
| `ultraenv doctor` | Run self-checks |
| `ultraenv vault *` | Vault encrypt/decrypt/rekey |
| `ultraenv envs *` | Multi-environment management |
| `ultraenv ci *` | CI/CD integration commands |

---

## 📐 Schema Reference

All schema builders via the `t` factory:

```typescript
import { defineEnv, t } from 'ultraenv';

t.string().format('url').required()
t.number().port().default(3000)
t.boolean().default(false)
t.enum(['a', 'b'] as const).required()
t.url({ protocols: ['https'] }).required()
t.email().optional()
t.array().separator(';').trimItems().required()
t.json<{ theme: string }>().required()
t.duration().default('1h')
t.bytes().default('10MB')
t.path({ mustExist: false }).default('./uploads')
t.uuid({ version: 4 }).required()
t.ip().required()
t.cron().default('0 2 * * *')
```

---

## 🔐 Encryption & Vault

```bash
ultraenv vault init --env production
ultraenv vault encrypt --env production
git add .env.vault  # safe to commit!
ultraenv vault decrypt --env production
```

- **Algorithm**: AES-256-GCM
- `.env.vault` → commit ✅
- `.env.keys` → gitignore ❌

---

## 🔍 Secret Scanning

```bash
ultraenv scan                          # Scan files
ultraenv scan --scope git-history      # Scan git history
ultraenv scan --format sarif --output results.sarif  # GitHub Code Scanning
```

55+ patterns: AWS, GitHub, Google, Stripe, Slack, private keys, DB URLs, and more.

---

## 🤝 Contributing

```bash
git clone https://github.com/Avinashvelu03/ultraenv.git
cd ultraenv && npm install
npm test
npm run build
```

---

## 📜 License

[MIT](LICENSE) © 2024 [Avinash Velu](https://github.com/Avinashvelu03)

---

## 🔐 Support ultraenv

<div align="center">

```
  ██████╗  ██████╗ ███╗   ██╗ █████╗ ████████╗███████╗
  ██╔══██╗██╔═══██╗████╗  ██║██╔══██╗╚══██╔══╝██╔════╝
  ██║  ██║██║   ██║██╔██╗ ██║███████║   ██║   █████╗
  ██║  ██║██║   ██║██║╚██╗██║██╔══██║   ██║   ██╔══╝
  ██████╔╝╚██████╔╝██║ ╚████║██║  ██║   ██║   ███████╗
  ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝   ╚═╝   ╚══════╝
```

> *ultraenv is solo-built and freely available to every developer on Earth.*
> *If it saved your secrets, saved your sanity, or caught a leak before prod — it earned your support.*

[![Ko-fi](https://img.shields.io/badge/☕_Ko--fi-Power_the_Vault-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/avinashvelu)
[![GitHub Sponsors](https://img.shields.io/badge/💜_GitHub-Become_a_Sponsor-EA4AAA?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sponsors/Avinashvelu03)

**Zero-cost support:**
- ⭐ [Star on GitHub](https://github.com/Avinashvelu03/ultraenv)
- 🐛 [Report a bug or request a feature](https://github.com/Avinashvelu03/ultraenv/issues)
- 📣 Share ultraenv with your team or in your community

**Made with ❤️ by [Avinash Velu](https://github.com/Avinashvelu03)**

[Report Bug](https://github.com/Avinashvelu03/ultraenv/issues) · [Request Feature](https://github.com/Avinashvelu03/ultraenv/issues) · [Discussions](https://github.com/Avinashvelu03/ultraenv/discussions)

</div>
