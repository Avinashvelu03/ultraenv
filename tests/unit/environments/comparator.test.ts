import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { compareEnvironments } from '../../../src/environments/comparator.js';

// Mock the dependencies
vi.mock('../../../src/utils/fs.js', () => ({
  readFile: vi.fn(),
  exists: vi.fn(),
}));

import { readFile, exists } from '../../../src/utils/fs.js';
import { parseEnvFile } from '../../../src/core/parser.js';

const mockReadFile = vi.mocked(readFile);
const mockExists = vi.mocked(exists);

describe('environments comparator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // compareEnvironments
  // ===========================================================================
  describe('compareEnvironments', () => {
    it('detects variables only in env1', async () => {
      mockExists.mockResolvedValue(true);
      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('development')) return Promise.resolve('A=1\nB=2\n');
        if (path.includes('production')) return Promise.resolve('A=1\n');
        return Promise.resolve('');
      });

      const result = await compareEnvironments('development', 'production', '/project');
      const onlyInEnv1 = result.onlyInEnv1.map((d) => d.key);
      expect(onlyInEnv1).toContain('B');
      expect(onlyInEnv1).not.toContain('A');
    });

    it('detects variables only in env2', async () => {
      mockExists.mockResolvedValue(true);
      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('development')) return Promise.resolve('A=1\n');
        if (path.includes('production')) return Promise.resolve('A=1\nC=3\n');
        return Promise.resolve('');
      });

      const result = await compareEnvironments('development', 'production', '/project');
      const onlyInEnv2 = result.onlyInEnv2.map((d) => d.key);
      expect(onlyInEnv2).toContain('C');
    });

    it('detects variables with different values', async () => {
      mockExists.mockResolvedValue(true);
      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('development')) return Promise.resolve('PORT=3000\n');
        if (path.includes('production')) return Promise.resolve('PORT=8080\n');
        return Promise.resolve('');
      });

      const result = await compareEnvironments('development', 'production', '/project');
      const different = result.different.map((d) => d.key);
      expect(different).toContain('PORT');
    });

    it('detects variables with same values', async () => {
      mockExists.mockResolvedValue(true);
      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('development')) return Promise.resolve('PORT=3000\n');
        if (path.includes('production')) return Promise.resolve('PORT=3000\n');
        return Promise.resolve('');
      });

      const result = await compareEnvironments('development', 'production', '/project');
      expect(result.same).toContain('PORT');
    });

    it('masks secret values in output', async () => {
      mockExists.mockResolvedValue(true);
      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('development')) return Promise.resolve('API_KEY=sk-abcdefghijklmnopqrstuvwxyz012345\n');
        if (path.includes('production')) return Promise.resolve('API_KEY=sk-zyxwvutsrqponmlkjihgfedcba987654\n');
        return Promise.resolve('');
      });

      const result = await compareEnvironments('development', 'production', '/project');
      const keyDiff = result.different.find((d) => d.key === 'API_KEY');
      expect(keyDiff).toBeDefined();
      // API_KEY matches the secret key pattern, so values should be masked
      expect(keyDiff!.isSecret).toBe(true);
      expect(keyDiff!.value1.includes('*')).toBe(true);
      expect(keyDiff!.value2.includes('*')).toBe(true);
    });

    it('generates warnings for security-related differences', async () => {
      mockExists.mockResolvedValue(true);
      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('development')) return Promise.resolve('DEBUG=true\n');
        if (path.includes('production')) return Promise.resolve('DEBUG=false\n');
        return Promise.resolve('');
      });

      const result = await compareEnvironments('development', 'production', '/project');
      // Should have warnings for DEBUG changing from true to false
      const debugWarnings = result.warnings.filter((w) => w.key === 'DEBUG');
      expect(debugWarnings.length).toBeGreaterThanOrEqual(1);
    });

    it('throws when first env file not found', async () => {
      mockExists.mockResolvedValue(false);
      await expect(
        compareEnvironments('development', 'production', '/project'),
      ).rejects.toThrow();
    });

    it('throws when second env file not found', async () => {
      mockExists.mockImplementation((path: string) => {
        return Promise.resolve(path.includes('development'));
      });
      await expect(
        compareEnvironments('development', 'production', '/project'),
      ).rejects.toThrow();
    });

    it('sorts results for deterministic output', async () => {
      mockExists.mockResolvedValue(true);
      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('development')) return Promise.resolve('Z=1\nB=2\n');
        if (path.includes('production')) return Promise.resolve('A=99\n');
        return Promise.resolve('');
      });

      const result = await compareEnvironments('development', 'production', '/project');
      const onlyInEnv1 = result.onlyInEnv1.map((d) => d.key);
      expect(onlyInEnv1).toEqual(['B', 'Z'].sort());
    });

    it('sets env1Name and env2Name', async () => {
      mockExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue('KEY=val\n');

      const result = await compareEnvironments('development', 'production', '/project');
      expect(result.env1Name).toBe('development');
      expect(result.env2Name).toBe('production');
    });

    it('handles empty environment files', async () => {
      mockExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue('');

      const result = await compareEnvironments('development', 'production', '/project');
      expect(result.onlyInEnv1).toHaveLength(0);
      expect(result.onlyInEnv2).toHaveLength(0);
      expect(result.different).toHaveLength(0);
      expect(result.same).toHaveLength(0);
    });

    it('handles direct file paths', async () => {
      mockExists.mockResolvedValue(true);
      mockReadFile.mockImplementation((path: string) => {
        if (path.includes('dev.env')) return Promise.resolve('A=1\n');
        return Promise.resolve('A=2\n');
      });

      const result = await compareEnvironments('/project/dev.env', '/project/prod.env', '/project');
      const different = result.different.map((d) => d.key);
      expect(different).toContain('A');
    });
  });
});
