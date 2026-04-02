import { describe, it, expect } from 'vitest';
import { BooleanSchemaBuilder, createBooleanSchema } from '../../../../src/schema/validators/boolean.js';

describe('BooleanSchemaBuilder', () => {
  // ===========================================================================
  // true/false
  // ===========================================================================
  describe('true/false literals', () => {
    it('accepts "true"', () => {
      const schema = createBooleanSchema();
      const result = schema._parse('true');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(true);
    });

    it('accepts "false"', () => {
      const schema = createBooleanSchema();
      const result = schema._parse('false');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(false);
    });
  });

  // ===========================================================================
  // 1/0
  // ===========================================================================
  describe('1/0 literals', () => {
    it('accepts "1" as true', () => {
      const schema = createBooleanSchema();
      const result = schema._parse('1');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(true);
    });

    it('accepts "0" as false', () => {
      const schema = createBooleanSchema();
      const result = schema._parse('0');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(false);
    });
  });

  // ===========================================================================
  // yes/no
  // ===========================================================================
  describe('yes/no literals', () => {
    it('accepts "yes" as true', () => {
      const schema = createBooleanSchema();
      const result = schema._parse('yes');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(true);
    });

    it('accepts "no" as false', () => {
      const schema = createBooleanSchema();
      const result = schema._parse('no');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(false);
    });
  });

  // ===========================================================================
  // on/off
  // ===========================================================================
  describe('on/off literals', () => {
    it('accepts "on" as true', () => {
      const schema = createBooleanSchema();
      const result = schema._parse('on');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(true);
    });

    it('accepts "off" as false', () => {
      const schema = createBooleanSchema();
      const result = schema._parse('off');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(false);
    });
  });

  // ===========================================================================
  // empty string
  // ===========================================================================
  describe('empty string', () => {
    it('accepts empty string as false', () => {
      const schema = createBooleanSchema();
      const result = schema._parse('');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(false);
    });
  });

  // ===========================================================================
  // case insensitivity
  // ===========================================================================
  describe('case insensitivity', () => {
    it('accepts "TRUE"', () => {
      const schema = createBooleanSchema();
      const result = schema._parse('TRUE');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(true);
    });

    it('accepts "FALSE"', () => {
      const schema = createBooleanSchema();
      const result = schema._parse('FALSE');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(false);
    });

    it('accepts "True"', () => {
      const schema = createBooleanSchema();
      const result = schema._parse('True');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(true);
    });

    it('accepts "Yes"', () => {
      const schema = createBooleanSchema();
      const result = schema._parse('Yes');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(true);
    });

    it('accepts "ON"', () => {
      const schema = createBooleanSchema();
      const result = schema._parse('ON');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(true);
    });

    it('accepts "No"', () => {
      const schema = createBooleanSchema();
      const result = schema._parse('No');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(false);
    });

    it('accepts "Off"', () => {
      const schema = createBooleanSchema();
      const result = schema._parse('Off');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(false);
    });
  });

  // ===========================================================================
  // whitespace handling
  // ===========================================================================
  describe('whitespace', () => {
    it('trims whitespace', () => {
      const schema = createBooleanSchema();
      const result = schema._parse('  true  ');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(true);
    });
  });

  // ===========================================================================
  // invalid values
  // ===========================================================================
  describe('invalid values', () => {
    it('rejects "maybe"', () => {
      const schema = createBooleanSchema();
      expect(schema._parse('maybe').success).toBe(false);
    });

    it('rejects "2"', () => {
      const schema = createBooleanSchema();
      expect(schema._parse('2').success).toBe(false);
    });

    it('rejects "yesplease"', () => {
      const schema = createBooleanSchema();
      expect(schema._parse('yesplease').success).toBe(false);
    });

    it('rejects "tru"', () => {
      const schema = createBooleanSchema();
      expect(schema._parse('tru').success).toBe(false);
    });

    it('returns error message for invalid input', () => {
      const schema = createBooleanSchema();
      const result = schema._parse('invalid');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not a valid boolean');
      }
    });
  });

  // ===========================================================================
  // custom truthy/falsy
  // ===========================================================================
  describe('custom truthy/falsy', () => {
    it('allows custom truthy values', () => {
      const schema = createBooleanSchema().truthy(['enabled']);
      const result = schema._parse('enabled');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(true);
    });

    it('allows custom falsy values', () => {
      const schema = createBooleanSchema().falsy(['disabled']);
      const result = schema._parse('disabled');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(false);
    });

    it('original values become invalid after override', () => {
      const schema = createBooleanSchema().truthy(['enabled']).falsy(['disabled']);
      expect(schema._parse('true').success).toBe(false);
      expect(schema._parse('false').success).toBe(false);
    });

    it('custom values are case-insensitive', () => {
      const schema = createBooleanSchema().truthy(['ENABLED']).falsy(['DISABLED']);
      const result = schema._parse('enabled');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(true);
    });
  });
});
