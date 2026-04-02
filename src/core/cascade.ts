// =============================================================================
// ultraenv — File Priority Cascade Logic
// Resolves which .env files to load and in what order based on environment,
// custom paths, and merge strategies.
// =============================================================================

import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { EnvFileType } from './types.js';
import type { MergeStrategy, ParsedEnvFile } from './types.js';
import { ConfigError } from './errors.js';
import { ENVIRONMENT_VARIABLES } from './constants.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CascadeOptions {
  /** Directory to search for .env files (default: process.cwd()) */
  envDir?: string;
  /** Override the detected environment name */
  environment?: string;
  /** Specific file paths to load (takes priority over auto-detection) */
  paths?: readonly string[];
  /** Glob patterns for file matching */
  patterns?: readonly string[];
  /** Specific EnvFileType enum values to load */
  files?: readonly EnvFileType[];
  /** Merge strategy when multiple files define the same key */
  mergeStrategy?: MergeStrategy;
  /** Whether to include system env vars in the cascade (highest priority) */
  includeSystemEnv?: boolean;
  /** Custom system env snapshot (defaults to process.env) */
  systemEnv?: Record<string, string | undefined>;
}

export interface CascadeFileEntry {
  /** Absolute path to the .env file */
  absolutePath: string;
  /** The file type (if recognized) */
  fileType: EnvFileType | null;
  /** Priority rank (higher = overrides lower) */
  priority: number;
  /** Whether the file exists on disk */
  exists: boolean;
}

export interface ResolvedCascadeResult {
  /** Ordered list of file entries (lowest priority first) */
  files: readonly CascadeFileEntry[];
  /** The detected or specified environment name */
  environment: string;
  /** The merge strategy used */
  mergeStrategy: MergeStrategy;
  /** Whether system env vars are included */
  includeSystemEnv: boolean;
  /** The resolved env directory (absolute path) */
  envDir: string;
  /** Files that were found to exist */
  existingFiles: readonly CascadeFileEntry[];
  /** Source tracking: which file each key came from */
  sources: Record<string, string>;
}

// -----------------------------------------------------------------------------
// Environment Detection
// -----------------------------------------------------------------------------

/**
 * Auto-detect the current environment from well-known env variables.
 * Checks NODE_ENV, APP_ENV, ENVIRONMENT, ENV, STAGE, ULTRAENV_ENV in order.
 *
 * @param systemEnv - The system env to check (defaults to process.env)
 * @returns The detected environment name, or 'development' as fallback
 */
export function detectEnvironment(
  systemEnv?: Record<string, string | undefined>,
): string {
  const env = systemEnv ?? process.env;

  for (const varName of ENVIRONMENT_VARIABLES) {
    const value = env[varName];
    if (value !== undefined && value !== '') {
      return value.toLowerCase().trim();
    }
  }

  return 'development';
}

// -----------------------------------------------------------------------------
// File Type Detection
// -----------------------------------------------------------------------------

/**
 * Try to determine the EnvFileType from a file name.
 * Returns null if the file name doesn't match any known type.
 */
function detectFileType(fileName: string): EnvFileType | null {
  // Strip leading path components
/* v8 ignore start */
  const baseName = fileName.split('/').pop() ?? fileName;
/* v8 ignore stop */
  const baseNameLower = baseName.toLowerCase();

  const fileTypeMap: ReadonlyMap<string, EnvFileType> = new Map<string, EnvFileType>([
    ['.env', EnvFileType.Env],
    ['.env.local', EnvFileType.EnvLocal],
    ['.env.development', EnvFileType.EnvDevelopment],
    ['.env.development.local', EnvFileType.EnvDevelopmentLocal],
    ['.env.test', EnvFileType.EnvTest],
    ['.env.test.local', EnvFileType.EnvTestLocal],
    ['.env.production', EnvFileType.EnvProduction],
    ['.env.production.local', EnvFileType.EnvProductionLocal],
    ['.env.staging', EnvFileType.EnvStaging],
    ['.env.staging.local', EnvFileType.EnvStagingLocal],
    ['.env.ci', EnvFileType.EnvCI],
  ]);

  return fileTypeMap.get(baseNameLower) ?? null;
}

// -----------------------------------------------------------------------------
// Standard Cascade Files
// -----------------------------------------------------------------------------

/**
 * Get the standard cascade file list for a given environment.
 *
 * Priority order (lowest to highest):
 * 1. .env
 * 2. .env.local (skipped in test environment)
 * 3. .env.{ENV}
 * 4. .env.{ENV}.local (skipped in test environment)
 *
 * @param envDir - The environment directory
 * @param environment - The environment name
 * @returns Array of file entries in priority order
 */
