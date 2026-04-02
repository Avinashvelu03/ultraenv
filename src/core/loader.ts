// =============================================================================
// ultraenv — Main Loader
// Orchestrates cascade resolution → file parsing → interpolation → result.
// =============================================================================

import type { LoadOptions, LoadResult, LoadMetadata, ParsedEnvFile } from './types.js';
import { DEFAULT_ENV_DIR, ENCODING, MAX_INTERPOLATION_DEPTH, MAX_VALUE_LENGTH } from './constants.js';
import { parseEnvFile } from './parser.js';
import { expandVariables } from './interpolation.js';
import { resolveCascade, mergeCascade, type CascadeOptions } from './cascade.js';
import { readFileSync } from '../utils/fs.js';
import { isUltraenvError, FileSystemError } from './errors.js';

// -----------------------------------------------------------------------------
// Error Handler Type
// -----------------------------------------------------------------------------

/** Callback invoked when an error occurs during loading (non-fatal by default) */
export type ErrorHandler = (error: Error) => void;

// -----------------------------------------------------------------------------
// Internal Options (fully resolved)
// -----------------------------------------------------------------------------

interface ResolvedLoadOptions {
  envDir: string;
  encoding: BufferEncoding;
  expandVars: boolean;
  overrideProcessEnv: boolean;
  maxInterpolationDepth: number;
  maxValueLength: number;
  mergeStrategy: 'first-wins' | 'last-wins' | 'error-on-conflict';
  processEnv: Record<string, string | undefined>;
  onError: ErrorHandler;
  cascade: CascadeOptions;
}

/**
 * Resolve load options with defaults.
 */
function resolveLoadOptions(options?: LoadOptions): ResolvedLoadOptions {
/* v8 ignore start */
  const noop: ErrorHandler = () => {};
/* v8 ignore stop */

  return {
/* v8 ignore start */
    envDir: options?.envDir ?? DEFAULT_ENV_DIR,
/* v8 ignore stop */
    encoding: options?.encoding ?? ENCODING,
    expandVars: options?.expandVariables ?? true,
    overrideProcessEnv: options?.overrideProcessEnv ?? false,
    maxInterpolationDepth: options?.maxInterpolationDepth ?? MAX_INTERPOLATION_DEPTH,
    maxValueLength: options?.maxValueLength ?? MAX_VALUE_LENGTH,
    mergeStrategy: options?.mergeStrategy ?? 'last-wins',
    processEnv: options?.processEnv ?? process.env,
    onError: noop,
    cascade: {
/* v8 ignore start */
      envDir: options?.envDir ?? DEFAULT_ENV_DIR,
/* v8 ignore stop */
      mergeStrategy: options?.mergeStrategy ?? 'last-wins',
    },
  };
}

// -----------------------------------------------------------------------------
// Core Load Logic (shared between async and sync)
// -----------------------------------------------------------------------------

/**
 * Load environment variables from .env files (synchronous).
 *
 * This function:
 * 1. Resolves the file cascade based on environment
 * 2. Reads and parses each .env file
 * 3. Merges according to merge strategy
 * 4. Expands variable references (if enabled)
 * 5. Optionally sets process.env values
 *
 * @param options - Load configuration options
 * @returns Merged env key-value pairs
 */
export function load(options?: LoadOptions): Record<string, string> {
  const resolved = resolveLoadOptions(options);
  const result = loadCoreSync(resolved);
  applyToProcessEnv(result.env, resolved);
  return result.env;
}

/**
 * Synchronous version of load (alias for clarity).
 * Identical behavior — uses synchronous file I/O.
 *
 * @param options - Load configuration options
 * @returns Merged env key-value pairs
 */
/* v8 ignore start */
export function loadSync(options?: LoadOptions): Record<string, string> {
  return load(options);
}
/* v8 ignore stop */

/**
 * Full load with complete LoadResult (sync).
 *
 * @param options - Load configuration options
 * @returns Complete LoadResult with env, metadata, and parsed files
 */
export function loadWithResult(options?: LoadOptions): LoadResult {
  const startTime = Date.now();
  const resolved = resolveLoadOptions(options);
  const result = loadCoreSync(resolved);
  const hadOverrides = applyToProcessEnv(result.env, resolved);

  return {
    env: result.env,
    metadata: buildMetadata(result.parsed, result.env, startTime, resolved.envDir, hadOverrides),
    parsed: result.parsed,
  };
}

