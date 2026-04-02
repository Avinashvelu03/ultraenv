# Changelog

All notable changes to the ultraenv project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-15

### Added

#### Core
- `.env` file parser with full syntax support (comments, quotes, multiline, interpolation)
- Variable interpolation with `$VAR` and `${VAR}` syntax
- `${VAR:-default}` fallback syntax
- Circular reference detection in interpolation
- Multi-file cascade loading with priority (11 `.env` variants)
- Configurable merge strategies (`first-wins`, `last-wins`, `error-on-conflict`)
- Configurable `maxInterpolationDepth` and `maxValueLength`
- File watcher for hot-reloading `.env` changes
- Configuration from `.ultraenvrc.json`, `.ultraenvrc.yaml`, `ultraenv.config.js`, or `package.json`

#### Schema Engine
- 30+ type validators with fluent builder API
- Core validators: `t.string()`, `t.number()`, `t.boolean()`, `t.enum()`, `t.array()`, `t.json()`, `t.date()`, `t.bigint()`, `t.regex()`
- String validators: `t.url()`, `t.email()`, `t.ip()`, `t.ipv4()`, `t.ipv6()`, `t.hostname()`, `t.port()`, `t.uuid()`, `t.hex()`, `t.base64()`, `t.semver()`, `t.path()`, `t.color()`, `t.locale()`, `t.timezone()`, `t.country()`, `t.currency()`
- Unit validators: `t.duration()`, `t.bytes()`, `t.cron()`
- 10+ modifiers: `.required()`, `.optional()`, `.default()`, `.description()`, `.transform()`, `.validate()`, `.deprecated()`, `.secret()`, `.alias()`, `.conditional()`
- Full TypeScript type inference from schema definitions
- `defineEnv()` and `tryDefineEnv()` for strict/non-throwing validation

#### Encryption & Vault
- AES-256-GCM authenticated encryption for environment secrets
- HKDF key derivation with random salts per environment
- Per-value encryption with unique IV and auth tag
- Multi-environment vault support (dev, staging, prod, etc.)
- Key rotation with automatic re-encryption
- Vault integrity verification with SHA-256 checksums
- Secure memory handling (`SecureBuffer`, `SecureString`)
- Timing-safe string comparison

#### Secret Scanning
- 55+ built-in secret detection patterns
- Categories: AWS, GitHub, Google, Stripe, Slack, private keys, databases, cloud, auth, messaging, generic
- Shannon entropy analysis for high-entropy string detection
- Git history scanning
- Staged file scanning (for pre-commit hooks)
- Git diff scanning (for PR review)
- SARIF output format for GitHub Code Scanning integration
- JSON and terminal output formats
- Custom pattern support via API and config file

#### Type Generation
- TypeScript declaration file (`.d.ts`) generation with JSDoc
- TypeScript module generation with runtime values
- JSON Schema generation for tool integration
- Watch mode for automatic regeneration
- Customizable interface names and formatting

#### Multi-Environment
- 11 `.env` file variants supported
- Environment listing, creation, and management
- Environment comparison (diff view)
- Environment validation across all files
- Environment switching

#### Framework Presets
- 9 built-in presets: Next.js, Vite, Nuxt, Remix, SvelteKit, Express, Fastify, Docker, AWS Lambda
- Client/server variable leak detection
- Preset registry with custom preset support

#### CLI
- `ultraenv init` — Project initialization
- `ultraenv validate` — Environment validation
- `ultraenv typegen` — TypeScript type generation
- `ultraenv sync` — `.env.example` sync (check, generate, interactive, watch)
- `ultraenv scan` — Secret scanning
- `ultraenv debug` — Diagnostics
- `ultraenv protect` — `.gitignore` protection
- `ultraenv doctor` — Self-check
- `ultraenv vault init/encrypt/decrypt/rekey/status/diff/verify` — Vault management
- `ultraenv envs list/compare/validate/create/switch` — Environment management
- `ultraenv ci validate/check-sync/scan/setup` — CI/CD commands
- `ultraenv install-hook` — Git hook installation
- `ultraenv completion` — Shell completions (bash, zsh, fish, powershell)
- Lazy command loading for fast startup
- JSON output format for all commands

#### Middleware
- Express middleware with env validation
- Fastify plugin with env validation
- Health check endpoints (liveness, readiness, env health)

#### Reporters
- Terminal reporter with colors, tables, and formatting
- JSON reporter for programmatic consumption
- SARIF reporter for GitHub Code Scanning

#### Error Handling
- Structured error classes with codes, hints, and cause chaining
- Type guards for all error types
- Actionable remediation hints on every error

#### .env.example Sync
- Auto-generation from `.env` with types, defaults, and descriptions
- Comparison mode to detect drift
- Interactive mode for review before update
- Watch mode for continuous sync

#### CI/CD
- GitHub Actions workflow generator
- GitLab CI pipeline generator
- CI-specific commands with strict mode

---

## [0.1.0] - 2024-01-01

### Added
- Initial project setup
- Basic `.env` file parsing
- Simple `load()` function (dotenv-compatible)
- `t.string()`, `t.number()`, `t.boolean()` validators

[1.0.0]: https://github.com/Avinashvelu03/ultraenv/releases/tag/v1.0.0
[0.1.0]: https://github.com/Avinashvelu03/ultraenv/releases/tag/v0.1.0
