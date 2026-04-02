# CLI Reference

Complete reference for the ultraenv command-line interface.

## Usage

```bash
ultraenv <command> [options] [args]
```

## Global Flags

| Flag | Short | Description |
|---|---|---|
| `--config <path>` | — | Path to configuration file |
| `--cwd <path>` | — | Working directory |
| `--format <fmt>` | — | Output format: `terminal`, `json`, `silent` |
| `--debug` | — | Enable debug output |
| `--no-color` | — | Disable color output |
| `-q` | `--quiet` | Suppress non-error output |
| `-v` | `--version` | Show version |
| `-h` | `--help` | Show help |

---

## Core Commands

### `init`

Initialize a new ultraenv project.

```bash
ultraenv init [options]
```

**What it does:**
- Creates `.ultraenvrc.json` configuration file
- Creates `.env` with sensible defaults
- Creates `.env.example` template
- Updates `.gitignore` with ultraenv entries

**Options:**

| Flag | Description |
|---|---|
| `--cwd <path>` | Target directory |
| `--force` | Overwrite existing configuration |

**Example:**

```bash
ultraenv init
ultraenv init --cwd ./my-app
ultraenv init --force
```

---

### `validate`

Load and validate environment variables.

```bash
ultraenv validate [options]
```

**What it does:**
- Loads `.env` files based on cascade
- Parses and interpolates variables
- Validates against schema (if defined)
- Shows loaded files, variable count, and load time

**Options:**

| Flag | Description |
|---|---|
| `--cwd <path>` | Environment directory |
| `--format <fmt>` | Output format |
| `--quiet` | Suppress variable listing |

**Example:**

```bash
ultraenv validate
ultraenv validate --format json
ultraenv validate --cwd ./config
```

**JSON Output:**

```json
{
  "valid": true,
  "metadata": {
    "totalVars": 24,
    "filesParsed": 3,
    "loadTimeMs": 2
  },
  "variables": 24,
  "env": {
    "NODE_ENV": "development",
    "PORT": "3000"
  }
}
```

---

### `typegen`

Generate TypeScript type definitions from environment schema.

```bash
ultraenv typegen [options]
```

**Options:**

| Flag | Description | Default |
|---|---|---|
| `--format <fmt>` | `declaration`, `module`, or `json-schema` | `declaration` |
| `--out <path>` | Output file path | `src/env.d.ts` |
| `--interface <name>` | Interface name | `Env` |

**Default output paths:**

| Format | Default Path |
|---|---|
| `declaration` | `src/env.d.ts` |
| `module` | `src/env.ts` |
| `json-schema` | `env.schema.json` |

**Examples:**

```bash
# Generate declaration file
ultraenv typegen --format declaration --out src/env.d.ts

# Generate TypeScript module
ultraenv typegen --format module --out src/env.ts

# Generate JSON Schema
ultraenv typegen --format json-schema --out env.schema.json

# Custom interface name
ultraenv typegen --interface AppConfig --out src/config.d.ts
```

---

### `sync`

Synchronize `.env.example` with `.env`.

```bash
ultraenv sync [options]
```

**Options:**

| Flag | Description | Default |
|---|---|---|
| `--mode <mode>` | `check`, `generate`, `interactive`, or `watch` | `check` |
| `--file <path>` | Source `.env` file path | `.env` |
| `--out <path>` | Target `.env.example` path | `.env.example` |

**Modes:**

| Mode | Description |
|---|---|
| `check` | Compare `.env` and `.env.example`, report differences |
| `generate` | Auto-generate `.env.example` from `.env` |
| `interactive` | Show differences and confirm before updating |
| `watch` | Watch for changes and auto-update `.env.example` |

**Examples:**

```bash
# Check if in sync
ultraenv sync --mode check

# Generate .env.example
ultraenv sync --mode generate

# Interactive review
ultraenv sync --mode interactive

# Watch mode
ultraenv sync --mode watch

# Custom paths
ultraenv sync --mode generate --file .env.production --out .env.production.example
```

---

### `scan`

Scan codebase for leaked secrets and credentials.

```bash
ultraenv scan [paths...] [options]
```

**Options:**

| Flag | Description | Default |
|---|---|---|
| `--scope <scope>` | `files`, `git-history`, `staged`, `diff`, or `all` | `files` |
| `--format <fmt>` | `terminal`, `json`, or `sarif` | `terminal` |
| `--include <pattern>` | Files/patterns to include | `**` |
| `--exclude <pattern>` | Files/patterns to exclude | — |
| `--fail-fast` | Stop on first match | `false` |
| `--from <ref>` | Git diff base ref (with `--scope diff`) | `HEAD` |
| `--to <ref>` | Git diff target ref | — |
| `--output <path>` | Output file path (for sarif) | — |

