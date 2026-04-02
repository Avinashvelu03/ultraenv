# Contributing to ultraenv

Thank you for your interest in contributing to ultraenv! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Writing Code](#writing-code)
- [Testing](#testing)
- [Documentation](#documentation)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Adding Features](#adding-features)
- [Reporting Bugs](#reporting-bugs)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](../CODE_OF_CONDUCT.md). By participating, you agree to abide by its terms.

---

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/ultraenv.git
cd ultraenv
npm install
```

---

## Development Setup

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run typecheck
```

---

## Project Structure

```
ultraenv/
├── bin/                     # CLI entry point
├── src/
│   ├── core/               # Core loading, parsing, errors
│   ├── schema/             # Schema engine, validators, modifiers
│   ├── vault/              # Encryption, key management
│   ├── scanner/            # Secret scanning
│   ├── sync/               # .env.example sync
│   ├── typegen/            # TypeScript type generation
│   ├── environments/       # Multi-environment management
│   ├── presets/            # Framework presets
│   ├── middleware/          # Express/Fastify middleware
│   ├── reporters/          # Output formatters
│   ├── cli/                # CLI commands and UI
│   ├── data/               # Static data (timezones, patterns, etc.)
│   ├── utils/              # Shared utilities
│   └── index.ts            # Main entry point
├── tests/
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   ├── fixtures/           # Test fixtures
│   └── helpers/            # Test utilities
├── docs/                   # Documentation
├── prisma/                 # Database schema
├── .ultraenvrc.json        # ultraenv config
├── tsconfig.json           # TypeScript config
├── vitest.config.ts        # Test config
└── package.json
```

---

## Development Workflow

1. **Create a branch**: `git checkout -b feature/my-feature`
2. **Make changes**: Write code, tests, and documentation
3. **Run checks**: `npm run lint && npm run typecheck && npm test`
4. **Commit**: Follow the commit message format
5. **Push**: `git push origin feature/my-feature`
6. **Open PR**: Fill in the PR template

---

## Writing Code

### TypeScript

- Use strict TypeScript (`no any`, explicit types)
- Prefer `interface` over `type` for object shapes
- Use `readonly` for immutable data
- Export types with `export type`

### Code Style

- 2-space indentation
- Single quotes for strings
- Semicolons required
- No trailing commas
- Max line length: 100 characters

### Error Handling

```typescript
import { UltraenvError } from './core/errors.js';

// Always use ultraenv error classes
throw new ValidationError(field, value, 'Invalid value', {
  hint: 'Check your .env file',
  expected: 'a valid URL',
});
```

### Adding a Validator

1. Create the validator in `src/schema/validators/`
2. Add to the `t` factory in `src/schema/index.ts`
3. Export from `src/index.ts`
4. Write tests in `tests/unit/schema/validators/`
5. Add documentation to `docs/SCHEMA_REFERENCE.md`

---

## Testing

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Specific test file
npx vitest run tests/unit/schema/validators/string.test.ts

# With coverage
npm run test:coverage
```

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('string validator', () => {
  it('should validate basic strings', () => {
    const schema = t.string().required();
    const result = validateValue(schema, 'hello');
    expect(result.valid).toBe(true);
    expect(result.value).toBe('hello');
  });

  it('should fail for empty strings', () => {
    const schema = t.string().minLength(1).required();
    const result = validateValue(schema, '');
    expect(result.valid).toBe(false);
  });
});
```

### Test Fixtures

Place test fixtures in `tests/fixtures/`:

```
tests/fixtures/
├── env-files/          # .env files for testing
├── scan-targets/       # Files for secret scanning tests
└── vault-files/        # Vault files for encryption tests
```

---

## Documentation

### Code Comments

Use JSDoc for all public APIs:

```typescript
/**
 * Validate an environment variable against a schema.
 *
 * @param schema - The schema definition
 * @param value - The raw string value
 * @returns Validation result with typed value or errors
 *
 * @example
 * ```typescript
 * const result = validateValue(t.string().email(), 'user@example.com');
 * ```
 */
export function validateValue(schema, value) { ... }
```

### Documentation Files

- `README.md` — Main documentation
- `docs/SCHEMA_REFERENCE.md` — Schema validator reference
- `docs/CLI_REFERENCE.md` — CLI command reference
- `docs/VAULT_GUIDE.md` — Encryption guide
- `docs/SECRET_SCANNING.md` — Scanning guide

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat(schema): add t.url() validator
fix(parser): handle quoted values with escaped quotes
docs(readme): add migration guide
test(vault): add encryption round-trip tests
refactor(core): simplify cascade resolution
```

### Types

| Type | Description |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `test` | Tests |
| `refactor` | Code changes without feature/fix |
| `chore` | Maintenance tasks |
| `ci` | CI/CD changes |

---

## Pull Request Process

1. **Description**: Clearly describe what the PR does
2. **Tests**: Include tests for new functionality
3. **Docs**: Update documentation for user-facing changes
4. **Linting**: Pass `npm run lint` and `npm run typecheck`
5. **Tests**: Pass `npm test`
6. **Review**: At least one approval required

---

## Adding Features

### Large Features

1. Open an issue to discuss the feature first
2. Get feedback from maintainers
3. Create a PR with the implementation
4. Include comprehensive tests
5. Update all relevant documentation

### Bug Fixes

1. Open an issue describing the bug
2. Include reproduction steps
3. Submit a PR with the fix
4. Include a test that would have caught the bug

---

## Reporting Bugs

Please include:

1. **ultraenv version**: `ultraenv --version`
2. **Node.js version**: `node --version`
3. **OS**: macOS, Linux, Windows
4. **Minimal reproduction**: A small code example
5. **Expected vs actual behavior**
6. **Error messages / stack traces**
