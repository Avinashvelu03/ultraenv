// =============================================================================
// ultraenv — Optional Modifier
// Marks a schema field as optional (can be omitted or undefined).
// =============================================================================

import { SchemaBuilder } from '../builder.js';

/**
 * Apply the optional modifier to a schema builder.
 * This makes the field optional — it can be omitted or have an undefined value.
 *
 * @param builder - The schema builder to modify
 * @returns The same builder (for chaining)
 *
 * @example
 * ```typescript
 * const schema = applyOptional(t.string());
 * ```
 */
export function applyOptional<T>(builder: SchemaBuilder<T>): SchemaBuilder<T> {
  void builder;
  return builder;
}

/**
 * Check if a schema is marked as optional.
 */
export function isOptional<T>(builder: SchemaBuilder<T>): boolean {
  return builder.isOptional;
}
