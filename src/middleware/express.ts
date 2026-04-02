// =============================================================================
// ultraenv — Express / Connect Middleware
// Filters env vars by prefix and attaches to req.env for safe access.
// =============================================================================

// Express types defined inline to avoid a hard dependency on the 'express' package.
// Users who install express will get proper type augmentation.

/** Minimal Express Request type */
export interface UltraenvRequest {
  [key: string]: unknown;
  env?: UltraenvFilteredEnv;
}

/** Minimal Express Response type */
export interface UltraenvResponse {
  status(code: number): UltraenvResponse;
  json(data: Record<string, unknown>): void;
}

/** Express NextFunction type */
export type UltraenvNextFunction = (err?: Error) => void;

// -----------------------------------------------------------------------------
// Options
// -----------------------------------------------------------------------------

/** Options for the ultraenv Express middleware */
export interface UltraenvMiddlewareOptions {
  /**
   * Whether to expose public env vars.
   * When true, filters process.env by the specified prefix and attaches
   * a filtered subset to req.env.
   * Default: true
   */
  exposePublic?: boolean;

  /**
   * Prefix to filter public variables by.
   * Only env vars starting with this prefix will be included in req.env.
   * Default: 'PUBLIC_'
   */
  prefix?: string;

  /**
   * Additional prefixes to include in the filtered env.
   * Useful for framework-specific prefixes (e.g., ['NEXT_PUBLIC_', 'VITE_']).
   * Default: []
   */
  additionalPrefixes?: readonly string[];

  /**
   * Explicit list of env var names to always include.
   * These are included regardless of prefix matching.
   * Default: []
   */
  allowList?: readonly string[];

  /**
   * Explicit list of env var names to always exclude.
   * Even if they match the prefix, they will be excluded.
   * Default: []
   */
  denyList?: readonly string[];

  /**
   * Whether to also set NODE_ENV on req.env.
   * Default: true
   */
  exposeNodeEnv?: boolean;

  /**
   * Custom source for environment variables.
   * Defaults to process.env if not provided.
   */
  source?: Record<string, string | undefined>;
}

// -----------------------------------------------------------------------------
// Env Object Type
// -----------------------------------------------------------------------------

/** The filtered env object attached to req.env */
export interface UltraenvFilteredEnv {
  /** The filtered environment variables */
  [key: string]: string;
}

// Note: Users should augment the Express Request type in their own code:
// declare global {
//   namespace Express {
//     interface Request { env?: UltraenvFilteredEnv; }
//   }
// }

// -----------------------------------------------------------------------------
// Middleware Factory
// -----------------------------------------------------------------------------

/**
 * Create an Express/Connect middleware that filters environment variables
 * by prefix and attaches them to `req.env`.
 *
 * Only env vars matching the specified prefix(es) are included,
 * preventing accidental exposure of secrets to client-side code.
 *
 * @param options - Middleware configuration options
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { ultraenvMiddleware } from 'ultraenv/middleware';
 *
 * const app = express();
 * app.use(ultraenvMiddleware({
 *   exposePublic: true,
 *   prefix: 'PUBLIC_',
 *   additionalPrefixes: ['NEXT_PUBLIC_', 'VITE_'],
 * }));
 *
 * // Now in routes:
 * app.get('/api/config', (req, res) => {
 *   res.json({
 *     apiUrl: req.env?.PUBLIC_API_URL,
 *     siteUrl: req.env?.PUBLIC_SITE_URL,
 *   });
 * });
 * ```
 */
export function ultraenvMiddleware(
  options: UltraenvMiddlewareOptions = {},
): (req: UltraenvRequest, res: UltraenvResponse, next: UltraenvNextFunction) => void {
  const {
    exposePublic = true,
    prefix = 'PUBLIC_',
    additionalPrefixes = [],
    allowList = [],
    denyList = [],
    exposeNodeEnv = true,
    source = process.env as Record<string, string | undefined>,
  } = options;

  // Build the set of prefixes to match
  const allPrefixes: string[] = [prefix];
  for (const p of additionalPrefixes) {
    allPrefixes.push(p);
  }

  // Build the allow and deny sets for O(1) lookups
  const allowSet = new Set(allowList.map((k) => k.toUpperCase()));
  const denySet = new Set(denyList.map((k) => k.toUpperCase()));

  // Build the filtered env object (computed once per middleware creation)
  const filteredEnv: UltraenvFilteredEnv = buildFilteredEnv(
    source,
    allPrefixes,
    allowSet,
    denySet,
    exposePublic,
    exposeNodeEnv,
  );

  return (
    _req: UltraenvRequest,
    _res: UltraenvResponse,
    next: UltraenvNextFunction,
  ): void => {
    _req.env = filteredEnv;
    next();
  };
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Build the filtered environment object.
 * This is done once at middleware creation time, not per-request.
 */
function buildFilteredEnv(
  source: Record<string, string | undefined>,
  prefixes: readonly string[],
  allowSet: ReadonlySet<string>,
  denySet: ReadonlySet<string>,
  exposePublic: boolean,
  exposeNodeEnv: boolean,
): UltraenvFilteredEnv {
  if (!exposePublic) {
    return {};
  }

  const env: UltraenvFilteredEnv = {};

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
// Health Check Route Helper
// -----------------------------------------------------------------------------

/**
 * Create a health check route handler that returns env health status.
 * Does NOT expose secret values — only counts and metadata.
 *
 * @param options - Health check options
 * @returns Express route handler
 *
 * @example
 * ```typescript
 * import { healthCheckRoute } from 'ultraenv/middleware';
 * app.get('/health/env', healthCheckRoute());
 * // Response: { status: 'ok', loaded: 38, environment: 'production', timestamp: '...' }
 * ```
 */
export function healthCheckRoute(
  options: {
    /** Custom env source. Defaults to process.env */
    source?: Record<string, string | undefined>;
    /** Additional metadata to include */
    metadata?: Record<string, string | number | boolean>;
  } = {},
): (req: UltraenvRequest, res: UltraenvResponse) => void {
  const { source = process.env as Record<string, string | undefined>, metadata = {} } = options;

  return (_req: UltraenvRequest, res: UltraenvResponse): void => {
    const envKeys = Object.keys(source).filter(
      (k) => source[k] !== undefined && source[k] !== '',
    );
    const nodeEnv = source['NODE_ENV'] ?? 'unknown';

    const response: Record<string, string | number | boolean> = {
      status: 'ok',
      loaded: envKeys.length,
      environment: nodeEnv,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    res.status(200).json(response);
  };
}
