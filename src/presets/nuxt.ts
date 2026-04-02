// =============================================================================
// ultraenv — Nuxt Preset
// Schema definitions and conventions for Nuxt 3 projects.
// =============================================================================

import type { Preset, SchemaDefinition } from '../core/types.js';
import { EnvFileType } from '../core/types.js';

// -----------------------------------------------------------------------------
// Prefix Constants
// -----------------------------------------------------------------------------

/** Prefix for Nuxt runtime config (exposed to both server and client) */
export const NUXT_PREFIX = 'NUXT_';

/** Prefix for Nitro server engine variables */
export const NITRO_PREFIX = 'NITRO_';

/** Both Nuxt and Nitro prefixes */
export const NUXT_ALL_PREFIXES: readonly string[] = [NUXT_PREFIX, NITRO_PREFIX] as const;

// -----------------------------------------------------------------------------
// Schema
// -----------------------------------------------------------------------------

/**
 * Nuxt environment variable schema.
 *
 * Nuxt 3 uses a layered runtime config system:
 * - NUXT_ vars: available in both runtime config (server + client)
 * - NITRO_ vars: Nitro server engine configuration (server-only)
 * - Non-prefixed vars: internal/secret (server-only)
 */
export const nuxtSchema: SchemaDefinition = {
  // ── Nuxt Runtime Config (exposed to client with NUXT_PUBLIC_ prefix) ────
  NUXT_PUBLIC_API_BASE: {
    type: 'string',
    optional: true,
    description: 'Public API base URL (exposed to client via useRuntimeConfig)',
  },
  NUXT_PUBLIC_SITE_URL: {
    type: 'string',
    format: 'url',
    optional: true,
    description: 'Canonical site URL (exposed to client)',
  },
  NUXT_PUBLIC_APP_NAME: {
    type: 'string',
    optional: true,
    description: 'Application name (exposed to client)',
  },
  NUXT_PUBLIC_GA_ID: {
    type: 'string',
    optional: true,
    description: 'Google Analytics measurement ID (exposed to client)',
  },
  NUXT_PUBLIC_SENTRY_DSN: {
    type: 'string',
    optional: true,
    format: 'url',
    description: 'Sentry DSN for client-side error reporting',
  },

  // ── Nuxt Private Runtime Config (server-only) ─────────────────────
  NUXT_API_SECRET: {
    type: 'string',
    optional: true,
    description: 'API secret key (server-only runtime config)',
  },
  NUXT_SESSION_SECRET: {
    type: 'string',
    optional: true,
    description: 'Session encryption secret (server-only)',
  },
  NUXT_OAUTH_GITHUB_CLIENT_ID: {
    type: 'string',
    optional: true,
    description: 'GitHub OAuth client ID (server-only)',
  },
  NUXT_OAUTH_GITHUB_CLIENT_SECRET: {
    type: 'string',
    optional: true,
    description: 'GitHub OAuth client secret (server-only)',
  },
  NUXT_DATABASE_URL: {
    type: 'string',
    optional: true,
    format: 'url',
    description: 'Database URL (server-only runtime config)',
  },

  // ── Nitro Server Variables ────────────────────────────────────────
  NITRO_PORT: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'Nitro server port',
    default: 3000,
  },
  NITRO_HOST: {
    type: 'string',
    optional: true,
    description: 'Nitro server hostname',
  },
  NITRO_PRESET: {
    type: 'string',
    optional: true,
    description: 'Nitro deployment preset (e.g., node, vercel, netlify)',
  },
  NITRO_BODY_SIZE_LIMIT: {
    type: 'string',
    optional: true,
    description: 'Nitro request body size limit (e.g., "16mb")',
  },

  // ── Core Variables ────────────────────────────────────────────────
  NODE_ENV: {
    type: 'enum',
    values: ['development', 'production', 'test'],
    description: 'Node.js environment mode',
    default: 'development',
  },
  NUXT_APP_ENV: {
    type: 'string',
    optional: true,
    description: 'Application environment identifier',
  },
};

// -----------------------------------------------------------------------------
// Loading Order
// -----------------------------------------------------------------------------

/**
 * Recommended .env file loading order for Nuxt.
 *
 * Nuxt loads .env files based on NODE_ENV / NUXT_APP_ENV:
 * - .env → .env.local → .env.[mode] → .env.[mode].local
 */
export const NUXT_FILES: readonly EnvFileType[] = [
  EnvFileType.Env,
  EnvFileType.EnvLocal,
  EnvFileType.EnvDevelopment,
  EnvFileType.EnvDevelopmentLocal,
  EnvFileType.EnvTest,
  EnvFileType.EnvTestLocal,
  EnvFileType.EnvProduction,
  EnvFileType.EnvProductionLocal,
  EnvFileType.EnvStaging,
  EnvFileType.EnvStagingLocal,
] as const;

// -----------------------------------------------------------------------------
// Classification Helpers
// -----------------------------------------------------------------------------

/** Runtime config variable categories for Nuxt */
export type NuxtVarCategory = 'public' | 'private' | 'nitro' | 'unknown';

/**
 * Classify a Nuxt environment variable by its scope.
 */
export function classifyNuxtVar(name: string): NuxtVarCategory {
  if (name.startsWith('NUXT_PUBLIC_')) return 'public';
  if (name.startsWith(NUXT_PREFIX)) return 'private';
  if (name.startsWith(NITRO_PREFIX)) return 'nitro';
  return 'unknown';
}

/**
 * Check if a variable is exposed to the Nuxt client bundle.
 */
export function isNuxtPublicVar(name: string): boolean {
  return name.startsWith('NUXT_PUBLIC_');
}

/**
 * Check if a variable is Nitro server-only.
 */
export function isNitroVar(name: string): boolean {
  return name.startsWith(NITRO_PREFIX);
}

/**
 * Detect NUXT_PUBLIC_ vars that contain secret-like keywords.
 */
export function detectNuxtClientLeakCandidates(vars: Record<string, string>): readonly string[] {
  const warnings: string[] = [];
  const secretIndicators = [
    'SECRET', 'PASSWORD', 'TOKEN', 'PRIVATE_KEY', 'API_KEY',
    'CREDENTIAL', 'ACCESS_KEY', 'CLIENT_SECRET',
  ];

  for (const key of Object.keys(vars)) {
    if (!key.startsWith('NUXT_PUBLIC_')) continue;

    const upperKey = key.toUpperCase();
    for (const indicator of secretIndicators) {
      if (upperKey.includes(indicator)) {
        warnings.push(
          `${key}: potential secret exposed to Nuxt client bundle (contains "${indicator}")`,
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

export const nuxtPreset: Preset = {
  id: 'nuxt',
  name: 'Nuxt',
  description: 'Configuration preset for Nuxt 3 with NUXT/NITRO runtime config separation',
  schema: nuxtSchema,
  files: NUXT_FILES,
  tags: ['framework', 'vue', 'ssr', 'fullstack'],
};
