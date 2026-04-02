// =============================================================================
// ultraenv — Array Validator
// Splits string by separator, validates each element. Returns string[].
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

// -----------------------------------------------------------------------------
// ArraySchemaBuilder
// -----------------------------------------------------------------------------

/**
 * Chainable array schema builder.
 * Splits a string by a configurable separator and validates each element.
 *
 * @example
 * ```typescript
 * const hosts = t.array().separator(',').minItems(1);
 * // hosts._parse("a,b,c") → { success: true, value: ["a", "b", "c"] }
 *
 * const tags = t.array().separator('|').unique();
 * // tags._parse("foo|bar|foo") → { success: false, error: "..." }
 * ```
 */
export class ArraySchemaBuilder extends SchemaBuilder<string[]> {
  private _separator: string;
  private _trimItems: boolean;
  private _filterEmpty: boolean;

  constructor() {
    const parser = (raw: string): ParseResult<string[]> => {
      return { success: true, value: raw.split(',') };
    };
    super(parser, 'array');
    this._separator = ',';
    this._trimItems = false;
    this._filterEmpty = false;
    this._rebuildParser();
  }

  /** Set the separator character (default: ',') */
  separator(char: string): ArraySchemaBuilder {
    this._separator = char;
    this._rebuildParser();
    return this;
  }

  /** Trim whitespace from each item after splitting */
  trimItems(enabled?: boolean): ArraySchemaBuilder {
    this._trimItems = enabled ?? true;
    this._rebuildParser();
    return this;
  }

  /** Remove empty strings from the result */
  filterEmpty(enabled?: boolean): ArraySchemaBuilder {
    this._filterEmpty = enabled ?? true;
    this._rebuildParser();
    return this;
  }

  /** Require unique items (no duplicates) */
  unique(): ArraySchemaBuilder {
    this._addValidator((value: string[]) => {
      const seen = new Set<string>();
      for (const item of value) {
        if (seen.has(item)) {
          return `Array contains duplicate value: "${item}"`;
        }
        seen.add(item);
      }
      return null;
    });
    return this;
  }

  /** Minimum number of items */
  minItems(n: number): ArraySchemaBuilder {
    this._addValidator((value: string[]) => {
      if (value.length < n) {
        return `Array must have at least ${n} item(s), got ${value.length}`;
      }
      return null;
    });
    return this;
  }

  /** Maximum number of items */
  maxItems(n: number): ArraySchemaBuilder {
    this._addValidator((value: string[]) => {
      if (value.length > n) {
        return `Array must have at most ${n} item(s), got ${value.length}`;
      }
      return null;
    });
    return this;
  }

  /** Exact number of items */
  items(n: number): ArraySchemaBuilder {
    this._addValidator((value: string[]) => {
      if (value.length !== n) {
        return `Array must have exactly ${n} item(s), got ${value.length}`;
      }
      return null;
    });
    return this;
  }

  /** Non-empty array */
  nonempty(): ArraySchemaBuilder {
    this._addValidator((value: string[]) => {
      if (value.length === 0) {
        return 'Array must not be empty';
      }
      return null;
    });
    return this;
  }

  /** Validate each item against a custom function */
  itemValidate(fn: (item: string, index: number) => string | null): ArraySchemaBuilder {
    this._addValidator((value: string[]) => {
      for (let i = 0; i < value.length; i++) {
        const error = fn(value[i] ?? '', i);
        if (error !== null) {
          return `Item at index ${i}: ${error}`;
        }
      }
      return null;
    });
    return this;
  }

  private _rebuildParser(): void {
    const sep = this._separator;
    const trim = this._trimItems;
    const filterEmpty = this._filterEmpty;

    const parser = (raw: string): ParseResult<string[]> => {
      let items = raw.split(sep);
      if (trim) {
        items = items.map(item => item.trim());
      }
      if (filterEmpty) {
        items = items.filter(item => item.length > 0);
      }
      return { success: true, value: items };
    };

    this._setParser(parser);
  }
}

/** Create a new array schema builder */
export function createArraySchema(): ArraySchemaBuilder {
  return new ArraySchemaBuilder();
}
