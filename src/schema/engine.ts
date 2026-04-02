// =============================================================================
// ultraenv — Validation Engine
// Executes schema validation against environment variable key-value pairs.
// =============================================================================

import { SchemaBuilder, ParseResult, SchemaMetadata } from './builder.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** A schema definition mapping variable names to schema builders */
export type SchemaDefinition = Record<string, SchemaBuilder<unknown>>;

/** Error entry from validation */
export interface ValidationErrorEntry {
  /** The variable name */
  field: string;
  /** The raw string value (or empty string if missing) */
  rawValue: string;
  /** Human-readable error message */
  message: string;
  /** The expected type */
  expected: string;
  /** Schema metadata for context */
  meta: Readonly<SchemaMetadata>;
}

/** Warning entry from validation (non-blocking) */
export interface ValidationWarningEntry {
  /** The variable name */
  field: string;
  /** The raw string value */
  rawValue: string;
  /** Warning message */
  message: string;
  /** Warning code */
  code: string;
}

/** Final result of validation */
export interface EngineValidationResult {
  /** Whether all validations passed (no errors) */
  valid: boolean;
  /** All validation errors (blocking) */
  errors: readonly ValidationErrorEntry[];
  /** All warnings (non-blocking) */
  warnings: readonly ValidationWarningEntry[];
  /** Successfully validated values */
  values: Record<string, unknown>;
  /** Unknown variables not in schema (only when strict mode) */
  unknown: readonly string[];
}

/** Options for the validation engine */
export interface EngineOptions {
  /** Whether to fail on unknown variables not in the schema — default: false */
  strict?: boolean;
  /** Whether to stop on first error — default: false */
  abortEarly?: boolean;
  /** Whether to include deprecation warnings — default: true */
  deprecationWarnings?: boolean;
}

// -----------------------------------------------------------------------------
// Engine Functions
// -----------------------------------------------------------------------------

/**
 * Validate environment variables against a schema definition.
 *
 * @param vars - The raw environment variable key-value pairs
 * @param schema - The schema definition mapping names to builders
 * @param options - Validation options
 * @returns The complete validation result
 *
 * @example
 * ```typescript
 * const schema = {
 *   PORT: t.number().port().default(3000),
 *   HOST: t.string().hostname().default('localhost'),
 *   DEBUG: t.boolean().optional(),
 * };
 *
 * const result = validate(process.env, schema);
 * if (result.valid) {
 *   console.log(result.values.PORT); // 3000 (number)
 * }
 * ```
 */
