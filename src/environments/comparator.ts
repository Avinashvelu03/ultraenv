// =============================================================================
// ultraenv — Environment Comparator
// Compares two .env environment files and reports differences.
// =============================================================================

import { resolve, join } from 'node:path';
import { readFile, exists } from '../utils/fs.js';
import { parseEnvFile } from '../core/parser.js';
import { maskValue, isSecretKey, isSecretLike } from '../utils/mask.js';
import { FileSystemError } from '../core/errors.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Result of comparing two environments.
 */
export interface EnvironmentComparison {
  /** The first environment name */
  env1Name: string;
  /** The second environment name */
  env2Name: string;
  /** Variables only present in env1 */
  onlyInEnv1: readonly EnvDifference[];
  /** Variables only present in env2 */
  onlyInEnv2: readonly EnvDifference[];
  /** Variables present in both but with different values */
  different: readonly EnvDifference[];
  /** Variables present in both with the same value */
  same: readonly string[];
  /** Warnings about potentially dangerous differences */
  warnings: readonly ComparisonWarning[];
}

/**
 * A single variable difference between two environments.
 */
export interface EnvDifference {
  /** The variable name */
  key: string;
  /** Value in env1 (masked if secret) */
  value1: string;
  /** Value in env2 (masked if secret) */
  value2: string;
  /** Whether the value is a secret */
  isSecret: boolean;
}

/**
 * A warning about a potentially dangerous difference.
 */
export interface ComparisonWarning {
  /** The variable name */
  key: string;
  /** Warning message */
  message: string;
  /** Severity level */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** Value in env1 (masked) */
  value1: string;
  /** Value in env2 (masked) */
  value2: string;
}

interface ParsedEnvironment {
  vars: Record<string, string>;
  keys: readonly string[];
}

// -----------------------------------------------------------------------------
// Parsing
// -----------------------------------------------------------------------------

/**
 * Parse a .env file into a simple key-value mapping.
 */
function parseEnvironment(content: string): ParsedEnvironment {
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

/**
 * Determine if a variable value looks like a secret.
 */
function isSecretVar(key: string, value: string): boolean {
  if (isSecretKey(key)) return true;
  if (value.length > 0 && isSecretLike(value)) return true;
  return false;
}

// -----------------------------------------------------------------------------
// Danger Detection
// -----------------------------------------------------------------------------

/**
 * Patterns that indicate potentially dangerous configuration differences.
 */
const DANGER_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}> = [
  {
    pattern: /^(SECURITY|CSRF|CORS|AUTH|SESSION|COOKIE)/i,
    message: 'Security configuration differs between environments',
    severity: 'critical',
  },
  {
    pattern: /^(DEBUG|LOG_LEVEL|VERBOSE|TRACE)/i,
    message: 'Debug/logging settings differ — debug mode may be enabled in production',
    severity: 'high',
  },
  {
    pattern: /^(ALLOWED_ORIGINS|CORS_ORIGIN)/i,
    message: 'CORS origin configuration differs — may expose to unintended origins',
    severity: 'high',
  },
  {
    pattern: /^(DATABASE_URL|MONGO_URL|REDIS_URL)/i,
    message: 'Database connection differs — pointing to different databases',
    severity: 'medium',
  },
  {
    pattern: /^(API_URL|BASE_URL|BACKEND_URL)/i,
    message: 'API endpoint differs — may point to wrong server',
    severity: 'medium',
  },
  {
    pattern: /^(SSL|TLS|HTTPS|CERT|KEY|ENCRYPTION)/i,
    message: 'SSL/TLS configuration differs — security may be weakened',
    severity: 'critical',
  },
  {
    pattern: /^(RATE_LIMIT|THROTTLE|MAX_REQUESTS)/i,
    message: 'Rate limiting differs — may be too permissive',
    severity: 'low',
  },
  {
    pattern: /^(NODE_ENV|APP_ENV|ENVIRONMENT)/i,
    message: 'Environment mode differs',
    severity: 'high',
  },
  {
    // Detect when a security feature is disabled in one env but enabled in another
    pattern: /^(.*_ENABLED|.*_DISABLED|.*_ACTIVE|.*_PROTECTED)/i,
    message: 'Feature flag/security toggle differs between environments',
    severity: 'medium',
  },
];

/**
 * Detect potentially dangerous differences between two values.
 */
