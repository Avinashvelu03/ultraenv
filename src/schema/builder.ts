// =============================================================================
// ultraenv — Schema Builder
// Chainable schema builder with FULL TypeScript type inference.
// Zero `any` types. Strict mode compatible.
// =============================================================================

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** Discriminated union parse result — success or failure */
export type ParseResult<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: string };

/** Configuration for conditional schema application */
export interface ConditionalConfig {
  /** Function that checks whether this schema should apply */
  check: (env: Record<string, unknown>) => boolean;
}

/** Metadata attached to every schema builder */
export interface SchemaMetadata {
  /** Human-readable description for documentation */
  description?: string;
  /** Example value for documentation */
  example?: string;
  /** Whether this value is a secret (should be masked in logs) */
  isSecret: boolean;
  /** Whether this value is deprecated */
  isDeprecated: boolean;
  /** Deprecation message */
  deprecationMessage?: string;
  /** Alternative variable names that should map to this schema */
  aliases: readonly string[];
  /** Whether the field is required */
  required: boolean;
  /** Whether a default value has been set */
  hasDefault: boolean;
  /** The raw default value (before parsing) */
  rawDefaultValue?: string;
  /** Runtime type name for error messages */
  typeName: string;
  /** Conditional configuration */
  conditional?: ConditionalConfig;
}

// -----------------------------------------------------------------------------
// Type Utilities (no `any`)
// -----------------------------------------------------------------------------

/** Prevent TypeScript from inferring a more specific type */
export type NoInfer<T> = T extends infer U ? U : never;

/** Extract the output type from a SchemaBuilder */
export type ExtractType<S> = S extends SchemaBuilder<infer T> ? T : never;

/** Check if a schema is optional */
export type IsOptional<S> = S extends { __optional: true } ? true : false;

/** Extract the default value type from a schema */
export type ExtractDefault<S> = S extends { __default: infer D } ? D : never;

/** Resolve the final output type of a schema */
export type ResolveOutput<S> =
  S extends { __optional: true }
    ? ExtractType<S> | undefined
    : S extends { __default: infer D }
      ? D
      : ExtractType<S>;

// -----------------------------------------------------------------------------
// SchemaBuilder — Core Chainable Class
// -----------------------------------------------------------------------------

/**
 * Core chainable schema builder with full TypeScript type inference.
 *
 * @typeParam TOutput - The output type after parsing and validation
 *
 * @example
 * ```typescript
 * const portSchema = t.number().port().default(3000);
 * // portSchema._parse("8080") → { success: true, value: 8080 }
 * // portSchema._parse("abc")  → { success: false, error: "..." }
 * ```
 */
export class SchemaBuilder<TOutput> {
  /** Internal parser function: string → ParseResult<TOutput> */
  protected _parser: (raw: string) => ParseResult<TOutput>;

  /** Ordered list of validator functions: value → error message or null */
  protected _validators: ReadonlyArray<(value: TOutput) => string | null>;

  /** Ordered list of transform functions applied after validation */
  protected _transforms: ReadonlyArray<(value: TOutput) => TOutput>;

  /** Schema metadata */
  protected _meta: SchemaMetadata;

  constructor(parser: (raw: string) => ParseResult<TOutput>, typeName: string) {
    this._parser = parser;
    this._validators = [];
    this._transforms = [];
    this._meta = {
      typeName,
      required: true,
      hasDefault: false,
      isSecret: false,
      isDeprecated: false,
      aliases: [],
    };
  }

  // -------------------------------------------------------------------------
  // Core Parsing & Validation
  // -------------------------------------------------------------------------

  /**
   * Parse a raw string value into the output type.
   * Runs the parser, then all validators and transforms.
   */
  _parse(raw: string): ParseResult<TOutput> {
    const parsed = this._parser(raw);
    if (!parsed.success) {
      return parsed;
    }

    const validationError = this._validate(parsed.value);
    if (validationError !== null) {
      return { success: false, error: validationError };
    }

    const transformed = this._applyTransforms(parsed.value);
    return { success: true, value: transformed };
  }

