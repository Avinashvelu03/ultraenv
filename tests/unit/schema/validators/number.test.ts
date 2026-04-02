import { describe, it, expect } from 'vitest';
import {
  NumberSchemaBuilder,
  createNumberSchema,
} from '../../../../src/schema/validators/number.js';

describe('NumberSchemaBuilder', () => {
  // ===========================================================================
  // basic parsing
  // ===========================================================================
  describe('basic parsing', () => {
    it('parses a valid integer string', () => {
      const schema = createNumberSchema();
      const result = schema._parse('42');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(42);
    });

    it('parses a valid float string', () => {
      const schema = createNumberSchema();
      const result = schema._parse('3.14');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(3.14);
    });

    it('parses negative numbers', () => {
      const schema = createNumberSchema();
      const result = schema._parse('-10');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(-10);
    });

    it('parses zero', () => {
      const schema = createNumberSchema();
      const result = schema._parse('0');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(0);
    });

    it('parses scientific notation', () => {
      const schema = createNumberSchema();
      const result = schema._parse('1.5e10');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(1.5e10);
    });

    it('rejects empty string', () => {
      const schema = createNumberSchema();
      expect(schema._parse('').success).toBe(false);
    });

    it('rejects non-numeric string', () => {
      const schema = createNumberSchema();
      expect(schema._parse('abc').success).toBe(false);
    });

    it('rejects NaN', () => {
      const schema = createNumberSchema();
      expect(schema._parse('NaN').success).toBe(false);
    });

    it('parses Infinity as a valid JS number (use .finite() to reject)', () => {
      // Number('Infinity') returns Infinity in JS, which is a valid number.
      // The base parser accepts it; use .finite() to reject.
      const schema = createNumberSchema();
      const result = schema._parse('Infinity');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(Infinity);
    });

    it('trims whitespace', () => {
      const schema = createNumberSchema();
      const result = schema._parse('  42  ');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(42);
    });

    it('returns error message for non-numeric', () => {
      const schema = createNumberSchema();
      const result = schema._parse('not-a-number');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain('not a valid number');
    });
  });

  // ===========================================================================
  // integer
  // ===========================================================================
  describe('integer', () => {
    it('accepts integer', () => {
      const schema = createNumberSchema().integer();
      expect(schema._parse('42').success).toBe(true);
    });

    it('rejects float', () => {
      const schema = createNumberSchema().integer();
      expect(schema._parse('3.14').success).toBe(false);
    });

    it('accepts negative integer', () => {
      const schema = createNumberSchema().integer();
      expect(schema._parse('-7').success).toBe(true);
    });
  });

  // ===========================================================================
  // float
  // ===========================================================================
  describe('float', () => {
    it('always passes (all JS numbers are floats)', () => {
      const schema = createNumberSchema().float();
      expect(schema._parse('42').success).toBe(true);
      expect(schema._parse('3.14').success).toBe(true);
    });
  });

  // ===========================================================================
  // min / max
  // ===========================================================================
  describe('min/max', () => {
    it('accepts value within range', () => {
      const schema = createNumberSchema().min(0).max(100);
      expect(schema._parse('50').success).toBe(true);
    });

    it('rejects value below min', () => {
      const schema = createNumberSchema().min(10);
      expect(schema._parse('5').success).toBe(false);
    });

    it('rejects value above max', () => {
      const schema = createNumberSchema().max(100);
      expect(schema._parse('200').success).toBe(false);
    });

    it('accepts value at exact boundaries', () => {
      const schema = createNumberSchema().min(10).max(100);
      expect(schema._parse('10').success).toBe(true);
      expect(schema._parse('100').success).toBe(true);
    });
  });

  // ===========================================================================
  // port
  // ===========================================================================
  describe('port', () => {
    it('accepts valid ports', () => {
      const schema = createNumberSchema().port();
      expect(schema._parse('80').success).toBe(true);
      expect(schema._parse('443').success).toBe(true);
      expect(schema._parse('8080').success).toBe(true);
      expect(schema._parse('3000').success).toBe(true);
    });

    it('accepts port 1', () => {
      const schema = createNumberSchema().port();
      expect(schema._parse('1').success).toBe(true);
    });

    it('accepts port 65535', () => {
      const schema = createNumberSchema().port();
      expect(schema._parse('65535').success).toBe(true);
    });

    it('rejects port 0', () => {
      const schema = createNumberSchema().port();
      expect(schema._parse('0').success).toBe(false);
    });

    it('rejects port above 65535', () => {
      const schema = createNumberSchema().port();
      expect(schema._parse('70000').success).toBe(false);
    });

    it('rejects non-integer port', () => {
      const schema = createNumberSchema().port();
      expect(schema._parse('3.14').success).toBe(false);
    });
  });

  // ===========================================================================
  // percentage
  // ===========================================================================
  describe('percentage', () => {
    it('accepts 0', () => {
      const schema = createNumberSchema().percentage();
      expect(schema._parse('0').success).toBe(true);
    });

    it('accepts 100', () => {
      const schema = createNumberSchema().percentage();
      expect(schema._parse('100').success).toBe(true);
    });

    it('accepts 50.5', () => {
      const schema = createNumberSchema().percentage();
      expect(schema._parse('50.5').success).toBe(true);
    });

    it('rejects negative', () => {
      const schema = createNumberSchema().percentage();
      expect(schema._parse('-1').success).toBe(false);
    });

    it('rejects over 100', () => {
      const schema = createNumberSchema().percentage();
      expect(schema._parse('101').success).toBe(false);
    });
  });

  // ===========================================================================
  // positive / negative
  // ===========================================================================
  describe('positive / negative', () => {
    it('positive accepts > 0', () => {
      const schema = createNumberSchema().positive();
      expect(schema._parse('1').success).toBe(true);
      expect(schema._parse('0.01').success).toBe(true);
    });

    it('positive rejects 0', () => {
      const schema = createNumberSchema().positive();
      expect(schema._parse('0').success).toBe(false);
    });

    it('positive rejects negative', () => {
      const schema = createNumberSchema().positive();
      expect(schema._parse('-1').success).toBe(false);
    });

    it('negative accepts < 0', () => {
      const schema = createNumberSchema().negative();
      expect(schema._parse('-1').success).toBe(true);
      expect(schema._parse('-0.01').success).toBe(true);
    });

    it('negative rejects 0', () => {
      const schema = createNumberSchema().negative();
      expect(schema._parse('0').success).toBe(false);
    });

    it('negative rejects positive', () => {
      const schema = createNumberSchema().negative();
      expect(schema._parse('1').success).toBe(false);
    });
  });

  // ===========================================================================
  // nonNegative
  // ===========================================================================
  describe('nonNegative', () => {
    it('accepts 0', () => {
      const schema = createNumberSchema().nonNegative();
      expect(schema._parse('0').success).toBe(true);
    });

    it('accepts positive', () => {
      const schema = createNumberSchema().nonNegative();
      expect(schema._parse('42').success).toBe(true);
    });

    it('rejects negative', () => {
      const schema = createNumberSchema().nonNegative();
      expect(schema._parse('-1').success).toBe(false);
    });
  });

  // ===========================================================================
  // finite
  // ===========================================================================
  describe('finite', () => {
    it('accepts normal number', () => {
      const schema = createNumberSchema().finite();
      expect(schema._parse('42').success).toBe(true);
    });

    it('rejects Infinity', () => {
      const schema = createNumberSchema().finite();
      expect(schema._parse('Infinity').success).toBe(false);
    });

    it('rejects -Infinity', () => {
      const schema = createNumberSchema().finite();
      expect(schema._parse('-Infinity').success).toBe(false);
    });

    it('rejects NaN', () => {
      const schema = createNumberSchema().finite();
      expect(schema._parse('NaN').success).toBe(false);
    });
  });

  // ===========================================================================
  // safeInt
  // ===========================================================================
  describe('safeInt', () => {
    it('accepts safe integer', () => {
      const schema = createNumberSchema().safeInt();
      expect(schema._parse('9007199254740991').success).toBe(true);
    });

    it('rejects Number.MAX_SAFE_INTEGER + 1', () => {
      const schema = createNumberSchema().safeInt();
      expect(schema._parse('9007199254740992').success).toBe(false);
    });

    it('rejects float', () => {
      const schema = createNumberSchema().safeInt();
      expect(schema._parse('3.14').success).toBe(false);
    });
  });

  // ===========================================================================
  // oneOf
  // ===========================================================================
  describe('oneOf', () => {
    it('accepts value in list', () => {
      const schema = createNumberSchema().oneOf([1, 2, 3] as const);
      expect(schema._parse('2').success).toBe(true);
    });

    it('rejects value not in list', () => {
      const schema = createNumberSchema().oneOf([1, 2, 3] as const);
      expect(schema._parse('5').success).toBe(false);
    });
  });

  // ===========================================================================
  // step
  // ===========================================================================
  describe('step', () => {
    it('accepts multiple of step', () => {
      const schema = createNumberSchema().step(5);
      expect(schema._parse('10').success).toBe(true);
      expect(schema._parse('15').success).toBe(true);
    });

    it('rejects non-multiple of step', () => {
      const schema = createNumberSchema().step(5);
      expect(schema._parse('12').success).toBe(false);
    });
  });
});
