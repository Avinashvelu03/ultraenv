// =============================================================================
// ultraenv — Hex Validator
// Advanced hex string validation with length and prefix options.
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

export interface HexValidatorOptions {
  /** Whether to allow "0x" prefix — default: false */
  allowPrefix?: boolean;
  /** Require "0x" prefix — default: false */
  requirePrefix?: boolean;
  /** Exact byte length (number of hex pairs) — e.g., 32 for SHA-256 */
  byteLength?: number;
  /** Case requirement: 'lower', 'upper', or 'mixed' (default: 'mixed') */
  caseSensitive?: 'lower' | 'upper' | 'mixed';
}

const HEX_CHARS = new Set('0123456789abcdefABCDEF');

function parseAndValidateHex(raw: string, opts: HexValidatorOptions): ParseResult<string> {
  const trimmed = raw.trim();
  let content = trimmed;

  // Handle prefix
  const allowPrefix = opts.allowPrefix ?? false;
  const requirePrefix = opts.requirePrefix ?? false;

  if (requirePrefix && !content.startsWith('0x') && !content.startsWith('0X')) {
    return { success: false, error: 'Hex string must start with "0x" prefix' };
  }

  if (content.startsWith('0x') || content.startsWith('0X')) {
    if (!allowPrefix && !requirePrefix) {
      return { success: false, error: 'Hex string must not have a "0x" prefix' };
    }
    content = content.slice(2);
  }

  if (content.length === 0) {
    return { success: false, error: 'Hex string must not be empty' };
  }

  // Validate all characters are hex
  for (let i = 0; i < content.length; i++) {
    if (!HEX_CHARS.has(content[i] ?? '')) {
      return {
        success: false,
        error: `Invalid hex character "${content[i]}" at position ${i}`,
      };
    }
  }

  // Case sensitivity
  const caseSensitive = opts.caseSensitive ?? 'mixed';
  if (caseSensitive === 'lower' && content !== content.toLowerCase()) {
    return { success: false, error: 'Hex string must be lowercase' };
  }
  if (caseSensitive === 'upper' && content !== content.toUpperCase()) {
    return { success: false, error: 'Hex string must be uppercase' };
  }

  // Byte length check
  if (opts.byteLength !== undefined) {
    if (content.length !== opts.byteLength * 2) {
      return {
        success: false,
        error: `Hex string must be ${opts.byteLength * 2} characters (${opts.byteLength} bytes), got ${content.length}`,
      };
    }
  }

  // Even length check (if no specific byte length)
  if (opts.byteLength === undefined && content.length % 2 !== 0) {
    return {
      success: false,
      error: 'Hex string must have an even number of characters',
    };
  }

  return { success: true, value: trimmed };
}

/** Create a hex string schema builder */
export function createHexSchema(opts?: HexValidatorOptions): SchemaBuilder<string> {
  const options = opts ?? {};
  const parser = (raw: string): ParseResult<string> => parseAndValidateHex(raw, options);
  return new SchemaBuilder<string>(parser, 'hex');
}
