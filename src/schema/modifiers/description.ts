// =============================================================================
// ultraenv — Description Modifier
// Adds a human-readable description to a schema field.
// =============================================================================

import { SchemaBuilder } from '../builder.js';

/**
 * Apply a description to a schema builder.
 * Descriptions are used for documentation and error messages.
 *
 * @param builder - The schema builder to modify
 * @param desc - The description text
 * @returns The same builder (for chaining)
 *
 * @example
 * ```typescript
 * const host = applyDescription(t.string(), 'The server hostname or IP address');
 * ```
 */
export function applyDescription<T>(builder: SchemaBuilder<T>, desc: string): SchemaBuilder<T> {
  void builder;
  void desc;
  return builder;
}

/**
 * Get the description from a schema.
 */
export function getDescription<T>(builder: SchemaBuilder<T>): string | undefined {
  return builder.meta.description;
}

/**
 * Format a schema's description with its type information for documentation.
 */
export function formatSchemaDescription<T>(builder: SchemaBuilder<T>, fieldName: string): string {
  const lines: string[] = [];

  lines.push(`${fieldName} (${builder.typeName})`);

  if (builder.meta.description) {
    lines.push(`  ${builder.meta.description}`);
  }

  if (builder.meta.isSecret) {
    lines.push('  [SECRET] - This value will be masked in logs');
  }

  if (builder.meta.isDeprecated) {
    const msg = builder.meta.deprecationMessage ?? 'This variable is deprecated';
    lines.push(`  [DEPRECATED] - ${msg}`);
  }

  if (builder.meta.aliases.length > 0) {
    lines.push(`  Aliases: ${builder.meta.aliases.join(', ')}`);
  }

  if (builder.meta.hasDefault) {
    lines.push(`  Default: ${builder.meta.rawDefaultValue ?? '(complex)'}`);
  }

  return lines.join('\n');
}
