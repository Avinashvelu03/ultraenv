import { describe, it, expect } from 'vitest';
import {
  computeIntegrity,
  verifyIntegrity,
  computeVaultChecksum,
  verifyVaultChecksum,
  checkIntegrity,
  checkVaultIntegrity,
} from '../../../src/vault/integrity.js';
import { EncryptionError } from '../../../src/core/errors.js';
import type { VaultEnvironment } from '../../../src/core/types.js';

describe('vault integrity', () => {
  // ===========================================================================
  // computeIntegrity
  // ===========================================================================
  describe('computeIntegrity', () => {
    it('returns a 64-character lowercase hex string', () => {
      const key = Buffer.from('test-key');
      const digest = computeIntegrity('hello world', key);
      expect(digest).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(digest)).toBe(true);
    });

    it('produces the same digest for the same input (deterministic)', () => {
      const key = Buffer.from('test-key');
      const d1 = computeIntegrity('test data', key);
      const d2 = computeIntegrity('test data', key);
      expect(d1).toBe(d2);
    });

    it('produces different digests for different data', () => {
      const key = Buffer.from('test-key');
      const d1 = computeIntegrity('data-one', key);
      const d2 = computeIntegrity('data-two', key);
      expect(d1).not.toBe(d2);
    });

    it('produces different digests for different keys', () => {
      const key1 = Buffer.from('key-one');
      const key2 = Buffer.from('key-two');
      const d1 = computeIntegrity('same data', key1);
      const d2 = computeIntegrity('same data', key2);
      expect(d1).not.toBe(d2);
    });

    it('throws EncryptionError for empty key', () => {
      expect(() => computeIntegrity('data', Buffer.alloc(0))).toThrow(EncryptionError);
    });

    it('throws EncryptionError for empty data', () => {
      expect(() => computeIntegrity('', Buffer.from('key'))).toThrow(EncryptionError);
    });

    it('throws with message about empty key', () => {
      try {
        computeIntegrity('data', Buffer.alloc(0));
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(EncryptionError);
        expect((err as EncryptionError).message).toContain('empty key');
      }
    });

    it('throws with message about empty data', () => {
      try {
        computeIntegrity('', Buffer.from('key'));
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(EncryptionError);
        expect((err as EncryptionError).message).toContain('empty data');
      }
    });

    it('handles long data strings', () => {
      const key = Buffer.from('key');
      const data = 'a'.repeat(100000);
      const digest = computeIntegrity(data, key);
      expect(digest).toHaveLength(64);
    });

    it('handles UTF-8 data', () => {
      const key = Buffer.from('key');
      const digest = computeIntegrity('こんにちは世界', key);
      expect(digest).toHaveLength(64);
    });
  });

  // ===========================================================================
  // verifyIntegrity
  // ===========================================================================
  describe('verifyIntegrity', () => {
    it('returns true for matching digest', () => {
      const key = Buffer.from('test-key');
      const data = 'test data';
      const digest = computeIntegrity(data, key);
      expect(verifyIntegrity(data, key, digest)).toBe(true);
    });

    it('returns false for non-matching digest', () => {
      const key = Buffer.from('test-key');
      const data = 'test data';
      expect(verifyIntegrity(data, key, 'a'.repeat(64))).toBe(false);
    });

    it('returns false when data has been tampered', () => {
      const key = Buffer.from('test-key');
      const digest = computeIntegrity('original data', key);
      expect(verifyIntegrity('tampered data', key, digest)).toBe(false);
    });

    it('throws EncryptionError for empty key', () => {
      expect(() => verifyIntegrity('data', Buffer.alloc(0), 'a'.repeat(64))).toThrow(EncryptionError);
    });

    it('throws EncryptionError for wrong digest length', () => {
      const key = Buffer.from('key');
      expect(() => verifyIntegrity('data', key, 'short')).toThrow(EncryptionError);
    });

    it('throws EncryptionError with message about digest length', () => {
      try {
        verifyIntegrity('data', Buffer.from('key'), 'abc');
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(EncryptionError);
        expect((err as EncryptionError).message).toContain('64 hex characters');
      }
    });

    it('throws EncryptionError for non-hex digest', () => {
      const key = Buffer.from('key');
      expect(() => verifyIntegrity('data', key, 'z'.repeat(64))).toThrow(EncryptionError);
    });

    it('throws EncryptionError with message about hex format', () => {
      try {
        verifyIntegrity('data', Buffer.from('key'), 'g'.repeat(64));
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(EncryptionError);
        expect((err as EncryptionError).message).toContain('hex');
      }
    });
  });

  // ===========================================================================
  // computeVaultChecksum
  // ===========================================================================
  describe('computeVaultChecksum', () => {
    function makeVaultEnv(name: string, encrypted: string): VaultEnvironment {
      return {
        name,
        varCount: 3,
        lastModified: '2024-01-01T00:00:00.000Z',
        keyIds: ['v1'],
      } as VaultEnvironment & { encrypted: string };
    }

    it('returns a 64-character hex string', () => {
      const envs = new Map<string, VaultEnvironment>();
      envs.set('development', makeVaultEnv('development', 'enc-dev'));
      const key = Buffer.from('test-key');
      const checksum = computeVaultChecksum(envs, key);
      expect(checksum).toHaveLength(64);
    });

    it('is deterministic (same input → same output)', () => {
      const envs = new Map<string, VaultEnvironment>();
      envs.set('development', makeVaultEnv('development', 'enc-dev'));
      const key = Buffer.from('test-key');
      const c1 = computeVaultChecksum(envs, key);
      const c2 = computeVaultChecksum(envs, key);
      expect(c1).toBe(c2);
    });

    it('changes when environment data changes', () => {
      const key = Buffer.from('test-key');

      const envs1 = new Map<string, VaultEnvironment>();
      const entry1 = makeVaultEnv('development', 'enc-v1');
      (entry1 as unknown as Record<string, unknown>).encrypted = 'enc-v1';
      envs1.set('development', entry1);
      const c1 = computeVaultChecksum(envs1, key);

      const envs2 = new Map<string, VaultEnvironment>();
      const entry2 = makeVaultEnv('development', 'enc-v2');
      (entry2 as unknown as Record<string, unknown>).encrypted = 'enc-v2';
      envs2.set('development', entry2);
      const c2 = computeVaultChecksum(envs2, key);

      expect(c1).not.toBe(c2);
    });

    it('throws EncryptionError for empty key', () => {
      const envs = new Map<string, VaultEnvironment>();
      envs.set('development', makeVaultEnv('development', 'enc'));
      expect(() => computeVaultChecksum(envs, Buffer.alloc(0))).toThrow(EncryptionError);
    });

    it('throws EncryptionError for empty environment set', () => {
      expect(() => computeVaultChecksum(new Map(), Buffer.from('key'))).toThrow(EncryptionError);
    });

    it('includes encrypted data in checksum when available', () => {
      const key = Buffer.from('test-key');

      const envs1 = new Map<string, VaultEnvironment>();
      const entry1 = makeVaultEnv('dev', 'enc-a');
      (entry1 as unknown as Record<string, unknown>).encrypted = 'enc-a';
      envs1.set('dev', entry1);

      const envs2 = new Map<string, VaultEnvironment>();
      const entry2 = makeVaultEnv('dev', 'enc-b');
      (entry2 as unknown as Record<string, unknown>).encrypted = 'enc-b';
      envs2.set('dev', entry2);

      expect(computeVaultChecksum(envs1, key)).not.toBe(computeVaultChecksum(envs2, key));
    });
  });

  // ===========================================================================
  // verifyVaultChecksum
  // ===========================================================================
  describe('verifyVaultChecksum', () => {
    function makeVaultEnv(name: string): VaultEnvironment {
      const env = {
        name,
        varCount: 1,
        lastModified: '2024-01-01T00:00:00.000Z',
        keyIds: ['v1'],
      } as VaultEnvironment & { encrypted: string };
      (env as unknown as Record<string, unknown>).encrypted = `enc-${name}`;
      return env;
    }

    it('returns true for matching checksum', () => {
      const key = Buffer.from('test-key');
      const envs = new Map<string, VaultEnvironment>();
      envs.set('development', makeVaultEnv('development'));
      const checksum = computeVaultChecksum(envs, key);
      expect(verifyVaultChecksum(envs, key, checksum)).toBe(true);
    });

    it('returns false for non-matching checksum', () => {
      const key = Buffer.from('test-key');
      const envs = new Map<string, VaultEnvironment>();
      envs.set('development', makeVaultEnv('development'));
      expect(verifyVaultChecksum(envs, key, 'a'.repeat(64))).toBe(false);
    });

    it('throws EncryptionError for empty key', () => {
      const envs = new Map<string, VaultEnvironment>();
      envs.set('dev', makeVaultEnv('dev'));
      expect(() => verifyVaultChecksum(envs, Buffer.alloc(0), 'a'.repeat(64))).toThrow(EncryptionError);
    });

    it('throws EncryptionError for wrong checksum length', () => {
      const key = Buffer.from('key');
      const envs = new Map<string, VaultEnvironment>();
      envs.set('dev', makeVaultEnv('dev'));
      expect(() => verifyVaultChecksum(envs, key, 'abc')).toThrow(EncryptionError);
    });
  });

  // ===========================================================================
  // checkIntegrity (detailed result)
  // ===========================================================================
  describe('checkIntegrity', () => {
    it('returns valid=true for matching digest', () => {
      const key = Buffer.from('test-key');
      const digest = computeIntegrity('data', key);
      const result = checkIntegrity('data', key, digest, 'test-source');
      expect(result.valid).toBe(true);
      expect(result.message).toContain('PASSED');
    });

    it('returns valid=false for non-matching digest', () => {
      const key = Buffer.from('test-key');
      const result = checkIntegrity('data', key, 'a'.repeat(64), 'test-source');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('FAILED');
    });

    it('includes the source in the message', () => {
      const key = Buffer.from('test-key');
      const result = checkIntegrity('data', key, 'a'.repeat(64), 'production');
      expect(result.message).toContain('production');
    });

    it('includes the expectedDigest', () => {
      const key = Buffer.from('test-key');
      const expected = 'a'.repeat(64);
      const result = checkIntegrity('data', key, expected, 'src');
      expect(result.expectedDigest).toBe(expected);
    });

    it('includes computedDigest when valid', () => {
      const key = Buffer.from('test-key');
      const digest = computeIntegrity('data', key);
      const result = checkIntegrity('data', key, digest, 'src');
      expect(result.computedDigest).toBe(digest);
    });

    it('does not include computedDigest when invalid', () => {
      const key = Buffer.from('test-key');
      const result = checkIntegrity('data', key, 'a'.repeat(64), 'src');
      expect(result.computedDigest).toBeUndefined();
    });

    it('includes timestamp', () => {
      const key = Buffer.from('key');
      const result = checkIntegrity('data', key, computeIntegrity('data', key), 'src');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('handles errors gracefully and returns valid=false', () => {
      const result = checkIntegrity('data', Buffer.alloc(0), 'a'.repeat(64), 'error-src');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('ERROR');
    });
  });

  // ===========================================================================
  // checkVaultIntegrity
  // ===========================================================================
  describe('checkVaultIntegrity', () => {
    it('returns correct totalEnvironments count', () => {
      const key = Buffer.from('key');
      const envs = new Map<string, VaultEnvironment>();
      const env1 = {
        name: 'dev',
        varCount: 1,
        lastModified: '2024-01-01T00:00:00.000Z',
        keyIds: ['v1'],
      } as VaultEnvironment & { encrypted: string };
      (env1 as unknown as Record<string, unknown>).encrypted = 'enc';
      envs.set('dev', env1);

      const result = checkVaultIntegrity(envs, key, computeVaultChecksum(envs, key));
      expect(result.totalEnvironments).toBe(1);
    });

    it('counts passed environments', () => {
      const key = Buffer.from('key');
      const envs = new Map<string, VaultEnvironment>();
      const entry = {
        name: 'dev',
        varCount: 1,
        lastModified: '2024-01-01T00:00:00.000Z',
        keyIds: ['v1'],
      } as VaultEnvironment & { encrypted: string };
      (entry as unknown as Record<string, unknown>).encrypted = 'enc';
      envs.set('dev', entry);

      const result = checkVaultIntegrity(envs, key, computeVaultChecksum(envs, key));
      expect(result.passedEnvironments).toBe(1);
      expect(result.failedEnvironments).toBe(0);
    });

    it('counts failed environments for entries without encrypted data', () => {
      const key = Buffer.from('key');
      const envs = new Map<string, VaultEnvironment>();
      envs.set('dev', {
        name: 'dev',
        varCount: 1,
        lastModified: '2024-01-01T00:00:00.000Z',
        keyIds: ['v1'],
      });

      const result = checkVaultIntegrity(envs, key, computeVaultChecksum(envs, key));
      expect(result.failedEnvironments).toBe(1);
    });

    it('includes per-environment results', () => {
      const key = Buffer.from('key');
      const envs = new Map<string, VaultEnvironment>();
      const entry = {
        name: 'dev',
        varCount: 1,
        lastModified: '2024-01-01T00:00:00.000Z',
        keyIds: ['v1'],
      } as VaultEnvironment & { encrypted: string };
      (entry as unknown as Record<string, unknown>).encrypted = 'enc';
      envs.set('dev', entry);

      const result = checkVaultIntegrity(envs, key, computeVaultChecksum(envs, key));
      expect(result.environments.get('dev')?.valid).toBe(true);
    });

    it('returns valid=true when vault checksum matches and all envs pass', () => {
      const key = Buffer.from('key');
      const envs = new Map<string, VaultEnvironment>();
      const entry = {
        name: 'dev',
        varCount: 1,
        lastModified: '2024-01-01T00:00:00.000Z',
        keyIds: ['v1'],
      } as VaultEnvironment & { encrypted: string };
      (entry as unknown as Record<string, unknown>).encrypted = 'enc';
      envs.set('dev', entry);

      const result = checkVaultIntegrity(envs, key, computeVaultChecksum(envs, key));
      expect(result.valid).toBe(true);
    });
  });
});
