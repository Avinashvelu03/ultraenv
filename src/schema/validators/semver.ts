// =============================================================================
// ultraenv — Semver Validator
// Validates semantic version strings per SemVer 2.0.0 (semver.org).
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

export interface SemverValidatorOptions {
  /** Whether to allow prerelease versions (e.g., 1.0.0-alpha.1) — default: true */
  allowPrerelease?: boolean;
  /** Whether to allow build metadata (e.g., 1.0.0+build.123) — default: true */
  allowBuildMetadata?: boolean;
  /** Whether to allow leading 'v' prefix (e.g., v1.0.0) — default: true */
  allowVPrefix?: boolean;
  /** Loose mode — allows non-compliant versions like "1.0" — default: false */
  loose?: boolean;
}

// SemVer 2.0.0 regex components
const SEMVER_CORE = '(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)';
const SEMVER_PRERELEASE = '(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))';
const SEMVER_BUILD = '(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))';

const STRICT_SEMVER_REGEX = new RegExp(`^${SEMVER_CORE}(?:${SEMVER_PRERELEASE})?(?:${SEMVER_BUILD})?$`);
const LOOSE_SEMVER_REGEX = /^v?(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?(?:\.(0|[1-9]\d*))?(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

function parseAndValidateSemver(raw: string, opts: SemverValidatorOptions): ParseResult<string> {
  const trimmed = raw.trim();
  let content = trimmed;

  // Handle v prefix
  const allowVPrefix = opts.allowVPrefix ?? true;
  if (content.startsWith('v') || content.startsWith('V')) {
    if (!allowVPrefix) {
      return { success: false, error: 'Semver string must not start with "v" prefix' };
    }
    content = content.slice(1);
  }

  const loose = opts.loose ?? false;
  const regex = loose ? LOOSE_SEMVER_REGEX : STRICT_SEMVER_REGEX;

  if (!regex.test(content)) {
    const mode = loose ? 'loose' : 'strict';
    return {
      success: false,
      error: `"${trimmed}" is not a valid semver string (${mode} mode)`,
    };
  }

  if (!loose) {
    // Extract prerelease and build metadata
    const match = content.match(new RegExp(`^${SEMVER_CORE}(?:${SEMVER_PRERELEASE})?(?:${SEMVER_BUILD})?$`));
    if (match) {
      const prerelease = match[4];
      const build = match[5];

      // Prerelease check
      if (prerelease !== undefined && opts.allowPrerelease === false) {
        return {
          success: false,
          error: 'Semver string must not have a prerelease suffix',
        };
      }

      // Build metadata check
      if (build !== undefined && opts.allowBuildMetadata === false) {
        return {
          success: false,
          error: 'Semver string must not have build metadata',
        };
      }
    }
  }

  return { success: true, value: trimmed };
}

/** Create a semver schema builder */
export function createSemverSchema(opts?: SemverValidatorOptions): SchemaBuilder<string> {
  const options = opts ?? {};
  const parser = (raw: string): ParseResult<string> => parseAndValidateSemver(raw, options);
  return new SchemaBuilder<string>(parser, 'semver');
}
