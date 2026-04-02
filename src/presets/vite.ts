// =============================================================================
// ultraenv — Vite Preset
// Schema definitions and conventions for Vite-powered projects.
// =============================================================================

import type { Preset, SchemaDefinition } from '../core/types.js';
import { EnvFileType } from '../core/types.js';

// -----------------------------------------------------------------------------
// Prefix Constants
// -----------------------------------------------------------------------------

/** Prefix for client-exposed environment variables in Vite */
export const VITE_PREFIX = 'VITE_';

// -----------------------------------------------------------------------------
// Mode Definitions
// -----------------------------------------------------------------------------

/** All valid Vite modes */
export const VITE_MODES: string[] = ['development', 'production', 'test'];

// -----------------------------------------------------------------------------
// Schema
// -----------------------------------------------------------------------------

/**
 * Vite environment variable schema.
 *
 * Vite only exposes variables prefixed with VITE_ to client code
 * via import.meta.env. Everything else is server-only.
 */
export const viteSchema: SchemaDefinition = {
  // ── Public (client-exposed) Variables ──────────────────────────────
  VITE_API_URL: {
    type: 'string',
    format: 'url',
    description: 'Public API base URL exposed via import.meta.env',
  },
  VITE_APP_TITLE: {
    type: 'string',
    optional: true,
    description: 'Application title for the HTML document',
  },
  VITE_APP_BASE_URL: {
    type: 'string',
    optional: true,
    description: 'Base URL for the application (used in router)',
  },
  VITE_ENABLE_DEVTOOLS: {
    type: 'boolean',
    optional: true,
    description: 'Enable Vue/React devtools in development',
  },
  VITE_SENTRY_DSN: {
    type: 'string',
    optional: true,
    format: 'url',
    description: 'Sentry DSN for client-side error reporting',
  },
  VITE_GA_ID: {
    type: 'string',
    optional: true,
    description: 'Google Analytics measurement ID',
  },

  // ── Mode-Based Variables ──────────────────────────────────────────
  MODE: {
    type: 'enum',
    values: VITE_MODES,
    description: 'Vite mode (development | production | test)',
    default: 'development',
  },
  VITE_MODE: {
    type: 'enum',
    values: VITE_MODES,
    optional: true,
    description: 'Vite mode exposed to client code via import.meta.env.MODE',
  },
  DEV: {
    type: 'boolean',
    optional: true,
    description: 'Whether the app is running in dev mode (set by Vite)',
  },
  PROD: {
    type: 'boolean',
    optional: true,
    description: 'Whether the app is running in production mode (set by Vite)',
  },
  SSR: {
    type: 'boolean',
    optional: true,
    description: 'Whether the app is running in SSR mode (set by Vite SSR plugin)',
  },

  // ── Server-Only Variables ─────────────────────────────────────────
  NODE_ENV: {
    type: 'enum',
    values: VITE_MODES,
    description: 'Node.js environment mode',
    default: 'development',
  },
  PORT: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'Dev server port (server-only)',
    default: 5173,
  },
  HOST: {
    type: 'string',
    optional: true,
    description: 'Dev server hostname (server-only)',
  },
  DATABASE_URL: {
    type: 'string',
    optional: true,
    format: 'url',
    description: 'Database connection URL (server-only)',
  },
  API_SECRET: {
    type: 'string',
    optional: true,
    description: 'API secret key for backend authentication (server-only)',
  },
  JWT_SECRET: {
    type: 'string',
    optional: true,
    description: 'JWT signing secret (server-only)',
  },
};

// -----------------------------------------------------------------------------
// Loading Order
// -----------------------------------------------------------------------------

/**
 * Recommended .env file loading order for Vite.
 *
 * Vite loads .env files based on MODE:
 * - All modes: .env
 * - Specific mode: .env.[mode]
 * - Local overrides: .env.local, .env.[mode].local
 *
 * Priority (lowest → highest):
 * .env → .env.local → .env.[mode] → .env.[mode].local
 */
export const VITE_FILES: readonly EnvFileType[] = [
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
// Validation Helpers
// -----------------------------------------------------------------------------

/**
 * Check if a variable name is a public Vite variable.
 */
export function isVitePublicVar(name: string): boolean {
  return name.startsWith(VITE_PREFIX);
}

/**
 * Detect variables that look like secrets but are exposed via VITE_ prefix.
 */
export function detectViteClientLeakCandidates(vars: Record<string, string>): readonly string[] {
  const warnings: string[] = [];
  const secretIndicators = [
    'SECRET',
    'PASSWORD',
    'TOKEN',
    'PRIVATE_KEY',
    'API_KEY',
    'CREDENTIAL',
    'ACCESS_KEY',
    'AUTH',
  ];

  for (const key of Object.keys(vars)) {
    if (!key.startsWith(VITE_PREFIX)) continue;

    const upperKey = key.toUpperCase();
    for (const indicator of secretIndicators) {
      if (upperKey.includes(indicator)) {
        warnings.push(
          `${key}: potential secret exposed to client bundle (contains "${indicator}")`,
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

export const vitePreset: Preset = {
  id: 'vite',
  name: 'Vite',
  description: 'Configuration preset for Vite-powered applications with mode-based env loading',
  schema: viteSchema,
  files: VITE_FILES,
  tags: ['build-tool', 'frontend', 'spa'],
};
