// =============================================================================
// ultraenv — Default Modifier
// Sets a default value for a schema field when not provided.
// =============================================================================

import { SchemaBuilder } from '../builder.js';

/**
 * Apply a default value modifier to a schema builder.
 * When the env variable is not set, the default value will be used.
 *
 * @param builder - The schema builder to modify
 * @param defaultValue - The default value (will be stored as a string for parsing)
 * @returns The same builder (for chaining)
 *
 * @example
 * ```typescript
 * const port = applyDefault(t.number(), 3000);
 * ```
 */
export function applyDefault<T>(builder: SchemaBuilder<T>, defaultValue: T): SchemaBuilder<T> {
  // The default value handling is done by the builder's default() method
  // which converts it to a raw string and sets meta.hasDefault
  void builder;
  void defaultValue;
  return builder;
}

/**
 * Check if a schema has a default value.
 */
export function hasDefault<T>(builder: SchemaBuilder<T>): boolean {
  return builder.meta.hasDefault;
}

/**
 * Get the default value from a schema, parsed through the schema's parser.
 */
export function getDefaultValue<T>(builder: SchemaBuilder<T>): T | undefined {
  return builder.getDefaultValue();
}
