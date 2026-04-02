// =============================================================================
// Integration Tests — Schema Validation End-to-End
// Tests: defineEnv with various schema types, required fields, defaults,
//        type inference (PORT is number, DEBUG is boolean).
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { defineEnv, tryDefineEnv, t, validate } from '../../src/schema/index.js';
import type { SchemaBuilder } from '../../src/schema/builder.js';
import { mockEnv } from '../helpers/mock-env.js';

describe('integration: schema validation', () => {
  let envMock: ReturnType<typeof mockEnv> | undefined;

  afterEach(() => {
    envMock?.restore();
  });

  // ---------------------------------------------------------------------------
  // defineEnv with various schema types
  // ---------------------------------------------------------------------------
  describe('defineEnv with various schema types', () => {
    it('validates string type', () => {
      const env = defineEnv(
        {
          APP_NAME: t.string(),
        },
        { APP_NAME: 'my-app' },
      );

      expect(env.APP_NAME).toBe('my-app');
      expect(typeof env.APP_NAME).toBe('string');
    });

    it('validates number type', () => {
      const env = defineEnv(
        {
          PORT: t.number(),
        },
        { PORT: '3000' },
      );

      expect(env.PORT).toBe(3000);
      expect(typeof env.PORT).toBe('number');
    });

    it('validates boolean type', () => {
      const env = defineEnv(
        {
          DEBUG: t.boolean(),
        },
        { DEBUG: 'true' },
      );

      expect(env.DEBUG).toBe(true);
      expect(typeof env.DEBUG).toBe('boolean');
    });

    it('validates enum type', () => {
      const env = defineEnv(
        {
          NODE_ENV: t.enum(['development', 'production', 'test'] as const),
        },
        { NODE_ENV: 'production' },
      );

      expect(env.NODE_ENV).toBe('production');
    });

    it('validates array type', () => {
      const env = defineEnv(
        {
          ALLOWED_ORIGINS: t.array().separator(','),
        },
        { ALLOWED_ORIGINS: 'http://a.com,http://b.com,http://c.com' },
      );

      expect(env.ALLOWED_ORIGINS).toEqual(['http://a.com', 'http://b.com', 'http://c.com']);
    });

    it('validates json type', () => {
      const env = defineEnv(
        {
          CONFIG: t.json(),
        },
        { CONFIG: '{"key":"value","num":42}' },
      );

      expect(env.CONFIG).toEqual({ key: 'value', num: 42 });
    });

    it('validates url type', () => {
      const env = defineEnv(
        {
          DATABASE_URL: t.url(),
        },
        { DATABASE_URL: 'https://example.com/db' },
      );

      // URL schema returns a URL object
      expect(env.DATABASE_URL).toBeInstanceOf(URL);
      expect(env.DATABASE_URL.href).toBe('https://example.com/db');
    });

    it('validates email type', () => {
      const env = defineEnv(
        {
          ADMIN_EMAIL: t.email(),
        },
        { ADMIN_EMAIL: 'admin@example.com' },
      );

      expect(env.ADMIN_EMAIL).toBe('admin@example.com');
    });

    it('validates port type', () => {
      const env = defineEnv(
        {
          PORT: t.port(),
        },
        { PORT: '8080' },
      );

      expect(env.PORT).toBe(8080);
    });

    it('validates uuid type', () => {
      const env = defineEnv(
        {
          REQUEST_ID: t.uuid(),
        },
        { REQUEST_ID: '550e8400-e29b-41d4-a716-446655440000' },
      );

      expect(env.REQUEST_ID).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('validates date type', () => {
      const env = defineEnv(
        {
          START_DATE: t.date(),
        },
        { START_DATE: '2024-01-15' },
      );

      expect(env.START_DATE).toBeInstanceOf(Date);
    });
  });

  // ---------------------------------------------------------------------------
  // Required fields fail when missing
  // ---------------------------------------------------------------------------
  describe('required fields', () => {
    it('throws when a required string field is missing', () => {
      expect(() => {
        defineEnv(
          {
            DATABASE_URL: t.string().required(),
          },
          {},
        );
      }).toThrow('Environment validation failed');
    });

    it('throws when a required number field is missing', () => {
      expect(() => {
        defineEnv(
          {
            PORT: t.number().required(),
          },
          {},
        );
      }).toThrow('Environment validation failed');
    });

    it('throws when a required enum field is missing', () => {
      expect(() => {
        defineEnv(
          {
            NODE_ENV: t.enum(['development', 'production', 'test'] as const).required(),
          },
          {},
        );
      }).toThrow('Environment validation failed');
    });

    it('error message includes the field name', () => {
      try {
        defineEnv(
          {
            API_KEY: t.string().required(),
          },
          {},
        );
        expect.fail('Should have thrown');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : '';
        expect(message).toContain('API_KEY');
        expect(message).toContain('missing');
      }
    });

    it('tryDefineEnv returns valid:false instead of throwing', () => {
      const result = tryDefineEnv(
        {
          REQUIRED_FIELD: t.string().required(),
        },
        {},
      );

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]?.field).toBe('REQUIRED_FIELD');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Defaults are applied
  // ---------------------------------------------------------------------------
  describe('defaults', () => {
    it('applies string default', () => {
      const env = defineEnv(
        {
          HOST: t.string().default('localhost'),
        },
        {},
      );

      expect(env.HOST).toBe('localhost');
    });

    it('applies number default', () => {
      const env = defineEnv(
        {
          PORT: t.number().default(3000),
        },
        {},
      );

      expect(env.PORT).toBe(3000);
      expect(typeof env.PORT).toBe('number');
    });

    it('applies boolean default', () => {
      const env = defineEnv(
        {
          DEBUG: t.boolean().default(false),
        },
        {},
      );

      expect(env.DEBUG).toBe(false);
      expect(typeof env.DEBUG).toBe('boolean');
    });

    it('does not override an explicitly provided value', () => {
      const env = defineEnv(
        {
          PORT: t.number().default(3000),
        },
        { PORT: '8080' },
      );

      expect(env.PORT).toBe(8080);
    });

    it('applies enum default', () => {
      const env = defineEnv(
        {
          NODE_ENV: t.enum(['development', 'production', 'test'] as const).default('development'),
        },
        {},
      );

      expect(env.NODE_ENV).toBe('development');
    });
  });

  // ---------------------------------------------------------------------------
  // Type inference works (PORT is number, DEBUG is boolean)
  // ---------------------------------------------------------------------------
  describe('type inference', () => {
    it('PORT is parsed as number, not string', () => {
      const env = defineEnv(
        {
          PORT: t.number(),
        },
        { PORT: '443' },
      );

      expect(env.PORT).toBe(443);
      expect(typeof env.PORT).toBe('number');
    });

    it('DEBUG is parsed as boolean, not string', () => {
      const env = defineEnv(
        {
          DEBUG: t.boolean(),
        },
        { DEBUG: 'false' },
      );

      expect(env.DEBUG).toBe(false);
      expect(typeof env.DEBUG).toBe('boolean');
    });

    it('falsy values are correctly parsed as boolean false', () => {
      for (const val of ['false', '0', 'no', 'off', '']) {
        const env = defineEnv(
          {
            DEBUG: t.boolean(),
          },
          { DEBUG: val },
        );

        expect(env.DEBUG).toBe(false);
      }
    });

    it('truthy values are correctly parsed as boolean true', () => {
      for (const val of ['true', '1', 'yes', 'on']) {
        const env = defineEnv(
          {
            DEBUG: t.boolean(),
          },
          { DEBUG: val },
        );

        expect(env.DEBUG).toBe(true);
      }
    });

    it('invalid number string causes validation error', () => {
      expect(() => {
        defineEnv(
          {
            PORT: t.number(),
          },
          { PORT: 'not-a-number' },
        );
      }).toThrow('Environment validation failed');
    });

    it('invalid boolean string causes validation error', () => {
      expect(() => {
        defineEnv(
          {
            DEBUG: t.boolean(),
          },
          { DEBUG: 'invalid' },
        );
      }).toThrow('Environment validation failed');
    });

    it('invalid enum value causes validation error', () => {
      expect(() => {
        defineEnv(
          {
            NODE_ENV: t.enum(['development', 'production', 'test'] as const),
          },
          { NODE_ENV: 'staging' },
        );
      }).toThrow('Environment validation failed');
    });
  });

  // ---------------------------------------------------------------------------
  // Optional fields
  // ---------------------------------------------------------------------------
  describe('optional fields', () => {
    it('returns undefined for optional fields that are missing', () => {
      const env = defineEnv(
        {
          OPTIONAL_VAR: t.string().optional(),
        },
        {},
      );

      expect(env.OPTIONAL_VAR).toBeUndefined();
    });

    it('returns the value when optional field is present', () => {
      const env = defineEnv(
        {
          OPTIONAL_VAR: t.string().optional(),
        },
        { OPTIONAL_VAR: 'present' },
      );

      expect(env.OPTIONAL_VAR).toBe('present');
    });
  });

  // ---------------------------------------------------------------------------
  // Complex schema with multiple types
  // ---------------------------------------------------------------------------
  describe('complex schema', () => {
    it('validates a full realistic schema', () => {
      const env = defineEnv(
        {
          PORT: t.number().port().default(3000),
          HOST: t.string().default('0.0.0.0'),
          NODE_ENV: t.enum(['development', 'staging', 'production'] as const),
          DEBUG: t.boolean().default(false),
          APP_URL: t.url().default('https://example.com'),
          LOG_LEVEL: t.enum(['debug', 'info', 'warn', 'error'] as const).default('info'),
        },
        {
          NODE_ENV: 'production',
          APP_URL: 'https://myapp.example.com',
        },
      );

      expect(env.PORT).toBe(3000);
      expect(env.HOST).toBe('0.0.0.0');
      expect(env.NODE_ENV).toBe('production');
      expect(env.DEBUG).toBe(false);
      expect(env.APP_URL).toBeInstanceOf(URL);
      // URL constructor normalizes to include trailing slash for bare hostnames
      expect(env.APP_URL.href).toBe('https://myapp.example.com/');
      expect(env.LOG_LEVEL).toBe('info');
    });

    it('fails when multiple required fields are missing', () => {
      const result = tryDefineEnv(
        {
          REQUIRED_A: t.string().required(),
          REQUIRED_B: t.number().required(),
          REQUIRED_C: t.boolean().required(),
        },
        {},
      );

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.length).toBe(3);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // validate() directly with raw env vars
  // ---------------------------------------------------------------------------
  describe('validate() engine', () => {
    it('returns valid:true for correct values', () => {
      const result = validate(
        { PORT: '3000', DEBUG: 'true' },
        {
          PORT: t.number(),
          DEBUG: t.boolean(),
        },
      );

      expect(result.valid).toBe(true);
      expect(result.values.PORT).toBe(3000);
      expect(result.values.DEBUG).toBe(true);
    });

    it('returns errors for invalid values', () => {
      const result = validate({ PORT: 'not_a_number' }, { PORT: t.number().required() });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('reports unknown variables in strict mode', () => {
      const result = validate(
        { PORT: '3000', EXTRA_VAR: 'hello' },
        { PORT: t.number() },
        { strict: true },
      );

      expect(result.valid).toBe(true);
      expect(result.unknown).toContain('EXTRA_VAR');
    });
  });
});
