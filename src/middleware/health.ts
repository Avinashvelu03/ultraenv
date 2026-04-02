// =============================================================================
// ultraenv — Health Check Helper
// Returns environment health status without exposing secret values.
// =============================================================================

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** Health check configuration options */
export interface HealthCheckOptions {
  /**
   * Custom env source to check.
   * Defaults to process.env.
   */
  source?: Record<string, string | undefined>;

  /**
   * List of loaded .env files (for metadata).
   */
  loadedFiles?: readonly string[];

  /**
   * Total number of validated variables (from schema validation).
   */
  validCount?: number;

  /**
   * Additional metadata to include in the health response.
   */
  metadata?: Record<string, string | number | boolean>;
}

/** Health check response structure */
export interface HealthCheckResult {
  /** Overall health status: 'ok' or 'error' */
  status: 'ok' | 'error';
  /** Total number of environment variables loaded */
  loaded: number;
  /** Number of variables that passed validation */
  valid: number;
  /** Current environment name */
  environment: string;
  /** List of .env files that were loaded */
  files: readonly string[];
  /** ISO 8601 timestamp of the check */
  timestamp: string;
  /** Any additional metadata */
  metadata: Record<string, string | number | boolean>;
}

// -----------------------------------------------------------------------------
// Health Check Function
// -----------------------------------------------------------------------------

/**
 * Perform an environment health check.
 *
 * Returns a structured object with health status information
 * WITHOUT exposing any secret values. This is safe to expose
 * via HTTP endpoints.
 *
 * @param options - Health check configuration
 * @returns Health check result
 *
 * @example
 * ```typescript
 * import { healthCheck } from 'ultraenv';
 * import { loadWithResult } from 'ultraenv';
 *
 * const result = loadWithResult();
 * const health = healthCheck({
 *   source: result.env,
 *   loadedFiles: result.parsed.map(f => f.path),
 *   validCount: result.validation?.errors.length === 0 ? Object.keys(result.env).length : 0,
 * });
 *
 * // Use in Express:
 * app.get('/health/env', (req, res) => res.json(healthCheck()));
 *
 * // Use in Fastify:
 * fastify.get('/health/env', async () => healthCheck());
 * ```
 */
export function healthCheck(options: HealthCheckOptions = {}): HealthCheckResult {
  const {
    source = process.env as Record<string, string | undefined>,
    loadedFiles = [],
    validCount,
    metadata = {},
  } = options;

  // Count non-empty env vars
  const envKeys = Object.entries(source).filter(
    ([, value]) => value !== undefined && value !== '',
  );
  const loaded = envKeys.length;

  // Determine environment name
  const environment = detectEnvironment(source);

  // Determine validity
  const valid = validCount ?? loaded;

  // Build file list (strip absolute paths to relative)
  const files = loadedFiles.length > 0
    ? loadedFiles.map((f) => {
        const lastSlash = f.lastIndexOf('/');
        const lastBackslash = f.lastIndexOf('\\');
        const lastSep = Math.max(lastSlash, lastBackslash);
        return lastSep >= 0 ? f.slice(lastSep + 1) : f;
      })
    : [];

  return {
    status: 'ok',
    loaded,
    valid,
    environment,
    files,
    timestamp: new Date().toISOString(),
    metadata,
  };
}

// -----------------------------------------------------------------------------
// Lightweight Health (for liveness probes)
// -----------------------------------------------------------------------------

/**
 * Returns a minimal liveness check response.
 * Suitable for Kubernetes liveness probes.
 *
 * @returns Simple liveness response
 *
 * @example
 * app.get('/health/live', (req, res) => res.json(liveCheck()));
 * // → { status: 'ok', timestamp: '2024-01-15T10:30:00.000Z' }
 */
export function liveCheck(): { status: 'ok'; timestamp: string } {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}

// -----------------------------------------------------------------------------
// Readiness Check (includes env validation status)
// -----------------------------------------------------------------------------

/**
 * Returns a readiness check that verifies critical env vars are set.
 *
 * @param requiredVars - List of env var names that MUST be set
 * @param source - Custom env source (defaults to process.env)
 * @returns Readiness check result
 *
 * @example
 * app.get('/health/ready', (req, res) => {
 *   res.json(readinessCheck(['DATABASE_URL', 'JWT_SECRET']));
 * });
 * // → { status: 'ok', ready: true, missing: [], timestamp: '...' }
 * // → { status: 'error', ready: false, missing: ['DATABASE_URL'], timestamp: '...' }
 */
export function readinessCheck(
  requiredVars: readonly string[],
  source?: Record<string, string | undefined>,
): {
  status: 'ok' | 'error';
  ready: boolean;
  missing: readonly string[];
  timestamp: string;
} {
  const env = source ?? (process.env as Record<string, string | undefined>);
  const missing: string[] = [];

  for (const varName of requiredVars) {
    const value = env[varName];
    if (value === undefined || value === '') {
      missing.push(varName);
    }
  }

  return {
    status: missing.length === 0 ? 'ok' : 'error',
    ready: missing.length === 0,
    missing,
    timestamp: new Date().toISOString(),
  };
}

// -----------------------------------------------------------------------------
// Environment Detection
// -----------------------------------------------------------------------------

/**
 * Detect the current environment from standard env variables.
 * Checks common variables in priority order.
 */
function detectEnvironment(env: Record<string, string | undefined>): string {
  const candidates = [
    'NODE_ENV',
    'APP_ENV',
    'ENVIRONMENT',
    'ENV',
    'STAGE',
  ];

  for (const candidate of candidates) {
    const value = env[candidate];
    if (value !== undefined && value !== '') {
      return value;
    }
  }

  return 'unknown';
}
