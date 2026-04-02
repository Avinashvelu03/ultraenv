import { describe, it, expect } from 'vitest';
import { createBytesSchema } from '../../../../src/schema/validators/bytes.js';

describe('BytesSchemaBuilder', () => {
  // ---------------------------------------------------------------------------
  // Basic parsing
  // ---------------------------------------------------------------------------
  describe('basic parsing', () => {
    it('parses "1KB" → 1024 bytes', () => {
      const result = createBytesSchema()._parse('1KB');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(1024);
    });

    it('parses "5MB" → 5242880 bytes', () => {
      const result = createBytesSchema()._parse('5MB');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(5242880);
    });

    it('parses "2GB" → 2147483648 bytes', () => {
      const result = createBytesSchema()._parse('2GB');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(2147483648);
    });

    it('parses bytes without unit', () => {
      const result = createBytesSchema()._parse('100B');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(100);
    });

    it('parses plain bytes with "byte" unit', () => {
      const result = createBytesSchema()._parse('512byte');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(512);
    });

    it('parses "bytes" unit', () => {
      const result = createBytesSchema()._parse('1024bytes');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(1024);
    });

    it('parses TB', () => {
      const result = createBytesSchema()._parse('1TB');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(1024 ** 4);
    });
  });

  // ---------------------------------------------------------------------------
  // Case insensitive units
  // ---------------------------------------------------------------------------
  describe('case insensitive', () => {
    it('accepts lowercase units', () => {
      expect(createBytesSchema()._parse('1kb').success).toBe(true);
    });

    it('accepts uppercase units', () => {
      expect(createBytesSchema()._parse('1KB').success).toBe(true);
    });

    it('accepts mixed case units', () => {
      expect(createBytesSchema()._parse('1Mb').success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Decimal vs binary
  // ---------------------------------------------------------------------------
  describe('decimal vs binary', () => {
    it('uses binary (1024) by default', () => {
      const result = createBytesSchema()._parse('1KB');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(1024);
    });

    it('uses decimal (1000) when binary is false', () => {
      const schema = createBytesSchema({ binary: false });
      const result = schema._parse('1KB');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(1000);
    });
  });

  // ---------------------------------------------------------------------------
  // Output unit
  // ---------------------------------------------------------------------------
  describe('output unit', () => {
    it('outputs in KB', () => {
      const schema = createBytesSchema({ unit: 'kb' });
      const result = schema._parse('1MB');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(1024);
    });

    it('outputs in MB', () => {
      const schema = createBytesSchema({ unit: 'mb' });
      const result = schema._parse('1GB');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(1024);
    });

    it('outputs in GB', () => {
      const schema = createBytesSchema({ unit: 'gb' });
      const result = schema._parse('1TB');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe(1024);
    });
  });

  // ---------------------------------------------------------------------------
  // Range constraints
  // ---------------------------------------------------------------------------
  describe('range constraints', () => {
    it('rejects values below min', () => {
      const schema = createBytesSchema({ min: 2048 });
      expect(schema._parse('1KB').success).toBe(false);
    });

    it('rejects values above max', () => {
      const schema = createBytesSchema({ max: 1024 });
      expect(schema._parse('2KB').success).toBe(false);
    });

    it('accepts values within range', () => {
      const schema = createBytesSchema({ min: 512, max: 2048 });
      expect(schema._parse('1KB').success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Invalid inputs
  // ---------------------------------------------------------------------------
  describe('invalid inputs', () => {
    it('rejects empty string', () => {
      expect(createBytesSchema()._parse('').success).toBe(false);
    });

    it('rejects plain numbers', () => {
      expect(createBytesSchema()._parse('1024').success).toBe(false);
    });

    it('rejects unknown units', () => {
      expect(createBytesSchema()._parse('1XB').success).toBe(false);
    });

    it('rejects negative values', () => {
      expect(createBytesSchema()._parse('-1KB').success).toBe(false);
    });
  });
});
