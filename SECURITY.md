# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.x.x | :white_check_mark: |
| < 1.0 | :x: |

## Reporting a Vulnerability

We take the security of ultraenv seriously. If you believe you have found a security vulnerability, please report it responsibly.

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them to: **avinashvelu03@gmail.com**

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact (what an attacker could do)
- Any suggested fix (optional but appreciated)

### What to Expect

- **Acknowledgment** within 24 hours
- **Initial assessment** within 48 hours
- **Regular updates** until the issue is resolved
- **Credit** in the release notes (unless you prefer anonymity)

### Severity Levels

| Severity | Response Time | Fix Timeline |
|---|---|---|
| Critical (RCE, data exposure) | 24 hours | 48 hours |
| High (authentication bypass) | 48 hours | 7 days |
| Medium (limited impact) | 72 hours | 30 days |
| Low (informational) | 1 week | Next release |

## Security Features

- **AES-256-GCM** encryption for vault
- **Zero runtime dependencies** (no supply chain attack surface)
- **Secure memory** handling (wiping, timing-safe comparisons)
- **No network requests** (fully offline)
- **No code execution** from environment values

## Best Practices for Users

- Store `.env.keys` in a secrets manager, not in code
- Use `ultraenv scan` to detect leaked secrets
- Enable the pre-commit hook: `ultraenv install-hook`
- Rotate encryption keys regularly
- Never commit `.env` or `.env.keys` files
