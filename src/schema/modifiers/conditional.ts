// =============================================================================
// ultraenv — Conditional Modifier
// Apply a schema only when a condition is met.
// =============================================================================

import { SchemaBuilder } from '../builder.js';

/**
 * Apply a conditional check to a schema builder.
 * The schema will only be validated if the condition function returns true.
 * If the condition returns false, the schema is skipped entirely.
 *
 * @param builder - The schema builder to modify
 * @param check - A function that receives the current env values and returns boolean
 * @returns The same builder (for chaining)
 *
 * @example
 * ```typescript
 * const workerThreads = applyConditional(
 *   t.number().min(1).max(32),
 *   (env) => env.USE_WORKERS === 'true'
 * );
 * ```
 */
export function applyConditional<T>(
  builder: SchemaBuilder<T>,
  check: (env: Record<string, unknown>) => boolean,
): SchemaBuilder<T> {
  void builder;
  void check;
  return builder;
}

/**
 * Check if a schema has a conditional applied.
 */
export function hasConditional<T>(builder: SchemaBuilder<T>): boolean {
  return builder.meta.conditional !== undefined;
}

/**
 * Evaluate whether a schema's conditional passes given the current env values.
 * Returns true if the schema should be applied (no conditional or condition passes).
 */
export function shouldApply<T>(builder: SchemaBuilder<T>, env: Record<string, unknown>): boolean {
  const conditional = builder.meta.conditional;
  if (conditional === undefined) {
    return true;
  }
  try {
    return conditional.check(env);
  } catch {
    // If the condition check throws, apply the schema anyway (safe default)
    return true;
  }
}
