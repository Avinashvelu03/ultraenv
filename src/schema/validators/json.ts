// =============================================================================
// ultraenv — JSON Validator
// Parses JSON string → object, with optional schema validation.
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

// -----------------------------------------------------------------------------
// JSONSchemaBuilder
// -----------------------------------------------------------------------------

/**
 * Chainable JSON schema builder.
 * Parses a JSON string into a typed object.
 *
 * @typeParam T - The expected JSON output type
 *
 * @example
 * ```typescript
 * const config = t.json<{ host: string; port: number }>();
 * // config._parse('{"host":"localhost","port":3000}') → { success: true, value: {...} }
 *
 * const configWithSchema = t.json<{ host: string }>().schema((obj) => {
 *   if (!obj.host) return 'host is required';
 *   return null;
 * });
 * ```
 */
export class JsonSchemaBuilder<T = unknown> extends SchemaBuilder<T> {
  constructor() {
    const parser = (raw: string): ParseResult<T> => {
      try {
        const parsed: T = JSON.parse(raw) as T;
        return { success: true, value: parsed };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return { success: false, error: `Invalid JSON: ${message}` };
      }
    };
    super(parser, 'json');
  }

  /**
   * Add a custom schema validation function for the parsed object.
   * Return an error message string, or null if valid.
   */
  schema(fn: (value: T) => string | null): JsonSchemaBuilder<T> {
    this._addValidator(fn);
    return this;
  }

  /** Require the parsed JSON to be an object (not null, array, or primitive) */
  object(): JsonSchemaBuilder<T> {
    this._addValidator((value: T) => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return 'JSON must be an object';
      }
      return null;
    });
    return this;
  }

  /** Require the parsed JSON to be an array */
  array(): JsonSchemaBuilder<T> {
    this._addValidator((value: T) => {
      if (!Array.isArray(value)) {
        return 'JSON must be an array';
      }
      return null;
    });
    return this;
  }

  /** Require the parsed JSON to be a string primitive */
  string(): JsonSchemaBuilder<T> {
    this._addValidator((value: T) => {
      if (typeof value !== 'string') {
        return 'JSON must be a string';
      }
      return null;
    });
    return this;
  }

  /** Require the parsed JSON to be a number primitive */
  number(): JsonSchemaBuilder<T> {
    this._addValidator((value: T) => {
      if (typeof value !== 'number') {
        return 'JSON must be a number';
      }
      return null;
    });
    return this;
  }

  /** Require the parsed JSON to be a boolean primitive */
  boolean(): JsonSchemaBuilder<T> {
    this._addValidator((value: T) => {
      if (typeof value !== 'boolean') {
        return 'JSON must be a boolean';
      }
      return null;
    });
    return this;
  }

  /** Require a specific top-level key to exist */
  hasKey(key: string): JsonSchemaBuilder<T> {
    this._addValidator((value: T) => {
      if (typeof value !== 'object' || value === null || !(key in (value as Record<string, unknown>))) {
        return `JSON object must have key "${key}"`;
      }
      return null;
    });
    return this;
  }

  /** Use a custom JSON reviver during parsing */
  reviver(reviver: (key: string, value: unknown) => unknown): JsonSchemaBuilder<T> {
    const parser = (raw: string): ParseResult<T> => {
      try {
        const parsed: T = JSON.parse(raw, reviver) as T;
        return { success: true, value: parsed };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return { success: false, error: `Invalid JSON: ${message}` };
      }
    };
    this._setParser(parser);
    return this;
  }
}

/** Create a new JSON schema builder */
export function createJsonSchema<T = unknown>(): JsonSchemaBuilder<T> {
  return new JsonSchemaBuilder<T>();
}
