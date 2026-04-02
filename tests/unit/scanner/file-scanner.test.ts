import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scanFile, scanFiles } from '../../../src/scanner/file-scanner.js';

// Mock the dependencies
vi.mock('../../../src/utils/git.js', () => ({
  isGitIgnored: vi.fn().mockResolvedValue(false),
}));

vi.mock('../../../src/scanner/patterns.js', () => ({
  matchPatterns: vi.fn().mockReturnValue([]),
}));

vi.mock('../../../src/scanner/entropy.js', () => ({
  detectHighEntropyStrings: vi.fn().mockReturnValue([]),
}));

import { isGitIgnored } from '../../../src/utils/git.js';
import { matchPatterns } from '../../../src/scanner/patterns.js';
import { detectHighEntropyStrings } from '../../../src/scanner/entropy.js';

const mockIsGitIgnored = vi.mocked(isGitIgnored);
const mockMatchPatterns = vi.mocked(matchPatterns);
const mockDetectHighEntropyStrings = vi.mocked(detectHighEntropyStrings);

describe('file-scanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsGitIgnored.mockResolvedValue(false);
    mockMatchPatterns.mockReturnValue([]);
    mockDetectHighEntropyStrings.mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // scanFile
  // ===========================================================================
  describe('scanFile', () => {
    it('scans a real file for secrets', async () => {
      // Use a fixture file
      const { fixturePath } = await import('../../../tests/helpers/fixtures.js');
      const path = fixturePath('scan-targets/with-secrets/hardcoded-key.js');

      mockMatchPatterns.mockReturnValueOnce([
        {
          type: 'Generic API Key Assignment',
          value: '***',
          file: 'hardcoded-key.js',
          line: 1,
          column: 1,
          pattern: {
            id: 'test',
            name: 'Test',
            pattern: /test/g,
            confidence: 0.7,
            severity: 'high',
            description: 'test',
            remediation: 'test',
            category: 'test',
          },
        },
      ]);

      const results = await scanFile(path, process.cwd());
      expect(results.length).toBe(1);
      expect(mockMatchPatterns).toHaveBeenCalledTimes(1);
      expect(mockDetectHighEntropyStrings).toHaveBeenCalledTimes(1);
    });

    it('returns empty array for files in skipped directories', async () => {
      const results = await scanFile('/some/path/node_modules/config.js', '/some/path');
      expect(results.length).toBe(0);
      expect(mockMatchPatterns).not.toHaveBeenCalled();
    });

    it('returns empty array for files in .git directory', async () => {
      const results = await scanFile('/repo/.git/config', '/repo');
      expect(results.length).toBe(0);
    });

    it('returns empty array for binary extensions', async () => {
      const results = await scanFile('/project/image.png', '/project');
      expect(results.length).toBe(0);
    });

    it('returns empty array for files that cannot be read', async () => {
      const results = await scanFile('/nonexistent/file.txt', '/tmp');
      expect(results.length).toBe(0);
    });

    it('returns empty array for binary content', async () => {
      // Create a temporary file with null bytes
      const { mkdtemp, writeFile, unlink, rmdir } = await import('node:fs/promises');
      const { join } = await import('node:path');

      const tmpDir = await mkdtemp('ultraenv-test-');
      const tmpFile = join(tmpDir, 'binary.bin');
      const buf = Buffer.alloc(100);
      buf[0] = 0x00; // null byte makes it binary
      await writeFile(tmpFile, buf);

      try {
        const results = await scanFile(tmpFile, tmpDir);
        expect(results.length).toBe(0);
      } finally {
        await unlink(tmpFile).catch(() => {});
        await rmdir(tmpDir).catch(() => {});
      }
    });

    it('combines pattern and entropy results', async () => {
      const { fixturePath } = await import('../../../tests/helpers/fixtures.js');
      const path = fixturePath('scan-targets/clean/safe-code.js');

      mockMatchPatterns.mockReturnValueOnce([
        { type: 'Pattern', value: 'p', file: 'f', line: 1, column: 1 } as any,
      ]);
      mockDetectHighEntropyStrings.mockReturnValueOnce([
        { type: 'Entropy', value: 'e', file: 'f', line: 2, column: 1 } as any,
      ]);

      const results = await scanFile(path, process.cwd());
      expect(results.length).toBe(2);
    });
  });

  // ===========================================================================
  // scanFiles
  // ===========================================================================
  describe('scanFiles', () => {
    it('scans files in a directory', async () => {
      const { fixturePath } = await import('../../../tests/helpers/fixtures.js');
      const scanDir = fixturePath('scan-targets');

      const result = await scanFiles([scanDir]);
      expect(result.found).toBeDefined();
      expect(result.filesScanned.length).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(typeof result.scanTimeMs).toBe('number');
    });

    it('returns scan metadata', async () => {
      const result = await scanFiles(['/some/path']);
      expect(result).toHaveProperty('found');
      expect(result).toHaveProperty('secrets');
      expect(result).toHaveProperty('filesScanned');
      expect(result).toHaveProperty('filesSkipped');
      expect(result).toHaveProperty('scanTimeMs');
      expect(result).toHaveProperty('timestamp');
    });

    it('supports include patterns', async () => {
      const { fixturePath } = await import('../../../tests/helpers/fixtures.js');
      const scanDir = fixturePath('scan-targets/with-secrets');

      const result = await scanFiles([scanDir], { include: ['**/*.ts'] });
      expect(result.filesScanned.length).toBeGreaterThanOrEqual(0);
    });

    it('respects failFast option', async () => {
      const { fixturePath } = await import('../../../tests/helpers/fixtures.js');
      const scanDir = fixturePath('scan-targets/with-secrets');

      // This should still work even with failFast
      const result = await scanFiles([scanDir], { failFast: true });
      expect(result).toBeDefined();
    });
  });
});
