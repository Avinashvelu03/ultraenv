// =============================================================================
// ultraenv — Fastify Preset
// Schema definitions and conventions for Fastify backend projects.
// =============================================================================

import type { Preset, SchemaDefinition } from '../core/types.js';
import { EnvFileType } from '../core/types.js';

// -----------------------------------------------------------------------------
// Schema
// -----------------------------------------------------------------------------

/**
 * Fastify environment variable schema.
 *
 * Fastify is a high-performance HTTP framework for Node.js.
 * All env vars are server-only.
 */
export const fastifySchema: SchemaDefinition = {
  // ── Server Configuration ──────────────────────────────────────────
  PORT: {
    type: 'number',
    positive: true,
    description: 'Fastify server listen port',
    default: 3000,
  },
  HOST: {
    type: 'string',
    description: 'Fastify server listen hostname',
    default: '0.0.0.0',
  },
  FASTIFY_ADDRESS: {
    type: 'string',
    optional: true,
    description: 'Fastify listen address (alias for HOST)',
  },
  FASTIFY_PORT: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'Fastify listen port (alias for PORT)',
  },
  NODE_ENV: {
    type: 'enum',
    values: ['development', 'production', 'test'],
    description: 'Node.js environment mode',
    default: 'development',
  },
  PREFIX: {
    type: 'string',
    optional: true,
    description: 'URL prefix for all routes (e.g., "/api/v1")',
  },

  // ── Fastify Core Options ──────────────────────────────────────────
  FASTIFY_BODY_LIMIT: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'Maximum request body size in bytes',
  },
  FASTIFY_REQUEST_TIMEOUT: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'Request timeout in milliseconds',
  },
  FASTIFY_KEEP_ALIVE_TIMEOUT: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'Keep-alive timeout in milliseconds',
  },
  FASTIFY_MAX_HEADER_SIZE: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'Maximum HTTP header size in bytes',
  },
  FASTIFY_HTTP2_ENABLED: {
    type: 'boolean',
    optional: true,
    description: 'Enable HTTP/2 support',
  },
  FASTIFY_HTTPS_ENABLED: {
    type: 'boolean',
    optional: true,
    description: 'Enable HTTPS (requires TLS cert/key)',
  },
  FASTIFY_HTTPS_CERT: {
    type: 'string',
    optional: true,
    description: 'Path to TLS certificate file',
  },
  FASTIFY_HTTPS_KEY: {
    type: 'string',
    optional: true,
    description: 'Path to TLS private key file',
  },

  // ── CORS ──────────────────────────────────────────────────────────
  CORS_ORIGIN: {
    type: 'string',
    optional: true,
    description: 'CORS allowed origins',
  },
  CORS_METHODS: {
    type: 'array',
    optional: true,
    separator: ',',
    trimItems: true,
    description: 'CORS allowed methods',
  },

  // ── Database ──────────────────────────────────────────────────────
  DATABASE_URL: {
    type: 'string',
    optional: true,
    format: 'url',
    description: 'Primary database connection URL',
  },

  // ── Authentication ────────────────────────────────────────────────
  JWT_SECRET: {
    type: 'string',
    optional: true,
    description: 'JWT signing secret',
  },
  FASTIFY_JWT_SECRET: {
    type: 'string',
    optional: true,
    description: 'JWT secret (Fastify JWT plugin specific)',
  },

  // ── Logging (Fastify uses Pino) ──────────────────────────────────
  LOG_LEVEL: {
    type: 'enum',
    values: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
    optional: true,
    description: 'Pino log level',
    default: 'info',
  },
  LOG_PRETTY_PRINT: {
    type: 'boolean',
    optional: true,
    description: 'Enable Pino pretty printing (development only)',
  },
  FASTIFY_LOGGER: {
    type: 'boolean',
    optional: true,
    description: 'Enable Fastify built-in Pino logger',
    default: true,
  },

  // ── Rate Limiting ─────────────────────────────────────────────────
  RATE_LIMIT_MAX: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'Max requests per time window',
  },
  RATE_LIMIT_TIME_WINDOW: {
    type: 'string',
    optional: true,
    description: 'Rate limit time window (e.g., "1 minute")',
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

export const FASTIFY_FILES: readonly EnvFileType[] = [
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
// Preset Export
// -----------------------------------------------------------------------------

export const fastifyPreset: Preset = {
  id: 'fastify',
  name: 'Fastify',
  description: 'Configuration preset for Fastify HTTP framework with schema-based configuration',
  schema: fastifySchema,
  files: FASTIFY_FILES,
  tags: ['framework', 'backend', 'http', 'node', 'performance'],
};
