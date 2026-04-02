import { describe, it, expect } from 'vitest';
import {
  parseVaultFile,
  serializeVaultFile,
  readVaultFile,
  writeVaultFile,
  getEnvironmentData,
  getVaultEnvironments,
} from '../../../src/vault/vault-file.js';
import { VaultError } from '../../../src/core/errors.js';
import type { VaultEntry } from '../../../src/vault/vault-file.js';
import { readFile, writeFile, exists } from '../../../src/utils/fs.js';
import type { VaultEnvironment } from '../../../src/core/types.js';

// Mock the fs utilities
vi.mock('../../../src/utils/fs.js', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  exists: vi.fn(),
}));

const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockExists = vi.mocked(exists);

describe('vault-file', () => {
  // ===========================================================================
  // parseVaultFile
  // ===========================================================================
  describe('parseVaultFile', () => {
    it('parses a valid vault file with multiple environments', () => {
      const content = [
        '# ultraenv encrypted vault — safe to commit',
        '# Generated: 2024-01-01T00:00:00.000Z',
        '',
        'ULTRAENV_VAULT_DEVELOPMENT="encrypted:v1:aes-256-gcm:abc123"',
        'ULTRAENV_VAULT_PRODUCTION="encrypted:v1:aes-256-gcm:def456"',
        '',
      ].join('\n');

      const vault = parseVaultFile(content);
      expect(vault.size).toBe(2);
      expect(vault.get('development')?.name).toBe('development');
      expect(vault.get('production')?.name).toBe('production');
      expect(vault.get('development')?.encrypted).toBe('encrypted:v1:aes-256-gcm:abc123');
    });

    it('returns empty map for empty content', () => {
      const vault = parseVaultFile('');
      expect(vault.size).toBe(0);
    });

    it('returns empty map for whitespace-only content', () => {
      const vault = parseVaultFile('   \n  \n  ');
      expect(vault.size).toBe(0);
    });

    it('skips comment lines', () => {
      const content = [
        '# This is a comment',
        'ULTRAENV_VAULT_DEVELOPMENT="encrypted:v1:aes-256-gcm:abc"',
        '# Another comment',
      ].join('\n');

      const vault = parseVaultFile(content);
      expect(vault.size).toBe(1);
      expect(vault.has('development')).toBe(true);
    });

    it('normalizes environment names to lowercase', () => {
      const content = 'ULTRAENV_VAULT_STAGING="encrypted:v1:abc"';
      const vault = parseVaultFile(content);
      expect(vault.has('staging')).toBe(true);
    });

    it('handles unquoted values (legacy format)', () => {
      const content = 'ULTRAENV_VAULT_DEVELOPMENT=encrypted:v1:legacy';
      const vault = parseVaultFile(content);
      expect(vault.get('development')?.encrypted).toBe('encrypted:v1:legacy');
    });

    it('throws VaultError for non-ULTRAENV_VAULT_ lines', () => {
      const content = 'KEY1=value1\nKEY2=value2\n';
      expect(() => parseVaultFile(content)).toThrow(VaultError);
    });

    it('sets varCount to 1 for encrypted format', () => {
      const content = 'ULTRAENV_VAULT_DEVELOPMENT="encrypted:v1:aes-256-gcm:abc123"';
      const vault = parseVaultFile(content);
      expect(vault.get('development')?.varCount).toBe(1);
    });

    it('throws VaultError for invalid format', () => {
      const content = 'INVALID_ENTRY=garbage';
      expect(() => parseVaultFile(content)).toThrow(VaultError);
    });

    it('throws VaultError with line number', () => {
      try {
        parseVaultFile('INVALID_ENTRY=garbage');
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(VaultError);
        expect((err as VaultError).message).toContain('line 1');
      }
    });

    it('extracts keyIds from encrypted data', () => {
      const content = 'ULTRAENV_VAULT_DEVELOPMENT="encrypted:v1:aes-256-gcm:abc"';
      const vault = parseVaultFile(content);
      expect(vault.get('development')?.keyIds).toContain('v1');
    });

    it('sets keyIds to unknown for non-encrypted data', () => {
      const content = 'ULTRAENV_VAULT_DEVELOPMENT="some-plain-data"';
      const vault = parseVaultFile(content);
      expect(vault.get('development')?.keyIds).toEqual(['unknown']);
    });
  });

  // ===========================================================================
  // serializeVaultFile
  // ===========================================================================
  describe('serializeVaultFile', () => {
    function makeEntry(name: string, encrypted: string): VaultEntry {
      return {
        name,
        varCount: 1,
        lastModified: '2024-01-01T00:00:00.000Z',
        keyIds: ['v1'],
        encrypted,
      };
    }

    it('serializes environments to a valid vault file format', () => {
      const envs = new Map<string, VaultEntry>();
      envs.set('development', makeEntry('development', 'enc-dev'));
      envs.set('production', makeEntry('production', 'enc-prod'));

      const content = serializeVaultFile(envs);
      expect(content).toContain('# ultraenv encrypted vault — safe to commit');
      expect(content).toContain('ULTRAENV_VAULT_DEVELOPMENT="enc-dev"');
      expect(content).toContain('ULTRAENV_VAULT_PRODUCTION="enc-prod"');
    });

    it('includes generated timestamp', () => {
      const envs = new Map<string, VaultEntry>();
      envs.set('development', makeEntry('development', 'enc'));
      const content = serializeVaultFile(envs);
      expect(content).toContain('# Generated:');
    });

    it('includes sorted environment names in header', () => {
      const envs = new Map<string, VaultEntry>();
      envs.set('production', makeEntry('production', 'enc'));
      envs.set('development', makeEntry('development', 'enc'));
      const content = serializeVaultFile(envs);
      expect(content).toContain('# Environments: development, production');
    });

    it('ends with a trailing newline', () => {
      const envs = new Map<string, VaultEntry>();
      envs.set('development', makeEntry('development', 'enc'));
      const content = serializeVaultFile(envs);
      expect(content.endsWith('\n')).toBe(true);
    });

    it('sorts environment entries alphabetically', () => {
      const envs = new Map<string, VaultEntry>();
      envs.set('zebra', makeEntry('zebra', 'z'));
      envs.set('alpha', makeEntry('alpha', 'a'));
      envs.set('middle', makeEntry('middle', 'm'));
      const content = serializeVaultFile(envs);
      const alphaPos = content.indexOf('ULTRAENV_VAULT_ALPHA');
      const middlePos = content.indexOf('ULTRAENV_VAULT_MIDDLE');
      const zebraPos = content.indexOf('ULTRAENV_VAULT_ZEBRA');
      expect(alphaPos).toBeLessThan(middlePos);
      expect(middlePos).toBeLessThan(zebraPos);
    });

    it('roundtrip: parseVaultFile then serializeVaultFile', () => {
      const originalContent = [
        '# ultraenv encrypted vault — safe to commit',
        '# Generated: 2024-01-01T00:00:00.000Z',
        '',
        'ULTRAENV_VAULT_DEVELOPMENT="encrypted:v1:aes-256-gcm:abc123"',
        '',
      ].join('\n');

      const parsed = parseVaultFile(originalContent);
      const serialized = serializeVaultFile(parsed);
      const reparsed = parseVaultFile(serialized);

      expect(reparsed.size).toBe(parsed.size);
      expect(reparsed.get('development')?.encrypted).toBe(
        parsed.get('development')?.encrypted,
      );
    });
  });

  // ===========================================================================
  // readVaultFile
  // ===========================================================================
  describe('readVaultFile', () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it('reads and parses a vault file', async () => {
      mockReadFile.mockResolvedValueOnce('ULTRAENV_VAULT_DEVELOPMENT="encrypted:v1:abc"');
      const vault = await readVaultFile('.env.vault');
      expect(vault.size).toBe(1);
      expect(vault.get('development')?.encrypted).toBe('encrypted:v1:abc');
    });

    it('wraps non-VaultError errors in VaultError', async () => {
      mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));
      await expect(readVaultFile('missing.vault')).rejects.toThrow(VaultError);
    });

    it('propagates VaultError from parseVaultFile', async () => {
      mockReadFile.mockResolvedValueOnce('INVALID=garbage');
      await expect(readVaultFile('bad.vault')).rejects.toThrow(VaultError);
    });

    it('passes the path to readFile', async () => {
      mockReadFile.mockResolvedValueOnce('');
      await readVaultFile('/path/to/vault');
      expect(mockReadFile).toHaveBeenCalledWith('/path/to/vault', 'utf-8');
    });
  });

  // ===========================================================================
  // writeVaultFile
  // ===========================================================================
  describe('writeVaultFile', () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it('writes serialized content to disk', async () => {
      const envs = new Map<string, VaultEntry>();
      envs.set('development', {
        name: 'development',
        varCount: 1,
        lastModified: '2024-01-01T00:00:00.000Z',
        keyIds: ['v1'],
        encrypted: 'encrypted:v1:abc',
      });

      mockWriteFile.mockResolvedValueOnce(undefined);
      await writeVaultFile('.env.vault', envs);
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      const [path, content] = mockWriteFile.mock.calls[0]!;
      expect(path).toBe('.env.vault');
      expect(content).toContain('ULTRAENV_VAULT_DEVELOPMENT');
    });

    it('throws VaultError for empty environments map', async () => {
      await expect(writeVaultFile('.env.vault', new Map())).rejects.toThrow(VaultError);
    });

    it('throws VaultError with message about empty vault', async () => {
      try {
        await writeVaultFile('.env.vault', new Map());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(VaultError);
        expect((err as VaultError).message).toContain('empty');
      }
    });

    it('wraps write errors in VaultError', async () => {
      const envs = new Map<string, VaultEntry>();
      envs.set('development', {
        name: 'development',
        varCount: 1,
        lastModified: '2024-01-01T00:00:00.000Z',
        keyIds: ['v1'],
        encrypted: 'enc',
      });
      mockWriteFile.mockRejectedValueOnce(new Error('EACCES'));
      await expect(writeVaultFile('/noaccess/.env.vault', envs)).rejects.toThrow(VaultError);
    });
  });

  // ===========================================================================
  // getEnvironmentData
  // ===========================================================================
  describe('getEnvironmentData', () => {
    it('returns the entry for a found environment', () => {
      const envs = new Map<string, VaultEntry>();
      envs.set('development', {
        name: 'development',
        varCount: 5,
        lastModified: '2024-01-01T00:00:00.000Z',
        keyIds: ['v1'],
        encrypted: 'enc-dev',
      });

      const entry = getEnvironmentData(envs, 'development');
      expect(entry?.varCount).toBe(5);
      expect(entry?.encrypted).toBe('enc-dev');
    });

    it('returns undefined for a missing environment', () => {
      const envs = new Map<string, VaultEntry>();
      expect(getEnvironmentData(envs, 'production')).toBeUndefined();
    });

    it('performs case-insensitive lookup', () => {
      const envs = new Map<string, VaultEntry>();
      envs.set('development', {
        name: 'development',
        varCount: 1,
        lastModified: '2024-01-01T00:00:00.000Z',
        keyIds: ['v1'],
        encrypted: 'enc',
      });

      expect(getEnvironmentData(envs, 'DEVELOPMENT')?.encrypted).toBe('enc');
      expect(getEnvironmentData(envs, 'Development')?.encrypted).toBe('enc');
    });
  });

  // ===========================================================================
  // getVaultEnvironments
  // ===========================================================================
  describe('getVaultEnvironments', () => {
    it('returns sorted list of environment names', () => {
      const envs = new Map<string, VaultEntry>();
      envs.set('production', {
        name: 'production',
        varCount: 1,
        lastModified: '2024-01-01T00:00:00.000Z',
        keyIds: ['v1'],
        encrypted: 'enc',
      });
      envs.set('development', {
        name: 'development',
        varCount: 1,
        lastModified: '2024-01-01T00:00:00.000Z',
        keyIds: ['v1'],
        encrypted: 'enc',
      });

      const names = getVaultEnvironments(envs);
      expect(names).toEqual(['development', 'production']);
    });

    it('returns empty array for empty vault', () => {
      expect(getVaultEnvironments(new Map())).toEqual([]);
    });
  });
});
