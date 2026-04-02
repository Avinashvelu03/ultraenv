# Roadmap

## Overview

This document outlines the planned features and improvements for ultraenv.

## [1.1] — Planned

### Features
- **WASM Support** — Compile ultraenv to WebAssembly for browser-side environment validation
- **VS Code Extension** — Syntax highlighting for `.env` files with ultraenv schema validation
- **Docker Compose Integration** — Auto-inject environment variables from vault into Docker Compose
- **Config File Wizard** — Interactive `ultraenv init` with schema builder UI
- **Env Diff Tool** — Visual diff tool for comparing environments side-by-side
- **Remote Vault** — Support for remote secret managers (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault)

### Improvements
- **Performance** — Lazy loading of validator modules for faster startup
- **SARIF v2.1.0** — Updated SARIF output format support
- **Better Error Messages** — Enhanced error messages with code snippets

---

## [1.2] — Planned

### Features
- **Terraform Provider** — Manage environment variables as Terraform resources
- **Kubernetes Integration** — Sync vault secrets to Kubernetes Secrets
- **GitHub App** — Ultraenv GitHub App for automatic PR scanning
- **Web Dashboard** — Web UI for vault management and environment comparison
- **Config Migrations** — Version-controlled schema migrations (like Prisma)
- **Nested Variable References** — Support for `${VAR1}_${VAR2}` style references

### Improvements
- **Incremental Scanning** — Only scan changed files (not full codebase)
- **Caching** — Cache scan results for faster repeated scans

---

## [2.0] — Future

### Features
- **Multi-File Schema** — Import and compose schemas from multiple files
- **Plugin System** — Third-party plugins for custom validators and integrations
- **Team Management** — Shared vault with role-based access control
- **Audit Log** — Cryptographic audit trail for all vault operations
- **Desktop App** — Native desktop application for vault management
- **Fuzzing** — Comprehensive fuzzing suite for parser and validators

### Improvements
- **Rust Core** — Rewrite performance-critical paths in Rust (via WASM or NAPI)
- **Formal Verification** — Property-based testing with fast-check

---

## Completed

### v1.0.0
- :white_check_mark: Core `.env` file parser with full syntax support
- :white_check_mark: 30+ schema validators with fluent builder API
- :white_check_mark: AES-256-GCM encrypted vault with key rotation
- :white_check_mark: 55+ pattern secret scanner with SARIF output
- :white_check_mark: TypeScript type generation (.d.ts, module, JSON Schema)
- :white_check_mark: Multi-environment management (11 `.env` variants)
- :white_check_mark: 9 framework presets (Next.js, Vite, Nuxt, Remix, SvelteKit, Express, Fastify, Docker, AWS Lambda)
- :white_check_mark: Full CLI with 25+ commands
- :white_check_mark: `.env.example` sync with watch mode
- :white_check_mark: Express and Fastify middleware
- :white_check_mark: CI/CD integration (GitHub Actions, GitLab CI)
- :white_check_mark: Git hook integration (pre-commit, pre-push)
- :white_check_mark: Zero runtime dependencies
- :white_check_mark: Full TypeScript with strict mode
- :white_check_mark: 500+ tests

---

## Feedback

We'd love to hear your feedback on the roadmap! Please:

- Vote on existing issues you'd like prioritized
- Open new issues for features you'd like to see
- Join [Discussions](https://github.com/Avinashvelu03/ultraenv/discussions) to share ideas
