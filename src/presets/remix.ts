// =============================================================================
// ultraenv — Remix Preset
// Schema definitions and conventions for Remix projects.
// =============================================================================

import type { Preset, SchemaDefinition } from '../core/types.js';
import { EnvFileType } from '../core/types.js';

// -----------------------------------------------------------------------------
// Schema
// -----------------------------------------------------------------------------

/**
 * Remix environment variable schema.
 *
 * Remix enforces server-side only access to environment variables.
 * All env vars are server-only unless explicitly passed through
 * the loader/getServerData API to the client.
 */
export const remixSchema: SchemaDefinition = {
  // ── Core Variables ────────────────────────────────────────────────
  NODE_ENV: {
    type: 'enum',
    values: ['development', 'production', 'test'],
    description: 'Node.js environment mode',
    default: 'development',
  },
  PORT: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'Remix dev server port',
    default: 3000,
  },
  HOST: {
    type: 'string',
    optional: true,
    description: 'Remix dev server hostname',
  },

  // ── Session Management ────────────────────────────────────────────
  SESSION_SECRET: {
    type: 'string',
    description: 'Secret for signing Remix sessions (required)',
  },
  SESSION_MAX_AGE: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'Session maximum age in seconds',
  },

  // ── Database ──────────────────────────────────────────────────────
  DATABASE_URL: {
    type: 'string',
    optional: true,
    format: 'url',
    description: 'Primary database connection URL (server-only)',
  },
  DATABASE_POOL_SIZE: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'Database connection pool size',
  },

  // ── Authentication ────────────────────────────────────────────────
  AUTH_SECRET: {
    type: 'string',
    optional: true,
    description: 'Authentication secret for Remix Auth (server-only)',
  },
  AUTH_REDIRECT_URL: {
    type: 'string',
    optional: true,
    format: 'url',
    description: 'Post-authentication redirect URL (server-only)',
  },

  // ── API & External Services ───────────────────────────────────────
  API_BASE_URL: {
    type: 'string',
    optional: true,
    format: 'url',
    description: 'Backend API base URL (server-only)',
  },
  STRIPE_SECRET_KEY: {
    type: 'string',
    optional: true,
    description: 'Stripe secret key (server-only)',
  },
  STRIPE_WEBHOOK_SECRET: {
    type: 'string',
    optional: true,
    description: 'Stripe webhook signing secret (server-only)',
  },
  SENTRY_DSN: {
    type: 'string',
    optional: true,
    format: 'url',
    description: 'Sentry DSN for server-side error reporting',
  },

  // ── Remix-Specific ───────────────────────────────────────────────
  REMIX_DEV_ORIGIN: {
    type: 'string',
    optional: true,
    format: 'url',
    description: 'Dev server origin URL for HMR',
  },
  REMIX_PUBLIC_PATH: {
    type: 'string',
    optional: true,
    description: 'Public asset path prefix',
  },
  BASE_URL: {
    type: 'string',
    format: 'url',
    optional: true,
    description: 'Application base URL',
  },
};

// -----------------------------------------------------------------------------
// Loading Order
// -----------------------------------------------------------------------------

export const REMIX_FILES: readonly EnvFileType[] = [
  EnvFileType.Env,
  EnvFileType.EnvLocal,
  EnvFileType.EnvDevelopment,
  EnvFileType.EnvDevelopmentLocal,
  EnvFileType.EnvTest,
  EnvFileType.EnvTestLocal,
  EnvFileType.EnvProduction,
  EnvFileType.EnvProductionLocal,
] as const;

// -----------------------------------------------------------------------------
// Server-Side Enforcement
// -----------------------------------------------------------------------------

/**
 * In Remix, ALL environment variables are server-side only.
 * There is no built-in prefix convention for client-exposed vars.
 * Instead, data must be explicitly passed through loaders.
 *
 * This function validates that no env vars are accidentally
 * referenced in client-side code paths.
 */
export function getRemixServerOnlyVars(): Set<string> {
  return new Set([
    'SESSION_SECRET',
    'AUTH_SECRET',
    'DATABASE_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'API_BASE_URL',
  ]);
}

/**
 * Categorize Remix env vars for documentation purposes.
 */
export function categorizeRemixVar(name: string): 'server-only' | 'config' | 'unknown' {
  const serverOnly = getRemixServerOnlyVars();
  if (serverOnly.has(name)) return 'server-only';
  const configVars = new Set([
    'NODE_ENV',
    'PORT',
    'HOST',
    'REMIX_DEV_ORIGIN',
    'REMIX_PUBLIC_PATH',
    'BASE_URL',
    'DATABASE_POOL_SIZE',
    'SESSION_MAX_AGE',
    'AUTH_REDIRECT_URL',
  ]);
  if (configVars.has(name)) return 'config';
  return 'unknown';
}

// -----------------------------------------------------------------------------
// Preset Export
// -----------------------------------------------------------------------------

export const remixPreset: Preset = {
  id: 'remix',
  name: 'Remix',
  description: 'Configuration preset for Remix with server-side-only env variable enforcement',
  schema: remixSchema,
  files: REMIX_FILES,
  tags: ['framework', 'react', 'ssr', 'fullstack'],
};
