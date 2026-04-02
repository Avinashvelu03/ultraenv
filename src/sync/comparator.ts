// =============================================================================
// ultraenv — .env vs .env.example Comparator
// Compares two environment files and reports differences.
// =============================================================================

import { readFile } from '../utils/fs.js';
import { parseEnvFile } from '../core/parser.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Result of comparing .env against .env.example.
 */
export interface SyncDiff {
  /** Whether the two files are perfectly in sync */
  inSync: boolean;
  /** Variables present in .env.example but missing from .env */
  missing: readonly string[];
  /** Variables present in .env but not in .env.example */
  extra: readonly string[];
  /** Variables present in both but with different values (example has placeholder) */
  different: readonly string[];
  /** Variables present in both with the same value */
  same: readonly string[];
}

interface ParsedVars {
  /** Key → raw value mapping */
  vars: Record<string, string>;
  /** Preserved ordering of keys */
  keys: readonly string[];
}

// -----------------------------------------------------------------------------
// Parsing Helper
// -----------------------------------------------------------------------------

/**
 * Parse a .env file into a simple key-value mapping with preserved ordering.
 */
function parseToVars(content: string): ParsedVars {
  const parsed = parseEnvFile(content);
  const vars: Record<string, string> = {};
  const keys: string[] = [];

  for (const envVar of parsed.vars) {
    if (!(envVar.key in vars)) {
      vars[envVar.key] = envVar.value;
      keys.push(envVar.key);
    }
  }

  return { vars, keys };
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Compare a .env file against a .env.example file.
 *
 * Analyzes both files and categorizes every variable into:
 * - **missing**: present in .env.example but not in .env (needs to be added)
 * - **extra**: present in .env but not in .env.example (possibly sensitive)
 * - **different**: present in both but values differ (example may have placeholder)
 * - **same**: present in both with matching values
 *
 * A file is considered "in sync" when there are no missing or extra variables.
 * "Different" variables do NOT cause inSync to be false since the .env.example
 * typically contains placeholder values rather than actual secrets.
 *
 * @param envPath - Path to the .env file
 * @param examplePath - Path to the .env.example file
 * @returns SyncDiff with categorized differences
 * @throws FileSystemError if either file cannot be read
 */
export async function compareSync(
  envPath: string,
  examplePath: string,
): Promise<SyncDiff> {
  const envContent = await readFile(envPath);
  const exampleContent = await readFile(examplePath);

  const envParsed = parseToVars(envContent);
  const exampleParsed = parseToVars(exampleContent);

  return compareValues(envParsed.vars, exampleParsed.vars);
}

/**
 * Compare two sets of environment variables.
 *
 * This is the core comparison logic, useful when you already have parsed
 * variables and don't need file I/O.
 *
 * @param envVars - The actual environment variables (e.g., from .env)
 * @param exampleVars - The example/template variables (e.g., from .env.example)
 * @returns SyncDiff with categorized differences
 */
export function compareValues(
  envVars: Record<string, string>,
  exampleVars: Record<string, string>,
): SyncDiff {
  const envKeys = new Set(Object.keys(envVars));
  const exampleKeys = new Set(Object.keys(exampleVars));

  const missing: string[] = [];
  const extra: string[] = [];
  const different: string[] = [];
  const same: string[] = [];

  // Find variables in example but not in env
  for (const key of exampleKeys) {
    if (!envKeys.has(key)) {
      missing.push(key);
    }
  }

  // Find variables in env but not in example
  for (const key of envKeys) {
    if (!exampleKeys.has(key)) {
      extra.push(key);
    }
  }

  // Compare values for variables present in both
  for (const key of envKeys) {
    if (!exampleKeys.has(key)) continue;

    const envValue = envVars[key];
    const exampleValue = exampleVars[key];

    if (envValue === exampleValue) {
      same.push(key);
    } else {
      different.push(key);
    }
  }

  // Sort all arrays for deterministic output
  missing.sort();
  extra.sort();
  different.sort();
  same.sort();

  // In sync means no missing or extra variables
  const inSync = missing.length === 0 && extra.length === 0;

  return {
    inSync,
    missing,
    extra,
    different,
    same,
  };
}

/**
 * Format a SyncDiff into a human-readable summary string.
 *
 * @param diff - The comparison result
 * @returns Formatted string suitable for terminal output
 */
export function formatSyncDiff(diff: SyncDiff): string {
  const lines: string[] = [];

  if (diff.inSync) {
    lines.push('✓ .env is in sync with .env.example');
  } else {
    lines.push('✗ .env is out of sync with .env.example');
  }

  if (diff.missing.length > 0) {
    lines.push('');
    lines.push(`Missing (${diff.missing.length}):`);
    for (const key of diff.missing) {
      lines.push(`  - ${key}`);
    }
  }

  if (diff.extra.length > 0) {
    lines.push('');
    lines.push(`Extra (${diff.extra.length}):`);
    for (const key of diff.extra) {
      lines.push(`  + ${key}`);
    }
  }

  if (diff.different.length > 0) {
    lines.push('');
    lines.push(`Different (${diff.different.length}):`);
    for (const key of diff.different) {
      lines.push(`  ~ ${key}`);
    }
  }

  if (diff.same.length > 0 && diff.inSync) {
    lines.push('');
    lines.push(`${diff.same.length} variable(s) matched.`);
  }

  return lines.join('\n');
}
