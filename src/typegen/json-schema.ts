// =============================================================================
// ultraenv — JSON Schema Generator
// Generates a JSON Schema (draft-07) from a SchemaDefinition.
// =============================================================================

import type { SchemaDefinition } from '../core/types.js';
import { writeFile } from '../utils/fs.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface GenerateJsonSchemaOptions {
  /** Title for the JSON Schema (default: 'Environment Variables') */
  title?: string;
  /** Description for the JSON Schema */
  description?: string;
  /** Whether to include schema descriptions in the output */
  includeDescriptions?: boolean;
  /** Indentation in spaces (default: 2) */
  indent?: number;
}

interface JsonSchemaProperty {
  type: string;
  description?: string;
  default?: string | number | boolean | null;
  enum?: readonly string[];
  format?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  items?: JsonSchemaProperty;
}

interface JsonSchemaDocument {
  $schema: string;
  title: string;
  description?: string;
  type: string;
  properties: Record<string, JsonSchemaProperty>;
  required: readonly string[];
  additionalProperties: boolean;
}

type SchemaEntry = SchemaDefinition[string];

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const JSON_SCHEMA_DRAFT_07 = 'http://json-schema.org/draft-07/schema#';

// -----------------------------------------------------------------------------
// Type Mapping
// -----------------------------------------------------------------------------

function schemaToJsonSchemaProperty(
  key: string,
  schema: SchemaEntry,
  includeDescriptions: boolean,
): JsonSchemaProperty {
  const r = schema as unknown as Record<string, unknown>;
  const schemaType = r.type as string | undefined;

  const property: JsonSchemaProperty = {
    type: 'string',
  };

  if (includeDescriptions && schema.description !== undefined) {
    property.description = schema.description;
  } else if (includeDescriptions) {
    property.description = key;
  }

  // Default value
  if (schema.default !== undefined) {
    property.default = schema.default as string | number | boolean | null;
  } else if (r.hasDefault === true && typeof r.rawDefaultValue === 'string') {
    const raw = r.rawDefaultValue;
    if (raw === 'true') {
      property.default = true;
    } else if (raw === 'false') {
      property.default = false;
    } else if (raw !== '' && !Number.isNaN(Number(raw)) && raw === String(Number(raw))) {
      property.default = Number(raw);
    } else {
      property.default = raw;
    }
  }

  switch (schemaType) {
    case 'string': {
      property.type = 'string';

      const enumValues = r.enum as readonly string[] | undefined;
      if (Array.isArray(enumValues) && enumValues.length > 0) {
        property.enum = [...enumValues];
      }

      if (typeof r.minLength === 'number') {
        property.minLength = r.minLength;
      }
      if (typeof r.maxLength === 'number') {
        property.maxLength = r.maxLength;
      }
      if (r.pattern instanceof RegExp) {
        property.pattern = r.pattern.source;
      }
      if (typeof r.format === 'string') {
        property.format = mapFormat(r.format);
      }

      break;
    }

    case 'number': {
      property.type = r.integer === true ? 'integer' : 'number';

      if (typeof r.min === 'number') {
        property.minimum = r.min;
        if (r.positive === true) {
          property.exclusiveMinimum = true;
        }
      }
      if (typeof r.max === 'number') {
        property.maximum = r.max;
        if (r.negative === true) {
          property.exclusiveMaximum = true;
        }
      }

      break;
    }

    case 'boolean': {
      property.type = 'boolean';
      break;
    }

    case 'enum': {
      property.type = 'string';
      const values = r.values as readonly string[] | undefined;
      if (Array.isArray(values) && values.length > 0) {
        property.enum = [...values];
      }
      break;
    }

    case 'array': {
      property.type = 'array';
      property.items = { type: 'string' };

      if (typeof r.minItems === 'number') {
        property.minItems = r.minItems;
      }
      if (typeof r.maxItems === 'number') {
        property.maxItems = r.maxItems;
      }
      if (r.unique === true) {
        property.uniqueItems = true;
      }
      if (typeof r.separator === 'string' && r.separator !== ',') {
        property.description = (property.description ?? '')
          + ` (separator: "${r.separator as string}")`;
      }

      break;
    }

    case 'json': {
      property.type = 'object';
      break;
    }

    case 'date': {
      property.type = 'string';
      property.format = 'date-time';
      break;
    }

    case 'bigint': {
      property.type = 'string';
      property.description = (property.description ?? '')
        + ' (bigint as string)';
      break;
    }

    default: {
      property.type = 'string';
      break;
    }
  }

  return property;
}

function mapFormat(format: string): string {
  const formatMap: ReadonlyMap<string, string> = new Map<string, string>([
    ['email', 'email'],
    ['url', 'uri'],
    ['uuid', 'uuid'],
    ['hostname', 'hostname'],
    ['ip', 'string'],
    ['ipv4', 'ipv4'],
    ['ipv6', 'ipv6'],
  ]);

  return formatMap.get(format) ?? 'string';
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Generate a JSON Schema (draft-07) from a SchemaDefinition.
 */
export async function generateJsonSchema(
  schema: SchemaDefinition,
  outputPath?: string,
  options?: GenerateJsonSchemaOptions,
): Promise<string> {
  const content = generateJsonSchemaContent(schema, options);

  if (outputPath !== undefined) {
    await writeFile(outputPath, content);
  }

  return content;
}

/**
 * Generate the JSON Schema content string.
 */
export function generateJsonSchemaContent(
  schema: SchemaDefinition,
  options?: GenerateJsonSchemaOptions,
): string {
  const includeDescriptions = options?.includeDescriptions ?? true;
  const indent = options?.indent ?? 2;
  const title = options?.title ?? 'Environment Variables';
  const description = options?.description
    ?? 'Schema for environment variables managed by ultraenv';

  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];

  const sortedKeys = Object.keys(schema).sort();

  for (const key of sortedKeys) {
    const schemaEntry = schema[key];
    if (schemaEntry === undefined) continue;

    properties[key] = schemaToJsonSchemaProperty(key, schemaEntry, includeDescriptions);

    const r = schemaEntry as unknown as Record<string, unknown>;
    const isOptional = schemaEntry.optional === true
      || schemaEntry.default !== undefined
      || r.hasDefault === true;

    if (!isOptional) {
      required.push(key);
    }
  }

  required.sort();

  const document: JsonSchemaDocument = {
    $schema: JSON_SCHEMA_DRAFT_07,
    title,
    description,
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  };

  return JSON.stringify(document, null, indent) + '\n';
}
