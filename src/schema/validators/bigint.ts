// =============================================================================
// ultraenv — BigInt Validator
// Parses string → BigInt with min/max/positive/negative constraints.
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

// -----------------------------------------------------------------------------
// BigInt Parsing
// -----------------------------------------------------------------------------

/** BigInt parser with radix support */
function parseBigIntProper(raw: string, radix: number): ParseResult<bigint> {
  const trimmed = raw.trim();
  try {
    // Handle hex prefix
    const cleaned = trimmed.replace(/^0x/i, '');
    const value =
      radix === 16 && trimmed.startsWith('0x') ? BigInt('0x' + cleaned) : BigInt(cleaned);
    return { success: true, value };
  } catch {
    return { success: false, error: `"${trimmed}" is not a valid BigInt (radix: ${radix})` };
  }
}

// -----------------------------------------------------------------------------
// BigInt Validators
// -----------------------------------------------------------------------------

function validateMin(n: bigint): (value: bigint) => string | null {
  return (value: bigint) => {
    if (value < n) {
      return `BigInt must be at least ${n}, got ${value}`;
    }
    return null;
  };
}

function validateMax(n: bigint): (value: bigint) => string | null {
  return (value: bigint) => {
    if (value > n) {
      return `BigInt must be at most ${n}, got ${value}`;
    }
    return null;
  };
}

function validatePositive(value: bigint): string | null {
  if (value <= 0n) {
    return `BigInt must be positive (> 0), got ${value}`;
  }
  return null;
}

function validateNegative(value: bigint): string | null {
  if (value >= 0n) {
    return `BigInt must be negative (< 0), got ${value}`;
  }
  return null;
}

function validateNonNegative(value: bigint): string | null {
  if (value < 0n) {
    return `BigInt must be non-negative (>= 0), got ${value}`;
  }
  return null;
}

// -----------------------------------------------------------------------------
// BigIntSchemaBuilder
// -----------------------------------------------------------------------------

/**
 * Chainable BigInt schema builder.
 *
 * @example
 * ```typescript
 * const big = t.bigint().positive().max(999999999999n);
 * // big._parse("123456789012") → { success: true, value: 123456789012n }
 * ```
 */
export class BigIntSchemaBuilder extends SchemaBuilder<bigint> {
  private _radix: number;

  constructor() {
    const parser = (raw: string): ParseResult<bigint> => parseBigIntProper(raw, 10);
    super(parser, 'bigint');
    this._radix = 10;
  }

  /** Set the radix for parsing (default: 10). Use 16 for hex. */
  radix(r: number): BigIntSchemaBuilder {
    this._radix = r;
    this._rebuildParser();
    return this;
  }

  /** Minimum value (inclusive) */
  min(n: bigint): BigIntSchemaBuilder {
    this._addValidator(validateMin(n));
    return this;
  }

  /** Maximum value (inclusive) */
  max(n: bigint): BigIntSchemaBuilder {
    this._addValidator(validateMax(n));
    return this;
  }

  /** Must be positive (> 0) */
  positive(): BigIntSchemaBuilder {
    this._addValidator(validatePositive);
    return this;
  }

  /** Must be negative (< 0) */
  negative(): BigIntSchemaBuilder {
    this._addValidator(validateNegative);
    return this;
  }

  /** Must be non-negative (>= 0) */
  nonNegative(): BigIntSchemaBuilder {
    this._addValidator(validateNonNegative);
    return this;
  }

  /** Must be one of the specified values */
  oneOf<const L extends bigint>(values: readonly L[]): BigIntSchemaBuilder {
    const set = new Set<bigint>(values);
    this._addValidator((value: bigint) => {
      if (!set.has(value)) {
        return `Value must be one of: ${Array.from(set).map(String).join(', ')}. Got ${value}`;
      }
      return null;
    });
    return this;
  }

  /** Use a custom parse function */
  parse(fn: (raw: string) => bigint): BigIntSchemaBuilder {
    const parser = (raw: string): ParseResult<bigint> => {
      try {
        const value = fn(raw);
        return { success: true, value };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return { success: false, error: `Failed to parse BigInt: ${message}` };
      }
    };
    this._setParser(parser);
    return this;
  }

  private _rebuildParser(): void {
    const r = this._radix;
    const parser = (raw: string): ParseResult<bigint> => parseBigIntProper(raw, r);
    this._setParser(parser);
  }
}

/** Create a new BigInt schema builder */
export function createBigIntSchema(): BigIntSchemaBuilder {
  return new BigIntSchemaBuilder();
}
