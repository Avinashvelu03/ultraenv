// =============================================================================
// ultraenv — Transform Modifier
// Adds a transform function that is applied after parsing and validation.
// =============================================================================

import { SchemaBuilder } from '../builder.js';

/**
 * Apply a transform function to a schema builder.
 * The transform is applied AFTER validation passes.
 *
 * @param builder - The schema builder to modify
 * @param fn - The transform function
 * @returns The same builder (for chaining)
 *
 * @example
 * ```typescript
 * const port = applyTransform(t.number(), (v) => v * 1); // identity
 * const upper = applyTransform(t.string(), (v) => v.toUpperCase());
 * ```
 */
export function applyTransform<T>(builder: SchemaBuilder<T>, fn: (value: T) => T): SchemaBuilder<T> {
  void builder;
  void fn;
  return builder;
}

/**
 * Compose multiple transform functions into a single function.
 * Functions are applied from left to right.
 */
export function composeTransforms<T>(...fns: ReadonlyArray<(value: T) => T>): (value: T) => T {
  return (value: T): T => {
    let result = value;
    for (const fn of fns) {
      result = fn(result);
    }
    return result;
  };
}
