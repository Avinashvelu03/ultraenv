import { describe, it, expect } from 'vitest';
import { createDurationSchema } from '../../../../src/schema/validators/duration.js';

describe('DurationSchemaBuilder', () => {
  // ===========================================================================
  // Basic duration parsing
  // ===========================================================================
  describe('basic parsing', () => {
    it('parses "30s" → 30000ms', () => {
      const result = createDurationSchema()._parse('30s');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(30000);
    });

    it('parses "5m" → 300000ms', () => {
      const result = createDurationSchema()._parse('5m');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(300000);
    });

    it('parses "2h" → 7200000ms', () => {
      const result = createDurationSchema()._parse('2h');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(7200000);
    });

    it('parses "1d" → 86400000ms', () => {
      const result = createDurationSchema()._parse('1d');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(86400000);
    });

    it('parses "500ms" → 500ms', () => {
      const result = createDurationSchema()._parse('500ms');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(500);
    });

    it('parses "1w" → 604800000ms', () => {
      const result = createDurationSchema()._parse('1w');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(604800000);
    });

    it('parses "1y" → 31536000000ms', () => {
      const result = createDurationSchema()._parse('1y');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(31536000000);
    });
  });

  // ===========================================================================
  // Unit variants
  // ===========================================================================
  describe('unit variants', () => {
    it('parses "sec" as alias for "s"', () => {
      const result = createDurationSchema()._parse('30sec');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(30000);
    });

    it('parses "min" as alias for "m"', () => {
      const result = createDurationSchema()._parse('5min');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(300000);
    });

    it('parses "hr" as alias for "h"', () => {
      const result = createDurationSchema()._parse('2hr');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(7200000);
    });

    it('parses "day" as alias for "d"', () => {
      const result = createDurationSchema()._parse('1day');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(86400000);
    });

    it('parses "wk" as alias for "w"', () => {
      const result = createDurationSchema()._parse('1wk');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(604800000);
    });

    it('parses "yr" as alias for "y"', () => {
      const result = createDurationSchema()._parse('1yr');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(31536000000);
    });
  });

  // ===========================================================================
  // Output unit
  // ===========================================================================
  describe('output unit', () => {
    it('outputs in seconds', () => {
      const schema = createDurationSchema({ unit: 's' });
      const result = schema._parse('30s');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(30);
    });

    it('outputs in minutes', () => {
      const schema = createDurationSchema({ unit: 'm' });
      const result = schema._parse('1h');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(60);
    });

    it('outputs in hours', () => {
      const schema = createDurationSchema({ unit: 'h' });
      const result = schema._parse('1d');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(24);
    });
  });

  // ===========================================================================
  // Range constraints
  // ===========================================================================
  describe('range constraints', () => {
    it('rejects values below min', () => {
      const schema = createDurationSchema({ min: 5000 });
      expect(schema._parse('1s').success).toBe(false);
    });

    it('rejects values above max', () => {
      const schema = createDurationSchema({ max: 60000 });
      expect(schema._parse('2m').success).toBe(false);
    });

    it('accepts values within range', () => {
      const schema = createDurationSchema({ min: 1000, max: 60000 });
      expect(schema._parse('30s').success).toBe(true);
    });

    it('accepts value at exact min boundary', () => {
      const schema = createDurationSchema({ min: 10000 });
      expect(schema._parse('10s').success).toBe(true);
    });

    it('accepts value at exact max boundary', () => {
      const schema = createDurationSchema({ max: 60000 });
      expect(schema._parse('1m').success).toBe(true);
    });
  });

  // ===========================================================================
  // Negative durations
  // ===========================================================================
  describe('negative durations', () => {
    it('rejects negative durations by default', () => {
      expect(createDurationSchema()._parse('-5m').success).toBe(false);
    });

    it('accepts negative when allowNegative is true', () => {
      const schema = createDurationSchema({ allowNegative: true });
      const result = schema._parse('-5m');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(-300000);
    });

    it('accepts negative seconds', () => {
      const schema = createDurationSchema({ allowNegative: true });
      const result = schema._parse('-30s');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(-30000);
    });

    it('accepts zero duration', () => {
      const schema = createDurationSchema();
      const result = schema._parse('0s');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(0);
    });
  });

  // ===========================================================================
  // Float durations
  // ===========================================================================
  describe('float durations', () => {
    it('parses "0.5s"', () => {
      const result = createDurationSchema()._parse('0.5s');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(500);
    });

    it('parses "1.5m"', () => {
      const result = createDurationSchema()._parse('1.5m');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(90000);
    });
  });

  // ===========================================================================
  // Invalid inputs
  // ===========================================================================
  describe('invalid inputs', () => {
    it('rejects empty string', () => {
      expect(createDurationSchema()._parse('').success).toBe(false);
    });

    it('rejects plain numbers without units', () => {
      expect(createDurationSchema()._parse('42').success).toBe(false);
    });

    it('rejects invalid units', () => {
      expect(createDurationSchema()._parse('5lightyears').success).toBe(false);
    });

    it('rejects "1h30m" (compound)', () => {
      expect(createDurationSchema()._parse('1h30m').success).toBe(false);
    });

    it('returns error message for empty string', () => {
      const result = createDurationSchema()._parse('');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain('empty');
    });

    it('returns error message for invalid format', () => {
      const result = createDurationSchema()._parse('42');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain('Invalid duration format');
    });

    it('returns error message for invalid unit', () => {
      const result = createDurationSchema()._parse('5lightyears');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain('Invalid duration format');
    });
  });

  // ===========================================================================
  // Edge cases
  // ===========================================================================
  describe('edge cases', () => {
    it('handles very large durations', () => {
      const result = createDurationSchema()._parse('365d');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(31536000000);
    });

    it('handles very small durations', () => {
      const result = createDurationSchema()._parse('1ms');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(1);
    });

    it('handles 0s', () => {
      const result = createDurationSchema()._parse('0s');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(0);
    });

    it('handles leading/trailing whitespace', () => {
      const result = createDurationSchema()._parse('  30s  ');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(30000);
    });
  });
});
