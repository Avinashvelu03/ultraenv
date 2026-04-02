import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import {
  readFile,
  readFileSync,
  writeFile,
  exists,
  existsSyncCheck,
  isFile,
  isDirectory,
  ensureDir,
  listFiles,
  findUp,
  findUpSync,
} from '../../../src/utils/fs.js';
import { FileSystemError } from '../../../src/core/errors.js';
import { TempDir } from '../../helpers/temp-dir.js';

describe('fs utilities', () => {
  let tempDir: TempDir;

  beforeEach(() => {
    tempDir = new TempDir();
  });

  afterEach(() => {
    tempDir.cleanup();
  });

  // ---------------------------------------------------------------------------
  // readFile / readFileSync
  // ---------------------------------------------------------------------------
  describe('readFile / readFileSync', () => {
    it('reads a file asynchronously', async () => {
      const filePath = tempDir.write('test.txt', 'hello world');
      const content = await readFile(filePath);
      expect(content).toBe('hello world');
    });

    it('reads a file synchronously', () => {
      const filePath = tempDir.write('test.txt', 'hello sync');
      const content = readFileSync(filePath);
      expect(content).toBe('hello sync');
    });

    it('throws FileSystemError for missing file (async)', async () => {
      await expect(readFile('/nonexistent/path/file.txt')).rejects.toThrow(FileSystemError);
    });

    it('throws FileSystemError for missing file (sync)', () => {
      expect(() => readFileSync('/nonexistent/path/file.txt')).toThrow(FileSystemError);
    });
  });

  // ---------------------------------------------------------------------------
  // writeFile
  // ---------------------------------------------------------------------------
  describe('writeFile', () => {
    it('writes a file', async () => {
      const filePath = tempDir.write('dir/test.txt', '');
      await writeFile(filePath, 'new content');
      const content = readFileSync(filePath);
      expect(content).toBe('new content');
    });

    it('creates parent directories automatically', async () => {
      const filePath = tempDir.write('deep/nested/dir/file.txt', '');
      await writeFile(filePath, 'deep content');
      const content = readFileSync(filePath);
      expect(content).toBe('deep content');
    });
  });

  // ---------------------------------------------------------------------------
  // exists / existsSyncCheck
  // ---------------------------------------------------------------------------
  describe('exists / existsSyncCheck', () => {
    it('returns true for existing file (async)', async () => {
      const filePath = tempDir.write('exists.txt', 'data');
      expect(await exists(filePath)).toBe(true);
    });

    it('returns false for non-existing file (async)', async () => {
      expect(await exists('/nonexistent/file.txt')).toBe(false);
    });

    it('returns true for existing file (sync)', () => {
      const filePath = tempDir.write('exists-sync.txt', 'data');
      expect(existsSyncCheck(filePath)).toBe(true);
    });

    it('returns false for non-existing file (sync)', () => {
      expect(existsSyncCheck('/nonexistent/file.txt')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // isFile
  // ---------------------------------------------------------------------------
  describe('isFile', () => {
    it('returns true for a regular file', async () => {
      const filePath = tempDir.write('file.txt', 'data');
      expect(await isFile(filePath)).toBe(true);
    });

    it('returns false for a directory', async () => {
      expect(await isFile(tempDir.path)).toBe(false);
    });

    it('returns false for non-existing path', async () => {
      expect(await isFile('/nonexistent')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // isDirectory
  // ---------------------------------------------------------------------------
  describe('isDirectory', () => {
    it('returns true for a directory', async () => {
      expect(await isDirectory(tempDir.path)).toBe(true);
    });

    it('returns false for a regular file', async () => {
      const filePath = tempDir.write('file.txt', 'data');
      expect(await isDirectory(filePath)).toBe(false);
    });

    it('returns false for non-existing path', async () => {
      expect(await isDirectory('/nonexistent')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // ensureDir
  // ---------------------------------------------------------------------------
  describe('ensureDir', () => {
    it('creates a directory if it does not exist', async () => {
      const dirPath = tempDir.write(path.join('new-dir', 'file.txt'), '');
      // Remove the file first
      const fs = await import('node:fs/promises');
      await fs.unlink(dirPath);
      const targetDir = path.dirname(dirPath);
      await ensureDir(targetDir);
      expect(await isDirectory(targetDir)).toBe(true);
    });

    it('does not throw if directory already exists', async () => {
      await expect(ensureDir(tempDir.path)).resolves.not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // listFiles
  // ---------------------------------------------------------------------------
  describe('listFiles', () => {
    it('lists files in a directory (non-recursive)', async () => {
      tempDir.write('a.txt', 'a');
      tempDir.write('b.txt', 'b');
      tempDir.write('sub/c.txt', 'c');
      const files = await listFiles(tempDir.path, false);
      expect(files).toContain('a.txt');
      expect(files).toContain('b.txt');
      expect(files).not.toContain('c.txt');
    });

    it('lists files recursively', async () => {
      tempDir.write('a.txt', 'a');
      tempDir.write(path.join('sub', 'c.txt'), 'c');
      const files = await listFiles(tempDir.path, true);
      expect(files).toContain('a.txt');
      expect(files).toContain(path.join('sub', 'c.txt'));
    });

    it('returns empty array for empty directory', async () => {
      const emptyDir = tempDir.write(path.join('empty', 'file.txt'), '');
      const fs = await import('node:fs/promises');
      await fs.unlink(emptyDir);
      const dirPath = path.dirname(emptyDir);
      await fs.rmdir(dirPath);
      await fs.mkdir(dirPath);
      const files = await listFiles(dirPath);
      expect(files).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // findUp / findUpSync
  // ---------------------------------------------------------------------------
  describe('findUp / findUpSync', () => {
    it('finds a file in the current directory (sync)', () => {
      const filePath = tempDir.write('target.txt', 'data');
      const result = findUpSync('target.txt', tempDir.path);
      expect(result).toBe(filePath);
    });

    it('finds a file in a parent directory (sync)', () => {
      tempDir.write('target.txt', 'data');
      const subDir = tempDir.write('sub/nested/file.txt', '');
      const result = findUpSync('target.txt', subDir);
      expect(result).not.toBeNull();
      expect(result).toContain('target.txt');
    });

    it('returns null when file is not found (sync)', () => {
      const result = findUpSync('nonexistent-file.txt', tempDir.path);
      expect(result).toBeNull();
    });

    it('finds a file in the current directory (async)', async () => {
      const filePath = tempDir.write('target.txt', 'data');
      const result = await findUp('target.txt', tempDir.path);
      expect(result).toBe(filePath);
    });

    it('returns null when file is not found (async)', async () => {
      const result = await findUp('nonexistent-file.txt', tempDir.path);
      expect(result).toBeNull();
    });
  });
});
