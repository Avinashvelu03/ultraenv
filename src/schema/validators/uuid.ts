// =============================================================================
// ultraenv — UUID Validator
// Advanced UUID validation with version-specific checks (v1-v7).
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

export interface UuidValidatorOptions {
  /** Require a specific UUID version (1-7) */
  version?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** Whether to allow nil UUID (00000000-0000-0000-0000-000000000000) — default: false */
  allowNil?: boolean;
  /** Whether to be strict about variant bits — default: true */
  strictVariant?: boolean;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

function parseAndValidateUuid(raw: string, opts: UuidValidatorOptions): ParseResult<string> {
  const trimmed = raw.trim().toLowerCase();

  if (!UUID_REGEX.test(trimmed)) {
    return { success: false, error: `"${trimmed}" is not a valid UUID` };
  }

  // Nil UUID check
  if (trimmed === NIL_UUID && opts.allowNil !== true) {
    return { success: false, error: 'Nil UUID (all zeros) is not allowed' };
  }

  // Version-specific checks
  if (opts.version !== undefined) {
    const versionDigit = trimmed[14] ?? '0';
    if (versionDigit !== String(opts.version)) {
      return {
        success: false,
        error: `Expected UUID v${opts.version}, but got v${versionDigit}`,
      };
    }
  }

  // Strict variant check (RFC 4122 variant: bits 10xx)
  if (opts.strictVariant !== false) {
    const variantNibble = trimmed[19] ?? '0';
    const variantNum = parseInt(variantNibble, 16);
    // RFC 4122: variant must be 10xx (binary), meaning 8, 9, a, or b
    if (variantNum < 8 || variantNum > 11) {
      return {
        success: false,
        error: `UUID variant nibble must be 8, 9, a, or b (RFC 4122). Got "${variantNibble}"`,
      };
    }

    // If version is specified, the version nibble must be valid (1-8)
    const versionNibble = trimmed[14] ?? '0';
    const versionNum = parseInt(versionNibble, 16);
    if (versionNum < 1 || versionNum > 8) {
      return {
        success: false,
        error: `UUID version nibble must be 1-8. Got "${versionNibble}"`,
      };
    }
  }

  return { success: true, value: trimmed };
}

/** Create a UUID schema builder */
export function createUuidSchema(opts?: UuidValidatorOptions): SchemaBuilder<string> {
  const options = opts ?? {};
  const parser = (raw: string): ParseResult<string> => parseAndValidateUuid(raw, options);
  return new SchemaBuilder<string>(parser, 'uuid');
}
