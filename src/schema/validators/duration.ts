// =============================================================================
// ultraenv — Duration Validator
// Parses human-readable duration strings to milliseconds.
// "30s"→30000, "5m"→300000, "2h"→7200000, "1d"→86400000
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

export interface DurationValidatorOptions {
  /** Output unit — default: 'ms' */
  unit?: 'ms' | 's' | 'm' | 'h';
  /** Maximum duration in milliseconds — default: unlimited */
  max?: number;
  /** Minimum duration in milliseconds — default: 0 */
  min?: number;
  /** Whether to allow negative durations (e.g., "-5m") — default: false */
  allowNegative?: boolean;
}

// Duration unit multipliers (to milliseconds)
const DURATION_UNITS: Record<string, number> = {
  ms: 1,
  s: 1000,
  sec: 1000,
  m: 60 * 1000,
  min: 60 * 1000,
  h: 60 * 60 * 1000,
  hr: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
  wk: 7 * 24 * 60 * 60 * 1000,
  y: 365 * 24 * 60 * 60 * 1000,
  yr: 365 * 24 * 60 * 60 * 1000,
};

const DURATION_REGEX = /^(-)?(\d+(?:\.\d+)?)(ms|s|sec|m|min|h|hr|d|day|w|wk|y|yr)$/;

function parseAndValidateDuration(raw: string, opts: DurationValidatorOptions): ParseResult<number> {
  const trimmed = raw.trim();
  const allowNegative = opts.allowNegative ?? false;

  if (trimmed.length === 0) {
    return { success: false, error: 'Duration string must not be empty' };
  }

  const match = trimmed.match(DURATION_REGEX);
  if (!match) {
    return {
      success: false,
      error: `Invalid duration format: "${trimmed}". Expected format: "<number><unit>" (e.g., "30s", "5m", "2h", "1d")`,
    };
  }

  const negative = match[1] === '-';
  const numStr = match[2] ?? '';
  const unit = match[3] ?? 'ms';

  if (negative && !allowNegative) {
    return { success: false, error: 'Negative durations are not allowed' };
  }

  const num = Number(numStr);
  if (!Number.isFinite(num)) {
    return { success: false, error: `Invalid duration number: "${numStr}"` };
  }

  const durationUnit = unit;
  const multiplier = DURATION_UNITS[durationUnit] ?? 1;
  let ms = num * multiplier;

  if (negative) {
    ms = -ms;
  }

  // Convert to requested unit
  const outputUnit = opts.unit ?? 'ms';
  let result: number;
  switch (outputUnit) {
    case 'ms':
      result = ms;
      break;
    case 's':
      result = ms / 1000;
      break;
    case 'm':
      result = ms / (60 * 1000);
      break;
    case 'h':
      result = ms / (60 * 60 * 1000);
      break;
  }

  // Range checks (always in ms)
  if (opts.min !== undefined && ms < opts.min) {
    return {
      success: false,
      error: `Duration must be at least ${opts.min}ms, got ${Math.round(ms)}ms`,
    };
  }
  if (opts.max !== undefined && ms > opts.max) {
    return {
      success: false,
      error: `Duration must be at most ${opts.max}ms, got ${Math.round(ms)}ms`,
    };
  }

  return { success: true, value: result };
}

/** Create a duration schema builder */
export function createDurationSchema(opts?: DurationValidatorOptions): SchemaBuilder<number> {
  const options = opts ?? {};
  const parser = (raw: string): ParseResult<number> => parseAndValidateDuration(raw, options);
  return new SchemaBuilder<number>(parser, 'duration');
}