**Examples:**

```bash
# Scan current directory
ultraenv scan

# Scan specific paths
ultraenv scan src/ config/ scripts/

# Scan git history
ultraenv scan --scope git-history

# Scan staged files (for pre-commit)
ultraenv scan --scope staged

# Scan diff against main branch
ultraenv scan --scope diff --from main

# Scan everything
ultraenv scan --scope all

# SARIF output for GitHub Code Scanning
ultraenv scan --scope all --format sarif --output results.sarif

# JSON output for CI
ultraenv scan --format json > scan-results.json

# With include/exclude
ultraenv scan --include "src/**" --exclude "src/**/*.test.ts"
```

---

### `debug`

Show diagnostic information for troubleshooting.

```bash
ultraenv debug [options]
```

**What it shows:**
- ultraenv version
- Node.js version
- Platform information
- Configuration file location
- Loaded environment files
- Schema validation status
- Vault status (if configured)

```bash
ultraenv debug
ultraenv debug --format json
```

---

### `protect`

Check and update `.gitignore` for secret protection.

```bash
ultraenv protect [options]
```

**What it does:**
- Checks if `.gitignore` contains ultraenv entries
- Adds missing entries (`.env.vault`, `.env.keys`, `.env.*.local`)
- Warns if sensitive files are not gitignored

```bash
ultraenv protect
```

---

### `doctor`

Run self-checks and diagnose common issues.

```bash
ultraenv doctor [options]
```

**Checks:**
- ultraenv installation integrity
- Configuration file validity
- `.env` file accessibility
- `.gitignore` protection
- Node.js version compatibility
- File permissions

```bash
ultraenv doctor
```

---

## Vault Commands

### `vault init`

Initialize the encrypted vault.

```bash
ultraenv vault init [options]
```

**Options:**

| Flag | Description | Default |
|---|---|---|
| `--env <name>` | Environment name | `production` |
| `--key <key>` | Existing encryption key | auto-generate |
| `--cwd <path>` | Working directory | `.` |
| `--force` | Overwrite existing vault | `false` |

**Creates:**
- `.env.keys` — Decryption keys (NEVER commit)
- `.env.vault` — Encrypted secrets (safe to commit)

```bash
ultraenv vault init
ultraenv vault init --env staging
ultraenv vault init --env production --force
```

---

### `vault encrypt`

Encrypt environment variables into the vault.

```bash
ultraenv vault encrypt [options]
```

**Options:**

| Flag | Description | Default |
|---|---|---|
| `--env <name>` | Environment name | `production` |
| `--key <key>` | Encryption key | read from `.env.keys` |
| `--input <file>` | Input `.env` file | `.env.<env>` |

```bash
ultraenv vault encrypt --env production
ultraenv vault encrypt --env staging --input .env.staging
```

---

### `vault decrypt`

Decrypt environment variables from the vault.

```bash
ultraenv vault decrypt [options]
```

**Options:**

| Flag | Description | Default |
|---|---|---|
| `--env <name>` | Environment name | `production` |
| `--key <key>` | Decryption key | read from `.env.keys` |
| `--output <file>` | Output file | `.env.<env>` |

```bash
ultraenv vault decrypt --env production
ultraenv vault decrypt --env staging --output .env.staging
```

---

### `vault rekey`

Rotate encryption keys and re-encrypt all vault data.

```bash
ultraenv vault rekey [options]
```

**Options:**

| Flag | Description | Default |
|---|---|---|
| `--env <name>` | Environment name | `production` |
| `--key <key>` | New encryption key | auto-generate |

```bash
ultraenv vault rekey --env production
```

**Important:** After rekeying, update:
1. Your `.env.keys` file
2. CI/CD secrets (GitHub Secrets, etc.)
3. Team members' local keys

---

### `vault status`

Show vault status and information.

```bash
ultraenv vault status [options]
```

**Options:**

| Flag | Description |
|---|---|
| `--format <fmt>` | `terminal` or `json` |

```bash
ultraenv vault status
ultraenv vault status --format json
```

**Output:**

```
🔐 Vault Status

  Vault file:     .env.vault     ✅ exists
  Keys file:      .env.keys      ✅ exists
  Encrypted:      true
  Environments:   3

  Environment     Variables   Last Modified
  ─────────────   ─────────   ─────────────
  development     12          2024-01-15T10:30:00Z
  staging         15          2024-01-15T11:00:00Z
  production      18          2024-01-15T12:00:00Z
```

