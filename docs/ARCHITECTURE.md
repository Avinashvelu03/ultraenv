# Architecture Overview

Technical architecture of the ultraenv library.

## Table of Contents

- [Design Philosophy](#design-philosophy)
- [System Architecture](#system-architecture)
- [Core Module](#core-module)
- [Schema Engine](#schema-engine)
- [Vault System](#vault-system)
- [Scanner System](#scanner-system)
- [CLI System](#cli-system)
- [Type Generation](#type-generation)
- [Data Flow](#data-flow)
- [Error System](#error-system)

---

## Design Philosophy

- **Zero dependencies** — Only Node.js built-in modules
- **Type-safe** — Full TypeScript with strict mode
- **Composable** — Each module is independent and composable
- **Secure by default** — Secrets never logged, keys securely handled
- **Performant** — Synchronous loading, lazy command imports
- **Extensible** — Custom patterns, presets, and reporters

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Entry Points                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ CLI (bin)│  │ Program- │  │  Middleware      │  │
│  │          │  │ matic API│  │  Express/Fastify  │  │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│       │              │                 │             │
├───────┼──────────────┼─────────────────┼─────────────┤
│       ▼              ▼                 ▼             │
│  ┌──────────────────────────────────────────────┐   │
│  │              Core Layer                      │   │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │ Config  │ │ Loader   │ │  Cascade     │  │   │
│  │  │         │ │          │ │  Resolver    │  │   │
│  │  └─────────┘ └──────────┘ └──────────────┘  │   │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │ Parser  │ │Interpo-  │ │  Watcher     │  │   │
│  │  │         │ │ lation   │ │              │  │   │
│  │  └─────────┘ └──────────┘ └──────────────┘  │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │            Feature Modules                    │   │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │ Schema  │ │  Vault   │ │  Scanner     │  │   │
│  │  │ Engine  │ │ (Encrypt)│ │ (Secrets)    │  │   │
│  │  └─────────┘ └──────────┘ └──────────────┘  │   │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │ TypeGen │ │   Sync   │ │ Environments │  │   │
│  │  │         │ │(.example)│ │              │  │   │
│  │  └─────────┘ └──────────┘ └──────────────┘  │   │
│  │  ┌─────────┐ ┌──────────┐                    │   │
│  │  │ Presets │ │ Reporter │                    │   │
│  │  │         │ │          │                    │   │
│  │  └─────────┘ └──────────┘                    │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │              Utilities                        │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │   │
│  │  │ fs   │ │crypto│ │git   │ │format│       │   │
│  │  └──────┘ └──────┘ └──────┘ └──────┘       │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Core Module

### Loading Pipeline

```
load() → resolveCascade() → parseEnvFile() × N → mergeCascade() → expandVariables() → process.env
```

1. **Config Resolution** — Load `.ultraenvrc.json` or defaults
2. **Cascade Resolution** — Determine which `.env` files exist and their priority
3. **Parsing** — Parse each file with full `.env` syntax support
4. **Merging** — Merge variables according to strategy (first-wins, last-wins, error-on-conflict)
5. **Interpolation** — Expand `$VAR` and `${VAR}` references
6. **Process.env** — Apply to `process.env` (if enabled)

### Parser Features

- Comments (`#` and `//`)
- Quoted values (single, double)
- Multi-line values
- Empty values
- Export prefix (`export KEY=value`)
- Variable interpolation (`$VAR`, `${VAR}`, `${VAR:-default}`)
- Circular reference detection
- Windows line endings (CRLF)
- UTF-8 encoding

---

## Schema Engine

### Architecture

```
defineEnv() → validate() → SchemaBuilder → Validator → Modifier Chain → Result
```

### Component Breakdown

| Component | Path | Description |
|---|---|---|
| Builder | `schema/builder.ts` | Fluent API with method chaining |
| Engine | `schema/engine.ts` | Validation orchestration |
| Validators | `schema/validators/*.ts` | 30+ type validators |
| Modifiers | `schema/modifiers/*.ts` | 10+ chainable modifiers |
| Inference | `schema/inference.ts` | TypeScript type inference |

### Validation Flow

1. **Schema Definition** — `defineEnv({ PORT: t.number().port().default(3000) })`
2. **Type Inference** — TypeScript infers `{ PORT: number }` from the schema
3. **Value Resolution** — Read from `process.env` or custom source
4. **Parsing** — Convert string to target type (e.g., `"3000"` → `3000`)
5. **Validation** — Check constraints (port range, length, format, etc.)
6. **Modifiers** — Apply transforms, defaults, custom validators
7. **Result** — Return typed object or errors

---

## Vault System

### Encryption Pipeline

```
encryptValue() → HKDF Derive → AES-256-GCM Encrypt → Format → Store
```

### Components

| Component | Path | Description |
|---|---|---|
| Encryption | `vault/encryption.ts` | AES-256-GCM encrypt/decrypt |
| Key Manager | `vault/key-manager.ts` | Key generation, derivation, rotation |
| Vault File | `vault/vault-file.ts` | Vault file I/O and parsing |
| Integrity | `vault/integrity.ts` | Checksums and tamper detection |
| Secure Memory | `vault/secure-memory.ts` | Secure string/buffer handling |

### Key Derivation

```
Master Key (256-bit)
    │
    ├── HKDF (salt + "production")
    │   └── Environment Key (256-bit)
    │
    ├── HKDF (salt + "staging")
    │   └── Environment Key (256-bit)
    │
    └── HKDF (salt + "development")
        └── Environment Key (256-bit)
```

---

## Scanner System

### Scan Pipeline

```
scan() → scanFiles() + scanGit() + scanStaged() + scanDiff() → Deduplicate → Sort → Report
```

### Components

| Component | Path | Description |
|---|---|---|
| Orchestrator | `scanner/index.ts` | Main scan API |
| File Scanner | `scanner/file-scanner.ts` | File system scanning |
| Git Scanner | `scanner/git-scanner.ts` | Git history/staged/diff scanning |
| Patterns | `scanner/patterns.ts` | Pattern registry |
| Entropy | `scanner/entropy.ts` | Shannon entropy analysis |
| Reporter | `scanner/reporter.ts` | Result formatting |

### Detection Methods

1. **Pattern Matching** — 55+ regex patterns for known formats
2. **Entropy Analysis** — Shannon entropy > 4.5 flags potential secrets
3. **Contextual Analysis** — Variable names like `API_KEY=`, `SECRET=`

---

## CLI System

### Architecture

```
run() → parseArgs() → resolveConfig() → CommandRunner → Output
```

### Command Registry

Commands are lazy-loaded for fast startup:

```typescript
const COMMAND_REGISTRY = {
  'init': () => import('./commands/init.js'),
  'scan': () => import('./commands/scan.js'),
  // ...
};
```

### UI Components

| Component | Path | Description |
|---|---|---|
| Colors | `cli/ui/colors.ts` | Terminal color support |
| Table | `cli/ui/table.ts` | Tabular output |
| Spinner | `cli/ui/spinner.ts` | Loading indicators |
| Prompt | `cli/ui/prompt.ts` | Interactive prompts |
| Box | `cli/ui/box.ts` | Bordered text boxes |
| Banner | `cli/ui/banner.ts` | ASCII art banner |

---

## Type Generation

### Pipeline

```
Schema → Generator → Output
         ├── Declaration (.d.ts)
         ├── Module (.ts)
         └── JSON Schema (.json)
```

### Components

| Component | Path | Description |
|---|---|---|
| Declaration | `typegen/declaration.ts` | .d.ts generation |
| Module | `typegen/module.ts` | .ts module generation |
| JSON Schema | `typegen/json-schema.ts` | JSON Schema generation |
| Watcher | `typegen/watcher.ts` | File watching for auto-regen |

---

## Data Flow

### Environment Loading

```
.env              ┌──────────────────┐
.env.local   ───→ │    Parser        │
.env.development ─│  (line by line)  │
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │   Interpolation  │
                  │  ($VAR expansion)│
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │    Merge         │
                  │  (cascade rules) │
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │   Validation     │
                  │  (schema engine) │
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │  process.env     │
                  │  + typed result   │
                  └──────────────────┘
```

---

## Error System

### Error Hierarchy

```
UltraenvError (base)
├── ValidationError      — Schema validation failure
├── ParseError           — .env file parsing error
├── InterpolationError   — Variable expansion error
├── EncryptionError      — Vault encryption error
├── VaultError           — Vault operation error
├── ScanError            — Secret scanning error
├── ConfigError          — Configuration error
└── FileSystemError      — File I/O error
```

### Error Features

- **Structured data**: code, message, hint, cause
- **Type guards**: `isUltraenvError()`, `isValidationError()`, etc.
- **Actionable hints**: Every error includes a suggestion for fixing it
