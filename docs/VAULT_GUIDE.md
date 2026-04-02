# Encryption & Vault Guide

Securely manage secrets across environments with AES-256-GCM encryption.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Vault Initialization](#vault-initialization)
- [Encrypting Secrets](#encrypting-secrets)
- [Decrypting Secrets](#decrypting-secrets)
- [Key Rotation](#key-rotation)
- [Multi-Environment Vaults](#multi-environment-vaults)
- [CI/CD Integration](#cicd-integration)
- [Vault Integrity](#vault-integrity)
- [Programmatic API](#programmatic-api)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The ultraenv vault provides encrypted storage for environment secrets. Key features:

- **AES-256-GCM** authenticated encryption
- **Per-value encryption** — each variable encrypted independently
- **Key derivation** with HKDF and random salts
- **Safe to commit** — `.env.vault` contains only ciphertext
- **Key rotation** — re-encrypt all values with a new key
- **Integrity verification** — checksums and tamper detection
- **Multi-environment** — separate encryption per environment

---

## Quick Start

```bash
# 1. Initialize vault
ultraenv vault init --env production

# 2. Set your secrets in .env.production
echo "DATABASE_URL=postgres://user:pass@host:5432/db" > .env.production
echo "JWT_SECRET=your-super-secret-key" >> .env.production

# 3. Encrypt to vault
ultraenv vault encrypt --env production

# 4. Commit vault (safe!)
git add .env.vault
git commit -m "Add encrypted production vault"

# 5. Team members decrypt
ultraenv vault decrypt --env production
# Creates .env.production with decrypted values
```

---

## How It Works

### Architecture

```
.env.production          .env.keys            .env.vault
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ DATABASE_URL=... │    │ ULTRAENV_KEY_   │    │ # ultraenv vault│
│ JWT_SECRET=...   │ →  │ PRODUCTION="..."│ →  │ encrypted:v1:..│
│ API_KEY=...      │    │                 │    │ encrypted:v1:..│
└─────────────────┘    └─────────────────┘    └─────────────────┘
  (plaintext)            (NEVER commit)         (safe to commit)
```

### Encryption Process

1. **Key Generation**: A 256-bit master key is generated using `crypto.randomBytes`
2. **Salt Generation**: A 16-byte random salt is created per encryption
3. **Key Derivation**: HKDF derives an environment-specific key from the master key + salt
4. **IV Generation**: A 12-byte random nonce is generated per value
5. **Encryption**: AES-256-GCM encrypts the value
6. **Storage**: Encrypted data stored as `encrypted:v1:aes-256-gcm:<base64>`

### Encrypted Value Format

```
encrypted:v1:aes-256-gcm:<base64-encoded-iv>:<base64-encoded-ciphertext>:<base64-encoded-auth-tag>
```

---

## Vault Initialization

### CLI

```bash
# Default (production environment)
ultraenv vault init

# Specific environment
ultraenv vault init --env development
ultraenv vault init --env staging
ultraenv vault init --env production

# With existing key
ultraenv vault init --env production --key "ultraenv_key_v1_abc123..."

# Force overwrite
ultraenv vault init --env production --force
```

### Programmatic

```typescript
import {
  generateMasterKey,
  formatKey,
  generateKeysFile,
} from 'ultraenv';

// Generate a new master key (32 bytes / 256 bits)
const key = generateMasterKey();
// → Buffer

// Format for storage
const keyFormatted = formatKey(key);
// → "ultraenv_key_v1_<base64-encoded-key>"

// Generate keys file content
const keysContent = generateKeysFile(['development', 'staging', 'production']);
// → ULTRAENV_KEY_DEVELOPMENT="ultraenv_key_v1_..."
// → ULTRAENV_KEY_STAGING="ultraenv_key_v1_..."
// → ULTRAENV_KEY_PRODUCTION="ultraenv_key_v1_..."
```

### Files Created

| File | Description | Commit? |
|---|---|---|
| `.env.keys` | Encryption keys per environment | ❌ **NEVER commit** |
| `.env.vault` | Encrypted secrets | ✅ Safe to commit |

### `.gitignore` Updates

After `vault init`, ultraenv automatically adds these entries to `.gitignore`:

```
# ultraenv — auto-generated entries
.env.vault
.env.keys
.env.*.local
```

> ⚠️ **Important**: `.env.keys` must NEVER be committed to version control. Always store keys in a secure secrets manager.

---

## Encrypting Secrets

### CLI

```bash
# Encrypt all variables from .env.production
ultraenv vault encrypt --env production

# Encrypt from specific file
ultraenv vault encrypt --env staging --input .env.staging
```

### Programmatic

```typescript
import { encryptValue, encryptEnvironment } from 'ultraenv';

// Encrypt a single value
const key = parseKey('ultraenv_key_v1_abc123...');
const encrypted = await encryptValue('my-secret-password', key);
// → "encrypted:v1:aes-256-gcm:iv:ciphertext:auth_tag"

// Check if a value is encrypted
import { isEncryptedValue } from 'ultraenv';
isEncryptedValue('encrypted:v1:aes-256-gcm:...');  // true
isEncryptedValue('plaintext-value');                  // false

// Encrypt an entire environment
const result = await encryptEnvironment(
  {
    DATABASE_URL: 'postgres://...',
    JWT_SECRET: 'my-secret',
    API_KEY: 'key-123',
  },
  key,
);
// → { DATABASE_URL: 'encrypted:v1:...', JWT_SECRET: 'encrypted:v1:...', ... }
```

---

## Decrypting Secrets

### CLI

```bash
# Decrypt to .env.production
ultraenv vault decrypt --env production

# Decrypt to specific file
ultraenv vault decrypt --env staging --output .env.staging
```

### Programmatic

```typescript
import { decryptValue, decryptEnvironment } from 'ultraenv';

// Decrypt a single value
const key = parseKey('ultraenv_key_v1_abc123...');
const decrypted = await decryptValue('encrypted:v1:aes-256-gcm:...', key);
// → "my-secret-password"

// Decrypt entire environment
const env = await decryptEnvironment(
  {
    DATABASE_URL: 'encrypted:v1:...',
    JWT_SECRET: 'encrypted:v1:...',
  },
  key,
);
// → { DATABASE_URL: 'postgres://...', JWT_SECRET: 'my-secret', ... }
```

---

## Key Rotation

Key rotation generates a new master key and re-encrypts all vault values.

### Why Rotate Keys?

- Keys may have been compromised
- Security policy requires periodic rotation
- Team member left the organization
- After a security incident

### CLI

```bash
# Rotate keys for production
ultraenv vault rekey --env production
```

### After Rotation

1. **Update `.env.keys`** — The file is automatically updated with the new key
2. **Update CI/CD secrets** — Update GitHub Secrets, GitLab CI variables, etc.
3. **Notify team members** — Share the new key through a secure channel
4. **Re-decrypt** — Team members run `ultraenv vault decrypt` with the new key

### Programmatic

```typescript
import { rotateKey } from 'ultraenv';

// Rotate key and re-encrypt
const newKey = await rotateKey({
  environment: 'production',
  currentKey: oldKey,
});
// Returns the new key and updates the vault file
```

---

## Multi-Environment Vaults

A single vault file can contain encrypted data for multiple environments.

### Setup

```bash
# Initialize vault for each environment
ultraenv vault init --env development
ultraenv vault init --env staging
ultraenv vault init --env production

# Encrypt each environment
ultraenv vault encrypt --env development
ultraenv vault encrypt --env staging
ultraenv vault encrypt --env production
```

### Vault File Structure

```
# ultraenv encrypted vault — safe to commit
# Generated: 2024-01-15T10:30:00Z
# Environments: development, staging, production

## ENVIRONMENT: development
DATABASE_URL=encrypted:v1:aes-256-gcm:...
DEBUG=encrypted:v1:aes-256-gcm:...

## ENVIRONMENT: staging
DATABASE_URL=encrypted:v1:aes-256-gcm:...
API_KEY=encrypted:v1:aes-256-gcm:...

## ENVIRONMENT: production
DATABASE_URL=encrypted:v1:aes-256-gcm:...
JWT_SECRET=encrypted:v1:aes-256-gcm:...
API_KEY=encrypted:v1:aes-256-gcm:...
```

### Keys File

```
# ultraenv encryption keys — NEVER commit this file
ULTRAENV_KEY_DEVELOPMENT="ultraenv_key_v1_..."
ULTRAENV_KEY_STAGING="ultraenv_key_v1_..."
ULTRAENV_KEY_PRODUCTION="ultraenv_key_v1_..."
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Deploy Production

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

      - name: Deploy
        run: npm run deploy
```

### GitLab CI

```yaml
deploy:
  stage: deploy
  script:
    - npm install -g ultraenv
    - ultraenv vault decrypt --env production
    - npm run deploy
  variables:
    ULTRAENV_KEY_PRODUCTION: $CI_ULTRAENV_KEY_PRODUCTION
```

### Loading Key from Environment

ultraenv automatically checks for the key in the environment variable:

```bash
export ULTRAENV_KEY_PRODUCTION="ultraenv_key_v1_..."
ultraenv vault decrypt --env production
```

---

## Vault Integrity

### Verify Vault

```bash
ultraenv vault verify
ultraenv vault verify --env production
```

### Checksums

Each vault environment has a SHA-256 checksum computed over the encrypted data. Tampering is detected immediately.

### Programmatic

```typescript
import {
  computeVaultChecksum,
  verifyVaultChecksum,
  computeIntegrity,
  verifyIntegrity,
} from 'ultraenv';

// Compute checksum
const checksum = computeVaultChecksum(vaultData);

// Verify checksum
const isValid = verifyVaultChecksum(vaultData, expectedChecksum);
```

---

## Programmatic API

### Key Management

```typescript
import {
  generateMasterKey,    // () => Buffer
  deriveEnvironmentKey, // (masterKey, salt, envName) => Buffer
  formatKey,            // (key) => string
  parseKey,             // (formatted) => Buffer
  isValidKeyFormat,     // (formatted) => boolean
  maskKey,              // (key) => string (masked)
  generateKeysFile,     // (envs[]) => string
  parseKeysFile,        // (content) => Record<string, string>
  rotateKey,            // (opts) => Promise<Buffer>
} from 'ultraenv';
```

### Encryption

```typescript
import {
  encryptValue,         // (plaintext, key) => Promise<string>
  decryptValue,         // (ciphertext, key) => Promise<string>
  encryptEnvironment,   // (env, key) => Promise<Record<string, string>>
  decryptEnvironment,   // (env, key) => Promise<Record<string, string>>
  isEncryptedValue,     // (value) => boolean
} from 'ultraenv';
```

### Vault File Operations

```typescript
import {
  parseVaultFile,       // (content) => VaultFile
  serializeVaultFile,   // (vault) => string
  readVaultFile,        // (path) => Promise<VaultFile>
  writeVaultFile,       // (path, vault) => Promise<void>
  getEnvironmentData,   // (vault, envName) => Record<string, string>
  getVaultEnvironments, // (vault) => string[]
} from 'ultraenv';
```

### Secure Memory

```typescript
import {
  SecureBuffer,        // Securely holds a Buffer
  SecureString,        // Securely holds a string
  createSecureString,  // (str) => SecureString
  createSecureStringFromBuffer, // (Buffer) => SecureString
  wipeString,          // (str) => void (securely zero memory)
  secureCompare,       // (a, b) => boolean (timing-safe)
} from 'ultraenv';
```

---

## Security Best Practices

### ✅ Do

- Store `.env.keys` in a secure secrets manager (AWS Secrets Manager, GitHub Secrets, HashiCorp Vault)
- Use separate keys per environment
- Rotate keys regularly (every 90 days recommended)
- Use `ultraenv vault verify` in CI to detect tampering
- Commit `.env.vault` to version control (it's encrypted)
- Use `.env.keys` with restricted file permissions (`chmod 600`)

### ❌ Don't

- Never commit `.env.keys` to version control
- Never share keys via email, Slack, or other insecure channels
- Never hardcode keys in source code
- Never use the same key across environments
- Never skip key rotation after a security incident

---

## Troubleshooting

### "Invalid key format"

Ensure your key starts with `ultraenv_key_v1_`:

```bash
echo $ULTRAENV_KEY_PRODUCTION
# Should output: ultraenv_key_v1_<base64>
```

### "Vault file corrupted"

Run verification:

```bash
ultraenv vault verify --env production
```

If verification fails, check if the `.env.vault` file was modified outside of ultraenv.

### "Key not found for environment"

Ensure the environment name matches between `.env.keys` and the vault:

```bash
# .env.keys should have:
ULTRAENV_KEY_PRODUCTION="ultraenv_key_v1_..."

# Use the same name:
ultraenv vault decrypt --env production
```

### "Decryption failed"

- Ensure you're using the correct key for the correct environment
- Check if the key was rotated but `.env.keys` wasn't updated
- Try `ultraenv vault verify` to check vault integrity