---

### `vault diff`

Compare local environment with vault contents.

```bash
ultraenv vault diff [options]
```

**Options:**

| Flag | Description | Default |
|---|---|---|
| `--env <name>` | Environment name | `production` |
| `--file <path>` | Local `.env` file to compare | `.env.<env>` |

```bash
ultraenv vault diff --env production
```

---

### `vault verify`

Verify vault integrity and checksums.

```bash
ultraenv vault verify [options]
```

**Options:**

| Flag | Description |
|---|---|
| `--env <name>` | Environment to verify (default: all) |

```bash
ultraenv vault verify
ultraenv vault verify --env production
```

---

## Environment Commands

### `envs list`

List all discovered environments.

```bash
ultraenv envs list [options]
```

**Options:**

| Flag | Description |
|---|---|
| `--format <fmt>` | `terminal` or `json` |

```bash
ultraenv envs list
```

---

### `envs compare`

Compare two environments side by side.

```bash
ultraenv envs compare <env1> <env2> [options]
```

**Options:**

| Flag | Description |
|---|---|
| `--format <fmt>` | `terminal` or `json` |
| `--show-values` | Show actual values (masked by default) |

```bash
ultraenv envs compare development production
ultraenv envs compare staging production --show-values
```

---

### `envs validate`

Validate all environments against the schema.

```bash
ultraenv envs validate [options]
```

```bash
ultraenv envs validate
```

---

### `envs create`

Create a new environment file.

```bash
ultraenv envs create <name> [options]
```

**Options:**

| Flag | Description |
|---|---|
| `--from <env>` | Copy values from existing environment |
| `--cwd <path>` | Working directory |

```bash
ultraenv envs create staging
ultraenv envs create production --from staging
```

---

### `envs switch`

Switch the active environment.

```bash
ultraenv envs switch <name> [options]
```

```bash
ultraenv envs switch production
ultraenv envs switch development
```

---

## CI Commands

### `ci validate`

Validate environment in CI (strict mode).

```bash
ultraenv ci validate [options]
```

**Options:**

| Flag | Description | Default |
|---|---|---|
| `--strict` | Fail on warnings | `false` |
| `--format <fmt>` | `json` or `silent` | `json` |

```bash
ultraenv ci validate --strict
ultraenv ci validate --strict --format json
```

---

### `ci check-sync`

Check `.env` ↔ `.env.example` sync in CI.

```bash
ultraenv ci check-sync [options]
```

```bash
ultraenv ci check-sync
ultraenv ci check-sync --format json
```

---

### `ci scan`

Scan for secrets in CI with structured output.

```bash
ultraenv ci scan [options]
```

**Options:**

| Flag | Description | Default |
|---|---|---|
| `--format <fmt>` | `json` or `sarif` | `json` |
| `--output <path>` | Output file path | — |

```bash
ultraenv ci scan
ultraenv ci scan --format sarif --output results.sarif
ultraenv ci scan --format json > scan-results.json
```

---

### `ci setup`

Generate CI configuration files.

```bash
ultraenv ci setup [options]
```

**Options:**

| Flag | Description | Default |
|---|---|---|
| `--platform <p>` | `github` or `gitlab` | `github` |
| `--force` | Overwrite existing config | `false` |
| `--cwd <path>` | Working directory | `.` |

```bash
ultraenv ci setup --platform github
ultraenv ci setup --platform gitlab
ultraenv ci setup --platform github --force
```

---

## Utility Commands

### `install-hook`

Install a git pre-commit hook for secret scanning.

```bash
ultraenv install-hook [options]
```

**Options:**

| Flag | Description |
|---|---|
| `--force` | Overwrite existing hook |
| `--hook-type <type>` | `pre-commit` or `pre-push` |

```bash
ultraenv install-hook
ultraenv install-hook --hook-type pre-push
```

---

### `completion`

Generate shell completion scripts.

```bash
ultraenv completion <shell>
```

**Supported shells:**

- `bash`
- `zsh`
- `fish`
- `powershell`

```bash
# Bash
ultraenv completion bash > ~/.ultraenv-completion.bash
echo 'source ~/.ultraenv-completion.bash' >> ~/.bashrc

# Zsh
ultraenv completion zsh > ~/.ultraenv-completion.zsh
echo 'source ~/.ultraenv-completion.zsh' >> ~/.zshrc

# Fish
ultraenv completion fish > ~/.config/fish/completions/ultraenv.fish
```

---

### `help`

Show help for a command.

```bash
ultraenv help [command]
```

```bash
ultraenv help
ultraenv help scan
ultraenv help vault encrypt
```
