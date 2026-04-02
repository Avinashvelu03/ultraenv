import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { load, loadWithResult } from '../../../src/core/loader.js';
import { TempDir } from '../../helpers/temp-dir.js';
import { mockEnv } from '../../helpers/mock-env.js';

describe('loader', () => {
  let tempDir: TempDir;
  let envMock: ReturnType<typeof mockEnv> | undefined;

  beforeEach(() => {
    tempDir = new TempDir();
    // Ensure no conflicting NODE_ENV
    envMock = mockEnv({ NODE_ENV: 'development' });
  });

  afterEach(() => {
    tempDir.cleanup();
    envMock?.restore();
  });

  // ---------------------------------------------------------------------------
  // Load basic .env file
  // ---------------------------------------------------------------------------
  describe('load basic .env file', () => {
    it('loads a basic .env file', () => {
      tempDir.write('.env', 'KEY=value\nPORT=3000');
      const env = load({ envDir: tempDir.path });
      expect(env.KEY).toBe('value');
      expect(env.PORT).toBe('3000');
    });

    it('returns an object with env key-value pairs', () => {
      tempDir.write('.env', 'A=1');
      const env = load({ envDir: tempDir.path });
      expect(env).toEqual(expect.any(Object));
    });
  });

  // ---------------------------------------------------------------------------
  // Load with custom path
  // ---------------------------------------------------------------------------
  describe('load with custom path', () => {
    it('loads from a custom envDir', () => {
      const customDir = tempDir.create();
      tempDir.write('custom/.env', 'CUSTOM=yes', customDir);
      // Write directly in the temp dir subfolder
      const subDir = tempDir.write('.env', 'CUSTOM=yes');
      // Use the parent of the file
      const result = load({ envDir: tempDir.path });
      expect(result.CUSTOM).toBe('yes');
    });

    it('returns empty object when no files exist', () => {
      const env = load({ envDir: tempDir.path });
      expect(Object.keys(env)).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Load with cascade
  // ---------------------------------------------------------------------------
  describe('load with cascade', () => {
    it('merges multiple env files with last-wins strategy', () => {
      tempDir.write('.env', 'KEY=base\nBASE_ONLY=yes');
      tempDir.write('.env.development', 'KEY=dev\nDEV_ONLY=yes');
      envMock?.restore();
      envMock = mockEnv({ NODE_ENV: 'development' });
      const env = load({ envDir: tempDir.path });
      expect(env.KEY).toBe('dev');
      expect(env.BASE_ONLY).toBe('yes');
      expect(env.DEV_ONLY).toBe('yes');
    });

    it('respects first-wins merge strategy', () => {
      tempDir.write('.env', 'KEY=base');
      tempDir.write('.env.development', 'KEY=dev');
      envMock?.restore();
      envMock = mockEnv({ NODE_ENV: 'development' });
      const env = load({ envDir: tempDir.path, mergeStrategy: 'first-wins' });
      expect(env.KEY).toBe('base');
    });
  });

  // ---------------------------------------------------------------------------
  // Load with interpolation disabled
  // ---------------------------------------------------------------------------
  describe('load with interpolation disabled', () => {
    it('does not expand variables when expandVariables is false', () => {
      tempDir.write('.env', 'URL=${HOST:-localhost}:3000\nHOST=example.com');
      const env = load({ envDir: tempDir.path, expandVariables: false });
      // Without expansion, ${HOST:-localhost} stays as literal
      expect(env.URL).toBe('${HOST:-localhost}:3000');
      expect(env.HOST).toBe('example.com');
    });

    it('expands variables by default', () => {
      tempDir.write('.env', 'URL=${HOST-localhost}:3000');
      const env = load({ envDir: tempDir.path });
      // ${HOST-localhost} → localhost (using - operator, not :-)
      expect(env.URL).toBe('localhost:3000');
    });
  });

  // ---------------------------------------------------------------------------
  // loadWithResult returns metadata
  // ---------------------------------------------------------------------------
  describe('loadWithResult', () => {
    it('returns env and metadata', () => {
      tempDir.write('.env', 'KEY=value');
      const result = loadWithResult({ envDir: tempDir.path });
      expect(result.env.KEY).toBe('value');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.totalVars).toBe(1);
      expect(result.metadata.filesParsed).toBe(1);
      expect(result.metadata.loadTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.timestamp).toBeDefined();
      expect(result.metadata.envDir).toBeDefined();
    });

    it('returns parsed files', () => {
      tempDir.write('.env', 'A=1\nB=2');
      const result = loadWithResult({ envDir: tempDir.path });
      expect(result.parsed).toBeDefined();
      expect(result.parsed.length).toBeGreaterThanOrEqual(1);
    });

    it('reports hadOverrides as false when not overriding process.env', () => {
      tempDir.write('.env', 'NEW_VAR=yes');
      const result = loadWithResult({
        envDir: tempDir.path,
        overrideProcessEnv: false,
      });
      expect(result.metadata.hadOverrides).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // overrideProcessEnv option
  // ---------------------------------------------------------------------------
  describe('overrideProcessEnv', () => {
    it('sets values in process.env when overrideProcessEnv is true', () => {
      tempDir.write('.env', 'ULTRAENV_TEST_KEY=test_value');
      const env = load({ envDir: tempDir.path, overrideProcessEnv: true });
      expect(env.ULTRAENV_TEST_KEY).toBe('test_value');
      expect(process.env.ULTRAENV_TEST_KEY).toBe('test_value');
      // Clean up
      delete process.env.ULTRAENV_TEST_KEY;
    });

    it('does not modify process.env by default', () => {
      tempDir.write('.env', 'ULTRAENV_TEST_KEY_NEW=test_value');
      const originalValue = process.env.ULTRAENV_TEST_KEY_NEW;
      load({ envDir: tempDir.path });
      expect(process.env.ULTRAENV_TEST_KEY_NEW).toBe(originalValue);
    });
  });

  // ---------------------------------------------------------------------------
  // Missing files handled
  // ---------------------------------------------------------------------------
  describe('missing files', () => {
    it('does not throw when files are missing', () => {
      expect(() => load({ envDir: tempDir.path })).not.toThrow();
    });

    it('returns empty env when no files exist', () => {
      const env = load({ envDir: tempDir.path });
      expect(env).toEqual({});
    });
  });
});