export function validate(
  vars: Record<string, string>,
  schema: SchemaDefinition,
  options?: EngineOptions,
): EngineValidationResult {
  const strict = options?.strict ?? false;
  const abortEarly = options?.abortEarly ?? false;
  const deprecationWarnings = options?.deprecationWarnings ?? true;

  const errors: ValidationErrorEntry[] = [];
  const warnings: ValidationWarningEntry[] = [];
  const values: Record<string, unknown> = {};
  const unknown: string[] = [];

  // Build an alias map: alias → schema key
  const aliasMap = new Map<string, string>();
  for (const [key, builder] of Object.entries(schema)) {
    for (const alias of builder.meta.aliases) {
      aliasMap.set(alias, key);
      aliasMap.set(alias.toLowerCase(), key);
    }
  }

  // Resolve values including alias lookup
  const resolvedVars = resolveVariables(vars, schema, aliasMap);

  // Process each schema field
  for (const [key, builder] of Object.entries(schema)) {
    // Check conditional
    const conditional = builder.meta.conditional;
    if (conditional !== undefined) {
      try {
        if (!conditional.check(values)) {
          // Skip this field — condition not met
          // Still provide default if available
          if (builder.meta.hasDefault) {
            const defaultVal = builder.getDefaultValue();
            if (defaultVal !== undefined) {
              values[key] = defaultVal;
            }
          } else if (!builder.meta.required) {
            values[key] = undefined;
          }
          continue;
        }
      } catch {
        // If condition check throws, continue validating
      }
    }

    // Deprecation warning
    if (deprecationWarnings && builder.meta.isDeprecated) {
      const rawValue = resolvedVars[key] ?? '';
      if (rawValue !== '') {
        warnings.push({
          field: key,
          rawValue,
          message: builder.meta.deprecationMessage ?? `Variable "${key}" is deprecated`,
          code: 'DEPRECATED',
        });
      }
    }

    // Get the raw value
    const rawValue = resolvedVars[key];

    // Handle missing values
    if (rawValue === undefined) {
      if (builder.meta.hasDefault) {
        const defaultVal = builder.getDefaultValue();
        if (defaultVal !== undefined) {
          values[key] = defaultVal;
        } else {
          // Default value could not be parsed
          errors.push({
            field: key,
            rawValue: builder.meta.rawDefaultValue ?? '',
            message: `Default value "${builder.meta.rawDefaultValue ?? ''}" could not be parsed as ${builder.meta.typeName}`,
            expected: builder.meta.typeName,
            meta: builder.meta,
          });
        }
      } else if (builder.meta.required) {
        errors.push({
          field: key,
          rawValue: '',
          message: `Required variable "${key}" is missing`,
          expected: builder.meta.typeName,
          meta: builder.meta,
        });
      } else {
        values[key] = undefined;
      }
      continue;
    }

    // Parse and validate
    const parseResult = builder._parse(rawValue);
    if (!parseResult.success) {
      errors.push({
        field: key,
        rawValue,
        message: parseResult.error,
        expected: builder.meta.typeName,
        meta: builder.meta,
      });
      if (abortEarly) {
        break;
      }
      continue;
    }

    values[key] = parseResult.value;
  }

  // Check for unknown variables in strict mode
  if (strict) {
    const schemaKeys = new Set(Object.keys(schema));
    for (const alias of aliasMap.keys()) {
      schemaKeys.add(alias);
    }
    for (const key of Object.keys(vars)) {
      if (!schemaKeys.has(key) && !aliasMap.has(key)) {
        unknown.push(key);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    values,
    unknown,
  };
}

/**
 * Resolve variables including alias lookups.
 * Returns a map of schema key → resolved raw value.
 */
function resolveVariables(
  vars: Record<string, string>,
  schema: SchemaDefinition,
  aliasMap: Map<string, string>,
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};

  for (const key of Object.keys(schema)) {
    // Direct lookup (case-sensitive first)
    if (key in vars && vars[key] !== undefined) {
      result[key] = vars[key];
      continue;
    }

    // Case-insensitive lookup
    const caseInsensitiveKey = Object.keys(vars).find((k) => k.toLowerCase() === key.toLowerCase());
    if (caseInsensitiveKey !== undefined && vars[caseInsensitiveKey] !== undefined) {
      result[key] = vars[caseInsensitiveKey];
      continue;
    }

    // Alias lookup
    let foundAlias = false;
    for (const [alias, schemaKey] of aliasMap.entries()) {
      if (schemaKey === key) {
        if (alias in vars && vars[alias] !== undefined) {
          result[key] = vars[alias];
          foundAlias = true;
          break;
        }
        // Case-insensitive alias lookup
        const ciAlias = Object.keys(vars).find((k) => k.toLowerCase() === alias.toLowerCase());
        if (ciAlias !== undefined && vars[ciAlias] !== undefined) {
          result[key] = vars[ciAlias];
          foundAlias = true;
          break;
        }
      }
    }

    if (!foundAlias) {
      result[key] = undefined;
    }
  }

  return result;
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Validate a single value against a schema builder.
 * Useful for testing individual validators.
 */
export function validateValue<T>(
  rawValue: string | undefined,
  builder: SchemaBuilder<T>,
): ParseResult<T> {
  if (rawValue === undefined) {
    if (builder.meta.hasDefault) {
      const defaultVal = builder.getDefaultValue();
      if (defaultVal !== undefined) {
        return { success: true, value: defaultVal };
      }
      return { success: false, error: `Value is required but has no valid default` };
    }
    if (builder.meta.required) {
      return { success: false, error: 'Value is required' };
    }
    // For optional fields with undefined value, we can't return T
    // This is a type system limitation — the caller should handle this
    return {
      success: false,
      error: 'Value is undefined and optional (use defineEnv for proper handling)',
    };
  }
  return builder._parse(rawValue);
}

/**
 * Create a validation summary string for human-readable output.
 */
export function formatValidationResult(result: EngineValidationResult): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push('✓ All validations passed');
    if (result.warnings.length > 0) {
      lines.push('');
      lines.push(`⚠ ${result.warnings.length} warning(s):`);
      for (const warning of result.warnings) {
        lines.push(`  - ${warning.field}: ${warning.message}`);
      }
    }
  } else {
    lines.push(`✗ Validation failed with ${result.errors.length} error(s):`);
    for (const error of result.errors) {
      lines.push(`  - ${error.field}: ${error.message}`);
      if (error.meta.description) {
        lines.push(`    ${error.meta.description}`);
      }
    }
    if (result.warnings.length > 0) {
      lines.push('');
      lines.push(`⚠ ${result.warnings.length} warning(s):`);
      for (const warning of result.warnings) {
        lines.push(`  - ${warning.field}: ${warning.message}`);
      }
    }
  }

  if (result.unknown.length > 0) {
    lines.push('');
    lines.push(`? Unknown variables: ${result.unknown.join(', ')}`);
  }

  return lines.join('\n');
}