function getStandardCascadeFiles(
  envDir: string,
  environment: string,
): CascadeFileEntry[] {
  const files: CascadeFileEntry[] = [];
  let priority = 0;

  // .env — always included
  files.push({
    absolutePath: resolve(join(envDir, '.env')),
    fileType: EnvFileType.Env,
    priority: priority++,
    exists: existsSync(resolve(join(envDir, '.env'))),
  });

  // .env.local — skipped in test environment
  if (environment !== 'test') {
    const localPath = resolve(join(envDir, '.env.local'));
    files.push({
      absolutePath: localPath,
      fileType: EnvFileType.EnvLocal,
      priority: priority++,
      exists: existsSync(localPath),
    });
  }

  // .env.{environment}
  const envSpecificPath = resolve(join(envDir, `.env.${environment}`));
  const envFileType = detectFileType(`.env.${environment}`);
  files.push({
    absolutePath: envSpecificPath,
    fileType: envFileType,
    priority: priority++,
    exists: existsSync(envSpecificPath),
  });

  // .env.{environment}.local — skipped in test environment
  if (environment !== 'test') {
    const envLocalPath = resolve(join(envDir, `.env.${environment}.local`));
    const envLocalFileType = detectFileType(`.env.${environment}.local`);
    files.push({
      absolutePath: envLocalPath,
      fileType: envLocalFileType,
      priority: priority++,
      exists: existsSync(envLocalPath),
    });
  }

  return files;
}

// -----------------------------------------------------------------------------
// Cascade Resolution
// -----------------------------------------------------------------------------

/**
 * Resolve the file cascade based on the given options.
 *
 * This function determines which .env files to load and in what order.
 * It supports:
 * - Standard cascade: .env → .env.local → .env.{ENV} → .env.{ENV}.local
 * - Custom file paths
 * - Custom EnvFileType arrays
 * - .env.local is skipped in test environment
 *
 * @param options - Cascade resolution options
 * @returns ResolvedCascadeResult with ordered file list and metadata
 * @throws ConfigError if options are invalid
 */
export function resolveCascade(options: CascadeOptions = {}): ResolvedCascadeResult {
  const envDir = resolve(options.envDir ?? process.cwd());
  const environment = options.environment ?? detectEnvironment(options.systemEnv);
  const mergeStrategy = options.mergeStrategy ?? 'last-wins';
  const includeSystemEnv = options.includeSystemEnv ?? true;
  const systemEnv = options.systemEnv ?? process.env;

  let entries: CascadeFileEntry[];

  // ---- Priority 1: Explicit file paths ----
  if (options.paths !== undefined && options.paths.length > 0) {
    entries = options.paths.map((p, idx) => {
      const absPath = resolve(p);
      return {
        absolutePath: absPath,
        fileType: detectFileType(p),
        priority: idx,
        exists: existsSync(absPath),
      };
    });
  }
  // ---- Priority 2: Explicit EnvFileType array ----
  else if (options.files !== undefined && options.files.length > 0) {
    entries = options.files.map((fileType, idx) => {
      const absPath = resolve(join(envDir, fileType));
      return {
        absolutePath: absPath,
        fileType,
        priority: idx,
        exists: existsSync(absPath),
      };
    });
  }
  // ---- Priority 3: Standard cascade based on detected environment ----
  else {
    entries = getStandardCascadeFiles(envDir, environment);
  }

  // Sort by priority (ascending = lowest priority first)
  const sorted = [...entries].sort((a, b) => a.priority - b.priority);

  const existingFiles = sorted.filter(entry => entry.exists);

  // Build source tracking
  const sources: Record<string, string> = {};
  if (includeSystemEnv) {
    for (const key of Object.keys(systemEnv)) {
      const val = systemEnv[key];
      if (val !== undefined) {
        sources[key] = 'system';
      }
    }
  }

  return {
    files: sorted,
    environment,
    mergeStrategy,
    includeSystemEnv,
    envDir,
    existingFiles,
    sources,
  };
}

// -----------------------------------------------------------------------------
// Merge Engine
// -----------------------------------------------------------------------------

/**
 * Merge parsed env files according to the cascade result and merge strategy.
 *
 * @param parsedFiles - Array of successfully parsed env files (in priority order)
 * @param cascade - The resolved cascade result
 * @returns Merged key-value pairs with source tracking
 * @throws ConfigError on conflict when using 'error-on-conflict' strategy
 */
export function mergeCascade(
  parsedFiles: readonly ParsedEnvFile[],
  cascade: ResolvedCascadeResult,
): Record<string, string> {
  const merged: Record<string, string> = {};

  if (cascade.mergeStrategy === 'first-wins') {
    for (const file of parsedFiles) {
      for (const envVar of file.vars) {
        if (!(envVar.key in merged)) {
          merged[envVar.key] = envVar.value;
          cascade.sources[envVar.key] = file.path;
        }
      }
    }
  } else if (cascade.mergeStrategy === 'last-wins') {
    for (const file of parsedFiles) {
      for (const envVar of file.vars) {
        merged[envVar.key] = envVar.value;
        cascade.sources[envVar.key] = file.path;
      }
    }
  } else {
    // error-on-conflict
    for (const file of parsedFiles) {
      for (const envVar of file.vars) {
        if (envVar.key in merged) {
          throw new ConfigError(
/* v8 ignore start */
            `Duplicate key "${envVar.key}" found in "${file.path}" (line ${envVar.lineNumber}). Previously defined in "${cascade.sources[envVar.key] ?? 'unknown'}".`,
/* v8 ignore stop */
            {
              field: 'mergeStrategy',
              hint: `Either use 'first-wins' or 'last-wins' merge strategy, or rename one of the conflicting variables.`,
            },
          );
        }
        merged[envVar.key] = envVar.value;
        cascade.sources[envVar.key] = file.path;
      }
    }
  }

  return merged;
}
