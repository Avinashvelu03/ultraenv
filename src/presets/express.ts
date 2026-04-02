// =============================================================================
// ultraenv — Express Preset
// Schema definitions and conventions for Express.js backend projects.
// =============================================================================

import type { Preset, SchemaDefinition } from '../core/types.js';
import { EnvFileType } from '../core/types.js';

// -----------------------------------------------------------------------------
// Schema
// -----------------------------------------------------------------------------

/**
 * Express.js environment variable schema.
 *
 * Express projects are server-only, so all env vars are accessible
 * on the server. This preset provides common conventions for
 * HTTP server configuration.
 */
export const expressSchema: SchemaDefinition = {
  // ── Server Configuration ──────────────────────────────────────────
  PORT: {
    type: 'number',
    positive: true,
    description: 'HTTP server listen port',
    default: 3000,
  },
  HOST: {
    type: 'string',
    description: 'HTTP server listen hostname',
    default: '0.0.0.0',
  },
  NODE_ENV: {
    type: 'enum',
    values: ['development', 'production', 'test'],
    description: 'Node.js environment mode',
    default: 'development',
  },
  TRUST_PROXY: {
    type: 'string',
    optional: true,
    description: 'Trust proxy setting (ip, ipsubnet, hostname, loopback, boolean)',
  },

  // ── CORS ──────────────────────────────────────────────────────────
  CORS_ORIGIN: {
    type: 'string',
    optional: true,
    description: 'CORS allowed origins (comma-separated or "*")',
  },
  CORS_CREDENTIALS: {
    type: 'boolean',
    optional: true,
    description: 'Enable CORS credentials support',
  },
  CORS_METHODS: {
    type: 'array',
    optional: true,
    separator: ',',
    trimItems: true,
    description: 'CORS allowed methods (comma-separated)',
  },
  CORS_HEADERS: {
    type: 'array',
    optional: true,
    separator: ',',
    trimItems: true,
    description: 'CORS allowed headers (comma-separated)',
  },

  // ── Rate Limiting ─────────────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'Rate limit window in milliseconds',
  },
  RATE_LIMIT_MAX: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'Maximum requests per rate limit window',
  },

  // ── Body Parsing ─────────────────────────────────────────────────
  BODY_SIZE_LIMIT: {
    type: 'string',
    optional: true,
    description: 'Maximum request body size (e.g., "10mb")',
  },

  // ── Database ──────────────────────────────────────────────────────
  DATABASE_URL: {
    type: 'string',
    optional: true,
    format: 'url',
    description: 'Primary database connection URL',
  },
  DATABASE_POOL_SIZE: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'Database connection pool size',
  },

  // ── Authentication ────────────────────────────────────────────────
  JWT_SECRET: {
    type: 'string',
    optional: true,
    description: 'JWT signing secret',
  },
  JWT_EXPIRES_IN: {
    type: 'string',
    optional: true,
    description: 'JWT token expiration (e.g., "7d", "24h")',
  },
  SESSION_SECRET: {
    type: 'string',
    optional: true,
    description: 'Express session secret',
  },
  COOKIE_SECRET: {
    type: 'string',
    optional: true,
    description: 'Cookie signing secret',
  },

  // ── Logging ───────────────────────────────────────────────────────
  LOG_LEVEL: {
    type: 'enum',
    values: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
    optional: true,
    description: 'Application log level',
    default: 'info',
  },
  LOG_FORMAT: {
    type: 'enum',
    values: ['json', 'text', 'combined', 'dev'],
    optional: true,
    description: 'Log output format',
    default: 'dev',
  },

  // ── Security ──────────────────────────────────────────────────────
  HELMET_ENABLED: {
    type: 'boolean',
    optional: true,
    description: 'Enable Helmet security middleware',
    default: true,
  },
  HSTS_MAX_AGE: {
    type: 'number',
    optional: true,
    nonNegative: true,
    description: 'HTTP Strict Transport Security max age in seconds',
  },
  CSP_DIRECTIVES: {
    type: 'json',
    optional: true,
    description: 'Content Security Policy directives (JSON object)',
  },

  // ── Compression ───────────────────────────────────────────────────
  COMPRESSION_ENABLED: {
    type: 'boolean',
    optional: true,
    description: 'Enable response compression',
    default: true,
  },

  // ── Health Check ──────────────────────────────────────────────────
  HEALTH_CHECK_PATH: {
    type: 'string',
    optional: true,
    description: 'Health check endpoint path',
    default: '/health',
  },
};

// -----------------------------------------------------------------------------
// Loading Order
// -----------------------------------------------------------------------------

export const EXPRESS_FILES: readonly EnvFileType[] = [
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
// Helpers
// -----------------------------------------------------------------------------

/**
 * Parse TRUST_PROXY value to determine trust proxy setting.
 * Accepts: boolean string, IP, IP subnet, or comma-separated list.
 */
export function parseTrustProxy(value: string): boolean | number | string {
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  if (value === 'loopback') return 'loopback';
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  return value;
}

// -----------------------------------------------------------------------------
// Preset Export
// -----------------------------------------------------------------------------

export const expressPreset: Preset = {
  id: 'express',
  name: 'Express',
  description: 'Configuration preset for Express.js backend applications',
  schema: expressSchema,
  files: EXPRESS_FILES,
  tags: ['framework', 'backend', 'http', 'node'],
};
