import { describe, it, expect } from 'vitest';
import { EnumSchemaBuilder, createEnumSchema } from '../../../../src/schema/validators/enum.js';

describe('EnumSchemaBuilder', () => {
  // ===========================================================================
  // valid values
  // ===========================================================================
  describe('valid values', () => {
    it('accepts a value from the enum list', () => {
      const schema = createEnumSchema(['development', 'production', 'test'] as const);
      const result = schema._parse('production');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe('production');
    });

    it('accepts all values from the enum list', () => {
      const schema = createEnumSchema(['alpha', 'beta', 'gamma'] as const);
      expect(schema._parse('alpha').success).toBe(true);
      expect(schema._parse('beta').success).toBe(true);
      expect(schema._parse('gamma').success).toBe(true);
    });

    it('returns the exact enum value', () => {
      const schema = createEnumSchema(['dev', 'prod'] as const);
      const result = schema._parse('dev');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe('dev');
    });
  });

  // ===========================================================================
  // invalid values
  // ===========================================================================
  describe('invalid values', () => {
    it('rejects value not in the list', () => {
      const schema = createEnumSchema(['development', 'production', 'test'] as const);
      expect(schema._parse('staging').success).toBe(false);
    });

    it('rejects empty string', () => {
      const schema = createEnumSchema(['development', 'production'] as const);
      expect(schema._parse('').success).toBe(false);
    });

    it('rejects partial match', () => {
      const schema = createEnumSchema(['development', 'production'] as const);
      expect(schema._parse('develop').success).toBe(false);
    });

    it('rejects case-different value', () => {
      const schema = createEnumSchema(['development', 'production'] as const);
      expect(schema._parse('DEVELOPMENT').success).toBe(false);
    });

    it('returns error message with available values', () => {
      const schema = createEnumSchema(['development', 'production', 'test'] as const);
      const result = schema._parse('staging');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('development');
        expect(result.error).toContain('production');
      }
    });

    it('returns error message with quoted value', () => {
      const schema = createEnumSchema(['active', 'inactive'] as const);
      const result = schema._parse('pending');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('"pending"');
      }
    });
  });

  // ===========================================================================
  // trimming
  // ===========================================================================
  describe('trimming', () => {
    it('trims whitespace from value', () => {
      const schema = createEnumSchema(['active', 'inactive'] as const);
      const result = schema._parse('  active  ');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe('active');
    });

    it('handles value with quotes', () => {
      const schema = createEnumSchema(['active', 'inactive'] as const);
      const result = schema._parse('"active"');
      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // case-insensitive mode
  // ===========================================================================
  describe('caseInsensitive', () => {
    it('accepts uppercase when case-insensitive', () => {
      const schema = createEnumSchema(['development', 'production'] as const).caseInsensitive();
      const result = schema._parse('DEVELOPMENT');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe('development');
    });

    it('accepts mixed case when case-insensitive', () => {
      const schema = createEnumSchema(['development', 'production'] as const).caseInsensitive();
      const result = schema._parse('DeVeLoPmEnT');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe('development');
    });

    it('returns original casing (lowercase)', () => {
      const schema = createEnumSchema(['DEVELOPMENT', 'PRODUCTION'] as const).caseInsensitive();
      const result = schema._parse('development');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe('DEVELOPMENT');
    });

    it('still rejects non-matching value', () => {
      const schema = createEnumSchema(['development', 'production'] as const).caseInsensitive();
      expect(schema._parse('staging').success).toBe(false);
    });

    it('caseInsensitive(false) disables case insensitivity', () => {
      const schema = createEnumSchema(['development'] as const).caseInsensitive(false);
      expect(schema._parse('DEVELOPMENT').success).toBe(false);
    });
  });

  // ===========================================================================
  // values accessor
  // ===========================================================================
  describe('values accessor', () => {
    it('returns the list of allowed values', () => {
      const schema = createEnumSchema(['a', 'b', 'c'] as const);
      expect(schema.values).toEqual(['a', 'b', 'c']);
    });
  });

  // ===========================================================================
  // single value enum
  // ===========================================================================
  describe('single value enum', () => {
    it('accepts the only allowed value', () => {
      const schema = createEnumSchema(['only'] as const);
      const result = schema._parse('only');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe('only');
    });

    it('rejects everything else', () => {
      const schema = createEnumSchema(['only'] as const);
      expect(schema._parse('other').success).toBe(false);
    });
  });
});
