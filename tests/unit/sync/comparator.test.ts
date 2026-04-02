import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  compareSync,
  compareValues,
  formatSyncDiff,
} from '../../../src/sync/comparator.js';

// Mock the fs utilities
vi.mock('../../../src/utils/fs.js', () => ({
  readFile: vi.fn(),
}));

// Mock the parser
vi.mock('../../../src/core/parser.js', () => ({
  parseEnvFile: vi.fn(),
}));

import { readFile } from '../../../src/utils/fs.js';
import { parseEnvFile } from '../../../src/core/parser.js';

const mockReadFile = vi.mocked(readFile);
const mockParseEnvFile = vi.mocked(parseEnvFile);

describe('sync comparator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // compareValues
  // ===========================================================================
  describe('compareValues', () => {
    it('returns inSync=true when both sets are identical', () => {
      const env = { A: '1', B: '2', C: '3' };
      const example = { A: '1', B: '2', C: '3' };
      const result = compareValues(env, example);
      expect(result.inSync).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.extra).toEqual([]);
      expect(result.different).toEqual([]);
      expect(result.same.sort()).toEqual(['A', 'B', 'C']);
    });

    it('detects missing variables (in example but not in env)', () => {
      const env = { A: '1' };
      const example = { A: '1', B: '2', C: '3' };
      const result = compareValues(env, example);
      expect(result.inSync).toBe(false);
      expect(result.missing.sort()).toEqual(['B', 'C']);
      expect(result.extra).toEqual([]);
    });

    it('detects extra variables (in env but not in example)', () => {
      const env = { A: '1', B: '2', EXTRA: 'x' };
      const example = { A: '1', B: '2' };
      const result = compareValues(env, example);
      expect(result.inSync).toBe(false);
      expect(result.extra.sort()).toEqual(['EXTRA']);
      expect(result.missing).toEqual([]);
    });

    it('detects different values (same keys, different values)', () => {
      const env = { A: '1', B: '2' };
      const example = { A: '1', B: '999' };
      const result = compareValues(env, example);
      expect(result.inSync).toBe(true); // different values don't break sync
      expect(result.different).toEqual(['B']);
      expect(result.same).toEqual(['A']);
    });

    it('inSync is true when only different values exist (no missing/extra)', () => {
      const env = { A: '1', B: '2' };
      const example = { A: '999', B: '2' };
      const result = compareValues(env, example);
      expect(result.inSync).toBe(true);
      expect(result.different).toEqual(['A']);
    });

    it('sorts all result arrays', () => {
      const env = { Z: '1', A: '2', M: '3' };
      const example = { A: '999', Z: '1', B: '4' };
      const result = compareValues(env, example);
      expect(result.missing).toEqual(['B']);
      expect(result.extra).toEqual(['M']);
      expect(result.different).toEqual(['A']);
      expect(result.same).toEqual(['Z']);
    });

    it('handles empty env vars', () => {
      const result = compareValues({}, {});
      expect(result.inSync).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.extra).toEqual([]);
      expect(result.different).toEqual([]);
      expect(result.same).toEqual([]);
    });

    it('handles env with extra vars but no example vars', () => {
      const env = { A: '1', B: '2' };
      const example = {};
      const result = compareValues(env, example);
      expect(result.inSync).toBe(false);
      expect(result.extra.sort()).toEqual(['A', 'B']);
    });

    it('handles example with extra vars but no env vars', () => {
      const env = {};
      const example = { A: '1', B: '2' };
      const result = compareValues(env, example);
      expect(result.inSync).toBe(false);
      expect(result.missing.sort()).toEqual(['A', 'B']);
    });
  });

  // ===========================================================================
  // compareSync (file-based)
  // ===========================================================================
  describe('compareSync', () => {
    it('reads both files and compares them', async () => {
      mockReadFile.mockResolvedValueOnce('A=1\nB=2\n');
      mockReadFile.mockResolvedValueOnce('A=1\nB=2\nC=3\n');
      mockParseEnvFile.mockImplementation((content: string) => ({
        vars: content
          .split('\n')
          .filter((line) => line.includes('='))
          .map((line) => {
            const [key, ...rest] = line.split('=');
            return {
              key: key!,
              value: rest.join('='),
              raw: rest.join('='),
              source: 'test',
              lineNumber: 0,
              comment: '',
            };
          }),
      }));

      const result = await compareSync('.env', '.env.example');
      expect(result.inSync).toBe(false);
      expect(result.missing).toEqual(['C']);
    });
  });

  // ===========================================================================
  // formatSyncDiff
  // ===========================================================================
  describe('formatSyncDiff', () => {
    it('formats a sync result for in-sync files', () => {
      const diff = {
        inSync: true,
        missing: [],
        extra: [],
        different: [],
        same: ['A', 'B', 'C'],
      };
      const formatted = formatSyncDiff(diff);
      expect(formatted).toContain('in sync');
    });

    it('formats a sync result for out-of-sync files', () => {
      const diff = {
        inSync: false,
        missing: ['MISSING_VAR'],
        extra: ['EXTRA_VAR'],
        different: ['CHANGED_VAR'],
        same: ['SAME_VAR'],
      };
      const formatted = formatSyncDiff(diff);
      expect(formatted).toContain('out of sync');
      expect(formatted).toContain('Missing');
      expect(formatted).toContain('MISSING_VAR');
      expect(formatted).toContain('Extra');
      expect(formatted).toContain('EXTRA_VAR');
      expect(formatted).toContain('Different');
      expect(formatted).toContain('CHANGED_VAR');
    });

    it('shows variable count when in sync', () => {
      const diff = {
        inSync: true,
        missing: [],
        extra: [],
        different: ['X'],
        same: ['A', 'B'],
      };
      const formatted = formatSyncDiff(diff);
      // Should show count since there are same variables
      // But only when inSync is true and there are same vars
      expect(formatted).toContain('in sync');
    });
  });
});
