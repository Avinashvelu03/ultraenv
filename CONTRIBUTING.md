# Contributing to ultraenv

First off, thank you for considering contributing to ultraenv! It's people like you that make open source such a great community.

## Table of Contents

- [Quick Start](#quick-start)
- [Getting Help](#getting-help)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Code Style](#code-style)
- [Commit Messages](#commit-messages)
- [Pull Requests](#pull-requests)
- [Reporting Issues](#reporting-issues)

---

## Quick Start

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/ultraenv.git
cd ultraenv

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Test
npm test

# 5. Lint
npm run lint
```

---

## Getting Help

If you have questions, feel free to:

- Open a [Discussion](https://github.com/Avinashvelu03/ultraenv/discussions)
- Join our community chat
- Check existing issues and PRs

---

## Development Setup

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Git**

### Scripts

| Command | Description |
|---|---|
| `npm run build` | Build the library |
| `npm run dev` | Build in watch mode |
| `npm test` | Run all tests |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:coverage` | Tests with coverage |
| `npm run lint` | Lint code |
| `npm run lint:fix` | Fix lint issues |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Type checking |

---

## Making Changes

### Small Changes (Bug Fixes, Docs)

1. Create a branch: `git checkout -b fix/describe-fix`
2. Make your changes
3. Add/update tests
4. Run checks: `npm run lint && npm run typecheck && npm test`
5. Commit and open a PR

### Large Changes (New Features)

1. Open an issue first to discuss the feature
2. Get feedback from maintainers
3. Implement the feature
4. Write comprehensive tests
5. Update documentation
6. Open a PR

---

## Testing

We aim for high test coverage. All new features must include tests.

```bash
# Run all tests
npm test

# Run specific test
npx vitest run tests/unit/schema/validators/string.test.ts

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Test Guidelines

- Test the happy path AND error cases
- Test edge cases (empty strings, undefined, null, special characters)
- Use descriptive test names
- Mock file system when appropriate
- Clean up after tests

---

## Code Style

We use ESLint and Prettier for consistent code style.

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Guidelines

- TypeScript strict mode — no `any` types
- Use `readonly` for immutable data
- Prefer `interface` over `type` for object shapes
- Use JSDoc for all public APIs
- Keep functions focused and small
- Use early returns

---

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `test`: Tests
- `refactor`: Code refactoring
- `chore`: Maintenance
- `ci`: CI/CD changes
- `perf`: Performance improvement

### Examples

```
feat(schema): add t.duration() validator
fix(parser): handle quoted values with newlines
docs(readme): add migration guide from dotenv
test(vault): add encryption round-trip tests
```

---

## Pull Requests

### PR Template

When opening a PR, please include:

1. **Description**: What does this PR do?
2. **Type**: Is this a bug fix, feature, or docs change?
3. **Testing**: How was this tested?
4. **Breaking Changes**: Any breaking changes?

### Review Process

- At least one approval required
- All CI checks must pass
- No linting errors
- No type errors
- All tests pass

---

## Reporting Issues

### Bug Reports

Please include:

1. **Version**: `ultraenv --version`
2. **Node.js version**: `node --version`
3. **OS**: macOS, Linux, Windows
4. **Minimal reproduction**: Code that demonstrates the issue
5. **Expected behavior**: What should happen?
6. **Actual behavior**: What actually happens?
7. **Error messages**: Any stack traces or error output

### Feature Requests

Please include:

1. **Problem**: What problem does this solve?
2. **Proposed solution**: How should it work?
3. **Alternatives**: Have you considered other approaches?
4. **Examples**: Links to similar features in other tools

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
