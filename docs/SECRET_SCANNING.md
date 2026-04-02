# Secret Scanning Guide

Detect leaked secrets, API keys, tokens, and credentials in your codebase.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Scan Modes](#scan-modes)
- [Output Formats](#output-formats)
- [Secret Patterns](#secret-patterns)
- [Custom Patterns](#custom-patterns)
- [Git Hook Integration](#git-hook-integration)
- [False Positives](#false-positives)
- [CI/CD Integration](#cicd-integration)
- [Programmatic API](#programmatic-api)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## Overview

The ultraenv secret scanner detects **55+ patterns** for leaked credentials across:

- **Source code files** — JavaScript, TypeScript, Python, Go, etc.
- **Configuration files** — JSON, YAML, TOML, INI, etc.
- **Git history** — All commits including deleted content
- **Staged files** — Pre-commit scanning
- **Git diffs** — Compare branches, PRs, commits

### Detection Methods

1. **Pattern matching** — 55+ regex patterns for known secret formats
2. **Entropy analysis** — Shannon entropy detection for high-entropy strings
3. **Contextual analysis** — Variable name analysis (e.g., `API_KEY=` assignments)

---

## Quick Start

```bash
# Scan current directory
ultraenv scan

# Scan specific paths
ultraenv scan src/ config/ scripts/

# Scan everything (files + git history)
ultraenv scan --scope all
```

---

## Scan Modes

### Files (default)

Scans files in the working directory:

```bash
ultraenv scan
ultraenv scan src/ tests/
ultraenv scan --include "src/**" --exclude "**/*.test.ts"
```

### Git History

Scans all commits in the repository:

```bash
ultraenv scan --scope git-history
```

> ⚠️ This scans the full git history and may take longer for large repositories.

### Staged Files

Scans only files staged for the next commit:

```bash
ultraenv scan --scope staged
```

Ideal for pre-commit hooks.

### Diff

Scans changes between git refs:

```bash
# Compare current working tree to HEAD
ultraenv scan --scope diff

# Compare two branches
ultraenv scan --scope diff --from main --to feature/auth

# Compare last N commits
ultraenv scan --scope diff --from HEAD~5
```

### All

Combines all scan modes:

```bash
ultraenv scan --scope all
```

---

## Output Formats

### Terminal (default)

Human-readable output with color coding:

```bash
ultraenv scan
```

```
🔐 Scanning for secrets...

  CRITICAL  AWS Access Key ID          src/config/aws.ts:12
            Confidence: 95%
            AKIAIOSFODNN7EXAMPLE

  HIGH     GitHub Personal Access     .env:5
            Confidence: 95%
            ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

  MEDIUM   Generic API Key            src/api/client.ts:45
            Confidence: 70%
            sk-1234567890abcdefghijklmnop

  Found 3 potential secret(s)!
```

### JSON

Machine-readable JSON output:

```bash
ultraenv scan --format json
```

```json
{
  "found": true,
  "secrets": [
    {
      "type": "AWS Access Key ID",
      "value": "AKIA...EXAMPLE",
      "file": "src/config/aws.ts",
      "line": 12,
      "column": 15,
      "pattern": {
        "id": "aws-access-key-id",
        "name": "AWS Access Key ID",
        "confidence": 0.95,
        "severity": "critical"
      },
      "confidence": 0.95
    }
  ],
  "filesScanned": 142,
  "filesSkipped": 3,
  "scanTimeMs": 234
}
```

### SARIF

Static Analysis Results Interchange Format for GitHub Code Scanning:

```bash
ultraenv scan --format sarif --output results.sarif
```

Integrates with [GitHub Code Scanning](https://docs.github.com/en/code-security/code-scanning):

```yaml
- name: Scan for secrets
  run: ultraenv scan --format sarif --output results.sarif

- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: results.sarif
```

---

## Secret Patterns

### AWS (4 patterns)

| Pattern | ID | Confidence | Severity |
|---|---|---|---|
| AWS Access Key ID | `aws-access-key-id` | 0.95 | critical |
| AWS Secret Access Key | `aws-secret-access-key` | 0.85 | critical |
| AWS Session Token | `aws-session-token` | 0.90 | critical |
| AWS Account ID | `aws-account-id` | 0.30 | medium |

### GitHub (6 patterns)

| Pattern | ID | Confidence | Severity |
|---|---|---|---|
| GitHub Personal Access Token | `github-personal-access-token` | 0.95 | critical |
| GitHub OAuth Access Token | `github-oauth-access-token` | 0.95 | critical |
| GitHub App Token | `github-app-token` | 0.95 | critical |
| GitHub Refresh Token | `github-refresh-token` | 0.95 | critical |
| GitHub User-to-Server Token | `github-user-to-server-token` | 0.95 | critical |
| GitHub Webhook Secret | `github-webhook-secret` | 0.90 | high |

### Google (5 patterns)

| Pattern | ID | Confidence | Severity |
|---|---|---|---|
| Google API Key | `google-api-key` | 0.85 | high |
| Google OAuth Client ID | `google-oauth-client-id` | 0.85 | medium |
| Google OAuth Client Secret | `google-oauth-client-secret` | 0.90 | critical |
| Google Firebase API Key | `google-firebase-api-key` | 0.80 | high |
| Google Service Account Private Key | `google-service-account-private-key` | 0.95 | critical |

### Stripe (3 patterns)

| Pattern | ID | Confidence | Severity |
|---|---|---|---|
| Stripe Secret Key | `stripe-secret-key` | 0.95 | critical |
| Stripe Publishable Key | `stripe-publishable-key` | 0.70 | medium |
| Stripe Restricted Key | `stripe-restricted-key` | 0.95 | critical |

### Slack (4 patterns)

| Pattern | ID | Confidence | Severity |
|---|---|---|---|
| Slack Bot Token | `slack-bot-token` | 0.90 | critical |
| Slack User Token | `slack-user-token` | 0.90 | critical |
| Slack App-Level Token | `slack-app-token` | 0.90 | critical |
| Slack Webhook URL | `slack-webhook-url` | 0.90 | high |

### Private Keys & Certificates (8 patterns)

| Pattern | ID | Confidence | Severity |
|---|---|---|---|
| RSA Private Key | `rsa-private-key` | 0.99 | critical |
| EC Private Key | `ec-private-key` | 0.99 | critical |
| DSA Private Key | `dsa-private-key` | 0.99 | critical |
| OpenSSH Private Key | `openssh-private-key` | 0.99 | critical |
| PGP Private Key | `pgp-private-key` | 0.99 | critical |
| PKCS#8 Private Key | `pkcs8-private-key` | 0.99 | critical |
| Encrypted Private Key | `encrypted-private-key` | 0.95 | critical |
| PEM Certificate | `pem-certificate` | 0.85 | high |

### Database (5 patterns)

| Pattern | ID | Confidence | Severity |
|---|---|---|---|
| MongoDB Connection String | `mongodb-connection-string` | 0.90 | critical |
| PostgreSQL Connection String | `postgresql-connection-string` | 0.90 | critical |
| MySQL Connection String | `mysql-connection-string` | 0.90 | critical |
| Redis Connection String | `redis-connection-string` | 0.85 | critical |
| CouchDB Connection String | `couchdb-connection-string` | 0.85 | critical |

### Auth & Tokens (4 patterns)

| Pattern | ID | Confidence | Severity |
|---|---|---|---|
| JSON Web Token | `jwt-token` | 0.75 | high |
| Base64 Credentials | `base64-credentials` | 0.70 | high |
| Base64 Encoded Secret | `base64-encoded-secret` | 0.65 | high |
| Hardcoded Password in URL | `hardcoded-password-url` | 0.80 | critical |

### Messaging (2 patterns)

| Pattern | ID | Confidence | Severity |
|---|---|---|---|
| Telegram Bot Token | `telegram-bot-token` | 0.85 | high |
| Discord Bot Token | `discord-bot-token` | 0.90 | critical |

### Cloud (4 patterns)

| Pattern | ID | Confidence | Severity |
|---|---|---|---|
| Azure Connection String | `azure-connection-string` | 0.95 | critical |
| DigitalOcean API Token | `digitalocean-token` | 0.95 | critical |
| Cloudflare API Token | `cloudflare-api-token` | 0.90 | critical |
| Heroku API Key | `heroku-api-key` | 0.70 | high |

### Generic (5+ patterns)

| Pattern | ID | Confidence | Severity |
|---|---|---|---|
| Generic API Key Assignment | `generic-api-key-assignment` | 0.70 | high |
| Generic Token Assignment | `generic-token-assignment` | 0.60 | high |
| Generic Secret Assignment | `generic-secret-assignment` | 0.65 | high |
| Generic Password Assignment | `generic-password-assignment` | 0.75 | high |
| .env File Secret Pattern | `env-file-secret-pattern` | 0.70 | high |

---

## Custom Patterns

Add your own patterns for company-specific secrets:

```typescript
import { addCustomPattern, removeCustomPattern, resetPatterns } from 'ultraenv';

// Add a custom pattern
addCustomPattern({
  id: 'my-company-api-key',
  name: 'My Company API Key',
  pattern: /MYCO_[A-Za-z0-9]{32}/g,
  confidence: 0.9,
  severity: 'critical',
  description: 'Company-specific API key format',
  remediation: 'Rotate the key and store in ultraenv vault.',
  category: 'internal',
});

// Add via config file (.ultraenvrc.json)
{
  "scan": {
    "customPatterns": [
      {
        "id": "internal-service-token",
        "name": "Internal Service Token",
        "pattern": "ISTK_[A-Za-z0-9]{40}",
        "confidence": 0.95,
        "severity": "critical",
        "description": "Internal microservice authentication token",
        "remediation": "Rotate token and store in vault.",
        "category": "internal"
      }
    ]
  }
}
```

### Pattern Properties

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | ✅ | Unique identifier |
| `name` | `string` | ✅ | Human-readable name |
| `pattern` | `RegExp` or `string` | ✅ | Regex pattern to match |
| `confidence` | `number` | ✅ | Confidence score (0.0–1.0) |
| `severity` | `string` | ✅ | `critical`, `high`, or `medium` |
| `description` | `string` | ✅ | What the pattern detects |
| `remediation` | `string` | ✅ | How to fix the issue |
| `category` | `string` | ✅ | Category for grouping |

---

## Git Hook Integration

### Install Pre-Commit Hook

```bash
ultraenv install-hook
```

This installs a pre-commit hook that runs `ultraenv scan --scope staged` before every commit. Commits with detected secrets are blocked.

### Install Pre-Push Hook

```bash
ultraenv install-hook --hook-type pre-push
```

### Manual Hook Setup

Add to `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx ultraenv scan --scope staged --format json --fail-fast
```

---

## False Positives

### Suppressing False Positives

Add a suppression comment on the line before or on the same line:

```typescript
// ultraenv-ignore
const apiKey = 'MYCO_abcdefghijklmnopqrstuvwxyz123456';

const testKey = 'AKIAIOSFODNN7EXAMPLE'; // ultraenv-ignore
```

### Low-Confidence Results

Results with confidence below 0.5 are marked as medium severity. Review these manually:

```bash
# Only show high-confidence results
ultraenv scan --min-confidence 0.8
```

---

## CI/CD Integration

### GitHub Actions

```yaml
- name: Scan for secrets
  run: ultraenv ci scan --format sarif --output results.sarif
  continue-on-error: true

- name: Upload SARIF
  if: always()
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: results.sarif
  continue-on-error: true
```

### GitLab CI

```yaml
scan-secrets:
  stage: scan
  image: node:20
  before_script:
    - npm install -g ultraenv
  script:
    - ultraenv ci scan --format json > scan-results.json
  artifacts:
    paths:
      - scan-results.json
    when: always
  allow_failure: true
```

---

## Programmatic API

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

// Full scan
const result = await scan({
  cwd: '/path/to/project',
  include: ['src/', 'config/'],
  exclude: ['**/*.test.ts', 'node_modules/**'],
  scanGitHistory: false,
  scanStaged: false,
  failFast: false,
});

// Check results
if (result.found) {
  for (const secret of result.secrets) {
    console.log(`${secret.type}: ${secret.file}:${secret.line}`);
    console.log(`  Confidence: ${(secret.confidence * 100).toFixed(0)}%`);
    console.log(`  Severity: ${secret.pattern.severity}`);
    console.log(`  Fix: ${secret.pattern.remediation}`);
  }
}

// Pattern matching
const matches = matchPatterns('const key = "AKIAIOSFODNN7EXAMPLE"');

// Entropy detection
const highEntropy = detectHighEntropyStrings('xJ3k9mP2nQ7vR1wY5aB8cD4fG6hJ0');
```

---

## Configuration

Add to `.ultraenvrc.json`:

```json
{
  "scan": {
    "include": ["src/", "config/", "scripts/"],
    "exclude": [
      "**/*.test.ts",
      "**/*.spec.ts",
      "node_modules/**",
      "dist/**",
      "coverage/**"
    ],
    "scanGitHistory": false,
    "maxFileSize": 1048576,
    "failFast": false,
    "customPatterns": []
  }
}
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `include` | `string[]` | `['**']` | File patterns to include |
| `exclude` | `string[]` | `[]` | File patterns to exclude |
| `scanGitHistory` | `boolean` | `false` | Scan full git history |
| `maxFileSize` | `number` | `1048576` | Max file size in bytes |
| `failFast` | `boolean` | `false` | Stop on first match |
| `customPatterns` | `object[]` | `[]` | Custom secret patterns |

---

## Troubleshooting

### "No secrets found" but I know there are secrets

- Ensure you're scanning the correct paths
- Check if the files are in the exclude list
- Try `--scope all` to include git history
- Add custom patterns for company-specific formats

### Too many false positives

- Increase the minimum confidence: `--min-confidence 0.8`
- Add `// ultraenv-ignore` comments for known false positives
- Adjust the exclude patterns

### Scan is slow

- Exclude `node_modules/`, `dist/`, `vendor/` directories
- Don't use `--scope git-history` unless necessary
- Set `--max-file-size` to skip large files
