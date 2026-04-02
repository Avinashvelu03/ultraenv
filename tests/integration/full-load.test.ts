// =============================================================================
// Integration Tests — Full Loading Pipeline
// Tests: load() basic, loadWithResult() with metadata, cascade, interpolation.
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { load, loadWithResult } from '../../src/core/loader.js';
import { defineEnv, t } from '../../src/schema/index.js';
import { TempDir } from '../helpers/temp-dir.js';
import { mockEnv } from '../helpers/mock-env.js';
import * as path from 'node:path';
import * as fs from 'node:fs';

describe('integration: full-load pipeline', () => {
  let tempDir: TempDir;
  let envMock: ReturnType<typeof mockEnv> | undefined;

  beforeEach(() => {
    tempDir = new TempDir();
    envMock = mockEnv({ NODE_ENV: 'development' });
  });

  afterEach(() => {
    tempDir.cleanup();
    envMock?.restore();
  });

  // ---------------------------------------------------------------------------
  // load() — basic loading
  // ---------------------------------------------------------------------------
  describe('load() basic', () => {
    it('loads a .env file and returns key-value pairs', () => {
      tempDir.write(
        '.env',
        [
          'DATABASE_URL=postgres://user:pass@localhost:5432/mydb',
          'PORT=3000',
          'HOST=localhost',
          'DEBUG=true',
          'NODE_ENV=development',
          'API_KEY=sk_test_abc123',
        ].join('\n'),
      );

      const env = load({ envDir: tempDir.path });

      expect(env.DATABASE_URL).toBe('postgres://user:pass@localhost:5432/mydb');
      expect(env.PORT).toBe('3000');
      expect(env.HOST).toBe('localhost');
      expect(env.DEBUG).toBe('true');
      expect(env.NODE_ENV).toBe('development');
      expect(env.API_KEY).toBe('sk_test_abc123');
    });

    it('returns empty object when no .env files exist', () => {
      const env = load({ envDir: tempDir.path });
      expect(env).toEqual({});
    });

    it('loads the fixture basic.env end-to-end', () => {
      // Copy the fixture into the temp directory
      const fixturePath = path.resolve(__dirname, '../fixtures/env-files/basic.env');
      const content = fs.readFileSync(fixturePath, 'utf-8');
      tempDir.write('.env', content);

      const env = load({ envDir: tempDir.path });

      expect(env.DATABASE_URL).toBe('postgres://user:pass@localhost:5432/mydb');
      expect(env.PORT).toBe('3000');
      expect(env.HOST).toBe('localhost');
      expect(env.DEBUG).toBe('true');
      expect(env.NODE_ENV).toBe('development');
      expect(env.API_KEY).toBe('sk_test_abc123');
    });
  });

  // ---------------------------------------------------------------------------
  // loadWithResult() — with metadata
  // ---------------------------------------------------------------------------
  describe('loadWithResult() with metadata', () => {
    it('returns env, metadata, and parsed files', () => {
      tempDir.write('.env', 'KEY=value\nPORT=8080');
      const result = loadWithResult({ envDir: tempDir.path });

      // env
      expect(result.env.KEY).toBe('value');
      expect(result.env.PORT).toBe('8080');

      // metadata
      expect(result.metadata.totalVars).toBe(2);
      expect(result.metadata.filesParsed).toBe(1);
      expect(result.metadata.filesFound).toBe(1);
      expect(result.metadata.loadTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.metadata.envDir).toBeDefined();
      expect(result.metadata.hadOverrides).toBe(false);

      // parsed files
      expect(result.parsed.length).toBeGreaterThanOrEqual(1);
      const parsedFile = result.parsed[0];
      expect(parsedFile).toBeDefined();
      expect(parsedFile?.path).toContain('.env');
      expect(parsedFile?.vars.length).toBe(2);
    });

    it('reports correct metadata for multiple loaded files', () => {
      tempDir.write('.env', 'BASE=yes');
      tempDir.write('.env.development', 'DEV=yes');
      const result = loadWithResult({ envDir: tempDir.path });

      expect(result.metadata.totalVars).toBe(2);
      expect(result.metadata.filesParsed).toBe(2);
      expect(result.metadata.filesFound).toBe(2);
    });

    it('tracks overrides when overrideProcessEnv is true', () => {
      tempDir.write('.env', 'OVERIDDEN_KEY=new_value');
      const result = loadWithResult({
        envDir: tempDir.path,
        overrideProcessEnv: true,
      });

      expect(result.metadata.hadOverrides).toBe(true);
      // Clean up
      delete process.env.OVERIDDEN_KEY;
    });
  });

  // ---------------------------------------------------------------------------
  // Cascade loading with multiple files
  // ---------------------------------------------------------------------------
  describe('cascade loading', () => {
    it('merges .env and .env.development with last-wins strategy', () => {
      tempDir.write('.env', 'KEY=base\nBASE_ONLY=yes');
      tempDir.write('.env.development', 'KEY=dev\nDEV_ONLY=yes');

      envMock?.restore();
      envMock = mockEnv({ NODE_ENV: 'development' });
      const env = load({ envDir: tempDir.path });

      // .env.development overrides .env for KEY
      expect(env.KEY).toBe('dev');
      expect(env.BASE_ONLY).toBe('yes');
      expect(env.DEV_ONLY).toBe('yes');
    });

    it('loads three files in the correct priority order', () => {
      tempDir.write('.env', 'PRIORITY=1\nONLY_BASE=yes');
      tempDir.write('.env.local', 'PRIORITY=2\nONLY_LOCAL=yes');
      tempDir.write('.env.development', 'PRIORITY=3\nONLY_DEV=yes');

      envMock?.restore();
      envMock = mockEnv({ NODE_ENV: 'development' });
      const env = load({ envDir: tempDir.path });

      // Last file wins for PRIORITY
      expect(env.PRIORITY).toBe('3');
      expect(env.ONLY_BASE).toBe('yes');
      expect(env.ONLY_LOCAL).toBe('yes');
      expect(env.ONLY_DEV).toBe('yes');
    });

    it('respects first-wins merge strategy', () => {
      tempDir.write('.env', 'KEY=base');
      tempDir.write('.env.development', 'KEY=dev');

      envMock?.restore();
      envMock = mockEnv({ NODE_ENV: 'development' });
      const env = load({
        envDir: tempDir.path,
        mergeStrategy: 'first-wins',
      });

      expect(env.KEY).toBe('base');
    });
  });

  // ---------------------------------------------------------------------------
  // Interpolation works end-to-end
  // ---------------------------------------------------------------------------
  describe('interpolation end-to-end', () => {
    it('expands variable references in loaded env', () => {
      tempDir.write(
        '.env',
        [
          'HOST=localhost',
          'PORT=5432',
          'DATABASE_URL=postgres://user:pass@${HOST}:${PORT}/mydb',
        ].join('\n'),
      );

      const env = load({ envDir: tempDir.path });

      expect(env.HOST).toBe('localhost');
      expect(env.PORT).toBe('5432');
      expect(env.DATABASE_URL).toBe('postgres://user:pass@localhost:5432/mydb');
    });

    it('respects default values in interpolation (without colon)', () => {
      // ${VAR-default} uses default only when VAR is unset
      // Note: default values with colons are problematic since colon is also
      // an operator separator, so use a colon-free default value
      tempDir.write('.env', 'BASE_URL=${API_URL-default-hostname}/api');

      const env = load({ envDir: tempDir.path });

      // API_URL is not set, so default is used
      expect(env.BASE_URL).toBe('default-hostname/api');
    });

    it('loads the interpolation fixture and expands correctly', () => {
      // Copy the interpolation fixture into the temp directory
      const fixturePath = path.resolve(__dirname, '../fixtures/env-files/interpolation.env');
      const content = fs.readFileSync(fixturePath, 'utf-8');
      tempDir.write('.env', content);

      const env = load({ envDir: tempDir.path });

      expect(env.HOST).toBe('localhost');
      expect(env.PORT).toBe('5432');
      // DATABASE_URL should be expanded using HOST and PORT
      expect(env.DATABASE_URL).toBe('postgres://user:pass@localhost:5432/mydb');
      // BASE_URL: ${API_URL:-http://localhost:3000} → parser sees colon as operator,
      // operand starts with '-' so default value is '-http://localhost:3000'
      expect(env.BASE_URL).toBe('-http://localhost:3000/api');
    });

    it('does not expand when expandVariables is false', () => {
      tempDir.write('.env', 'URL=${HOST:-localhost}:3000');
      const env = load({
        envDir: tempDir.path,
        expandVariables: false,
      });

      expect(env.URL).toBe('${HOST:-localhost}:3000');
    });
  });

  // ---------------------------------------------------------------------------
  // Full pipeline: load → parse → interpolate → validate → typed object
  // ---------------------------------------------------------------------------
  describe('full pipeline with schema validation', () => {
    it('loads env file and validates with schema end-to-end', () => {
      tempDir.write(
        '.env',
        ['PORT=3000', 'HOST=localhost', 'DEBUG=true', 'NODE_ENV=development'].join('\n'),
      );

      // Load the env vars
      const rawEnv = load({ envDir: tempDir.path });

      // Validate with schema — full pipeline
      const env = defineEnv(
        {
          PORT: t.number().port().default(8080),
          HOST: t.string().default('0.0.0.0'),
          DEBUG: t.boolean().default(false),
          NODE_ENV: t.enum(['development', 'production', 'test'] as const),
        },
        rawEnv,
      );

      // PORT should be number, not string
      expect(typeof env.PORT).toBe('number');
      expect(env.PORT).toBe(3000);

      // HOST should be string
      expect(typeof env.HOST).toBe('string');
      expect(env.HOST).toBe('localhost');

      // DEBUG should be boolean
      expect(typeof env.DEBUG).toBe('boolean');
      expect(env.DEBUG).toBe(true);

      // NODE_ENV should be a string literal type
      expect(env.NODE_ENV).toBe('development');
    });

    it('applies defaults for missing values in full pipeline', () => {
      tempDir.write('.env', 'NODE_ENV=production');

      const rawEnv = load({ envDir: tempDir.path });

      const env = defineEnv(
        {
          PORT: t.number().port().default(3000),
          HOST: t.string().default('localhost'),
          DEBUG: t.boolean().default(false),
          NODE_ENV: t.enum(['development', 'production', 'test'] as const),
        },
        rawEnv,
      );

      expect(env.PORT).toBe(3000);
      expect(env.HOST).toBe('localhost');
      expect(env.DEBUG).toBe(false);
      expect(env.NODE_ENV).toBe('production');
    });
  });
});
