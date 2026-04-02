// =============================================================================
// ultraenv — Next.js Preset
// Schema definitions, conventions, and validation for Next.js projects.
// =============================================================================

import type { Preset, SchemaDefinition } from '../core/types.js';
import { EnvFileType } from '../core/types.js';

// -----------------------------------------------------------------------------
// Prefix Constants
// -----------------------------------------------------------------------------

/** Prefix for client-exposed environment variables */
export const NEXT_PUBLIC_PREFIX = 'NEXT_PUBLIC_';

/** All known server-only variable prefixes (NOT exposed to client) */
export const SERVER_ONLY_PREFIXES: readonly string[] = [
  'DATABASE_',
  'DB_',
  'SECRET_',
  'PRIVATE_',
  'AWS_',
  'STRIPE_',
  'AUTH_',
  'SESSION_',
  'REDIS_',
  'SMTP_',
  'MAIL_',
] as const;

// -----------------------------------------------------------------------------
// Schema
// -----------------------------------------------------------------------------

/**
 * Next.js environment variable schema.
 *
 * Next.js convention: only variables prefixed with NEXT_PUBLIC_ are
 * inlined into the client bundle. Everything else is server-only.
 */
export const nextjsSchema: SchemaDefinition = {
  // ── Public (client-exposed) Variables ──────────────────────────────
  NEXT_PUBLIC_API_URL: {
    type: 'string',
    format: 'url',
    description: 'Public API base URL exposed to the client bundle',
  },
  NEXT_PUBLIC_SITE_URL: {
    type: 'string',
    format: 'url',
    description: 'Canonical site URL (used for SEO, OG tags, etc.)',
  },
  NEXT_PUBLIC_VERCEL_URL: {
    type: 'string',
    format: 'url',
    optional: true,
    description: 'Vercel deployment URL (auto-set by Vercel)',
  },
  NEXT_PUBLIC_GA_ID: {
    type: 'string',
    optional: true,
    description: 'Google Analytics measurement ID (e.g., G-XXXXXXXXXX)',
  },
  NEXT_PUBLIC_SENTRY_DSN: {
    type: 'string',
    optional: true,
    format: 'url',
    description: 'Sentry DSN for client-side error reporting',
  },
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: {
    type: 'string',
    optional: true,
    description: 'Stripe publishable key for client-side usage',
  },

  // ── Server-Only Variables ─────────────────────────────────────────
  DATABASE_URL: {
    type: 'string',
    format: 'url',
    description: 'Primary database connection URL (server-only)',
  },
  DATABASE_URL_UNPOOLED: {
    type: 'string',
    optional: true,
    format: 'url',
    description: 'Unpooled database connection for migrations (server-only)',
  },
  DIRECT_URL: {
    type: 'string',
    optional: true,
    description: 'Direct database URL for Prisma migrations',
  },
  NODE_ENV: {
    type: 'enum',
    values: ['development', 'production', 'test'],
    description: 'Node.js environment mode',
    default: 'development',
  },
  NEXT_PUBLIC_NODE_ENV: {
    type: 'enum',
    values: ['development', 'production', 'test'],
    optional: true,
    description: 'Node.js environment mode exposed to client (usually set by Next.js)',
  },
  NEXT_TELEMETRY_DISABLED: {
    type: 'boolean',
    optional: true,
    description: 'Disable Next.js telemetry collection',
  },
  NEXT_PUBLIC_APP_ENV: {
    type: 'string',
    optional: true,
    description: 'Application environment name exposed to the client',
  },

  // ── Authentication ────────────────────────────────────────────────
  NEXTAUTH_URL: {
    type: 'string',
    format: 'url',
    optional: true,
    description: 'NextAuth.js callback URL (server-only)',
  },
  NEXTAUTH_SECRET: {
    type: 'string',
    optional: true,
    description: 'NextAuth.js secret for signing tokens (server-only)',
  },
  NEXTAUTH_CLIENT_ID: {
    type: 'string',
    optional: true,
    description: 'OAuth client ID for NextAuth.js (server-only)',
  },
  NEXTAUTH_CLIENT_SECRET: {
    type: 'string',
    optional: true,
    description: 'OAuth client secret for NextAuth.js (server-only)',
  },

  // ── Image Optimization ────────────────────────────────────────────
  NEXT_PUBLIC_IMAGE_DOMAINS: {
    type: 'array',
    optional: true,
    separator: ',',
    trimItems: true,
    description: 'Allowed image optimization domains (comma-separated)',
  },
  NEXT_PUBLIC_IMAGE_REMOTE_PATTERNS: {
    type: 'json',
    optional: true,
    description: 'Remote image patterns for next/image (JSON array)',
  },

  // ── Feature Flags ─────────────────────────────────────────────────
  NEXT_PUBLIC_ENABLE_ANALYTICS: {
    type: 'boolean',
    optional: true,
    description: 'Enable client-side analytics tracking',
  },
  NEXT_PUBLIC_ENABLE_MOCK_MODE: {
    type: 'boolean',
    optional: true,
    description: 'Enable mock API mode for development',
  },
};

// -----------------------------------------------------------------------------
// Loading Order
// -----------------------------------------------------------------------------

/**
 * Recommended .env file loading order for Next.js.
 *
 * Priority (lowest → highest):
 * .env → .env.local → .env.development → .env.development.local
 *
 * In production: .env → .env.local → .env.production → .env.production.local
 */
export const NEXTJS_FILES: readonly EnvFileType[] = [
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
 * Check if a variable name is a public Next.js variable (exposed to client).
 */
export function isNextPublicVar(name: string): boolean {
  return name.startsWith(NEXT_PUBLIC_PREFIX);
}

/**
 * Check if a variable name looks like it should be server-only
 * (does NOT have the NEXT_PUBLIC_ prefix).
 * Returns true for server-only vars.
 */
export function isServerOnlyVar(name: string): boolean {
  if (isNextPublicVar(name)) return false;
  // Built-in Next.js vars that are fine without the prefix
  const allowedWithoutPrefix = new Set(['NODE_ENV', 'NEXT_TELEMETRY_DISABLED']);
  if (allowedWithoutPrefix.has(name)) return false;
  return true;
}

/**
 * Detect potentially dangerous server-only vars that might be
 * accidentally used in client components.
 * Returns warnings for variables that look like secrets but lack
 * the proper prefix discipline.
 */
export function detectClientLeakCandidates(vars: Record<string, string>): readonly string[] {
  const warnings: string[] = [];
  const secretIndicators = [
    'SECRET',
    'PASSWORD',
    'TOKEN',
    'KEY',
    'PRIVATE',
    'CREDENTIAL',
    'API_KEY',
    'ACCESS_KEY',
  ];

  for (const key of Object.keys(vars)) {
    if (!isNextPublicVar(key)) continue;

    // A NEXT_PUBLIC_ var that contains secret-like keywords is dangerous
    const upperKey = key.toUpperCase();
    for (const indicator of secretIndicators) {
      if (upperKey.includes(indicator)) {
        warnings.push(
          `${key}: appears to be a secret exposed to the client bundle (contains "${indicator}")`,
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

export const nextjsPreset: Preset = {
  id: 'nextjs',
  name: 'Next.js',
  description:
    'Configuration preset for Next.js applications with client/server variable separation',
  schema: nextjsSchema,
  files: NEXTJS_FILES,
  tags: ['framework', 'react', 'ssr', 'fullstack'],
};
