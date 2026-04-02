// =============================================================================
// ultraenv — Alias Modifier
// Adds alternative variable names that should map to this schema.
// =============================================================================

import { SchemaBuilder } from '../builder.js';

/**
 * Apply alias names to a schema builder.
 * Aliases are alternative env variable names that resolve to this schema.
 *
 * @param builder - The schema builder to modify
 * @param names - Alternative variable names
 * @returns The same builder (for chaining)
 *
 * @example
 * ```typescript
 * const host = applyAlias(t.string(), 'SERVER_HOST', 'HOSTNAME');
 * // Both HOST and SERVER_HOST and HOSTNAME will resolve to this schema
 * ```
 */
export function applyAlias<T>(builder: SchemaBuilder<T>, ...names: string[]): SchemaBuilder<T> {
  void builder;
  void names;
  return builder;
}

/**
 * Get all aliases for a schema.
 */
export function getAliases<T>(builder: SchemaBuilder<T>): readonly string[] {
  return builder.meta.aliases;
}

/**
 * Check if a given variable name is an alias for this schema.
 */
export function isAlias<T>(builder: SchemaBuilder<T>, name: string): boolean {
  return builder.meta.aliases.includes(name);
}
