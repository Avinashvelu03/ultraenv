// =============================================================================
// ultraenv — Docker Preset
// Schema definitions and conventions for Docker / Docker Compose projects.
// =============================================================================

import type { Preset, SchemaDefinition } from '../core/types.js';
import { EnvFileType } from '../core/types.js';

// -----------------------------------------------------------------------------
// Schema
// -----------------------------------------------------------------------------

/**
 * Docker / Docker Compose environment variable schema.
 *
 * Docker environments have two layers:
 * - Build-time args (ARG): available only during docker build
 * - Runtime vars (ENV): available in running containers
 *
 * This preset covers both Dockerfile and docker-compose.yml conventions.
 */
export const dockerSchema: SchemaDefinition = {
  // ── Docker Engine ─────────────────────────────────────────────────
  DOCKER_HOST: {
    type: 'string',
    optional: true,
    description: 'Docker daemon socket URL',
  },
  DOCKER_TLS_VERIFY: {
    type: 'boolean',
    optional: true,
    description: 'Enable TLS verification for Docker daemon',
  },
  DOCKER_CERT_PATH: {
    type: 'string',
    optional: true,
    description: 'Path to Docker TLS certificates',
  },
  DOCKER_API_VERSION: {
    type: 'string',
    optional: true,
    description: 'Docker API version',
  },
  DOCKER_CONTEXT: {
    type: 'string',
    optional: true,
    description: 'Docker context name',
  },

  // ── Docker Compose ────────────────────────────────────────────────
  COMPOSE_FILE: {
    type: 'string',
    optional: true,
    description: 'Docker Compose file path (default: docker-compose.yml)',
  },
  COMPOSE_PROJECT_NAME: {
    type: 'string',
    optional: true,
    description: 'Docker Compose project name',
  },
  COMPOSE_PROFILES: {
    type: 'array',
    optional: true,
    separator: ',',
    trimItems: true,
    description: 'Docker Compose active profiles',
  },
  COMPOSE_DOCKER_CLI_BUILD: {
    type: 'number',
    optional: true,
    description: 'Use Docker CLI for builds (0 or 1)',
  },

  // ── Common Container Services ─────────────────────────────────────
  // PostgreSQL
  POSTGRES_USER: {
    type: 'string',
    optional: true,
    description: 'PostgreSQL superuser name',
  },
  POSTGRES_PASSWORD: {
    type: 'string',
    optional: true,
    description: 'PostgreSQL superuser password',
  },
  POSTGRES_DB: {
    type: 'string',
    optional: true,
    description: 'PostgreSQL default database name',
  },
  POSTGRES_HOST: {
    type: 'string',
    optional: true,
    description: 'PostgreSQL host (within Docker network)',
    default: 'postgres',
  },
  POSTGRES_PORT: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'PostgreSQL port',
    default: 5432,
  },

  // Redis
  REDIS_HOST: {
    type: 'string',
    optional: true,
    description: 'Redis host (within Docker network)',
    default: 'redis',
  },
  REDIS_PORT: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'Redis port',
    default: 6379,
  },
  REDIS_PASSWORD: {
    type: 'string',
    optional: true,
    description: 'Redis password',
  },

  // MySQL
  MYSQL_ROOT_PASSWORD: {
    type: 'string',
    optional: true,
    description: 'MySQL root password',
  },
  MYSQL_DATABASE: {
    type: 'string',
    optional: true,
    description: 'MySQL default database name',
  },
  MYSQL_USER: {
    type: 'string',
    optional: true,
    description: 'MySQL user name',
  },
  MYSQL_PASSWORD: {
    type: 'string',
    optional: true,
    description: 'MySQL user password',
  },
  MYSQL_HOST: {
    type: 'string',
    optional: true,
    description: 'MySQL host (within Docker network)',
    default: 'mysql',
  },
  MYSQL_PORT: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'MySQL port',
    default: 3306,
  },

  // MongoDB
  MONGO_INITDB_ROOT_USERNAME: {
    type: 'string',
    optional: true,
    description: 'MongoDB root username',
  },
  MONGO_INITDB_ROOT_PASSWORD: {
    type: 'string',
    optional: true,
    description: 'MongoDB root password',
  },
  MONGO_HOST: {
    type: 'string',
    optional: true,
    description: 'MongoDB host (within Docker network)',
    default: 'mongodb',
  },
  MONGO_PORT: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'MongoDB port',
    default: 27017,
  },

  // ── Networking ────────────────────────────────────────────────────
  APP_PORT: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'Application container exposed port',
  },
  APP_HOST: {
    type: 'string',
    optional: true,
    description: 'Application container hostname',
  },
  VIRTUAL_HOST: {
    type: 'string',
    optional: true,
    description: 'Virtual host for nginx-proxy',
  },
  VIRTUAL_PORT: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'Virtual port for nginx-proxy',
  },
  LETSENCRYPT_HOST: {
    type: 'string',
    optional: true,
    description: "Let's Encrypt host(s) for nginx-proxy companion",
  },
  LETSENCRYPT_EMAIL: {
    type: 'string',
    optional: true,
    format: 'email',
    description: "Let's Encrypt notification email",
  },

  // ── Node.js App in Container ─────────────────────────────────────
  NODE_ENV: {
    type: 'enum',
    values: ['development', 'production', 'test'],
    description: 'Node.js environment mode',
    default: 'production',
  },
};

// -----------------------------------------------------------------------------
// Loading Order
// -----------------------------------------------------------------------------

export const DOCKER_FILES: readonly EnvFileType[] = [
  EnvFileType.Env,
  EnvFileType.EnvLocal,
  EnvFileType.EnvProduction,
  EnvFileType.EnvProductionLocal,
] as const;

// -----------------------------------------------------------------------------
// ARG vs ENV Awareness
// -----------------------------------------------------------------------------

/**
 * Variables commonly used as Dockerfile ARG (build-time only).
 * These are NOT available at container runtime.
 */
export const DOCKER_ARG_VARS: readonly string[] = [
  'NODE_VERSION',
  'ALPINE_VERSION',
  'BUILDKIT_INLINE_CACHE',
  'DOCKER_BUILDKIT',
  'TARGETPLATFORM',
  'BUILDPLATFORM',
  'IMAGE_TAG',
  'GIT_SHA',
  'BUILD_DATE',
  'VCS_REF',
] as const;

/**
 * Variables commonly used as ENV (runtime).
 * These are available at container runtime.
 */
export const DOCKER_ENV_VARS: readonly string[] = [
  'NODE_ENV',
  'PORT',
  'HOST',
  'DATABASE_URL',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'REDIS_PASSWORD',
  'APP_PORT',
  'APP_HOST',
] as const;

/**
 * Check if a variable is likely a build-time ARG.
 */
export function isDockerArg(name: string): boolean {
  return (DOCKER_ARG_VARS as readonly string[]).includes(name.toUpperCase());
}

/**
 * Check if a variable is a runtime ENV.
 */
export function isDockerEnv(name: string): boolean {
  return (DOCKER_ENV_VARS as readonly string[]).includes(name.toUpperCase());
}

// -----------------------------------------------------------------------------
// Preset Export
// -----------------------------------------------------------------------------

export const dockerPreset: Preset = {
  id: 'docker',
  name: 'Docker',
  description: 'Configuration preset for Docker and Docker Compose with ARG/ENV awareness',
  schema: dockerSchema,
  files: DOCKER_FILES,
  tags: ['infrastructure', 'containers', 'devops'],
};
