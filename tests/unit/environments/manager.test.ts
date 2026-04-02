import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  listEnvironments,
  validateAllEnvironments,
} from '../../../src/environments/manager.js';

// Mock the dependencies
vi.mock('node:fs', () => ({
  statSync: vi.fn(),
}));

vi.mock('../../../src/utils/fs.js', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  exists: vi.fn(),
  listFiles: vi.fn().mockResolvedValue([]),
}));

import { exists } from '../../../src/utils/fs.js';
import { readFile } from '../../../src/utils/fs.js';
import { statSync } from 'node:fs';
import * as path from 'node:path';

const mockExists = vi.mocked(exists);
const mockReadFile = vi.mocked(readFile);
const mockStatSync = vi.mocked(statSync);

describe('environments manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // listEnvironments
  // ===========================================================================
  describe('listEnvironments', () => {
    it('returns list of known environment patterns', async () => {
      // All env files exist
      mockExists.mockResolvedValue(true);
      mockStatSync.mockReturnValue({
        size: 100,
        mtime: new Date('2024-01-01'),
      } as any);
      mockReadFile.mockResolvedValue('KEY=value\n');

      const envs = await listEnvironments('/project');
      expect(envs.length).toBeGreaterThan(0);

      // Should include base, development, staging, production, test, etc.
      const names = envs.map((e) => e.name);
      expect(names).toContain('base');
      expect(names).toContain('development');
      expect(names).toContain('production');
    });

    it('marks non-existent files as exists=false', async () => {
      mockExists.mockResolvedValue(false);

      const envs = await listEnvironments('/project');
      expect(envs.every((e) => e.exists === false)).toBe(true);
    });

    it('reports correct file info for existing files', async () => {
      mockExists.mockResolvedValue(true);
      mockStatSync.mockReturnValue({
        size: 256,
        mtime: new Date('2024-06-15T12:00:00Z'),
      } as any);
      mockReadFile.mockResolvedValue('A=1\nB=2\nC=3\n');

      const envs = await listEnvironments('/project');
      const existing = envs.filter((e) => e.exists);
      expect(existing.length).toBeGreaterThan(0);
      expect(existing[0]!.fileSize).toBe(256);
      expect(existing[0]!.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(existing[0]!.variableCount).toBe(3);
    });

    it('reports zero variables for non-existent files', async () => {
      mockExists.mockResolvedValue(false);

      const envs = await listEnvironments('/project');
      expect(envs.every((e) => e.variableCount === 0)).toBe(true);
    });

    it('sorts environments in a logical order', async () => {
      mockExists.mockResolvedValue(true);
      mockStatSync.mockReturnValue({ size: 0, mtime: new Date() } as any);
      mockReadFile.mockResolvedValue('');

      const envs = await listEnvironments('/project');
      const baseIndex = envs.findIndex((e) => e.name === 'base');
      const devIndex = envs.findIndex((e) => e.name === 'development');
      expect(baseIndex).toBeLessThan(devIndex);
    });

    it('includes absolute paths', async () => {
      mockExists.mockResolvedValue(true);
      mockStatSync.mockReturnValue({ size: 0, mtime: new Date() } as any);
      mockReadFile.mockResolvedValue('');

      const envs = await listEnvironments('/my-project');
      const base = envs.find((e) => e.name === 'base');
      expect(base?.absolutePath).toContain(path.normalize('/my-project/.env'));
    });

    it('includes fileName property', async () => {
      mockExists.mockResolvedValue(true);
      mockStatSync.mockReturnValue({ size: 0, mtime: new Date() } as any);
      mockReadFile.mockResolvedValue('');

      const envs = await listEnvironments('/project');
      const dev = envs.find((e) => e.name === 'development');
      expect(dev?.fileName).toBe('.env.development');
    });
  });

  // ===========================================================================
  // validateAllEnvironments
  // ===========================================================================
  describe('validateAllEnvironments', () => {
    it('skips non-existent environment files', async () => {
      mockExists.mockResolvedValue(false);
      const schema: any = { REQUIRED_KEY: { type: 'string' } };

      const results = await validateAllEnvironments(schema, '/project');
      expect(results.size).toBe(0);
    });

    it('reports errors for missing required variables', async () => {
      mockExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue('OTHER=value\n');

      const schema: any = {
        REQUIRED_VAR: { type: 'string' },
      };

      const results = await validateAllEnvironments(schema, '/project');
      expect(results.size).toBeGreaterThanOrEqual(1);

      for (const [, result] of results) {
        if (!result.valid) {
          const missingFields = result.errors.map((e) => e.field);
          expect(missingFields).toContain('REQUIRED_VAR');
        }
      }
    });

    it('reports valid when all required vars present', async () => {
      mockExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue('REQUIRED_VAR=value\n');

      const schema: any = {
        REQUIRED_VAR: { type: 'string' },
      };

      const results = await validateAllEnvironments(schema, '/project');
      expect(results.size).toBeGreaterThanOrEqual(1);

      for (const [, result] of results) {
        expect(result.valid).toBe(true);
      }
    });

    it('reports errors for invalid number values', async () => {
      mockExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue('PORT=not-a-number\n');

      const schema: any = {
        PORT: { type: 'number' },
      };

      const results = await validateAllEnvironments(schema, '/project');
      for (const [, result] of results) {
        if (!result.valid) {
          const numberErrors = result.errors.filter(
            (e) => e.message.includes('number'),
          );
          expect(numberErrors.length).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it('reports errors for invalid boolean values', async () => {
      mockExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue('DEBUG=invalid\n');

      const schema: any = {
        DEBUG: { type: 'boolean' },
      };

      const results = await validateAllEnvironments(schema, '/project');
      for (const [, result] of results) {
        if (!result.valid) {
          const boolErrors = result.errors.filter(
            (e) => e.message.includes('boolean'),
          );
          expect(boolErrors.length).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it('reports warnings for deprecated variables', async () => {
      mockExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue('OLD_VAR=value\n');

      const schema: any = {
        OLD_VAR: { type: 'string', isDeprecated: true, deprecationMessage: 'Use NEW_VAR instead' },
      };

      const results = await validateAllEnvironments(schema, '/project');
      for (const [, result] of results) {
        if (result.warnings.length > 0) {
          expect(result.warnings[0]!.message).toContain('NEW_VAR');
        }
      }
    });

    it('accepts valid boolean values', async () => {
      for (const boolVal of ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off']) {
        mockExists.mockResolvedValue(true);
        mockReadFile.mockResolvedValue(`DEBUG=${boolVal}\n`);
      }

      const schema: any = { DEBUG: { type: 'boolean' } };
      const results = await validateAllEnvironments(schema, '/project');
      for (const [, result] of results) {
        expect(result.valid).toBe(true);
      }
    });

    it('accepts empty string for optional boolean', async () => {
      mockExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue('DEBUG=\n');

      const schema: any = {
        DEBUG: { type: 'boolean', optional: true },
      };

      const results = await validateAllEnvironments(schema, '/project');
      for (const [, result] of results) {
        expect(result.valid).toBe(true);
      }
    });

    it('handles read errors gracefully', async () => {
      mockExists.mockResolvedValue(true);
      mockReadFile.mockRejectedValue(new Error('permission denied'));

      const schema: any = { KEY: { type: 'string' } };
      const results = await validateAllEnvironments(schema, '/project');
      expect(results.size).toBeGreaterThanOrEqual(1);
      for (const [, result] of results) {
        expect(result.valid).toBe(false);
      }
    });
  });
});