function detectDanger(key: string, value1: string, value2: string): ComparisonWarning | null {
  for (const danger of DANGER_PATTERNS) {
    if (danger.pattern.test(key)) {
      return {
        key,
        message: danger.message,
        severity: danger.severity,
        value1: isSecretVar(key, value1) ? maskValue(value1) : value1,
        value2: isSecretVar(key, value2) ? maskValue(value2) : value2,
      };
    }
  }

  // Detect URL differences (pointing to different hosts)
  const urlPattern = /^https?:\/\//i;
  if (urlPattern.test(value1) && urlPattern.test(value2)) {
    try {
      const url1 = new URL(value1);
      const url2 = new URL(value2);
      if (url1.hostname !== url2.hostname) {
        return {
          key,
          message: `URL host differs: "${url1.hostname}" vs "${url2.hostname}"`,
          severity: 'medium',
          value1: isSecretVar(key, value1) ? maskValue(value1) : value1,
          value2: isSecretVar(key, value2) ? maskValue(value2) : value2,
        };
      }
    } catch {
      // Not valid URLs, ignore
    }
  }

  // Detect boolean-like value going from true to false (security feature disabled)
  if (
    (value1.toLowerCase() === 'true' || value1 === '1') &&
    (value2.toLowerCase() === 'false' || value2 === '0')
  ) {
    return {
      key,
      message: `Feature toggled off: "${key}" changed from enabled to disabled`,
      severity: 'medium',
      value1,
      value2,
    };
  }

  return null;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Compare two .env environment files and report differences.
 *
 * This compares the variables between two environments, masks secret values
 * in the output, and generates warnings for potentially dangerous differences
 * (e.g., different database URLs, disabled security features, debug mode enabled).
 *
 * @param env1 - Name of the first environment (e.g., 'development')
 * @param env2 - Name of the second environment (e.g., 'production')
 * @param cwd - The directory containing the .env files
 * @param schema - Optional schema for identifying secrets and required fields
 * @returns EnvironmentComparison with detailed difference information
 * @throws FileSystemError if either environment file cannot be read
 */
export async function compareEnvironments(
  env1: string,
  env2: string,
  cwd?: string,
  _schema?: unknown,
): Promise<EnvironmentComparison> {
  const baseDir = resolve(cwd ?? process.cwd());

  const env1Path = join(baseDir, `.env.${env1}`);
  const env2Path = join(baseDir, `.env.${env2}`);

  // Resolve file paths — support direct paths too
  const resolvedEnv1Path = env1.includes('/') || env1.includes('\\') ? resolve(env1) : env1Path;
  const resolvedEnv2Path = env2.includes('/') || env2.includes('\\') ? resolve(env2) : env2Path;

  if (!(await exists(resolvedEnv1Path))) {
    throw new FileSystemError(`Environment file not found: "${resolvedEnv1Path}"`, {
      path: resolvedEnv1Path,
      operation: 'read',
      hint: `Ensure ".env.${env1}" exists in the project directory.`,
    });
  }

  if (!(await exists(resolvedEnv2Path))) {
    throw new FileSystemError(`Environment file not found: "${resolvedEnv2Path}"`, {
      path: resolvedEnv2Path,
      operation: 'read',
      hint: `Ensure ".env.${env2}" exists in the project directory.`,
    });
  }

  const env1Content = await readFile(resolvedEnv1Path);
  const env2Content = await readFile(resolvedEnv2Path);

  const env1Parsed = parseEnvironment(env1Content);
  const env2Parsed = parseEnvironment(env2Content);

  return compareEnvironmentVars(env1, env2, env1Parsed, env2Parsed);
}

/**
 * Compare two parsed environments.
 */
function compareEnvironmentVars(
  env1Name: string,
  env2Name: string,
  env1Parsed: ParsedEnvironment,
  env2Parsed: ParsedEnvironment,
): EnvironmentComparison {
  const env1Keys = new Set(env1Parsed.keys);
  const env2Keys = new Set(env2Parsed.keys);

  const onlyInEnv1: EnvDifference[] = [];
  const onlyInEnv2: EnvDifference[] = [];
  const different: EnvDifference[] = [];
  const same: string[] = [];
  const warnings: ComparisonWarning[] = [];

  // Variables only in env1
  for (const key of env1Keys) {
    if (!env2Keys.has(key)) {
      const value = env1Parsed.vars[key] ?? '';
      onlyInEnv1.push({
        key,
        value1: isSecretVar(key, value) ? maskValue(value) : value,
        value2: '',
        isSecret: isSecretVar(key, value),
      });
    }
  }

  // Variables only in env2
  for (const key of env2Keys) {
    if (!env1Keys.has(key)) {
      const value = env2Parsed.vars[key] ?? '';
      onlyInEnv2.push({
        key,
        value1: '',
        value2: isSecretVar(key, value) ? maskValue(value) : value,
        isSecret: isSecretVar(key, value),
      });
    }
  }

  // Variables in both — compare values
  for (const key of env1Keys) {
    if (!env2Keys.has(key)) continue;

    const value1 = env1Parsed.vars[key] ?? '';
    const value2 = env2Parsed.vars[key] ?? '';

    if (value1 === value2) {
      same.push(key);
    } else {
      const isSecret = isSecretVar(key, value1) || isSecretVar(key, value2);
      different.push({
        key,
        value1: isSecret ? maskValue(value1) : value1,
        value2: isSecret ? maskValue(value2) : value2,
        isSecret,
      });

      // Check for dangerous differences
      const danger = detectDanger(key, value1, value2);
      if (danger !== null) {
        warnings.push(danger);
      }
    }
  }

  // Sort for deterministic output
  onlyInEnv1.sort((a, b) => a.key.localeCompare(b.key));
  onlyInEnv2.sort((a, b) => a.key.localeCompare(b.key));
  different.sort((a, b) => a.key.localeCompare(b.key));
  same.sort();
  warnings.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const diff = severityOrder[a.severity] - severityOrder[b.severity];
    return diff !== 0 ? diff : a.key.localeCompare(b.key);
  });

  return {
    env1Name,
    env2Name,
    onlyInEnv1,
    onlyInEnv2,
    different,
    same,
    warnings,
  };
}

