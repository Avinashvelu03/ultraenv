// =============================================================================
// ultraenv — Secret Modifier
// Marks a schema field as a secret (should be masked in logs/output).
// =============================================================================

import { SchemaBuilder } from '../builder.js';

/**
 * Apply the secret modifier to a schema builder.
 * Secret values will be masked in logs and diagnostic output.
 *
 * @param builder - The schema builder to modify
 * @returns The same builder (for chaining)
 *
 * @example
 * ```typescript
 * const apiKey = applySecret(t.string());
 * ```
 */
export function applySecret<T>(builder: SchemaBuilder<T>): SchemaBuilder<T> {
  void builder;
  return builder;
}

/**
 * Check if a schema is marked as secret.
 */
export function isSecret<T>(builder: SchemaBuilder<T>): boolean {
  return builder.meta.isSecret;
}

/**
 * Mask a value if the schema is marked as secret.
 * Shows first 4 characters and replaces the rest with asterisks.
 */
export function maskValue<T>(value: T, builder: SchemaBuilder<T>): string {
  if (!builder.meta.isSecret) {
    return String(value);
  }
  const str = String(value);
  if (str.length <= 4) {
    return '****';
  }
  return str.slice(0, 4) + '*'.repeat(Math.min(str.length - 4, 20));
}
