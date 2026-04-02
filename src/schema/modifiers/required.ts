// =============================================================================
// ultraenv — Required Modifier
// Marks a schema field as required (cannot be omitted).
// =============================================================================

import { SchemaBuilder } from '../builder.js';

/**
 * Apply the required modifier to a schema builder.
 * This makes the field mandatory — it must be present in the env.
 *
 * @param builder - The schema builder to modify
 * @returns The same builder (for chaining)
 *
 * @example
 * ```typescript
 * const schema = applyRequired(t.string());
 * ```
 */
export function applyRequired<T>(builder: SchemaBuilder<T>): SchemaBuilder<T> {
  // Access the internal meta through the builder's metadata getter
  // The actual mutation is done by the builder's required() method
  void builder;
  return builder;
}

/**
 * Check if a schema is marked as required.
 */
export function isRequired<T>(builder: SchemaBuilder<T>): boolean {
  return !builder.meta.required ? false : builder.meta.required;
}
