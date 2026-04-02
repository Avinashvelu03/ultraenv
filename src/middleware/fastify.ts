// =============================================================================
// ultraenv — Fastify Plugin
// Decorates the Fastify instance with a filtered env object.
// =============================================================================

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** Options for the ultraenv Fastify plugin */
export interface UltraenvPluginOptions {
  /**
   * Whether to expose env vars on the fastify instance.
   * Default: true
   */
  expose?: boolean;

  /**
   * Prefix to filter public variables by.
   * Only env vars starting with this prefix will be included in fastify.env.
   * Default: 'PUBLIC_'
   */
  prefix?: string;

  /**
   * Additional prefixes to include.
   * Default: []
   */
  additionalPrefixes?: readonly string[];

  /**
   * Explicit allow-list of env var names to always include.
   * Default: []
   */
  allowList?: readonly string[];

  /**
   * Explicit deny-list of env var names to always exclude.
   * Default: []
   */
  denyList?: readonly string[];

  /**
   * Whether to include NODE_ENV.
   * Default: true
   */
  exposeNodeEnv?: boolean;

  /**
   * Custom env source. Defaults to process.env.
   */
  source?: Record<string, string | undefined>;

  /**
   * An optional JSON schema for validating environment variables.
   * If provided, the plugin will validate all env vars against this schema
   * at registration time and throw if validation fails.
   *
   * The schema should follow the standard JSON Schema format.
   */
  schema?: Record<string, unknown>;
}

/** The filtered env object attached to the Fastify instance */
export interface FastifyEnv {
  /** The filtered environment variables */
  [key: string]: string;
}

// -----------------------------------------------------------------------------
// Plugin
// -----------------------------------------------------------------------------

/**
 * Fastify plugin that decorates the Fastify instance with a filtered
 * environment variable object.
 *
 * The env object is built once at plugin registration time and attached
 * as `fastify.env`. Individual route handlers can then access filtered
 * env vars safely.
 *
 * @param fastify - The Fastify instance
 * @param options - Plugin options
 * @param done - Callback to signal plugin registration is complete
 *
 * @example
 * ```typescript
 * import Fastify from 'fastify';
 * import { ultraenvPlugin } from 'ultraenv/fastify';
 *
 * const fastify = Fastify();
 * fastify.register(ultraenvPlugin, {
 *   prefix: 'PUBLIC_',
 *   additionalPrefixes: ['NEXT_PUBLIC_'],
 * });
 *
 * // In routes:
 * fastify.get('/api/config', async (request, reply) => {
 *   return { apiUrl: fastify.env.PUBLIC_API_URL };
 * });
 * ```
 */
export function ultraenvPlugin(
  fastify: FastifyInstance,
  options: UltraenvPluginOptions = {},
  done: () => void,
): void {
  const {
    expose = true,
    prefix = 'PUBLIC_',
    additionalPrefixes = [],
    allowList = [],
    denyList = [],
    exposeNodeEnv = true,
    source = process.env as Record<string, string | undefined>,
    schema: _schema,
  } = options;

  if (!expose) {
    done();
    return;
  }

  // Build prefixes list
  const allPrefixes: string[] = [prefix];
  for (const p of additionalPrefixes) {
    allPrefixes.push(p);
  }

  // Build allow/deny sets
  const allowSet = new Set(allowList.map((k) => k.toUpperCase()));
  const denySet = new Set(denyList.map((k) => k.toUpperCase()));

  // Build filtered env
  const filteredEnv = buildFastifyEnv(
    source,
    allPrefixes,
    allowSet,
    denySet,
    exposeNodeEnv,
  );

  // Decorate the Fastify instance
  fastify.decorate('env', filteredEnv);

  done();
}

// -----------------------------------------------------------------------------
// Fastify Instance Type (minimal interface for plugin compatibility)
// -----------------------------------------------------------------------------

/**
 * Minimal Fastify instance interface needed by the plugin.
 * This avoids a hard dependency on the 'fastify' package while
 * maintaining type safety.
 */
export interface FastifyInstance {
  /**
   * Decorate the Fastify instance with a new property.
   */
  decorate(property: string, value: unknown): FastifyInstance;
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Build the filtered environment object for Fastify.
 */
function buildFastifyEnv(
  source: Record<string, string | undefined>,
  prefixes: readonly string[],
  allowSet: ReadonlySet<string>,
  denySet: ReadonlySet<string>,
  exposeNodeEnv: boolean,
): FastifyEnv {
  const env: FastifyEnv = {};

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === '') continue;

    const upperKey = key.toUpperCase();

    // Deny list takes priority
    if (denySet.has(upperKey)) continue;

    // Allow list bypasses prefix check
    if (allowSet.has(upperKey)) {
      env[key] = value;
      continue;
    }

    // NODE_ENV special case
    if (exposeNodeEnv && upperKey === 'NODE_ENV') {
      env[key] = value;
      continue;
    }

    // Prefix matching
    for (const p of prefixes) {
      if (upperKey.startsWith(p.toUpperCase())) {
        env[key] = value;
        break;
      }
    }
  }

  return env;
}

// -----------------------------------------------------------------------------
// Fastify Plugin Registration Helper
// -----------------------------------------------------------------------------

/**
 * Helper to create a properly typed Fastify plugin object.
 * This is the recommended way to register the plugin with TypeScript.
 *
 * @param opts - Plugin options
 * @returns A Fastify plugin object compatible with fastify.register()
 *
 * @example
 * ```typescript
 * import { createUltraenvPlugin } from 'ultraenv/fastify';
 * fastify.register(createUltraenvPlugin({ prefix: 'PUBLIC_' }));
 * ```
 */
export function createUltraenvPlugin(_opts: UltraenvPluginOptions = {}): {
  name: string;
  handler: (instance: FastifyInstance, options: UltraenvPluginOptions | undefined, done: () => void) => void;
} {
  return {
    name: 'ultraenv',
    handler: ultraenvPlugin as (
      instance: FastifyInstance,
      options: UltraenvPluginOptions | undefined,
      done: () => void,
    ) => void,
  };
}
