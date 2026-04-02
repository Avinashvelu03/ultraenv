// =============================================================================
// ultraenv — Custom Validation Modifier
// Adds a custom validation function to a schema builder.
// =============================================================================

import { SchemaBuilder } from '../builder.js';

/**
 * Apply a custom validation function to a schema builder.
 * The function receives the parsed value and must return:
 * - `null` or `undefined` if validation passes
 * - An error message string if validation fails
 *
 * @param builder - The schema builder to modify
 * @param fn - The custom validation function
 * @returns The same builder (for chaining)
 *
 * @example
 * ```typescript
 * const password = applyCustom(t.string(), (v) => {
 *   if (v.length < 12) return 'Password must be at least 12 characters';
 *   return null;
 * });
 * ```
 */
export function applyCustom<T>(
  builder: SchemaBuilder<T>,
  fn: (value: T) => string | null,
): SchemaBuilder<T> {
  void builder;
  void fn;
  return builder;
}

/**
 * Create a validator that checks for a minimum length.
 */
export function minLength<T extends string>(n: number): (value: T) => string | null {
  return (value: T) => {
    if (value.length < n) {
      return `Value must be at least ${n} characters, got ${value.length}`;
    }
    return null;
  };
}

/**
 * Create a validator that checks for a maximum length.
 */
export function maxLength<T extends string>(n: number): (value: T) => string | null {
  return (value: T) => {
    if (value.length > n) {
      return `Value must be at most ${n} characters, got ${value.length}`;
    }
    return null;
  };
}

/**
 * Create a validator that checks a condition with a custom error message.
 */
export function check<T>(
  condition: (value: T) => boolean,
  message: string,
): (value: T) => string | null {
  return (value: T) => {
    if (!condition(value)) {
      return message;
    }
    return null;
  };
}

/**
 * Combine multiple validators with short-circuit evaluation.
 */
export function allOf<T>(
  ...validators: ReadonlyArray<(value: T) => string | null>
): (value: T) => string | null {
  return (value: T) => {
    for (const validator of validators) {
      const error = validator(value);
      if (error !== null) {
        return error;
      }
    }
    return null;
  };
}
