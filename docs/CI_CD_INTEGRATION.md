# CI/CD Integration Guide

Integrate ultraenv into your CI/CD pipeline for automated validation, secret scanning, and environment sync checks.

## Table of Contents

- [Overview](#overview)
- [Quick Setup](#quick-setup)
- [GitHub Actions](#github-actions)
- [GitLab CI](#gitlab-ci)
- [CI Commands](#ci-commands)
- [Secret Scanning in CI](#secret-scanning-in-ci)
- [Vault Decryption in CI](#vault-decryption-in-ci)
- [GitHub Code Scanning](#github-code-scanning)
- [Custom Pipelines](#custom-pipelines)
- [Exit Codes](#exit-codes)
- [Best Practices](#best-practices)

---

## Overview

ultraenv provides dedicated CI commands that:

- **Validate** environment variables in strict mode
- **Check sync** between `.env` and `.env.example`
- **Scan for secrets** with SARIF output
- **Decrypt vault** secrets for deployment
- **Fail the build** when issues are detected

---

## Quick Setup

```bash
# Generate CI configuration
ultraenv ci setup --platform github
```

This creates a complete CI pipeline with all checks.

---

## GitHub Actions

### Auto-Generated Workflow

Running `ultraenv ci setup --platform github` creates `.github/workflows/ultraenv.yml`:

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

### Minimal Workflow

```yaml
name: Env Check

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g ultraenv
      - run: ultraenv ci validate --strict
      - run: ultraenv ci check-sync
```

### With Vault Decryption

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install ultraenv
        run: npm install -g ultraenv

      - name: Decrypt production secrets
        run: ultraenv vault decrypt --env production
        env:
          ULTRAENV_KEY_PRODUCTION: ${{ secrets.ULTRAENV_KEY_PRODUCTION }}

      - name: Validate
        run: ultraenv ci validate --strict

      - name: Deploy
        run: npm run deploy
```

---

## GitLab CI

### Auto-Generated Pipeline

Running `ultraenv ci setup --platform gitlab` creates `.gitlab-ci.yml`:

```yaml
stages:
  - validate
  - scan

variables:
  NODE_VERSION: "20"

.validate-env:
  stage: validate
  image: node:${NODE_VERSION}
  before_script:
    - npm install -g ultraenv
  script:
    - ultraenv ci validate --strict
    - ultraenv ci check-sync

.scan-secrets:
  stage: scan
  image: node:${NODE_VERSION}
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

### With Vault

```yaml
deploy:
  stage: deploy
  image: node:20
  before_script:
    - npm install -g ultraenv
    - ultraenv vault decrypt --env production
  variables:
    ULTRAENV_KEY_PRODUCTION: $CI_ULTRAENV_KEY_PRODUCTION
  script:
    - ultraenv ci validate --strict
    - npm run deploy
```

---

## CI Commands

### `ci validate`

Validate environment in strict mode.

```bash
ultraenv ci validate [options]
```

| Flag | Description | Default |
|---|---|---|
| `--strict` | Fail on warnings | `false` |
| `--format <fmt>` | `json` or `silent` | `json` |

### `ci check-sync`

Check `.env` ↔ `.env.example` sync.

```bash
ultraenv ci check-sync [options]
```

| Flag | Description |
|---|---|
| `--format <fmt>` | `json` or `silent` |

### `ci scan`

Scan for secrets with structured output.

```bash
ultraenv ci scan [options]
```

| Flag | Description | Default |
|---|---|---|
| `--format <fmt>` | `json` or `sarif` | `json` |
| `--output <path>` | Output file path | — |

---

## Secret Scanning in CI

### JSON Output

```bash
ultraenv ci scan --format json > scan-results.json
```

```json
{
  "found": true,
  "secrets": [...],
  "filesScanned": 142,
  "scanTimeMs": 234
}
```

### SARIF Output

```bash
ultraenv ci scan --format sarif --output results.sarif
```

### GitHub Code Scanning Integration

```yaml
- name: Scan for secrets
  run: ultraenv ci scan --format sarif --output results.sarif

- name: Upload SARIF
  if: always()
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: results.sarif
```

---

## Vault Decryption in CI

### Step 1: Store Key in CI Secrets

**GitHub:**
```bash
gh secret set ULTRAENV_KEY_PRODUCTION --body "ultraenv_key_v1_..."
```

**GitLab:**
Settings → CI/CD → Variables → Add `ULTRAENV_KEY_PRODUCTION`

### Step 2: Decrypt in Pipeline

```yaml
- name: Decrypt secrets
  run: ultraenv vault decrypt --env production
  env:
    ULTRAENV_KEY_PRODUCTION: ${{ secrets.ULTRAENV_KEY_PRODUCTION }}
```

### Step 3: Use Decrypted Values

```yaml
- name: Deploy
  run: npm run deploy
  # .env.production is now available with decrypted values
```

---

## GitHub Code Scanning

### Enable Code Scanning

1. Go to **Settings → Code security → Code scanning**
2. ultraenv SARIF results will appear alongside other scanning tools
3. Secrets are categorized by severity (critical, high, medium)

### Annotate PRs

```yaml
- name: Scan for secrets
  id: scan
  run: |
    ultraenv ci scan --format json > results.json
    echo "count=$(jq '.secrets | length' results.json)" >> $GITHUB_OUTPUT

- name: Comment on PR
  if: steps.scan.outputs.count > 0
  uses: actions/github-script@v7
  with:
    script: |
      const results = require('./results.json');
      const count = results.secrets.length;
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: `⚠️ **${count} potential secret(s)** detected by ultraenv.\n\nRun \`ultraenv scan\` locally to review.`
      });
```

---

## Custom Pipelines

### Jenkins

```groovy
pipeline {
  agent any
  stages {
    stage('Validate') {
      steps {
        sh 'npm install -g ultraenv'
        sh 'ultraenv ci validate --strict --format json'
        sh 'ultraenv ci check-sync'
      }
    }
    stage('Scan') {
      steps {
        sh 'ultraenv ci scan --format json > scan-results.json'
      }
    }
  }
}
```

### Bitbucket Pipelines

```yaml
pipelines:
  default:
    - step:
        name: Validate
        script:
          - npm install -g ultraenv
          - ultraenv ci validate --strict
          - ultraenv ci check-sync
    - step:
        name: Scan
        script:
          - ultraenv ci scan --format json
```

### CircleCI

```yaml
version: 2.1
jobs:
  validate:
    docker:
      - image: node:20
    steps:
      - checkout
      - run: npm install -g ultraenv
      - run: ultraenv ci validate --strict
      - run: ultraenv ci check-sync
      - run: ultraenv ci scan --format json
```

---

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | Success — all checks passed |
| `1` | Failure — validation errors, sync issues, or secrets found |

### Fail-Fast

```bash
# Stop on first issue
ultraenv ci validate --strict --fail-fast
ultraenv ci scan --fail-fast
```

### Allow Failures

```yaml
# Continue even if scan finds secrets
- name: Scan for secrets
  run: ultraenv ci scan --format sarif --output results.sarif
  continue-on-error: true
```

---

## Best Practices

### ✅ Recommended

- Run validation on every push and PR
- Use `--strict` mode in CI to catch warnings
- Scan for secrets in CI (even if you scan locally)
- Use SARIF output for GitHub Code Scanning integration
- Store vault keys in CI secrets (never in code)
- Run `ci check-sync` to prevent `.env.example` drift

### ❌ Avoid

- Don't skip CI checks with `continue-on-error` on validate
- Don't store vault keys in CI config files
- Don't decrypt vault in PR builds (only in deploy)
- Don't suppress scan results without review
