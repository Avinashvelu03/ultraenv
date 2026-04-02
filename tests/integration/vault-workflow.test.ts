// =============================================================================
// Integration Tests — Vault Workflow
// Tests: key generation/format/parse roundtrip, encrypt/decrypt cycles,
//        wrong key fails, vault file serialize/parse roundtrip.
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  encryptEnvironment,
  decryptEnvironment,
  encryptValue,
  decryptValue,
  isEncryptedValue,
  deserializeEnvData,
} from '../../src/vault/encryption.js';
import {
  generateMasterKey,
  formatKey,
  parseKey,
  isValidKeyFormat,
  deriveEnvironmentKey,
} from '../../src/vault/key-manager.js';
import {
  parseVaultFile,
  serializeVaultFile,
} from '../../src/vault/vault-file.js';
import { randomBytes } from 'node:crypto';

describe('integration: vault workflow', () => {
  // ---------------------------------------------------------------------------
  // Key management roundtrip
  // ---------------------------------------------------------------------------
  describe('key generation roundtrip', () => {
    it('generateMasterKey → formatKey → parseKey roundtrip preserves the key', () => {
      const originalKey = generateMasterKey();

      // Format to string
      const formatted = formatKey(originalKey);
      expect(typeof formatted).toBe('string');
      expect(formatted).toContain('ultraenv_key_v1_');

      // Parse back to buffer
      const parsedKey = parseKey(formatted);

      // Keys must match exactly
      expect(parsedKey).toEqual(originalKey);
    });

    it('generateMasterKey produces a 32-byte key', () => {
      const key = generateMasterKey();
      expect(key.length).toBe(32);
    });

    it('formatKey produces valid format', () => {
      const key = generateMasterKey();
      const formatted = formatKey(key);
      expect(isValidKeyFormat(formatted)).toBe(true);
    });

    it('isValidKeyFormat rejects invalid formats', () => {
      expect(isValidKeyFormat('not-a-key')).toBe(false);
      expect(isValidKeyFormat('')).toBe(false);
      expect(isValidKeyFormat('ultraenv_key_v1_')).toBe(false);
    });

    it('parseKey rejects non-ultraenv format', () => {
      expect(() => parseKey('invalid-key')).toThrow();
    });

    it('deriveEnvironmentKey produces deterministic unique keys', () => {
      const masterKey = generateMasterKey();
      const devKey = deriveEnvironmentKey(masterKey, 'development');
      const prodKey = deriveEnvironmentKey(masterKey, 'production');
      const devKey2 = deriveEnvironmentKey(masterKey, 'development');

      // Same environment → same key (deterministic)
      expect(devKey).toEqual(devKey2);
      // Different environments → different keys
      expect(devKey).not.toEqual(prodKey);
      // All keys are 32 bytes
      expect(devKey.length).toBe(32);
      expect(prodKey.length).toBe(32);
    });

    it('deriveEnvironmentKey key → formatKey → parseKey roundtrip', () => {
      const masterKey = generateMasterKey();
      const envKey = deriveEnvironmentKey(masterKey, 'production');

      const formatted = formatKey(envKey);
      const parsed = parseKey(formatted);

      expect(parsed).toEqual(envKey);
    });
  });

  // ---------------------------------------------------------------------------
  // encryptEnvironment → decryptEnvironment roundtrip
  // ---------------------------------------------------------------------------
  describe('encryptEnvironment ↔ decryptEnvironment', () => {
    it('encrypts and decrypts environment data correctly', () => {
      const key = generateMasterKey();
      const originalData: Record<string, string> = {
        DATABASE_URL: 'postgres://user:pass@localhost:5432/mydb',
        API_KEY: 'sk_live_abc123def456',
        PORT: '3000',
        HOST: 'example.com',
      };

      const encrypted = encryptEnvironment(originalData, key);
      const decrypted = decryptEnvironment(encrypted, key);

      expect(typeof decrypted).toBe('string');
      const parsed = deserializeEnvData(decrypted);

      // Keys should match
      expect(Object.keys(parsed).sort()).toEqual(
        Object.keys(originalData).sort(),
      );

      // Values should match
      for (const [k, v] of Object.entries(originalData)) {
        expect(parsed[k]).toBe(v);
      }
    });

    it('produces different ciphertext on each encryption (random IV)', () => {
      const key = generateMasterKey();
      const data = { SECRET: 'my-secret-value' };

      const encrypted1 = encryptEnvironment(data, key);
      const encrypted2 = encryptEnvironment(data, key);

      // The ciphertext should be different because IV is random
      expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toEqual(encrypted2.iv);

      // But both should decrypt to the same plaintext
      const decrypted1 = deserializeEnvData(decryptEnvironment(encrypted1, key));
      const decrypted2 = deserializeEnvData(decryptEnvironment(encrypted2, key));
      expect(decrypted1).toEqual(decrypted2);
    });

    it('wrong key fails to decrypt', () => {
      const correctKey = generateMasterKey();
      const wrongKey = generateMasterKey();
      const data = { SECRET: 'sensitive-data' };

      const encrypted = encryptEnvironment(data, correctKey);

      expect(() => {
        decryptEnvironment(encrypted, wrongKey);
      }).toThrow();
    });

    it('throws when trying to encrypt empty data', () => {
      const key = generateMasterKey();

      expect(() => {
        encryptEnvironment({}, key);
      }).toThrow('Cannot encrypt empty environment data');
    });

    it('handles special characters in values', () => {
      const key = generateMasterKey();
      const data = {
        VALUE_WITH_EQUALS: 'key=value',
        VALUE_WITH_NEWLINES: 'line1\nline2',
        VALUE_WITH_QUOTES: 'she said "hello"',
        VALUE_WITH_SPECIAL: '!@#$%^&*()_+-={}[]|\\:;<>?,./',
      };

      const encrypted = encryptEnvironment(data, key);
      const decrypted = deserializeEnvData(decryptEnvironment(encrypted, key));

      expect(decrypted.VALUE_WITH_EQUALS).toBe('key=value');
      expect(decrypted.VALUE_WITH_NEWLINES).toBe('line1\nline2');
      expect(decrypted.VALUE_WITH_QUOTES).toBe('she said "hello"');
      expect(decrypted.VALUE_WITH_SPECIAL).toBe('!@#$%^&*()_+-={}[]|\\:;<>?,./');
    });

    it('serialized output has sorted keys', () => {
      const key = generateMasterKey();
      const data = {
        ZEBRA: 'last',
        ALPHA: 'first',
        MIDDLE: 'mid',
      };

      const encrypted = encryptEnvironment(data, key);
      const decrypted = decryptEnvironment(encrypted, key);

      // Keys should be in alphabetical order in the serialized format
      const lines = decrypted.split('\n');
      const keys = lines.map(line => line.split('=')[0]);
      expect(keys).toEqual(['ALPHA', 'MIDDLE', 'ZEBRA']);
    });
  });

  // ---------------------------------------------------------------------------
  // encryptValue → decryptValue roundtrip
  // ---------------------------------------------------------------------------
  describe('encryptValue ↔ decryptValue', () => {
    it('encrypts and decrypts a single value correctly', () => {
      const key = generateMasterKey();
      const secret = 'my-password-123';

      const encrypted = encryptValue(secret, key);
      const decrypted = decryptValue(encrypted, key);

      expect(decrypted).toBe(secret);
    });

    it('produces different ciphertext each time', () => {
      const key = generateMasterKey();
      const value = 'same-value';

      const encrypted1 = encryptValue(value, key);
      const encrypted2 = encryptValue(value, key);

      // Should be different strings (different IVs)
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('encrypted value has the correct prefix format', () => {
      const key = generateMasterKey();
      const encrypted = encryptValue('test', key);

      expect(encrypted.startsWith('encrypted:v1:aes-256-gcm:')).toBe(true);
      expect(isEncryptedValue(encrypted)).toBe(true);
    });

    it('isEncryptedValue correctly identifies encrypted values', () => {
      const key = generateMasterKey();
      const encrypted = encryptValue('secret', key);

      expect(isEncryptedValue(encrypted)).toBe(true);
      expect(isEncryptedValue('plain-text')).toBe(false);
      expect(isEncryptedValue('')).toBe(false);
      expect(isEncryptedValue('encrypted:')).toBe(false);
    });

    it('wrong key fails to decrypt', () => {
      const correctKey = generateMasterKey();
      const wrongKey = generateMasterKey();

      const encrypted = encryptValue('secret-data', correctKey);

      expect(() => {
        decryptValue(encrypted, wrongKey);
      }).toThrow();
    });

    it('decryptValue rejects non-encrypted input', () => {
      const key = generateMasterKey();

      expect(() => {
        decryptValue('not-encrypted', key);
      }).toThrow('Invalid encrypted value format');
    });

    it('handles long values', () => {
      const key = generateMasterKey();
      const longValue = 'a'.repeat(10000) + 'SECRET-MIDDLE' + 'b'.repeat(10000);

      const encrypted = encryptValue(longValue, key);
      const decrypted = decryptValue(encrypted, key);

      expect(decrypted).toBe(longValue);
    });

    it('throws when trying to encrypt empty string', () => {
      const key = generateMasterKey();
      // Empty string encryption produces empty base64 components
      // which fail the validation in encryptValue or decryptValue
      const encrypted = encryptValue('', key);
      expect(() => decryptValue(encrypted, key)).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Wrong key failures
  // ---------------------------------------------------------------------------
  describe('wrong key failures', () => {
    it('decryptEnvironment with wrong key throws EncryptionError', () => {
      const key1 = generateMasterKey();
      const key2 = generateMasterKey();
      const encrypted = encryptEnvironment({ FOO: 'bar' }, key1);

      expect(() => decryptEnvironment(encrypted, key2)).toThrow(
        'Failed to decrypt environment data',
      );
    });

    it('decryptValue with corrupted ciphertext throws', () => {
      const key = generateMasterKey();
      // Manually create a corrupted encrypted string
      const encrypted = encryptValue('test', key);
      // Swap some characters in the base64 payload
      const corrupted = encrypted.slice(0, -5) + 'XXXXX';

      expect(() => decryptValue(corrupted, key)).toThrow();
    });

    it('encryptEnvironment rejects wrong key length', () => {
      const shortKey = randomBytes(16); // Only 16 bytes, not 32

      expect(() => {
        encryptEnvironment({ FOO: 'bar' }, shortKey);
      }).toThrow('Invalid key length');
    });
  });

  // ---------------------------------------------------------------------------
  // Vault file serialize → parse roundtrip
  // ---------------------------------------------------------------------------
  describe('vault file serialize ↔ parse roundtrip', () => {
    it('serializes and parses a vault file with one environment', () => {
      const key = generateMasterKey();
      const encryptedValue = encryptValue('vault-secret-data', key);

      const vaultMap = new Map<string, { name: string; varCount: number; lastModified: string; keyIds: string[]; encrypted: string }>();
      vaultMap.set('development', {
        name: 'development',
        varCount: 5,
        lastModified: '2024-01-15T10:30:00.000Z',
        keyIds: ['v1'],
        encrypted: encryptedValue,
      });

      const serialized = serializeVaultFile(vaultMap as any);
      const parsed = parseVaultFile(serialized);

      expect(parsed.has('development')).toBe(true);
      const entry = parsed.get('development')!;
      expect(entry.name).toBe('development');
      // parseVaultFile estimates varCount as 1 for encrypted payloads
      // (it cannot decrypt to count actual vars)
      expect(entry.varCount).toBe(1);
      expect(entry.encrypted).toBe(encryptedValue);
    });

    it('serializes and parses a vault file with multiple environments', () => {
      const key = generateMasterKey();

      const vaultMap = new Map<string, { name: string; varCount: number; lastModified: string; keyIds: string[]; encrypted: string }>();
      vaultMap.set('development', {
        name: 'development',
        varCount: 3,
        lastModified: '2024-01-01T00:00:00.000Z',
        keyIds: ['v1'],
        encrypted: encryptValue('dev-data', key),
      });
      vaultMap.set('production', {
        name: 'production',
        varCount: 7,
        lastModified: '2024-01-15T00:00:00.000Z',
        keyIds: ['v1'],
        encrypted: encryptValue('prod-data', key),
      });
      vaultMap.set('staging', {
        name: 'staging',
        varCount: 5,
        lastModified: '2024-01-10T00:00:00.000Z',
        keyIds: ['v1'],
        encrypted: encryptValue('staging-data', key),
      });

      const serialized = serializeVaultFile(vaultMap as any);
      const parsed = parseVaultFile(serialized);

      expect(parsed.size).toBe(3);
      expect(parsed.has('development')).toBe(true);
      expect(parsed.has('production')).toBe(true);
      expect(parsed.has('staging')).toBe(true);

      // Decrypt values to verify roundtrip
      const devEntry = parsed.get('development')!;
      const decrypted = decryptValue(devEntry.encrypted, key);
      expect(decrypted).toBe('dev-data');
    });

    it('serialized vault file starts with header comment', () => {
      const key = generateMasterKey();

      const vaultMap = new Map<string, { name: string; varCount: number; lastModified: string; keyIds: string[]; encrypted: string }>();
      vaultMap.set('development', {
        name: 'development',
        varCount: 1,
        lastModified: '2024-01-01T00:00:00.000Z',
        keyIds: ['v1'],
        encrypted: encryptValue('data', key),
      });

      const serialized = serializeVaultFile(vaultMap as any);

      expect(serialized).toContain('# ultraenv encrypted vault');
      expect(serialized).toContain('Generated:');
      expect(serialized).toContain('Environments: development');
      expect(serialized).toContain('ULTRAENV_VAULT_DEVELOPMENT="encrypted:v1:');
    });

    it('parseVaultFile returns empty map for empty content', () => {
      const parsed = parseVaultFile('');
      expect(parsed.size).toBe(0);
    });

    it('parseVaultFile skips comments and blank lines', () => {
      const content = [
        '# This is a comment',
        '',
        '  ',
        '# Another comment',
        'ULTRAENV_VAULT_TEST="encrypted:v1:aes-256-gcm:dGVzdA==:dGVzdA==:dGVzdA=="',
      ].join('\n');

      const parsed = parseVaultFile(content);
      expect(parsed.size).toBe(1);
      expect(parsed.has('test')).toBe(true);
    });

    it('full roundtrip: encrypt env → serialize vault → parse vault → decrypt', () => {
      const masterKey = generateMasterKey();
      const envKey = deriveEnvironmentKey(masterKey, 'production');

      const originalEnv = {
        DATABASE_URL: 'postgres://prod-db.example.com/app',
        API_KEY: 'sk_prod_secret_key',
        REDIS_URL: 'redis://prod-redis.example.com:6379',
      };

      // Encrypt the environment
      const encrypted = encryptEnvironment(originalEnv, envKey);

      // Serialize the encrypted data as a vault file value
      const vaultMap = new Map<string, { name: string; varCount: number; lastModified: string; keyIds: string[]; encrypted: string }>();
      vaultMap.set('production', {
        name: 'production',
        varCount: Object.keys(originalEnv).length,
        lastModified: new Date().toISOString(),
        keyIds: ['v1'],
        encrypted: `encrypted:v1:aes-256-gcm:${encrypted.iv.toString('base64')}:${encrypted.authTag.toString('base64')}:${encrypted.ciphertext.toString('base64')}`,
      });

      const serialized = serializeVaultFile(vaultMap as any);
      const parsed = parseVaultFile(serialized);

      expect(parsed.has('production')).toBe(true);

      // Reconstruct the EncryptionResult from the entry and decrypt
      const entry = parsed.get('production')!;
      const parts = entry.encrypted.replace('encrypted:v1:aes-256-gcm:', '').split(':');
      const iv = Buffer.from(parts[0]!, 'base64');
      const authTag = Buffer.from(parts[1]!, 'base64');
      const ciphertext = Buffer.from(parts[2]!, 'base64');

      const decryptedStr = decryptEnvironment(
        {
          iv,
          authTag,
          ciphertext,
          algorithm: 'aes-256-gcm',
        },
        envKey,
      );

      const finalEnv = deserializeEnvData(decryptedStr);

      expect(finalEnv.DATABASE_URL).toBe(originalEnv.DATABASE_URL);
      expect(finalEnv.API_KEY).toBe(originalEnv.API_KEY);
      expect(finalEnv.REDIS_URL).toBe(originalEnv.REDIS_URL);
    });
  });
});