  /**
   * Validate an already-parsed value against all registered validators.
   * Returns an error message string, or null if validation passes.
   */
  _validate(value: TOutput): string | null {
    for (const validator of this._validators) {
      const error = validator(value);
      if (error !== null) {
        return error;
      }
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Metadata Accessors
  // -------------------------------------------------------------------------

  /** Get a readonly view of the schema metadata */
  get meta(): Readonly<SchemaMetadata> {
    return this._meta;
  }

  /** Whether this schema is effectively optional (marked optional or has default) */
  get isOptional(): boolean {
    return !this._meta.required || this._meta.hasDefault;
  }

  /** The runtime type name string */
  get typeName(): string {
    return this._meta.typeName;
  }

  /** Get the default value, parsing it if a raw default exists */
  getDefaultValue(): TOutput | undefined {
    if (!this._meta.hasDefault || this._meta.rawDefaultValue === undefined) {
      return undefined;
    }
    const result = this._parse(this._meta.rawDefaultValue);
    return result.success ? result.value : undefined;
  }

  /** Return a composed reference to this builder for chaining */
  get chain(): SchemaBuilder<TOutput> {
    return this;
  }

  // -------------------------------------------------------------------------
  // Modifiers — Description & Example
  // -------------------------------------------------------------------------

  /** Add a human-readable description */
  description(desc: string): this {
    this._meta = { ...this._meta, description: desc };
    return this;
  }

  /** Set an example value for documentation */
  example(ex: NoInfer<TOutput>): this {
    this._meta = { ...this._meta, example: String(ex) };
    return this;
  }

  // -------------------------------------------------------------------------
  // Modifiers — Required / Optional / Default
  // -------------------------------------------------------------------------

  /**
   * Mark this field as optional. The output type becomes `TOutput | undefined`.
   */
  optional(): this & { __optional: true } {
    this._meta = { ...this._meta, required: false };
    return this as this & { __optional: true };
  }

  /**
   * Mark this field as required.
   */
  required(): this {
    this._meta = { ...this._meta, required: true };
    return this;
  }

  /**
   * Set a default value. The field becomes effectively optional.
   * The output type remains `TOutput` (guaranteed by the default).
   */
  default(value: NoInfer<TOutput>): this & { __default: NoInfer<TOutput> } {
    this._meta = {
      ...this._meta,
      hasDefault: true,
      required: false,
      rawDefaultValue: String(value),
    };
    return this as this & { __default: NoInfer<TOutput> };
  }

  // -------------------------------------------------------------------------
  // Modifiers — Secret & Deprecated
  // -------------------------------------------------------------------------

  /** Mark this field as a secret (masks in logs) */
  secret(): this {
    this._meta = { ...this._meta, isSecret: true };
    return this;
  }

  /** Mark this field as deprecated with a message */
  deprecated(message: string): this {
    this._meta = { ...this._meta, isDeprecated: true, deprecationMessage: message };
    return this;
  }

  // -------------------------------------------------------------------------
  // Modifiers — Alias
  // -------------------------------------------------------------------------

  /** Add alternative variable names */
  alias(...names: string[]): this {
    this._meta = { ...this._meta, aliases: [...this._meta.aliases, ...names] };
    return this;
  }

  // -------------------------------------------------------------------------
  // Modifiers — Transform & Custom Validation
  // -------------------------------------------------------------------------

  /** Add a transform function applied after validation */
  transform(fn: (value: TOutput) => TOutput): this {
    this._transforms = [...this._transforms, fn];
    return this;
  }

  /** Add a custom validation function */
  custom(fn: (value: TOutput) => string | null): this {
    this._validators = [...this._validators, fn];
    return this;
  }

  // -------------------------------------------------------------------------
  // Modifiers — Conditional
  // -------------------------------------------------------------------------

  /**
   * Apply this schema only when a condition is met.
   * The condition receives the current env values.
   */
  when(check: (env: Record<string, unknown>) => boolean): this {
    this._meta = { ...this._meta, conditional: { check } };
    return this;
  }

  // -------------------------------------------------------------------------
  // Internal Methods
  // -------------------------------------------------------------------------

  /** Add a validator function (used by type-specific subclasses) */
  protected _addValidator(validator: (value: TOutput) => string | null): void {
    this._validators = [...this._validators, validator];
  }

  /** Add a transform function (used by type-specific subclasses) */
  protected _addTransform(fn: (value: TOutput) => TOutput): void {
    this._transforms = [...this._transforms, fn];
  }

  /** Replace the parser function (used for type narrowing) */
  protected _setParser(parser: (raw: string) => ParseResult<TOutput>): void {
    this._parser = parser;
  }

  /** Apply all transforms to a value */
  protected _applyTransforms(value: TOutput): TOutput {
    let result = value;
    for (const transform of this._transforms) {
      result = transform(result);
    }
    return result;
  }

  /** Clone this builder (for composition) */
  clone(): SchemaBuilder<TOutput> {
    const cloned = new SchemaBuilder<TOutput>(this._parser, this._meta.typeName);
    cloned._validators = [...this._validators];
    cloned._transforms = [...this._transforms];
    cloned._meta = { ...this._meta, aliases: [...this._meta.aliases] };
    return cloned;
  }
}
