// =============================================================================
// ultraenv — SvelteKit Preset
// Schema definitions and conventions for SvelteKit projects.
// =============================================================================

import type { Preset, SchemaDefinition } from '../core/types.js';
import { EnvFileType } from '../core/types.js';

// -----------------------------------------------------------------------------
// Prefix Constants
// -----------------------------------------------------------------------------

/** Prefix for SvelteKit variables exposed to client code */
export const PUBLIC_PREFIX = 'PUBLIC_';

// -----------------------------------------------------------------------------
// Schema
// -----------------------------------------------------------------------------

/**
 * SvelteKit environment variable schema.
 *
 * SvelteKit convention:
 * - Variables prefixed with PUBLIC_ are available in both server and client
 *   via import.meta.env.VITE_* (Vite is the underlying bundler)
 * - All other variables are server-only (available via $env/dynamic/private
 *   or $env/static/private)
 */
export const sveltekitSchema: SchemaDefinition = {
  // ── Public Variables (exposed to client) ──────────────────────────
  PUBLIC_API_URL: {
    type: 'string',
    format: 'url',
    description: 'Public API base URL (exposed to client via import.meta.env)',
  },
  PUBLIC_SITE_URL: {
    type: 'string',
    format: 'url',
    description: 'Canonical site URL (exposed to client)',
  },
  PUBLIC_APP_NAME: {
    type: 'string',
    optional: true,
    description: 'Application name (exposed to client)',
  },
  PUBLIC_GA_ID: {
    type: 'string',
    optional: true,
    description: 'Google Analytics measurement ID (exposed to client)',
  },
  PUBLIC_SENTRY_DSN: {
    type: 'string',
    optional: true,
    format: 'url',
    description: 'Sentry DSN for client-side error reporting',
  },
  PUBLIC_STRIPE_PUBLISHABLE_KEY: {
    type: 'string',
    optional: true,
    description: 'Stripe publishable key (exposed to client)',
  },
  PUBLICturnstileSiteKey: {
    type: 'string',
    optional: true,
    description: 'Cloudflare Turnstile site key (exposed to client)',
  },

  // ── Server-Only Private Variables ─────────────────────────────────
  DATABASE_URL: {
    type: 'string',
    optional: true,
    format: 'url',
    description: 'Database connection URL (server-only, $env/static/private)',
  },
  PRIVATE_API_SECRET: {
    type: 'string',
    optional: true,
    description: 'Private API secret (server-only)',
  },
  PRIVATE_SESSION_SECRET: {
    type: 'string',
    optional: true,
    description: 'Session encryption secret (server-only)',
  },
  PRIVATE_OAUTH_GITHUB_CLIENT_ID: {
    type: 'string',
    optional: true,
    description: 'GitHub OAuth client ID (server-only)',
  },
  PRIVATE_OAUTH_GITHUB_CLIENT_SECRET: {
    type: 'string',
    optional: true,
    description: 'GitHub OAuth client secret (server-only)',
  },
  PRIVATE_COOKIE_SECRET: {
    type: 'string',
    optional: true,
    description: 'Cookie signing secret (server-only)',
  },
  JWT_SECRET: {
    type: 'string',
    optional: true,
    description: 'JWT signing secret (server-only)',
  },
  STRIPE_SECRET_KEY: {
    type: 'string',
    optional: true,
    description: 'Stripe secret key (server-only)',
  },

  // ── Core Variables ────────────────────────────────────────────────
  ORIGIN: {
    type: 'string',
    format: 'url',
    optional: true,
    description: 'Server origin URL (used by SvelteKit adapter)',
  },
  PORT: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'Dev server port',
    default: 5173,
  },
  HOST: {
    type: 'string',
    optional: true,
    description: 'Dev server hostname',
  },
  NODE_ENV: {
    type: 'enum',
    values: ['development', 'production', 'test'],
    description: 'Node.js environment mode',
    default: 'development',
  },
};

// -----------------------------------------------------------------------------
// Loading Order
// -----------------------------------------------------------------------------

export const SVELTEKIT_FILES: readonly EnvFileType[] = [
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
// Classification Helpers
// -----------------------------------------------------------------------------

/**
 * Check if a SvelteKit variable is public (exposed to client).
 */
export function isSveltekitPublicVar(name: string): boolean {
  return name.startsWith(PUBLIC_PREFIX);
}

/**
 * Detect PUBLIC_ vars that contain secret-like keywords.
 */
export function detectSveltekitClientLeakCandidates(vars: Record<string, string>): readonly string[] {
  const warnings: string[] = [];
  const secretIndicators = [
    'SECRET', 'PASSWORD', 'TOKEN', 'PRIVATE_KEY', 'API_KEY',
    'CREDENTIAL', 'ACCESS_KEY', 'CLIENT_SECRET',
  ];

  for (const key of Object.keys(vars)) {
    if (!key.startsWith(PUBLIC_PREFIX)) continue;

    const upperKey = key.toUpperCase();
    for (const indicator of secretIndicators) {
      if (upperKey.includes(indicator)) {
        warnings.push(
          `${key}: potential secret exposed to SvelteKit client (contains "${indicator}")`,
        );
        break;
      }
    }
  }

  return warnings;
}

// -----------------------------------------------------------------------------
// Preset Export
// -----------------------------------------------------------------------------

export const sveltekitPreset: Preset = {
  id: 'sveltekit',
  name: 'SvelteKit',
  description: 'Configuration preset for SvelteKit with PUBLIC_ prefix convention',
  schema: sveltekitSchema,
  files: SVELTEKIT_FILES,
  tags: ['framework', 'svelte', 'ssr', 'fullstack'],
};
