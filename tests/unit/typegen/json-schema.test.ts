import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateJsonSchemaContent, generateJsonSchema } from '../../../src/typegen/json-schema.js';
import type { SchemaDefinition } from '../../../src/core/types.js';

// Mock the fs utilities
vi.mock('../../../src/utils/fs.js', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

import { writeFile } from '../../../src/utils/fs.js';
const mockWriteFile = vi.mocked(writeFile);

describe('json-schema generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // generateJsonSchemaContent
  // ===========================================================================
  describe('generateJsonSchemaContent', () => {
    it('generates valid JSON Schema (draft-07)', () => {
      const schema: SchemaDefinition = {
        APP_NAME: {
          type: 'string',
          description: 'The application name',
        },
        PORT: {
          type: 'number',
          description: 'Server port',
          integer: true,
          min: 1,
          max: 65535,
        },
        DEBUG: {
          type: 'boolean',
          description: 'Enable debug mode',
        },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);

      expect(parsed.$schema).toBe('http://json-schema.org/draft-07/schema#');
      expect(parsed.type).toBe('object');
      expect(parsed.additionalProperties).toBe(false);
    });

    it('includes all schema properties', () => {
      const schema: SchemaDefinition = {
        STRING_VAR: { type: 'string' },
        NUMBER_VAR: { type: 'number' },
        BOOL_VAR: { type: 'boolean' },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);

      expect(Object.keys(parsed.properties)).toContain('STRING_VAR');
      expect(Object.keys(parsed.properties)).toContain('NUMBER_VAR');
      expect(Object.keys(parsed.properties)).toContain('BOOL_VAR');
    });

    it('sets correct type for string properties', () => {
      const schema: SchemaDefinition = {
        NAME: { type: 'string' },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);
      expect(parsed.properties.NAME.type).toBe('string');
    });

    it('sets correct type for number properties', () => {
      const schema: SchemaDefinition = {
        PORT: { type: 'number' },
        COUNT: { type: 'number', integer: true },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);
      expect(parsed.properties.PORT.type).toBe('number');
      expect(parsed.properties.COUNT.type).toBe('integer');
    });

    it('sets correct type for boolean properties', () => {
      const schema: SchemaDefinition = {
        DEBUG: { type: 'boolean' },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);
      expect(parsed.properties.DEBUG.type).toBe('boolean');
    });

    it('sets correct type for enum properties', () => {
      const schema: SchemaDefinition = {
        ENV: {
          type: 'enum',
          values: ['development', 'production', 'test'],
        },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);
      expect(parsed.properties.ENV.type).toBe('string');
      expect(parsed.properties.ENV.enum).toEqual(['development', 'production', 'test']);
    });

    it('includes string format for url type', () => {
      const schema: SchemaDefinition = {
        SITE_URL: { type: 'string', format: 'url' as any },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);
      expect(parsed.properties.SITE_URL.format).toBe('uri');
    });

    it('includes string format for email type', () => {
      const schema: SchemaDefinition = {
        EMAIL: { type: 'string', format: 'email' as any },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);
      expect(parsed.properties.EMAIL.format).toBe('email');
    });

    it('includes string format for uuid type', () => {
      const schema: SchemaDefinition = {
        ID: { type: 'string', format: 'uuid' as any },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);
      expect(parsed.properties.ID.format).toBe('uuid');
    });

    it('includes minLength and maxLength for string schema', () => {
      const schema: SchemaDefinition = {
        NAME: { type: 'string', minLength: 1, maxLength: 100 },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);
      expect(parsed.properties.NAME.minLength).toBe(1);
      expect(parsed.properties.NAME.maxLength).toBe(100);
    });

    it('includes min and max for number schema', () => {
      const schema: SchemaDefinition = {
        PORT: { type: 'number', min: 1, max: 65535 },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);
      expect(parsed.properties.PORT.minimum).toBe(1);
      expect(parsed.properties.PORT.maximum).toBe(65535);
    });

    it('sets required for non-optional fields without defaults', () => {
      const schema: SchemaDefinition = {
        REQUIRED: { type: 'string' },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);
      expect(parsed.required).toContain('REQUIRED');
    });

    it('excludes from required when optional is true', () => {
      const schema: SchemaDefinition = {
        OPTIONAL: { type: 'string', optional: true },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);
      expect(parsed.required).not.toContain('OPTIONAL');
    });

    it('excludes from required when default is set', () => {
      const schema: SchemaDefinition = {
        WITH_DEFAULT: { type: 'string', default: 'fallback' },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);
      expect(parsed.required).not.toContain('WITH_DEFAULT');
    });

    it('includes default values', () => {
      const schema: SchemaDefinition = {
        PORT: { type: 'number', default: 3000 },
        DEBUG: { type: 'boolean', default: false },
        NAME: { type: 'string', default: 'app' },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);
      expect(parsed.properties.PORT.default).toBe(3000);
      expect(parsed.properties.DEBUG.default).toBe(false);
      expect(parsed.properties.NAME.default).toBe('app');
    });

    it('sorts required array', () => {
      const schema: SchemaDefinition = {
        ZEBRA: { type: 'string' },
        ALPHA: { type: 'string' },
        MIDDLE: { type: 'string' },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);
      expect(parsed.required).toEqual(['ALPHA', 'MIDDLE', 'ZEBRA']);
    });

    it('sorts properties alphabetically', () => {
      const schema: SchemaDefinition = {
        Z: { type: 'string' },
        A: { type: 'string' },
        M: { type: 'string' },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);
      const keys = Object.keys(parsed.properties);
      expect(keys).toEqual(['A', 'M', 'Z']);
    });

    it('includes title and description', () => {
      const schema: SchemaDefinition = { KEY: { type: 'string' } };
      const content = generateJsonSchemaContent(schema, {
        title: 'My Schema',
        description: 'Schema for my app',
      });
      const parsed = JSON.parse(content);
      expect(parsed.title).toBe('My Schema');
      expect(parsed.description).toBe('Schema for my app');
    });

    it('uses default title when not specified', () => {
      const schema: SchemaDefinition = { KEY: { type: 'string' } };
      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);
      expect(parsed.title).toBe('Environment Variables');
    });

    it('handles array type', () => {
      const schema: SchemaDefinition = {
        TAGS: { type: 'array', separator: ',', minItems: 1, maxItems: 10 },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);
      expect(parsed.properties.TAGS.type).toBe('array');
      expect(parsed.properties.TAGS.items).toEqual({ type: 'string' });
      expect(parsed.properties.TAGS.minItems).toBe(1);
      expect(parsed.properties.TAGS.maxItems).toBe(10);
    });

    it('handles json type', () => {
      const schema: SchemaDefinition = {
        CONFIG: { type: 'json' },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);
      expect(parsed.properties.CONFIG.type).toBe('object');
    });

    it('handles date type', () => {
      const schema: SchemaDefinition = {
        CREATED: { type: 'date' },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);
      expect(parsed.properties.CREATED.type).toBe('string');
      expect(parsed.properties.CREATED.format).toBe('date-time');
    });

    it('handles bigint type', () => {
      const schema: SchemaDefinition = {
        BIG: { type: 'bigint' },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);
      expect(parsed.properties.BIG.type).toBe('string');
    });

    it('uses custom indentation', () => {
      const schema: SchemaDefinition = { KEY: { type: 'string' } };
      const content2 = generateJsonSchemaContent(schema, { indent: 4 });
      // 4-space indent should produce different output than 2-space
      const content4 = generateJsonSchemaContent(schema, { indent: 4 });
      const lines4 = content4.split('\n').filter((l) => l.trimStart().startsWith('"'));
      if (lines4.length > 0) {
        // Check that indentation is 4 spaces
        expect(lines4[0]!.startsWith('    ')).toBe(true);
      }
    });

    it('respects includeDescriptions=false', () => {
      const schema: SchemaDefinition = {
        KEY: { type: 'string', description: 'A secret key' },
      };

      const content = generateJsonSchemaContent(schema, { includeDescriptions: false });
      const parsed = JSON.parse(content);
      expect(parsed.properties.KEY.description).toBeUndefined();
    });

    it('ends with a newline', () => {
      const schema: SchemaDefinition = { KEY: { type: 'string' } };
      const content = generateJsonSchemaContent(schema);
      expect(content.endsWith('\n')).toBe(true);
    });

    it('handles string enum values', () => {
      const schema: SchemaDefinition = {
        ROLE: {
          type: 'string',
          enum: ['admin', 'user', 'guest'],
        },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);
      expect(parsed.properties.ROLE.type).toBe('string');
      expect(parsed.properties.ROLE.enum).toEqual(['admin', 'user', 'guest']);
    });

    it('includes pattern for regex constraints', () => {
      const schema: SchemaDefinition = {
        HEX_COLOR: {
          type: 'string',
          pattern: /^#[0-9a-fA-F]{6}$/,
        },
      };

      const content = generateJsonSchemaContent(schema);
      const parsed = JSON.parse(content);
      expect(parsed.properties.HEX_COLOR.pattern).toBe('^#[0-9a-fA-F]{6}$');
    });

    it('handles empty schema', () => {
      const content = generateJsonSchemaContent({});
      const parsed = JSON.parse(content);
      expect(parsed.type).toBe('object');
      expect(Object.keys(parsed.properties)).toHaveLength(0);
      expect(parsed.required).toHaveLength(0);
    });
  });

  // ===========================================================================
  // generateJsonSchema (async with file output)
  // ===========================================================================
  describe('generateJsonSchema', () => {
    it('returns the content string', async () => {
      const schema: SchemaDefinition = { KEY: { type: 'string' } };
      const content = await generateJsonSchema(schema);
      const parsed = JSON.parse(content);
      expect(parsed.$schema).toBeDefined();
    });

    it('writes to file when outputPath is provided', async () => {
      const schema: SchemaDefinition = { KEY: { type: 'string' } };
      await generateJsonSchema(schema, '/output/schema.json');
      expect(mockWriteFile).toHaveBeenCalledWith('/output/schema.json', expect.any(String));
    });

    it('does not write to file when outputPath is omitted', async () => {
      const schema: SchemaDefinition = { KEY: { type: 'string' } };
      await generateJsonSchema(schema);
      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });
});
