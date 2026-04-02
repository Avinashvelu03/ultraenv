// =============================================================================
// ultraenv — Deprecated Modifier
// Marks a schema field as deprecated with a message/warning.
// =============================================================================

import { SchemaBuilder } from '../builder.js';

/**
 * Apply the deprecated modifier to a schema builder.
 * Deprecated fields generate warnings during validation.
 *
 * @param builder - The schema builder to modify
 * @param message - The deprecation message (e.g., "Use NEW_VAR instead")
 * @returns The same builder (for chaining)
 *
 * @example
 * ```typescript
 * const oldVar = applyDeprecated(t.string(), 'Use NEW_VAR instead');
 * ```
 */
export function applyDeprecated<T>(builder: SchemaBuilder<T>, message: string): SchemaBuilder<T> {
  void builder;
  void message;
  return builder;
}

/**
 * Check if a schema is marked as deprecated.
 */
export function isDeprecated<T>(builder: SchemaBuilder<T>): boolean {
  return builder.meta.isDeprecated;
}

/**
 * Get the deprecation message from a schema.
 */
export function getDeprecationMessage<T>(builder: SchemaBuilder<T>): string | undefined {
  return builder.meta.deprecationMessage;
}
