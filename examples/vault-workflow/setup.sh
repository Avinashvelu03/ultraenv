#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Ultraenv Vault Workflow - Automated Secret Management
# ─────────────────────────────────────────────────────────────────────────────
#
# This script sets up ultraenv vault for managing encrypted environment secrets
# across development, staging, and production environments.
#
# Usage: ./setup.sh [--env <environment>] [--team <team-name>]
#
# Prerequisites:
#   - Node.js >= 18
#   - ultraenv installed globally or locally
#   - GPG or age for encryption (if not using built-in encryption)
# ─────────────────────────────────────────────────────────────────────────────

COLOR_RESET="\033[0m"
COLOR_BOLD="\033[1m"
COLOR_GREEN="\033[32m"
COLOR_YELLOW="\033[33m"
COLOR_BLUE="\033[34m"
COLOR_RED="\033[31m"
COLOR_CYAN="\033[36m"

log_info()  { echo -e "${COLOR_BLUE}[INFO]${COLOR_RESET} $*"; }
log_ok()    { echo -e "${COLOR_GREEN}[OK]${COLOR_RESET} $*"; }
log_warn()  { echo -e "${COLOR_YELLOW}[WARN]${COLOR_RESET} $*"; }
log_error() { echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $*"; }
log_step()  { echo -e "\n${COLOR_BOLD}${COLOR_CYAN}▶ $*${COLOR_RESET}"; }

# ── Parse arguments ──────────────────────────────────────────────────────────

ENVIRONMENT="${ENVIRONMENT:-development}"
TEAM_NAME="${TEAM_NAME:-}"
VAULT_DIR=".vault"
FORCE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --env)       ENVIRONMENT="$2"; shift 2 ;;
    --team)      TEAM_NAME="$2"; shift 2 ;;
    --vault-dir) VAULT_DIR="$2"; shift 2 ;;
    --force)     FORCE=true; shift ;;
    --help|-h)
      echo "Usage: $0 [--env <env>] [--team <team>] [--vault-dir <dir>] [--force]"
      exit 0
      ;;
    *) log_error "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Validate environment ─────────────────────────────────────────────────────

VALID_ENVS=("development" "staging" "production")
if [[ ! " ${VALID_ENVS[*]} " =~ " ${ENVIRONMENT} " ]]; then
  log_error "Invalid environment: ${ENVIRONMENT}. Must be one of: ${VALID_ENVS[*]}"
  exit 1
fi

# ── Check prerequisites ─────────────────────────────────────────────────────

log_step "Checking prerequisites..."

# Check for Node.js
if ! command -v node &> /dev/null; then
  log_error "Node.js is not installed. Please install Node.js >= 18."
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [[ "$NODE_VERSION" -lt 18 ]]; then
  log_error "Node.js version must be >= 18. Current: $(node -v)"
  exit 1
fi
log_ok "Node.js $(node -v) detected"

# Check for ultraenv
if command -v ultraenv &> /dev/null; then
  log_ok "ultraenv CLI found"
else
  log_warn "ultraenv CLI not found globally. Checking local installation..."
  if [[ -f "./node_modules/.bin/ultraenv" ]]; then
    log_ok "ultraenv found in node_modules"
  else
    log_error "ultraenv is not installed. Run: npm install ultraenv"
    exit 1
  fi
fi

# ── Step 1: Initialize vault ─────────────────────────────────────────────────

log_step "Step 1/6: Initializing vault for ${ENVIRONMENT}..."

VAULT_PATH="${VAULT_DIR}/${ENVIRONMENT}"
mkdir -p "$VAULT_PATH"

if [[ -f "${VAULT_PATH}/.vault-key" ]] && [[ "$FORCE" != true ]]; then
  log_warn "Vault already initialized for ${ENVIRONMENT}. Use --force to reinitialize."
else
  npx ultraenv vault init --env "$ENVIRONMENT" --dir "$VAULT_PATH"
  log_ok "Vault initialized at ${VAULT_PATH}/"
fi

# ── Step 2: Create environment schema ────────────────────────────────────────

log_step "Step 2/6: Creating environment schema..."

SCHEMA_FILE="env.schema.ts"
if [[ ! -f "$SCHEMA_FILE" ]] || [[ "$FORCE" == true ]]; then
  cat > "$SCHEMA_FILE" << 'SCHEMA_EOF'
import { defineEnv, t } from 'ultraenv';

export const env = defineEnv({
  // Server configuration
  PORT: t.number().port().default(3000),
  HOST: t.string().hostname().default('0.0.0.0'),
  NODE_ENV: t.enum(['development', 'staging', 'production'] as const).required(),

  // Database
  DATABASE_URL: t.string().url().required().secret(),
  DATABASE_POOL_SIZE: t.number().min(1).max(100).default(10),

  // Authentication
  JWT_SECRET: t.string().min(32).required().secret(),
  JWT_EXPIRES_IN: t.string().default('24h'),
  OAUTH_CLIENT_ID: t.string().required(),
  OAUTH_CLIENT_SECRET: t.string().required().secret(),

  // External APIs
  API_KEY_EXTERNAL: t.string().min(16).required().secret(),
  API_RATE_LIMIT: t.number().default(100),

  // Feature flags
  ENABLE_CACHE: t.boolean().default(true),
  ENABLE_RATE_LIMITING: t.boolean().default(true),
  ENABLE_REQUEST_LOGGING: t.boolean().default(false),

  // Logging
  LOG_LEVEL: t.enum(['fatal', 'error', 'warn', 'info', 'debug'] as const).default('info'),
});
SCHEMA_EOF
  log_ok "Schema created at ${SCHEMA_FILE}"
