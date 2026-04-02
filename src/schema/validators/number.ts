// =============================================================================
// ultraenv — Number Validator
// Parses strings to numbers with integer, float, range, port, percentage, etc.
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

// -----------------------------------------------------------------------------
// Number Parse & Validation Functions
// -----------------------------------------------------------------------------

/** Parse a string to a number */
function parseNumber(raw: string): ParseResult<number> {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { success: false, error: 'Value is empty, expected a number' };
  }
  const num = Number(trimmed);
  if (Number.isNaN(num)) {
    return { success: false, error: `"${trimmed}" is not a valid number` };
  }
  return { success: true, value: num };
}

/** Validate integer */
function validateInteger(value: number): string | null {
  if (!Number.isInteger(value)) {
    return `Expected an integer, got ${value}`;
  }
  return null;
}

/** Validate float (always passes since all JS numbers are float) */
function validateFloat(value: number): string | null {
  // All JS numbers are IEEE 754 doubles, so this always passes.
  // We keep it as a semantic marker.
  void value;
  return null;
}

/** Validate minimum */
function validateMin(n: number): (value: number) => string | null {
  return (value: number) => {
    if (value < n) {
      return `Number must be at least ${n}, got ${value}`;
    }
    return null;
  };
}

/** Validate maximum */
function validateMax(n: number): (value: number) => string | null {
  return (value: number) => {
    if (value > n) {
      return `Number must be at most ${n}, got ${value}`;
    }
    return null;
  };
}

/** Validate positive */
function validatePositive(value: number): string | null {
  if (value <= 0) {
    return `Number must be positive (> 0), got ${value}`;
  }
  return null;
}

/** Validate negative */
function validateNegative(value: number): string | null {
  if (value >= 0) {
    return `Number must be negative (< 0), got ${value}`;
  }
  return null;
}

/** Validate port range (1-65535) */
function validatePort(value: number): string | null {
  if (!Number.isInteger(value)) {
    return `Port must be an integer, got ${value}`;
  }
  if (value < 1 || value > 65535) {
    return `Port must be between 1 and 65535, got ${value}`;
  }
  return null;
}

/** Validate percentage (0-100) */
function validatePercentage(value: number): string | null {
  if (value < 0 || value > 100) {
    return `Percentage must be between 0 and 100, got ${value}`;
  }
  return null;
}

/** Validate finite (no Infinity or NaN) */
function validateFinite(value: number): string | null {
  if (!Number.isFinite(value)) {
    return `Number must be finite, got ${value}`;
  }
  return null;
}

/** Validate non-negative (>= 0) */
function validateNonNegative(value: number): string | null {
  if (value < 0) {
    return `Number must be non-negative (>= 0), got ${value}`;
  }
  return null;
}

// -----------------------------------------------------------------------------
// NumberSchemaBuilder
// -----------------------------------------------------------------------------

/**
 * Chainable number schema builder with all number-specific validators.
 *
 * @typeParam T - The number literal type (defaults to number)
 *
 * @example
 * ```typescript
 * const port = t.number().port().default(3000);
 * const pct = t.number().percentage().min(0).max(100);
 * ```
 */
export class NumberSchemaBuilder<T extends number = number> extends SchemaBuilder<T> {
  constructor() {
    const parser = (raw: string): ParseResult<number> => parseNumber(raw);
    super(parser as (raw: string) => ParseResult<T>, 'number');
  }

  // -------------------------------------------------------------------------
  // Type Constraints
  // -------------------------------------------------------------------------

  /** Must be an integer (no decimals) */
  integer(): NumberSchemaBuilder<T> {
    this._addValidator((value: T) => validateInteger(value as number));
    return this;
  }

  /** Must be a float (semantic marker — all JS numbers are doubles) */
  float(): NumberSchemaBuilder<T> {
    this._addValidator((value: T) => validateFloat(value as number));
    return this;
  }

  // -------------------------------------------------------------------------
  // Range Constraints
  // -------------------------------------------------------------------------

  /** Minimum value (inclusive) */
  min(n: number): NumberSchemaBuilder<T> {
    this._addValidator(validateMin(n) as (value: T) => string | null);
    return this;
  }

  /** Maximum value (inclusive) */
  max(n: number): NumberSchemaBuilder<T> {
    this._addValidator(validateMax(n) as (value: T) => string | null);
    return this;
  }

  /** Must be positive (> 0) */
  positive(): NumberSchemaBuilder<T> {
    this._addValidator((value: T) => validatePositive(value as number));
    return this;
  }

  /** Must be negative (< 0) */
  negative(): NumberSchemaBuilder<T> {
    this._addValidator((value: T) => validateNegative(value as number));
    return this;
  }

  /** Must be non-negative (>= 0) */
  nonNegative(): NumberSchemaBuilder<T> {
    this._addValidator((value: T) => validateNonNegative(value as number));
    return this;
  }

  // -------------------------------------------------------------------------
  // Specialized Validators
  // -------------------------------------------------------------------------

  /** Must be a valid network port (1-65535) */
  port(): NumberSchemaBuilder<T> {
    this._addValidator((value: T) => validatePort(value as number));
    return this;
  }

  /** Must be a percentage (0-100) */
  percentage(): NumberSchemaBuilder<T> {
    this._addValidator((value: T) => validatePercentage(value as number));
    return this;
  }

  /** Must be finite (no Infinity or NaN) */
  finite(): NumberSchemaBuilder<T> {
    this._addValidator((value: T) => validateFinite(value as number));
    return this;
  }

  /** Must be one of the specified values — narrows the output type */
  oneOf<const L extends number>(values: readonly L[]): NumberSchemaBuilder<L> {
    const set = new Set<number>(values);
    this._addValidator((value: number) => {
      if (!set.has(value)) {
        return `Value must be one of: ${Array.from(set).join(', ')}. Got ${value}`;
      }
      return null;
    });
    return this as unknown as NumberSchemaBuilder<L>;
  }

  /** Must be a multiple of the given number */
  step(n: number): NumberSchemaBuilder<T> {
    this._addValidator((value: T) => {
      const v = value as number;
      if (n !== 0 && !Number.isFinite(v / n) || v % n !== 0) {
        return `Value must be a multiple of ${n}, got ${v}`;
      }
      return null;
    });
    return this;
  }

  /** Must be a safe integer (-(2^53 - 1) to 2^53 - 1) */
  safeInt(): NumberSchemaBuilder<T> {
    this._addValidator((value: T) => {
      if (!Number.isSafeInteger(value as number)) {
        return `Value must be a safe integer, got ${value}`;
      }
      return null;
    });
    return this;
  }
}

/** Create a new number schema builder */
export function createNumberSchema<T extends number = number>(): NumberSchemaBuilder<T> {
  return new NumberSchemaBuilder<T>();
}
