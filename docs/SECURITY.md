# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.x.x | ✅ Active |
| < 1.0 | ❌ End of Life |

---

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **DO NOT** open a public GitHub issue
2. Email security reports to: **avinashvelu03@gmail.com**
3. Include the following in your report:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

### What to Expect

- **Acknowledgment** within 24 hours
- **Initial assessment** within 48 hours
- **Status updates** every 7 days
- **Patch release** within 30 days for critical issues

### Response Timeline

| Severity | Response Time | Patch Timeline |
|---|---|---|
| Critical | 24 hours | 48 hours |
| High | 48 hours | 7 days |
| Medium | 72 hours | 30 days |
| Low | 1 week | Next release |

---

## Security Measures

### Encryption

- AES-256-GCM authenticated encryption for vault
- HKDF key derivation with random salts
- 12-byte random nonce per encrypted value
- 16-byte GCM authentication tags

### Key Management

- Keys are never logged or printed (masked by default)
- Secure memory handling with `SecureBuffer` and `SecureString`
- Zeroing memory after use
- Timing-safe comparisons

### Secret Scanning

- 55+ built-in patterns for common secret formats
- Shannon entropy analysis for high-entropy strings
- Git history scanning
- SARIF output for CI/CD integration

### Dependency Security

- **Zero runtime dependencies**
- Only Node.js built-in modules (`crypto`, `fs`, `path`, etc.)
- No network requests
- No code execution from environment values

---

## Security Best Practices for Users

### ✅ Do

- Store `.env.keys` in a secure secrets manager
- Use `ultraenv vault encrypt` for sensitive values
- Run `ultraenv scan` regularly
- Install the pre-commit hook: `ultraenv install-hook`
- Use `ultraenv ci scan` in your CI/CD pipeline
- Rotate encryption keys regularly
- Commit `.env.vault` (it's encrypted and safe)

### ❌ Don't

- Never commit `.env.keys` to version control
- Never commit `.env` or `.env.local` files
- Never share encryption keys via email or Slack
- Never use the same key across environments
- Never skip validation in production

---

## Vulnerability Disclosure

When a vulnerability is reported and confirmed:

1. Create a security advisory (GitHub Security)
2. Develop a fix in a private branch
3. Coordinate disclosure with reporter
4. Release patch with CVE if applicable
5. Publish advisory after patch is available

---

## Credits

We acknowledge the following security researchers and projects that have helped improve ultraenv's security:

- [gitleaks](https://github.com/gitleaks/gitleaks) — Secret detection patterns
- [trufflehog](https://github.com/trufflesecurity/trufflehog) — Secret scanning methodology