else
  log_ok "Schema already exists at ${SCHEMA_FILE}"
fi

# ── Step 3: Generate vault template ─────────────────────────────────────────

log_step "Step 3/6: Generating vault template..."

TEMPLATE_FILE="${VAULT_PATH}/secrets.env.template"
if [[ ! -f "$TEMPLATE_FILE" ]] || [[ "$FORCE" == true ]]; then
  cat > "$TEMPLATE_FILE" << 'TEMPLATE_EOF'
# ── Ultraenv Vault Secrets Template ──────────────────────────────────────
# Fill in the values below. Secrets will be encrypted when you run vault encrypt.
# DO NOT commit this file with actual values!
# ───────────────────────────────────────────────────────────────────────────

# Server
DATABASE_URL=
DATABASE_POOL_SIZE=10

# Authentication
JWT_SECRET=
JWT_EXPIRES_IN=24h
OAUTH_CLIENT_ID=
OAUTH_CLIENT_SECRET=

# External APIs
API_KEY_EXTERNAL=
API_RATE_LIMIT=100

# Feature flags (non-secret, but managed here for consistency)
ENABLE_CACHE=true
ENABLE_RATE_LIMITING=true
ENABLE_REQUEST_LOGGING=false

# Logging
LOG_LEVEL=info
TEMPLATE_EOF
  log_ok "Template created at ${TEMPLATE_FILE}"
else
  log_ok "Template already exists"
fi

# ── Step 4: Encrypt secrets ─────────────────────────────────────────────────

log_step "Step 4/6: Encrypting secrets..."

if [[ -f "${VAULT_PATH}/secrets.env" ]]; then
  npx ultraenv vault encrypt --env "$ENVIRONMENT" --dir "$VAULT_PATH"
  log_ok "Secrets encrypted at ${VAULT_PATH}/secrets.env.enc"
else
  log_warn "No secrets.env file found. Create one from the template:"
  log_warn "  cp ${TEMPLATE_FILE} ${VAULT_PATH}/secrets.env"
  log_warn "Then fill in your values and run this script again."
fi

# ── Step 5: Verify vault integrity ───────────────────────────────────────────

log_step "Step 5/6: Verifying vault integrity..."

if [[ -f "${VAULT_PATH}/secrets.env.enc" ]]; then
  npx ultraenv vault verify --env "$ENVIRONMENT" --dir "$VAULT_PATH"
  log_ok "Vault integrity verified"
else
  log_warn "Skipping verification (no encrypted secrets found)"
fi

# ── Step 6: Set up gitignore ─────────────────────────────────────────────────

log_step "Step 6/6: Configuring gitignore..."

GITIGNORE=".gitignore"
if [[ -f "$GITIGNORE" ]]; then
  if ! rg -q "\.vault" "$GITIGNORE" 2>/dev/null; then
    {
      echo ""
      echo "# Ultraenv vault - encrypted secrets"
      echo ".vault/*/secrets.env"
      echo ".vault/*/.vault-key"
      echo ".vault/*/secrets.env.dec"
      echo "!${VAULT_PATH}/secrets.env.enc"
      echo "!${VAULT_PATH}/secrets.env.template"
    } >> "$GITIGNORE"
    log_ok "Added vault entries to ${GITIGNORE}"
  else
    log_ok "Gitignore already configured for vault"
  fi
else
  cat > "$GITIGNORE" << GITIGNORE_EOF
# Ultraenv vault - encrypted secrets
.vault/*/secrets.env
.vault/*/.vault-key
.vault/*/secrets.env.dec
!${VAULT_PATH}/secrets.env.enc
!${VAULT_PATH}/secrets.env.template
GITIGNORE_EOF
  log_ok "Created ${GITIGNORE} with vault entries"
fi

# ── Summary ─────────────────────────────────────────────────────────────────

echo ""
echo -e "${COLOR_BOLD}${COLOR_GREEN}═══════════════════════════════════════════════════════════${COLOR_RESET}"
echo -e "${COLOR_BOLD}${COLOR_GREEN}  Ultraenv Vault Setup Complete!${COLOR_RESET}"
echo -e "${COLOR_BOLD}${COLOR_GREEN}═══════════════════════════════════════════════════════════${COLOR_RESET}"
echo ""
echo -e "  ${COLOR_CYAN}Environment:${COLOR_RESET}  ${ENVIRONMENT}"
echo -e "  ${COLOR_CYAN}Vault path:${COLOR_RESET}    ${VAULT_PATH}/"
echo -e "  ${COLOR_CYAN}Schema:${COLOR_RESET}        ${SCHEMA_FILE}"
echo ""
echo -e "  ${COLOR_YELLOW}Next steps:${COLOR_RESET}"
echo "    1. Fill in secrets:  cp ${VAULT_PATH}/secrets.env.template ${VAULT_PATH}/secrets.env"
echo "    2. Edit secrets:      ${EDITOR:-vim} ${VAULT_PATH}/secrets.env"
echo "    3. Encrypt:           npx ultraenv vault encrypt --env ${ENVIRONMENT}"
echo "    4. Verify:            npx ultraenv vault verify --env ${ENVIRONMENT}"
echo "    5. Decrypt (runtime): npx ultraenv vault decrypt --env ${ENVIRONMENT}"
echo "    6. Check status:      npx ultraenv vault status --env ${ENVIRONMENT}"
echo ""
echo -e "  ${COLOR_YELLOW}Team collaboration:${COLOR_RESET}"
echo "    - Share the .vault-key file securely with team members"
echo "    - Commit only .env.enc and .env.template files"
echo "    - Use 'npx ultraenv vault diff' to compare env across environments"
echo ""
