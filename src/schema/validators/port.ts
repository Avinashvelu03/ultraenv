// =============================================================================
// ultraenv — Port Validator
// Parses and validates network port numbers (1-65535).
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

export interface PortValidatorOptions {
  /** Whether to include well-known ports (0-1023) — default: true */
  allowWellKnown?: boolean;
  /** Whether to include registered ports (1024-49151) — default: true */
  allowRegistered?: boolean;
  /** Whether to include dynamic/ephemeral ports (49152-65535) — default: true */
  allowDynamic?: boolean;
  /** Whether to allow port 0 (default: false) */
  allowZero?: boolean;
  /** Specific allowed ports (overrides range checks if provided) */
  allowedPorts?: readonly number[];
}

function parseAndValidatePort(raw: string, opts: PortValidatorOptions): ParseResult<number> {
  const trimmed = raw.trim();

  const num = Number(trimmed);
  if (!Number.isInteger(num)) {
    return { success: false, error: `"${trimmed}" is not a valid integer port number` };
  }

  if (opts.allowedPorts !== undefined) {
    if (!opts.allowedPorts.includes(num)) {
      return {
        success: false,
        error: `Port must be one of: ${opts.allowedPorts.join(', ')}. Got ${num}`,
      };
    }
    return { success: true, value: num };
  }

  if (opts.allowZero !== true && num === 0) {
    return { success: false, error: 'Port 0 is not allowed' };
  }

  if (num < 1 || num > 65535) {
    return { success: false, error: `Port must be between 1 and 65535, got ${num}` };
  }

  const allowWellKnown = opts.allowWellKnown ?? true;
  const allowRegistered = opts.allowRegistered ?? true;
  const allowDynamic = opts.allowDynamic ?? true;

  if (num <= 1023 && !allowWellKnown) {
    return { success: false, error: `Well-known port ${num} is not allowed` };
  }
  if (num >= 1024 && num <= 49151 && !allowRegistered) {
    return { success: false, error: `Registered port ${num} is not allowed` };
  }
  if (num >= 49152 && !allowDynamic) {
    return { success: false, error: `Dynamic port ${num} is not allowed` };
  }

  return { success: true, value: num };
}

/** Create a port schema builder */
export function createPortSchema(opts?: PortValidatorOptions): SchemaBuilder<number> {
  const options = opts ?? {};
  const parser = (raw: string): ParseResult<number> => parseAndValidatePort(raw, options);
  return new SchemaBuilder<number>(parser, 'port');
}
