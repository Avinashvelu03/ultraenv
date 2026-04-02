import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveCascade, mergeCascade, detectEnvironment } from '../../../src/core/cascade.js';
import { ConfigError } from '../../../src/core/errors.js';
import { parseEnvFile } from '../../../src/core/parser.js';
import { EnvFileType, type ParsedEnvFile } from '../../../src/core/types.js';
import { TempDir } from '../../helpers/temp-dir.js';
import { mockEnv } from '../../helpers/mock-env.js';

describe('cascade', () => {
  let tempDir: TempDir;
  let envMock: ReturnType<typeof mockEnv> | undefined;

  beforeEach(() => {
    tempDir = new TempDir();
  });

  afterEach(() => {
    tempDir.cleanup();
    envMock?.restore();
  });

  // ---------------------------------------------------------------------------
  // File priority order
  // ---------------------------------------------------------------------------
  describe('resolveCascade - file priority order', () => {
    it('returns files in priority order', () => {
      tempDir.write('.env', 'A=1');
      const result = resolveCascade({ envDir: tempDir.path, environment: 'development' });
      // In development: .env, .env.local, .env.development, .env.development.local = 4 files
      expect(result.files.length).toBeGreaterThanOrEqual(3);
      expect(result.files[0]!.fileType?.toString()).toContain('.env');
    });

    it('sorts by priority ascending', () => {
      const result = resolveCascade({ envDir: tempDir.path });
      const priorities = result.files.map((f) => f.priority);
      for (let i = 1; i < priorities.length; i++) {
        expect(priorities[i]!).toBeGreaterThanOrEqual(priorities[i - 1]!);
      }
    });

    it('marks existing files correctly', () => {
      tempDir.write('.env', 'A=1');
      const result = resolveCascade({ envDir: tempDir.path });
      const envFile = result.files.find((f) => f.fileType?.toString() === '.env');
      expect(envFile!.exists).toBe(true);
    });

    it('marks non-existing files as non-existent', () => {
      const result = resolveCascade({ envDir: tempDir.path });
      const envFile = result.files.find((f) => f.fileType?.toString() === '.env');
      expect(envFile!.exists).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Environment detection from NODE_ENV
  // ---------------------------------------------------------------------------
  describe('detectEnvironment', () => {
    it('detects from NODE_ENV', () => {
      expect(detectEnvironment({ NODE_ENV: 'production' })).toBe('production');
    });

    it('detects from APP_ENV', () => {
      expect(detectEnvironment({ APP_ENV: 'staging' })).toBe('staging');
    });

    it('falls back to development', () => {
      expect(detectEnvironment({})).toBe('development');
    });

    it('normalizes to lowercase and trims', () => {
      expect(detectEnvironment({ NODE_ENV: '  PRODUCTION  ' })).toBe('production');
    });

    it('checks ENVIRONMENT variable', () => {
      expect(detectEnvironment({ ENVIRONMENT: 'test' })).toBe('test');
    });

    it('checks ENV variable', () => {
      expect(detectEnvironment({ ENV: 'ci' })).toBe('ci');
    });

    it('checks STAGE variable', () => {
      expect(detectEnvironment({ STAGE: 'staging' })).toBe('staging');
    });

    it('checks ULTRAENV_ENV variable', () => {
      expect(detectEnvironment({ ULTRAENV_ENV: 'production' })).toBe('production');
    });

    it('prioritizes NODE_ENV over APP_ENV', () => {
      expect(detectEnvironment({ NODE_ENV: 'test', APP_ENV: 'production' })).toBe('test');
    });
  });

  // ---------------------------------------------------------------------------
  // .env.local excluded in test
  // ---------------------------------------------------------------------------
  describe('.env.local excluded in test', () => {
    it('excludes .env.local when environment is test', () => {
      tempDir.write('.env', 'A=1');
      tempDir.write('.env.local', 'B=2');
      tempDir.write('.env.test', 'C=3');
      const result = resolveCascade({
        envDir: tempDir.path,
        environment: 'test',
      });
      const fileNames = result.files.map((f) => f.fileType?.toString());
      expect(fileNames).not.toContain('.env.local');
      expect(fileNames).not.toContain('.env.test.local');
      expect(fileNames).toContain('.env');
      expect(fileNames).toContain('.env.test');
    });

    it('includes .env.local when environment is development', () => {
      tempDir.write('.env', 'A=1');
      tempDir.write('.env.local', 'B=2');
      tempDir.write('.env.development', 'C=3');
      tempDir.write('.env.development.local', 'D=4');
      const result = resolveCascade({
        envDir: tempDir.path,
        environment: 'development',
      });
      const fileNames = result.files.map((f) => f.fileType?.toString());
      expect(fileNames).toContain('.env.local');
      expect(fileNames).toContain('.env.development.local');
    });
  });

  // ---------------------------------------------------------------------------
  // Custom paths
  // ---------------------------------------------------------------------------
  describe('custom paths', () => {
    it('uses explicit paths when provided', () => {
      const fileA = tempDir.write('custom-a.env', 'A=1');
      const fileB = tempDir.write('custom-b.env', 'B=2');
      const result = resolveCascade({ paths: [fileA, fileB] });
      expect(result.files).toHaveLength(2);
      expect(result.files[0]!.absolutePath).toBe(fileA);
      expect(result.files[1]!.absolutePath).toBe(fileB);
    });

    it('custom paths take priority over auto-detection', () => {
      const customFile = tempDir.write('my.env', 'X=1');
      const result = resolveCascade({ paths: [customFile] });
      expect(result.files).toHaveLength(1);
      expect(result.files[0]!.absolutePath).toBe(customFile);
    });

    it('uses explicit EnvFileType array when files option is provided', () => {
      const result = resolveCascade({ files: [EnvFileType.EnvProduction] });
      expect(result.files).toHaveLength(1);
      expect(result.files[0]!.fileType).toBe(EnvFileType.EnvProduction);
    });
  });

  // ---------------------------------------------------------------------------
  // mergeCascade - merge strategies
  // ---------------------------------------------------------------------------
  describe('mergeCascade', () => {
    function makeParsedFile(vars: Record<string, string>, path: string): ParsedEnvFile {
      return {
        path,
        vars: Object.entries(vars).map(([key, value], i) => ({
          key,
          value,
          raw: value,
          source: path,
          lineNumber: i + 1,
          comment: '',
        })),
        exists: true,
      };
    }

    it('last-wins strategy: later files override earlier ones', () => {
      const file1 = makeParsedFile({ KEY: 'first' }, '/a.env');
      const file2 = makeParsedFile({ KEY: 'second' }, '/b.env');
      const cascade = resolveCascade({ mergeStrategy: 'last-wins' });
      const result = mergeCascade([file1, file2], cascade);
      expect(result.KEY).toBe('second');
    });

    it('first-wins strategy: earlier files take precedence', () => {
      const file1 = makeParsedFile({ KEY: 'first' }, '/a.env');
      const file2 = makeParsedFile({ KEY: 'second' }, '/b.env');
      const cascade = resolveCascade({ mergeStrategy: 'first-wins' });
      const result = mergeCascade([file1, file2], cascade);
      expect(result.KEY).toBe('first');
    });

    it('error-on-conflict strategy: throws on duplicate keys', () => {
      const file1 = makeParsedFile({ KEY: 'first' }, '/a.env');
      const file2 = makeParsedFile({ KEY: 'second' }, '/b.env');
      const cascade = resolveCascade({ mergeStrategy: 'error-on-conflict' });
      expect(() => mergeCascade([file1, file2], cascade)).toThrow(ConfigError);
    });

    it('error-on-conflict strategy: allows unique keys across files', () => {
      const file1 = makeParsedFile({ A: '1' }, '/a.env');
      const file2 = makeParsedFile({ B: '2' }, '/b.env');
      const cascade = resolveCascade({ mergeStrategy: 'error-on-conflict' });
      const result = mergeCascade([file1, file2], cascade);
      expect(result.A).toBe('1');
      expect(result.B).toBe('2');
    });

    it('tracks sources in the cascade', () => {
      const file1 = makeParsedFile({ A: '1' }, '/a.env');
      const file2 = makeParsedFile({ B: '2' }, '/b.env');
      const cascade = resolveCascade({ mergeStrategy: 'last-wins' });
      mergeCascade([file1, file2], cascade);
      expect(cascade.sources.A).toBe('/a.env');
      expect(cascade.sources.B).toBe('/b.env');
    });
  });

  // ---------------------------------------------------------------------------
  // Missing files handled gracefully
  // ---------------------------------------------------------------------------
  describe('missing files', () => {
    it('handles missing files in cascade gracefully', () => {
      const result = resolveCascade({ envDir: tempDir.path });
      expect(result.existingFiles).toHaveLength(0);
      expect(result.files.length).toBeGreaterThan(0);
    });

    it('returns empty merged result for no existing files', () => {
      const cascade = resolveCascade({ envDir: tempDir.path });
      const merged = mergeCascade([], cascade);
      expect(Object.keys(merged)).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Source tracking
  // ---------------------------------------------------------------------------
  describe('source tracking', () => {
    it('includes system env vars in sources when includeSystemEnv is true', () => {
      const result = resolveCascade({
        envDir: tempDir.path,
        includeSystemEnv: true,
        systemEnv: { PATH: '/usr/bin' },
      });
      expect(result.sources.PATH).toBe('system');
    });

    it('does not include system env when includeSystemEnv is false', () => {
      const result = resolveCascade({
        envDir: tempDir.path,
        includeSystemEnv: false,
        systemEnv: { PATH: '/usr/bin' },
      });
      expect(result.sources.PATH).toBeUndefined();
    });
  });
});