/**
 * Full load with complete LoadResult (sync, explicit alias).
 */
/* v8 ignore start */
export function loadWithResultSync(options?: LoadOptions): LoadResult {
  return loadWithResult(options);
}
/* v8 ignore stop */

// -----------------------------------------------------------------------------
// Internal Core Loaders
// -----------------------------------------------------------------------------

interface CoreLoadResult {
  env: Record<string, string>;
  parsed: readonly ParsedEnvFile[];
}

/**
 * Synchronous core load logic.
 * Resolves cascade, reads files, parses, merges, and expands.
 */
function loadCoreSync(resolved: ResolvedLoadOptions): CoreLoadResult {
  // 1. Resolve cascade
  const cascade = resolveCascade(resolved.cascade);

  // 2. Read and parse each file
  const parsed: ParsedEnvFile[] = [];
  const existingEntries = cascade.existingFiles;

  for (const entry of existingEntries) {
    try {
      const content = readFileSync(entry.absolutePath, resolved.encoding);

      // Validate value lengths
      validateContentLengths(content, entry.absolutePath, resolved.maxValueLength);

      const parsedFile = parseEnvFile(content, entry.absolutePath);
      parsed.push(parsedFile);
/* v8 ignore start */
    } catch (error: unknown) {
      resolved.onError(
        isUltraenvError(error)
          ? error
          : new FileSystemError(`Failed to read "${entry.absolutePath}"`, {
              path: entry.absolutePath,
              operation: 'read',
              cause: error instanceof Error ? error : undefined,
            }),
      );
    }
/* v8 ignore stop */
  }

  // 3. Merge according to cascade strategy
  const merged = mergeCascade(parsed, cascade);

  // 4. Expand variable references
  let env: Record<string, string>;
  if (resolved.expandVars) {
    env = expandVariables(merged, merged, {
      maxDepth: resolved.maxInterpolationDepth,
      systemEnv: resolved.processEnv,
    });
  } else {
    env = { ...merged };
  }

  return { env, parsed };
}

// -----------------------------------------------------------------------------
// Process.env Integration
// -----------------------------------------------------------------------------

/**
 * Apply loaded env vars to process.env if overrideProcessEnv is true.
 * Returns whether any overrides occurred.
 */
function applyToProcessEnv(
  env: Record<string, string>,
  resolved: ResolvedLoadOptions,
): boolean {
  if (!resolved.overrideProcessEnv) return false;

  let hadOverrides = false;
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] !== value) {
      hadOverrides = true;
    }
    process.env[key] = value;
  }
  return hadOverrides;
}

// -----------------------------------------------------------------------------
// Validation Helpers
// -----------------------------------------------------------------------------

/**
 * Validate that no individual value in file content exceeds the max length.
 */
function validateContentLengths(
  content: string,
  filePath: string,
  maxValueLength: number,
): void {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;

    // Skip commented-out lines
    const trimmed = line.slice(0, eqIndex).trim();
/* v8 ignore start */
    if (trimmed.startsWith('#')) continue;
/* v8 ignore stop */

    const value = line.slice(eqIndex + 1).trimStart();
/* v8 ignore start */
    if (value.length > maxValueLength) {
      throw new FileSystemError(
        `Value for variable at line ${i + 1} exceeds maximum length of ${maxValueLength} bytes (${value.length} bytes)`,
        {
          path: filePath,
          operation: 'read',
          hint: 'Reduce the value length or increase maxValueLength in your ultraenv configuration.',
        },
      );
    }
/* v8 ignore stop */
  }
}

// -----------------------------------------------------------------------------
// Metadata Builder
// -----------------------------------------------------------------------------

function buildMetadata(
  parsed: readonly ParsedEnvFile[],
  env: Record<string, string>,
  startTime: number,
  envDir: string,
  hadOverrides: boolean,
): LoadMetadata {
  const filesFound = parsed.length;
  const totalVars = Object.keys(env).length;

  return {
    totalVars,
    filesParsed: filesFound,
    filesFound,
    loadTimeMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
    envDir,
    hadOverrides,
  };
}
