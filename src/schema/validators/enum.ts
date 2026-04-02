// =============================================================================
// ultraenv — Enum Validator
// Validates against a readonly array of string literals, returns literal union.
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

// -----------------------------------------------------------------------------
// EnumSchemaBuilder
// -----------------------------------------------------------------------------

/**
 * Chainable enum schema builder for literal string unions.
 *
 * @typeParam L - The literal string union type
 *
 * @example
 * ```typescript
 * const env = t.enum(['development', 'production', 'test'] as const);
 * // env._parse("production") → { success: true, value: "production" }
 * // env._parse("staging")    → { success: false, error: "..." }
 *
 * // Type is inferred as: SchemaBuilder<"development" | "production" | "test">
 * ```
 */
export class EnumSchemaBuilder<L extends string> extends SchemaBuilder<L> {
  private readonly _values: ReadonlySet<string>;
  private readonly _valuesArray: readonly string[];
  private _caseInsensitive: boolean;

  constructor(values: readonly L[]) {
    const valueSet = new Set<string>(values);
    const parser = (raw: string): ParseResult<L> => {
      const trimmed = raw.trim();
      if (valueSet.has(trimmed)) {
        return { success: true, value: trimmed as L };
      }
      return {
        success: false,
        error: `"${trimmed}" is not a valid enum value. Expected one of: ${Array.from(valueSet).join(', ')}`,
      };
    };
    super(parser, 'enum');
    this._values = valueSet;
    this._valuesArray = values;
    this._caseInsensitive = false;
  }

  /** Enable or disable case-insensitive matching */
  caseInsensitive(enabled?: boolean): EnumSchemaBuilder<L> {
    this._caseInsensitive = enabled ?? true;
    this._rebuildParser();
    return this;
  }

  /** Get the list of allowed values */
  get values(): readonly string[] {
    return this._valuesArray;
  }

  private _rebuildParser(): void {
    const values = this._values;
    const caseInsensitive = this._caseInsensitive;

    const parser = (raw: string): ParseResult<L> => {
      const trimmed = raw.trim();
      const lookup = caseInsensitive ? trimmed.toLowerCase() : trimmed;

      if (caseInsensitive) {
        for (const val of values) {
          if (val.toLowerCase() === lookup) {
            return { success: true, value: val as L };
          }
        }
      } else {
        if (values.has(trimmed)) {
          return { success: true, value: trimmed as L };
        }
      }

      return {
        success: false,
        error: `"${trimmed}" is not a valid enum value. Expected one of: ${Array.from(values).join(', ')}`,
      };
    };

    this._setParser(parser);
  }
}

/** Create a new enum schema builder */
export function createEnumSchema<L extends string>(values: readonly L[]): EnumSchemaBuilder<L> {
  return new EnumSchemaBuilder<L>(values);
}
