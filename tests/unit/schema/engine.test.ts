import { describe, it, expect } from 'vitest';
import { validate, SchemaBuilder } from '../../../src/schema/engine.js';
import { StringSchemaBuilder } from '../../../src/schema/validators/string.js';
import { NumberSchemaBuilder } from '../../../src/schema/validators/number.js';
import { BooleanSchemaBuilder } from '../../../src/schema/validators/boolean.js';
import { EnumSchemaBuilder } from '../../../src/schema/validators/enum.js';

function str() {
  return new StringSchemaBuilder<string>();
}
function num() {
  return new NumberSchemaBuilder<number>();
}
function bool() {
  return new BooleanSchemaBuilder();
}
function enu(values: readonly string[]) {
  return new EnumSchemaBuilder(values);
}

describe('validate (schema engine)', () => {
  // ---------------------------------------------------------------------------
  // Basic validation with schema
  // ---------------------------------------------------------------------------
  describe('basic schema validation', () => {
    it('validates all fields', () => {
      const schema = {
        PORT: num().port(),
        HOST: str().minLength(1),
      };
      const result = validate({ PORT: '3000', HOST: 'localhost' }, schema);
      expect(result.valid).toBe(true);
      expect(result.values.PORT).toBe(3000);
      expect(result.values.HOST).toBe('localhost');
    });

    it('returns errors for invalid values', () => {
      const schema = {
        PORT: num().port(),
      };
      const result = validate({ PORT: '99999' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.field).toBe('PORT');
    });
  });

  // ---------------------------------------------------------------------------
  // Required fields
  // ---------------------------------------------------------------------------
  describe('required fields', () => {
    it('reports error for missing required field', () => {
      const schema = {
        PORT: num().port(),
      };
      const result = validate({}, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.field).toBe('PORT');
      expect(result.errors[0]!.message).toContain('missing');
    });
  });

  // ---------------------------------------------------------------------------
  // Optional fields
  // ---------------------------------------------------------------------------
  describe('optional fields', () => {
    it('allows missing optional field', () => {
      const schema = {
        DEBUG: bool().optional(),
      };
      const result = validate({}, schema);
      expect(result.valid).toBe(true);
      expect(result.values.DEBUG).toBeUndefined();
    });

    it('validates optional field when present', () => {
      const schema = {
        PORT: num().port().optional(),
      };
      const result = validate({ PORT: 'invalid' }, schema);
      expect(result.valid).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Defaults
  // ---------------------------------------------------------------------------
  describe('defaults', () => {
    it('uses default when field is missing', () => {
      const schema = {
        PORT: num().port().default(3000),
      };
      const result = validate({}, schema);
      expect(result.valid).toBe(true);
      expect(result.values.PORT).toBe(3000);
    });

    it('uses provided value over default', () => {
      const schema = {
        PORT: num().port().default(3000),
      };
      const result = validate({ PORT: '8080' }, schema);
      expect(result.valid).toBe(true);
      expect(result.values.PORT).toBe(8080);
    });
  });

  // ---------------------------------------------------------------------------
  // Aliases
  // ---------------------------------------------------------------------------
  describe('aliases', () => {
    it('resolves value from alias', () => {
      const schema = {
        PORT: num().port().alias('SERVER_PORT'),
      };
      const result = validate({ SERVER_PORT: '8080' }, schema);
      expect(result.valid).toBe(true);
      expect(result.values.PORT).toBe(8080);
    });

    it('prefers direct key over alias', () => {
      const schema = {
        PORT: num().port().alias('SERVER_PORT'),
      };
      const result = validate({ PORT: '3000', SERVER_PORT: '8080' }, schema);
      expect(result.valid).toBe(true);
      expect(result.values.PORT).toBe(3000);
    });
  });

  // ---------------------------------------------------------------------------
  // Conditionals
  // ---------------------------------------------------------------------------
  describe('conditionals (when)', () => {
    it('skips validation when condition is false', () => {
      const schema = {
        MODE: enu(['dev', 'prod'] as const),
        DB_URL: str()
          .minLength(1)
          .when((env) => env.MODE === 'prod'),
      };
      const result = validate({ MODE: 'dev' }, schema);
      expect(result.valid).toBe(true);
    });

    it('validates when condition is true', () => {
      const schema = {
        MODE: enu(['dev', 'prod'] as const),
        DB_URL: str()
          .minLength(1)
          .when((env) => env.MODE === 'prod'),
      };
      const result = validate({ MODE: 'prod' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'DB_URL')).toBe(true);
    });

    it('provides default for skipped conditional field', () => {
      const schema = {
        MODE: enu(['dev', 'prod'] as const),
        DB_URL: str()
          .default('sqlite://local.db')
          .when((env) => env.MODE === 'prod'),
      };
      const result = validate({ MODE: 'dev' }, schema);
      expect(result.valid).toBe(true);
      expect(result.values.DB_URL).toBe('sqlite://local.db');
    });
  });

  // ---------------------------------------------------------------------------
  // Deprecation warnings
  // ---------------------------------------------------------------------------
  describe('deprecation warnings', () => {
    it('emits warning for deprecated fields with values', () => {
      const schema = {
        OLD_API: str().deprecated('Use NEW_API instead'),
      };
      const result = validate({ OLD_API: 'value' }, schema);
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]!.code).toBe('DEPRECATED');
      expect(result.warnings[0]!.field).toBe('OLD_API');
    });

    it('does not warn for deprecated fields without values', () => {
      const schema = {
        OLD_API: str().deprecated('Use NEW_API instead'),
      };
      const result = validate({}, schema);
      // Required field is missing — that's an error, not a deprecation warning
      expect(result.warnings).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Strict mode
  // ---------------------------------------------------------------------------
  describe('strict mode', () => {
    it('reports unknown variables in strict mode', () => {
      const schema = {
        PORT: num().port().default(3000),
      };
      const result = validate({ PORT: '8080', UNKNOWN_VAR: 'hello' }, schema, { strict: true });
      expect(result.valid).toBe(true);
      expect(result.unknown).toContain('UNKNOWN_VAR');
    });

    it('does not report unknown variables in non-strict mode', () => {
      const schema = {
        PORT: num().port().default(3000),
      };
      const result = validate({ PORT: '8080', UNKNOWN_VAR: 'hello' }, schema, { strict: false });
      expect(result.unknown).toHaveLength(0);
    });

    it('recognizes alias keys as known', () => {
      const schema = {
        PORT: num().port().alias('SERVER_PORT').default(3000),
      };
      const result = validate({ SERVER_PORT: '8080' }, schema, { strict: true });
      expect(result.unknown).not.toContain('SERVER_PORT');
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple errors
  // ---------------------------------------------------------------------------
  describe('multiple errors', () => {
    it('collects all errors', () => {
      const schema = {
        PORT: num().port(),
        HOST: str().minLength(1),
      };
      const result = validate({ PORT: 'invalid', HOST: '' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('supports abortEarly to stop on first error', () => {
      const schema = {
        PORT: num().port(),
        HOST: str().minLength(1),
      };
      const result = validate({ PORT: 'invalid', HOST: '' }, schema, { abortEarly: true });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Result shape
  // ---------------------------------------------------------------------------
  describe('result shape', () => {
    it('returns correct result structure', () => {
      const schema = { KEY: str() };
      const result = validate({ KEY: 'value' }, schema);
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('values');
      expect(result).toHaveProperty('unknown');
    });

    it('errors have correct shape', () => {
      const schema = { PORT: num().port() };
      const result = validate({ PORT: 'abc' }, schema);
      const error = result.errors[0]!;
      expect(error).toHaveProperty('field');
      expect(error).toHaveProperty('rawValue');
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('expected');
      expect(error).toHaveProperty('meta');
    });
  });
});
