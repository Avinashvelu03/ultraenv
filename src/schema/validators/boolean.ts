// =============================================================================
// ultraenv — Boolean Validator
// Parses true/false, 1/0, yes/no, on/off (case-insensitive) to boolean.
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

// -----------------------------------------------------------------------------
// Boolean Parsing
// -----------------------------------------------------------------------------

const TRUTHY_SET = new Set(['true', '1', 'yes', 'on']);
const FALSY_SET = new Set(['false', '0', 'no', 'off', '']);

/** Parse a string to a boolean — succeeds for both truthy and falsy values */
function parseBooleanFull(raw: string): ParseResult<boolean> {
  const lower = raw.trim().toLowerCase();
  if (TRUTHY_SET.has(lower)) {
    return { success: true, value: true };
  }
  if (FALSY_SET.has(lower)) {
    return { success: true, value: false };
  }
  return {
    success: false,
    error: `"${raw}" is not a valid boolean. Use true/false, 1/0, yes/no, or on/off`,
  };
}

// -----------------------------------------------------------------------------
// BooleanSchemaBuilder
// -----------------------------------------------------------------------------

/**
 * Chainable boolean schema builder.
 *
 * @example
 * ```typescript
 * const debug = t.boolean().default(false);
 * // debug._parse("true") → { success: true, value: true }
 * // debug._parse("1")    → { success: true, value: true }
 * // debug._parse("no")   → { success: true, value: false }
 * // debug._parse("abc")  → { success: false, error: "..." }
 * ```
 */
export class BooleanSchemaBuilder extends SchemaBuilder<boolean> {
  private _truthyValues: ReadonlySet<string>;
  private _falsyValues: ReadonlySet<string>;

  constructor() {
    super(parseBooleanFull, 'boolean');
    this._truthyValues = TRUTHY_SET;
    this._falsyValues = FALSY_SET;
  }

  /**
   * Override the set of truthy values (case-insensitive).
   * Common defaults: true, 1, yes, on
   */
  truthy(values: readonly string[]): BooleanSchemaBuilder {
    this._truthyValues = new Set(values.map((v) => v.toLowerCase()));
    // Rebuild the parser with custom truthy/falsy values
    this._rebuildParser();
    return this;
  }

  /**
   * Override the set of falsy values (case-insensitive).
   * Common defaults: false, 0, no, off, ''
   */
  falsy(values: readonly string[]): BooleanSchemaBuilder {
    this._falsyValues = new Set(values.map((v) => v.toLowerCase()));
    this._rebuildParser();
    return this;
  }

  /** Rebuild the parser function with current truthy/falsy sets */
  private _rebuildParser(): void {
    const truthy = this._truthyValues;
    const falsy = this._falsyValues;

    const parser = (raw: string): ParseResult<boolean> => {
      const lower = raw.trim().toLowerCase();
      if (truthy.has(lower)) {
        return { success: true, value: true };
      }
      if (falsy.has(lower)) {
        return { success: true, value: false };
      }
      return {
        success: false,
        error: `"${raw}" is not a valid boolean. Accepted truthy: [${Array.from(truthy).join(', ')}]. Accepted falsy: [${Array.from(falsy).join(', ')}]`,
      };
    };

    this._setParser(parser);
  }
}

/** Create a new boolean schema builder */
export function createBooleanSchema(): BooleanSchemaBuilder {
  return new BooleanSchemaBuilder();
}
