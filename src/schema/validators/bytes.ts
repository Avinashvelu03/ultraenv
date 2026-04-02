// =============================================================================
// ultraenv — Bytes Validator
// Parses byte size strings to exact byte counts.
// "1KB"→1024, "5MB"→5242880, "2GB"→2147483648
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

export interface BytesValidatorOptions {
  /** Whether to use binary units (1024) or decimal units (1000) — default: binary */
  binary?: boolean;
  /** Output unit — default: 'bytes' */
  unit?: 'bytes' | 'kb' | 'mb' | 'gb' | 'tb';
  /** Maximum byte count — default: unlimited */
  max?: number;
  /** Minimum byte count — default: 0 */
  min?: number;
}

// Binary unit multipliers
const BINARY_UNITS: Record<string, number> = {
  b: 1,
  byte: 1,
  bytes: 1,
  kb: 1024,
  kib: 1024,
  mb: 1024 * 1024,
  mib: 1024 * 1024,
  gb: 1024 * 1024 * 1024,
  gib: 1024 * 1024 * 1024,
  tb: 1024 * 1024 * 1024 * 1024,
  tib: 1024 * 1024 * 1024 * 1024,
  pb: 1024 * 1024 * 1024 * 1024 * 1024,
  pib: 1024 * 1024 * 1024 * 1024 * 1024,
};

// Decimal unit multipliers
const DECIMAL_UNITS: Record<string, number> = {
  b: 1,
  byte: 1,
  bytes: 1,
  kb: 1000,
  mb: 1000 * 1000,
  gb: 1000 * 1000 * 1000,
  tb: 1000 * 1000 * 1000 * 1000,
  pb: 1000 * 1000 * 1000 * 1000 * 1000,
};

const BYTES_REGEX = /^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/;

function parseAndValidateBytes(raw: string, opts: BytesValidatorOptions): ParseResult<number> {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return { success: false, error: 'Bytes string must not be empty' };
  }

  const match = trimmed.match(BYTES_REGEX);
  if (!match) {
    return {
      success: false,
      error: `Invalid bytes format: "${trimmed}". Expected format: "<number><unit>" (e.g., "1KB", "5MB", "2GB")`,
    };
  }

  const numStr = match[1];
  const unitStr = (match[2] ?? '').toLowerCase();

  const num = Number(numStr);
  if (!Number.isFinite(num) || num < 0) {
    return { success: false, error: `Invalid bytes number: "${numStr}"` };
  }

  const isBinary = opts.binary ?? true;
  const units = isBinary ? BINARY_UNITS : DECIMAL_UNITS;
  const multiplier = units[unitStr];

  if (multiplier === undefined) {
    return {
      success: false,
      error: `Unknown bytes unit: "${match[2]}". Supported: ${Object.keys(units).join(', ')}`,
    };
  }

  let bytes = num * multiplier;

  // Round to integer for byte counts
  bytes = Math.round(bytes);

  // Convert to requested output unit
  const outputUnit = opts.unit ?? 'bytes';
  let result: number;
  switch (outputUnit) {
    case 'bytes':
      result = bytes;
      break;
    case 'kb':
      result = bytes / (isBinary ? 1024 : 1000);
      break;
    case 'mb':
      result = bytes / ((isBinary ? 1024 : 1000) ** 2);
      break;
    case 'gb':
      result = bytes / ((isBinary ? 1024 : 1000) ** 3);
      break;
    case 'tb':
      result = bytes / ((isBinary ? 1024 : 1000) ** 4);
      break;
  }

  // Range checks
  if (opts.min !== undefined && bytes < opts.min) {
    return {
      success: false,
      error: `Bytes must be at least ${opts.min}, got ${bytes}`,
    };
  }
  if (opts.max !== undefined && bytes > opts.max) {
    return {
      success: false,
      error: `Bytes must be at most ${opts.max}, got ${bytes}`,
    };
  }

  return { success: true, value: result };
}

/** Create a bytes schema builder */
export function createBytesSchema(opts?: BytesValidatorOptions): SchemaBuilder<number> {
  const options = opts ?? {};
  const parser = (raw: string): ParseResult<number> => parseAndValidateBytes(raw, options);
  return new SchemaBuilder<number>(parser, 'bytes');
}