/**
 * Format an EnvironmentComparison into a human-readable summary string.
 *
 * @param comparison - The comparison result
 * @returns Formatted string suitable for terminal output
 */
export function formatComparison(comparison: EnvironmentComparison): string {
  const lines: string[] = [];

  lines.push(`Comparing: ${comparison.env1Name} vs ${comparison.env2Name}`);
  lines.push('─'.repeat(50));

  // Warnings (most important)
  if (comparison.warnings.length > 0) {
    lines.push('');
    lines.push(`⚠ ${comparison.warnings.length} warning(s):`);
    for (const warning of comparison.warnings) {
      const icon =
        warning.severity === 'critical'
          ? '🔴'
          : warning.severity === 'high'
            ? '🟠'
            : warning.severity === 'medium'
              ? '🟡'
              : '🔵';
      lines.push(`  ${icon} ${warning.key}: ${warning.message}`);
    }
  }

  // Only in env1
  if (comparison.onlyInEnv1.length > 0) {
    lines.push('');
    lines.push(`Only in ${comparison.env1Name} (${comparison.onlyInEnv1.length}):`);
    for (const diff of comparison.onlyInEnv1) {
      lines.push(
        `  - ${diff.key}${diff.isSecret ? ' [SECRET]' : ''} = ${diff.value1 || '(empty)'}`,
      );
    }
  }

  // Only in env2
  if (comparison.onlyInEnv2.length > 0) {
    lines.push('');
    lines.push(`Only in ${comparison.env2Name} (${comparison.onlyInEnv2.length}):`);
    for (const diff of comparison.onlyInEnv2) {
      lines.push(
        `  + ${diff.key}${diff.isSecret ? ' [SECRET]' : ''} = ${diff.value2 || '(empty)'}`,
      );
    }
  }

  // Different values
  if (comparison.different.length > 0) {
    lines.push('');
    lines.push(`Different (${comparison.different.length}):`);
    for (const diff of comparison.different) {
      lines.push(`  ~ ${diff.key}${diff.isSecret ? ' [SECRET]' : ''}`);
      lines.push(`    ${comparison.env1Name}: ${diff.value1 || '(empty)'}`);
      lines.push(`    ${comparison.env2Name}: ${diff.value2 || '(empty)'}`);
    }
  }

  // Same values
  if (comparison.same.length > 0) {
    lines.push('');
    lines.push(`Same (${comparison.same.length}): ${comparison.same.join(', ')}`);
  }

  return lines.join('\n');
}
