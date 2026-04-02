// =============================================================================
// ultraenv — Base64 Validator
// Advanced base64 string validation with padding and URL-safe options.
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

export interface Base64ValidatorOptions {
  /** Whether to allow URL-safe characters (- and _ instead of + and /) — default: false */
  urlSafe?: boolean;
  /** Whether to require padding (= or ==) — default: false */
  requirePadding?: boolean;
  /** Whether to disallow whitespace — default: true */
  noWhitespace?: boolean;
  /** Whether to allow empty strings — default: false */
  allowEmpty?: boolean;
  /** Minimum decoded byte length — default: none */
  minBytes?: number;
  /** Maximum decoded byte length — default: none */
  maxBytes?: number;
}

const BASE64_CHARS_STANDARD = /^[A-Za-z0-9+/]*={0,2}$/;
const BASE64_CHARS_URL_SAFE = /^[A-Za-z0-9\-_]*={0,2}$/;

function parseAndValidateBase64(raw: string, opts: Base64ValidatorOptions): ParseResult<string> {
  const trimmed = raw.trim();
  const urlSafe = opts.urlSafe ?? false;
  const requirePadding = opts.requirePadding ?? false;
  const noWhitespace = opts.noWhitespace ?? true;
  const allowEmpty = opts.allowEmpty ?? false;

  if (trimmed.length === 0) {
    if (allowEmpty) {
      return { success: true, value: trimmed };
    }
    return { success: false, error: 'Base64 string must not be empty' };
  }

  if (noWhitespace && /\s/.test(trimmed)) {
    return { success: false, error: 'Base64 string must not contain whitespace' };
  }

  const regex = urlSafe ? BASE64_CHARS_URL_SAFE : BASE64_CHARS_STANDARD;
  if (!regex.test(trimmed)) {
    const validChars = urlSafe ? 'A-Za-z0-9-_' : 'A-Za-z0-9+/';
    return {
      success: false,
      error: `Base64 string contains invalid characters. Allowed: ${validChars}=`,
    };
  }

  // Padding validation
  if (requirePadding) {
    const mod = trimmed.replace(/=/g, '').length % 4;
    const expectedPadding = mod === 0 ? 0 : 4 - mod;
    const actualPadding = trimmed.length - (trimmed.replace(/=/g, '').length);
    if (actualPadding !== expectedPadding) {
      return {
        success: false,
        error: `Base64 padding is invalid. Expected ${expectedPadding} padding characters, got ${actualPadding}`,
      };
    }
  }

  // Check that padding, if present, is only at the end
  const paddingIndex = trimmed.indexOf('=');
  if (paddingIndex !== -1) {
    const afterPadding = trimmed.slice(paddingIndex);
    if (/[^=]/.test(afterPadding)) {
      return { success: false, error: 'Base64 padding (=) must only appear at the end' };
    }
    if (afterPadding.length > 2) {
      return { success: false, error: 'Base64 string has too many padding characters' };
    }
  }

  // Try to decode to validate
  const decoded = Buffer.from(trimmed, 'base64');

  // Check for valid decode (Buffer.from with base64 never throws, but produces empty for invalid)
  const reEncoded = decoded.toString('base64');
  // Normalize for comparison: remove padding
  const normalizedInput = trimmed.replace(/=+$/, '');
  const normalizedReEncoded = reEncoded.replace(/=+$/, '');
  if (urlSafe) {
    const urlSafeReEncoded = normalizedReEncoded.replace(/\+/g, '-').replace(/\//g, '_');
    if (normalizedInput !== urlSafeReEncoded) {
      return { success: false, error: 'Base64 string contains invalid characters' };
    }
  } else {
    if (normalizedInput !== normalizedReEncoded) {
      return { success: false, error: 'Base64 string contains invalid characters' };
    }
  }

  // Byte length checks
  if (opts.minBytes !== undefined && decoded.length < opts.minBytes) {
    return {
      success: false,
      error: `Base64 decoded length must be at least ${opts.minBytes} bytes, got ${decoded.length}`,
    };
  }
  if (opts.maxBytes !== undefined && decoded.length > opts.maxBytes) {
    return {
      success: false,
      error: `Base64 decoded length must be at most ${opts.maxBytes} bytes, got ${decoded.length}`,
    };
  }

  return { success: true, value: trimmed };
}

/** Create a base64 schema builder */
export function createBase64Schema(opts?: Base64ValidatorOptions): SchemaBuilder<string> {
  const options = opts ?? {};
  const parser = (raw: string): ParseResult<string> => parseAndValidateBase64(raw, options);
  return new SchemaBuilder<string>(parser, 'base64');
}
