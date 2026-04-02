import { describe, it, expect } from 'vitest';
import { StringSchemaBuilder, createStringSchema } from '../../../../src/schema/validators/string.js';

describe('StringSchemaBuilder', () => {
  // ===========================================================================
  // email
  // ===========================================================================
  describe('email', () => {
    it('accepts a valid email', () => {
      const schema = createStringSchema().email();
      expect(schema._parse('user@example.com').success).toBe(true);
    });

    it('rejects email without @', () => {
      const schema = createStringSchema().email();
      expect(schema._parse('userexample.com').success).toBe(false);
    });

    it('rejects email without domain', () => {
      const schema = createStringSchema().email();
      expect(schema._parse('user@').success).toBe(false);
    });

    it('rejects empty string', () => {
      const schema = createStringSchema().email();
      expect(schema._parse('').success).toBe(false);
    });
  });

  // ===========================================================================
  // url
  // ===========================================================================
  describe('url', () => {
    it('accepts http URL', () => {
      const schema = createStringSchema().url();
      expect(schema._parse('http://example.com').success).toBe(true);
    });

    it('accepts https URL', () => {
      const schema = createStringSchema().url();
      expect(schema._parse('https://example.com').success).toBe(true);
    });

    it('accepts URL with path and query', () => {
      const schema = createStringSchema().url();
      expect(schema._parse('https://example.com/path?query=value').success).toBe(true);
    });

    it('rejects invalid URL', () => {
      const schema = createStringSchema().url();
      expect(schema._parse('not-a-url').success).toBe(false);
    });

    it('rejects ftp URL with default protocols', () => {
      const schema = createStringSchema().url();
      expect(schema._parse('ftp://example.com').success).toBe(false);
    });

    it('accepts ftp URL when explicitly allowed', () => {
      const schema = createStringSchema().url({ protocols: ['http', 'https', 'ftp'] });
      expect(schema._parse('ftp://example.com').success).toBe(true);
    });
  });

  // ===========================================================================
  // uuid
  // ===========================================================================
  describe('uuid', () => {
    it('accepts UUID v4', () => {
      const schema = createStringSchema().uuid();
      expect(schema._parse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
    });

    it('accepts UUID when version is specified', () => {
      const schema = createStringSchema().uuid(4);
      expect(schema._parse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      const schema = createStringSchema().uuid();
      expect(schema._parse('not-a-uuid').success).toBe(false);
    });

    it('rejects UUID with wrong version digit', () => {
      const schema = createStringSchema().uuid(4);
      expect(schema._parse('550e8400-e29b-51d4-a716-446655440000').success).toBe(false);
    });

    it('rejects empty string', () => {
      const schema = createStringSchema().uuid();
      expect(schema._parse('').success).toBe(false);
    });
  });

  // ===========================================================================
  // hex
  // ===========================================================================
  describe('hex', () => {
    it('accepts hex string', () => {
      const schema = createStringSchema().hex();
      expect(schema._parse('deadbeef').success).toBe(true);
    });

    it('accepts hex string with 0x prefix', () => {
      const schema = createStringSchema().hex();
      expect(schema._parse('0xdeadbeef').success).toBe(true);
    });

    it('rejects non-hex string', () => {
      const schema = createStringSchema().hex();
      expect(schema._parse('ghijkl').success).toBe(false);
    });

    it('accepts empty hex string', () => {
      // The regex /^(0x)?[0-9a-fA-F]+$/ matches '' because + means one or more
      // Actually, + means one or more, so '' should fail
      const schema = createStringSchema().hex();
      expect(schema._parse('').success).toBe(false);
    });
  });

  // ===========================================================================
  // base64
  // ===========================================================================
  describe('base64', () => {
    it('accepts valid base64', () => {
      const schema = createStringSchema().base64();
      expect(schema._parse('SGVsbG8=').success).toBe(true);
    });

    it('accepts longer base64', () => {
      const schema = createStringSchema().base64();
      expect(schema._parse('SGVsbG8gdGhpcykuIGV4cmVudA==').success).toBe(true);
    });

    it('rejects invalid base64', () => {
      const schema = createStringSchema().base64();
      expect(schema._parse('!!!invalid!!!').success).toBe(false);
    });

    it('rejects empty string', () => {
      const schema = createStringSchema().base64();
      expect(schema._parse('').success).toBe(false);
    });
  });

  // ===========================================================================
  // minLength
  // ===========================================================================
  describe('minLength', () => {
    it('accepts string meeting minimum length', () => {
      const schema = createStringSchema().minLength(5);
      expect(schema._parse('hello').success).toBe(true);
    });

    it('rejects string shorter than minimum', () => {
      const schema = createStringSchema().minLength(5);
      expect(schema._parse('hi').success).toBe(false);
    });

    it('rejects empty string', () => {
      const schema = createStringSchema().minLength(1);
      expect(schema._parse('').success).toBe(false);
    });

    it('accepts exact length', () => {
      const schema = createStringSchema().minLength(3);
      expect(schema._parse('abc').success).toBe(true);
    });
  });

  // ===========================================================================
  // maxLength
  // ===========================================================================
  describe('maxLength', () => {
    it('accepts string within max length', () => {
      const schema = createStringSchema().maxLength(5);
      expect(schema._parse('hello').success).toBe(true);
    });

    it('rejects string exceeding max length', () => {
      const schema = createStringSchema().maxLength(3);
      expect(schema._parse('hello').success).toBe(false);
    });

    it('accepts empty string', () => {
      const schema = createStringSchema().maxLength(10);
      expect(schema._parse('').success).toBe(true);
    });
  });

  // ===========================================================================
  // pattern
  // ===========================================================================
  describe('pattern', () => {
    it('accepts string matching regex', () => {
      const schema = createStringSchema().pattern(/^[A-Z]+$/);
      expect(schema._parse('HELLO').success).toBe(true);
    });

    it('rejects string not matching regex', () => {
      const schema = createStringSchema().pattern(/^[A-Z]+$/);
      expect(schema._parse('hello').success).toBe(false);
    });

    it('works with complex patterns', () => {
      const schema = createStringSchema().pattern(/^\d{3}-\d{4}$/);
      expect(schema._parse('123-4567').success).toBe(true);
      expect(schema._parse('abc-defg').success).toBe(false);
    });
  });

  // ===========================================================================
  // startsWith
  // ===========================================================================
  describe('startsWith', () => {
    it('accepts string starting with prefix', () => {
      const schema = createStringSchema().startsWith('Bearer ');
      expect(schema._parse('Bearer abc123').success).toBe(true);
    });

    it('rejects string not starting with prefix', () => {
      const schema = createStringSchema().startsWith('Bearer ');
      expect(schema._parse('Token abc123').success).toBe(false);
    });
  });

  // ===========================================================================
  // endsWith
  // ===========================================================================
  describe('endsWith', () => {
    it('accepts string ending with suffix', () => {
      const schema = createStringSchema().endsWith('.json');
      expect(schema._parse('config.json').success).toBe(true);
    });

    it('rejects string not ending with suffix', () => {
      const schema = createStringSchema().endsWith('.json');
      expect(schema._parse('config.yaml').success).toBe(false);
    });
  });

  // ===========================================================================
  // nonempty
  // ===========================================================================
  describe('nonempty', () => {
    it('accepts non-empty string', () => {
      const schema = createStringSchema().nonempty();
      expect(schema._parse('hello').success).toBe(true);
    });

    it('rejects empty string', () => {
      const schema = createStringSchema().nonempty();
      expect(schema._parse('').success).toBe(false);
    });
  });

  // ===========================================================================
  // json
  // ===========================================================================
  describe('json', () => {
    it('accepts valid JSON string', () => {
      const schema = createStringSchema().json();
      expect(schema._parse('{"key":"value"}').success).toBe(true);
    });

    it('accepts JSON array', () => {
      const schema = createStringSchema().json();
      expect(schema._parse('[1,2,3]').success).toBe(true);
    });

    it('rejects invalid JSON', () => {
      const schema = createStringSchema().json();
      expect(schema._parse('not json').success).toBe(false);
    });

    it('rejects empty string', () => {
      const schema = createStringSchema().json();
      expect(schema._parse('').success).toBe(false);
    });
  });

  // ===========================================================================
  // oneOf / enum
  // ===========================================================================
  describe('oneOf / enum', () => {
    it('accepts one of the specified values', () => {
      const schema = createStringSchema().oneOf(['development', 'production', 'test'] as const);
      expect(schema._parse('development').success).toBe(true);
      expect(schema._parse('production').success).toBe(true);
      expect(schema._parse('test').success).toBe(true);
    });

    it('rejects value not in the list', () => {
      const schema = createStringSchema().oneOf(['development', 'production'] as const);
      expect(schema._parse('staging').success).toBe(false);
    });
  });

  // ===========================================================================
  // alphanumeric
  // ===========================================================================
  describe('alphanumeric', () => {
    it('accepts alphanumeric string', () => {
      const schema = createStringSchema().alphanumeric();
      expect(schema._parse('abc123XYZ').success).toBe(true);
    });

    it('rejects string with spaces', () => {
      const schema = createStringSchema().alphanumeric();
      expect(schema._parse('abc 123').success).toBe(false);
    });

    it('rejects string with special chars', () => {
      const schema = createStringSchema().alphanumeric();
      expect(schema._parse('abc!@#').success).toBe(false);
    });
  });

  // ===========================================================================
  // lowercase
  // ===========================================================================
  describe('lowercase', () => {
    it('accepts lowercase string', () => {
      const schema = createStringSchema().lowercase();
      expect(schema._parse('hello').success).toBe(true);
    });

    it('rejects string with uppercase (validator runs before transform)', () => {
      // lowercase() adds both a transform AND a validator.
      // The validator rejects non-lowercase input before the transform can run.
      const schema = createStringSchema().lowercase();
      expect(schema._parse('Hello').success).toBe(false);
    });

    it('rejects mixed case string', () => {
      const schema = createStringSchema().lowercase();
      const result = schema._parse('Hello World');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain('lowercase');
    });

    it('passes already-lowercase input through transform unchanged', () => {
      const schema = createStringSchema().lowercase();
      const result = schema._parse('hello world');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe('hello world');
    });
  });

  // ===========================================================================
  // uppercase
  // ===========================================================================
  describe('uppercase', () => {
    it('accepts uppercase string', () => {
      const schema = createStringSchema().uppercase();
      expect(schema._parse('HELLO').success).toBe(true);
    });

    it('rejects string with lowercase (validator runs before transform)', () => {
      // uppercase() adds both a transform AND a validator.
      // The validator rejects non-uppercase input before the transform can run.
      const schema = createStringSchema().uppercase();
      expect(schema._parse('hello').success).toBe(false);
    });

    it('rejects mixed case string', () => {
      const schema = createStringSchema().uppercase();
      const result = schema._parse('hello world');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain('uppercase');
    });

    it('passes already-uppercase input through transform unchanged', () => {
      const schema = createStringSchema().uppercase();
      const result = schema._parse('HELLO WORLD');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe('HELLO WORLD');
    });
  });

  // ===========================================================================
  // trim
  // ===========================================================================
  describe('trim', () => {
    it('trims whitespace', () => {
      const schema = createStringSchema().trim();
      const result = schema._parse('  hello  ');
      expect(result.success).toBe(true);
      if (result.success) expect(result.value).toBe('hello');
    });
  });

  // ===========================================================================
  // length (exact)
  // ===========================================================================
  describe('length', () => {
    it('accepts string with exact length', () => {
      const schema = createStringSchema().length(5);
      expect(schema._parse('hello').success).toBe(true);
    });

    it('rejects string with wrong length', () => {
      const schema = createStringSchema().length(5);
      expect(schema._parse('hi').success).toBe(false);
      expect(schema._parse('helloo').success).toBe(false);
    });
  });

  // ===========================================================================
  // includes
  // ===========================================================================
  describe('includes', () => {
    it('accepts string containing substring', () => {
      const schema = createStringSchema().includes('world');
      expect(schema._parse('hello world').success).toBe(true);
    });

    it('rejects string not containing substring', () => {
      const schema = createStringSchema().includes('world');
      expect(schema._parse('hello').success).toBe(false);
    });
  });
});
