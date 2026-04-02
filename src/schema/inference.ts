// =============================================================================
// ultraenv — TypeScript Type Inference Helpers
// Maps schema definitions to fully inferred TypeScript types.
// =============================================================================

import type { SchemaBuilder } from './builder.js';

// -----------------------------------------------------------------------------
// Core Type Utilities
// -----------------------------------------------------------------------------

/**
 * Extract the output type from a SchemaBuilder instance.
 *
 * @example
 * ```typescript
 * type T = ExtractType<typeof t.number().port()>;
 * // T = number
 *
 * type T2 = ExtractType<typeof t.enum(['a', 'b'] as const)>;
 * // T2 = 'a' | 'b'
 * ```
 */
export type ExtractType<S> = S extends SchemaBuilder<infer T> ? T : never;

/**
 * Check if a schema is optional (has the __optional marker).
 *
 * @example
 * ```typescript
 * type IsOpt = IsOptional<typeof t.string().optional()>;
 * // IsOpt = true
 *
 * type IsReq = IsOptional<typeof t.string()>;
 * // IsReq = false
 * ```
 */
export type IsOptional<S> = S extends { __optional: true } ? true : false;

/**
 * Extract the default value type from a schema.
 *
 * @example
 * ```typescript
 * type Def = ExtractDefault<typeof t.number().default(3000)>;
 * // Def = 3000
 * ```
 */
export type ExtractDefault<S> = S extends { __default: infer D } ? D : never;

/**
 * Resolve the final output type of a schema, considering optional and default.
 *
 * - If optional: T | undefined
 * - If has default: D (the default type)
 * - Otherwise: T
 *
 * @example
 * ```typescript
 * type V1 = ResolveOutput<typeof t.string()>;
 * // V1 = string
 *
 * type V2 = ResolveOutput<typeof t.string().optional()>;
 * // V2 = string | undefined
 *
 * type V3 = ResolveOutput<typeof t.number().default(3000)>;
 * // V3 = number
 * ```
 */
export type ResolveOutput<S> =
  S extends { __optional: true }
    ? ExtractType<S> | undefined
    : S extends { __default: infer D }
      ? D
      : ExtractType<S>;

// -----------------------------------------------------------------------------
// Schema Definition Inference
// -----------------------------------------------------------------------------

/**
 * Infer a complete typed object from a schema definition.
 * This is the main type used by `defineEnv` for its return type.
 *
 * @example
 * ```typescript
 * const schema = {
 *   PORT: t.number().port().default(3000),
 *   HOST: t.string().hostname(),
 *   NODE_ENV: t.enum(['dev', 'prod'] as const),
 *   DEBUG: t.boolean().optional(),
 * };
 *
 * type Env = InferSchema<typeof schema>;
 * // Env = {
 * //   PORT: number;       // has default, so number (not undefined)
 * //   HOST: string;       // required
 * //   NODE_ENV: 'dev' | 'prod';  // enum narrows the type
 * //   DEBUG: boolean | undefined; // optional
 * // }
 * ```
 */
export type InferSchema<T extends Record<string, SchemaBuilder<unknown>>> = {
  readonly [K in keyof T]: ResolveOutput<T[K]>;
};

/**
 * Make all fields of an inferred schema required (remove undefined).
 * Useful when you know all defaults are applied.
 */
export type RequiredSchema<T> = {
  readonly [K in keyof T]: Exclude<T[K], undefined>;
};

/**
 * Make all fields of an inferred schema optional (add undefined).
 * Useful for partial configs.
 */
export type PartialSchema<T> = {
  readonly [K in keyof T]: T[K] | undefined;
};

/**
 * Extract only the required fields from a schema.
 */
export type RequiredFields<T extends Record<string, unknown>> = {
  readonly [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};

/**
 * Extract only the optional fields from a schema.
 */
export type OptionalFields<T extends Record<string, unknown>> = {
  readonly [K in keyof T as undefined extends T[K] ? K : never]: T[K];
};

// -----------------------------------------------------------------------------
// Utility Types for Schema Manipulation
// -----------------------------------------------------------------------------

/**
 * Omit fields from a schema definition (preserves types).
 */
export type SchemaOmit<T extends Record<string, SchemaBuilder<unknown>>, K extends keyof T> = Omit<T, K>;

/**
 * Pick fields from a schema definition (preserves types).
 */
export type SchemaPick<T extends Record<string, SchemaBuilder<unknown>>, K extends keyof T> = Pick<T, K>;

/**
 * Merge two schema definitions.
 * Values from B override values from A for overlapping keys.
 */
export type SchemaMerge<A extends Record<string, SchemaBuilder<unknown>>, B extends Record<string, SchemaBuilder<unknown>>> =
  Omit<A, keyof B> & B;

/**
 * Get the union of all output types in a schema.
 */
export type SchemaValueUnion<T extends Record<string, SchemaBuilder<unknown>>> =
  ExtractType<T[keyof T]>;

/**
 * Create a mapped type that wraps each value in a Promise.
 */
export type AsyncSchema<T extends Record<string, SchemaBuilder<unknown>>> = {
  readonly [K in keyof T]: Promise<ResolveOutput<T[K]>>;
};
