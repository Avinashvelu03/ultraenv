import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateMasterKey,
  deriveEnvironmentKey,
  formatKey,
  parseKey,
  isValidKeyFormat,
  maskKey,
  generateKeysFile,
  parseKeysFile,
  rotateKey,
} from '../../../src/vault/key-manager.js';
import { EncryptionError } from '../../../src/core/errors.js';
import { decryptValue } from '../../../src/vault/encryption.js';
import { DEFAULT_KEY_LENGTH } from '../../../src/core/constants.js';

describe('key-manager', () => {
  // ===========================================================================
  // generateMasterKey
  // ===========================================================================
  describe('generateMasterKey', () => {
    it('returns a 32-byte Buffer', () => {
      const key = generateMasterKey();
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(DEFAULT_KEY_LENGTH);
    });

    it('generates different keys on each call (randomness)', () => {
      const keys = new Set<string>();
      for (let i = 0; i < 20; i++) {
        keys.add(generateMasterKey().toString('hex'));
      }
      // With 20 samples of 256-bit keys, all should be unique
      expect(keys.size).toBe(20);
    });

    it('generates a key with all non-zero bytes (extremely unlikely all-zero)', () => {
      const key = generateMasterKey();
      const hasNonZero = Array.from(key).some((b) => b !== 0);
      expect(hasNonZero).toBe(true);
    });
  });

  // ===========================================================================
  // deriveEnvironmentKey
  // ===========================================================================
  describe('deriveEnvironmentKey', () => {
    let masterKey: Buffer;

    beforeEach(() => {
      masterKey = generateMasterKey();
    });

    it('derives a 32-byte key for an environment', () => {
      const envKey = deriveEnvironmentKey(masterKey, 'development');
      expect(envKey).toBeInstanceOf(Buffer);
      expect(envKey.length).toBe(DEFAULT_KEY_LENGTH);
    });

    it('produces different keys for different environments', () => {
      const devKey = deriveEnvironmentKey(masterKey, 'development');
      const prodKey = deriveEnvironmentKey(masterKey, 'production');
      expect(devKey.equals(prodKey)).toBe(false);
    });

    it('produces the same key for the same environment (deterministic)', () => {
      const key1 = deriveEnvironmentKey(masterKey, 'staging');
      const key2 = deriveEnvironmentKey(masterKey, 'staging');
      expect(key1.equals(key2)).toBe(true);
    });

    it('throws EncryptionError for wrong key length (too short)', () => {
      expect(() => deriveEnvironmentKey(Buffer.alloc(16), 'development')).toThrow(EncryptionError);
    });

    it('throws EncryptionError for wrong key length (too long)', () => {
      expect(() => deriveEnvironmentKey(Buffer.alloc(64), 'development')).toThrow(EncryptionError);
    });

    it('throws EncryptionError for empty environment name', () => {
      expect(() => deriveEnvironmentKey(masterKey, '')).toThrow(EncryptionError);
    });

    it('throws EncryptionError with message about key length', () => {
      try {
        deriveEnvironmentKey(Buffer.alloc(16), 'test');
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(EncryptionError);
        expect((err as EncryptionError).message).toContain('32 bytes');
      }
    });

    it('throws EncryptionError with message about empty environment', () => {
      try {
        deriveEnvironmentKey(masterKey, '');
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(EncryptionError);
        expect((err as EncryptionError).message).toContain('empty');
      }
    });

    it('derives keys for many environment names', () => {
      const envs = ['development', 'staging', 'production', 'test', 'ci', 'preview', 'custom-env'];
      const keys = new Set<string>();
      for (const env of envs) {
        const key = deriveEnvironmentKey(masterKey, env);
        keys.add(key.toString('hex'));
      }
      expect(keys.size).toBe(envs.length);
    });
  });

  // ===========================================================================
  // formatKey / parseKey roundtrip
  // ===========================================================================
  describe('formatKey / parseKey', () => {
    it('roundtrip: format then parse returns the original key', () => {
      const original = generateMasterKey();
      const formatted = formatKey(original);
      const parsed = parseKey(formatted);
      expect(parsed.equals(original)).toBe(true);
    });

    it('formatted key starts with the key prefix', () => {
      const key = generateMasterKey();
      const formatted = formatKey(key);
      expect(formatted.startsWith('ultraenv_key_v1_')).toBe(true);
    });

    it('formatted key contains base64 data after prefix', () => {
      const key = generateMasterKey();
      const formatted = formatKey(key);
      const base64Part = formatted.slice('ultraenv_key_v1_'.length);
      expect(base64Part.length).toBeGreaterThan(0);
      // Should be valid base64
      expect(() => Buffer.from(base64Part, 'base64')).not.toThrow();
    });

    it('parseKey throws for missing prefix', () => {
      expect(() => parseKey('not-a-key')).toThrow(EncryptionError);
    });

    it('parseKey throws for prefix-only string', () => {
      expect(() => parseKey('ultraenv_key_v1_')).toThrow(EncryptionError);
    });

    it('parseKey decodes base64 (Node.js is lenient with invalid base64 chars)', () => {
      // Buffer.from('!!!invalid!!!', 'base64') does NOT throw in Node.js;
      // it silently ignores invalid characters and returns a partial decode.
      const result = parseKey('ultraenv_key_v1_!!!invalid!!!');
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('parseKey throws with message about invalid prefix', () => {
      try {
        parseKey('bogus_key_v1_abc');
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(EncryptionError);
        expect((err as EncryptionError).message).toContain('prefix');
      }
    });

    it('formatKey throws for empty key', () => {
      expect(() => formatKey(Buffer.alloc(0))).toThrow(EncryptionError);
    });

    it('formatKey throws with message about empty key', () => {
      try {
        formatKey(Buffer.alloc(0));
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(EncryptionError);
        expect((err as EncryptionError).message).toContain('empty');
      }
    });
  });

  // ===========================================================================
  // isValidKeyFormat
  // ===========================================================================
  describe('isValidKeyFormat', () => {
    it('returns true for a valid formatted key', () => {
      const key = generateMasterKey();
      const formatted = formatKey(key);
      expect(isValidKeyFormat(formatted)).toBe(true);
    });

    it('returns false for a random string', () => {
      expect(isValidKeyFormat('not-a-key')).toBe(false);
    });

    it('returns false for prefix only', () => {
      expect(isValidKeyFormat('ultraenv_key_v1_')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidKeyFormat('')).toBe(false);
    });

    it('returns false for non-string input', () => {
      expect(isValidKeyFormat(123 as unknown as string)).toBe(false);
      expect(isValidKeyFormat(null as unknown as string)).toBe(false);
      expect(isValidKeyFormat(undefined as unknown as string)).toBe(false);
    });

    it('returns false for key with corrupted base64', () => {
      expect(isValidKeyFormat('ultraenv_key_v1_!!!invalid!!!')).toBe(false);
    });

    it('returns false for key with base64 that decodes to less than 16 bytes', () => {
      // base64 of a very short buffer (< 16 bytes)
      const shortBuf = Buffer.alloc(8);
      const b64 = shortBuf.toString('base64');
      expect(isValidKeyFormat(`ultraenv_key_v1_${b64}`)).toBe(false);
    });

    it('returns true for key with base64 that decodes to 16+ bytes', () => {
      const buf = Buffer.alloc(16, 0x41);
      const b64 = buf.toString('base64');
      expect(isValidKeyFormat(`ultraenv_key_v1_${b64}`)).toBe(true);
    });
  });

  // ===========================================================================
  // maskKey
  // ===========================================================================
  describe('maskKey', () => {
    it('masks a long formatted key', () => {
      const key = generateMasterKey();
      const formatted = formatKey(key);
      const masked = maskKey(formatted);
      expect(masked.length).toBe(formatted.length);
      // Should show first 8 and last 4 chars
      expect(masked.startsWith(formatted.slice(0, 8))).toBe(true);
      expect(masked.endsWith(formatted.slice(-4))).toBe(true);
      // Middle should be all asterisks
      const middle = masked.slice(8, -4);
      expect(middle).toBe('*'.repeat(middle.length));
    });

    it('returns "***" for very short strings (14 or fewer chars)', () => {
      expect(maskKey('short')).toBe('***');
      expect(maskKey('12345678901234')).toBe('***');
    });

    it('returns "***" for empty string', () => {
      expect(maskKey('')).toBe('***');
    });

    it('returns "***" for strings <= 14 chars', () => {
      expect(maskKey('12345678')).toBe('***');
      expect(maskKey('12345678901234')).toBe('***');
    });

    it('correctly masks a known key', () => {
      const formatted = 'ultraenv_key_v1_aBcDeFgHiJkLmNoPqRsTuVwXyZ012345==';
      const masked = maskKey(formatted);
      // maskKey shows first 8 and last 4 chars, with asterisks in between.
      // length=50, visibleStart=8, visibleEnd=4 → 50-8-4=38 asterisks
      expect(masked).toBe('ultraenv**************************************45==');
    });
  });

  // ===========================================================================
  // generateKeysFile / parseKeysFile
  // ===========================================================================
  describe('generateKeysFile / parseKeysFile', () => {
    it('generates a file with header comments', () => {
      const content = generateKeysFile(['development']);
      expect(content).toContain('# ultraenv encryption keys — DO NOT COMMIT');
      expect(content).toContain('# Generated:');
    });

    it('includes all specified environments', () => {
      const content = generateKeysFile(['development', 'staging', 'production']);
      expect(content).toContain('ULTRAENV_KEY_DEVELOPMENT=');
      expect(content).toContain('ULTRAENV_KEY_STAGING=');
      expect(content).toContain('ULTRAENV_KEY_PRODUCTION=');
    });

    it('generates empty values for each key', () => {
      const content = generateKeysFile(['development']);
      expect(content).toContain('ULTRAENV_KEY_DEVELOPMENT=""');
    });

    it('includes environment-specific comments', () => {
      const content = generateKeysFile(['staging']);
      expect(content).toContain('# Key for "staging" environment');
    });

    it('parseKeysFile extracts environment-key mappings', () => {
      const content = `# ultraenv encryption keys\nULTRAENV_KEY_DEVELOPMENT="ultraenv_key_v1_abc123"\nULTRAENV_KEY_PRODUCTION="ultraenv_key_v1_def456"`;
      const map = parseKeysFile(content);
      expect(map.get('development')).toBe('ultraenv_key_v1_abc123');
      expect(map.get('production')).toBe('ultraenv_key_v1_def456');
    });

    it('parseKeysFile normalizes environment names to lowercase', () => {
      const content = 'ULTRAENV_KEY_STAGING="ultraenv_key_v1_abc"';
      const map = parseKeysFile(content);
      expect(map.get('staging')).toBe('ultraenv_key_v1_abc');
    });

    it('parseKeysFile skips comments and empty lines', () => {
      const content = `# comment\n\nULTRAENV_KEY_TEST="ultraenv_key_v1_abc"\n`;
      const map = parseKeysFile(content);
      expect(map.size).toBe(1);
      expect(map.get('test')).toBe('ultraenv_key_v1_abc');
    });

    it('parseKeysFile handles unquoted values', () => {
      const content = 'ULTRAENV_KEY_CI=ultraenv_key_v1_abc';
      const map = parseKeysFile(content);
      expect(map.get('ci')).toBe('ultraenv_key_v1_abc');
    });

    it('parseKeysFile throws for invalid format', () => {
      const content = 'INVALID_LINE=nothing';
      expect(() => parseKeysFile(content)).toThrow(EncryptionError);
    });

    it('parseKeysFile handles empty content', () => {
      const map = parseKeysFile('');
      expect(map.size).toBe(0);
    });

    it('roundtrip: generateKeysFile then parseKeysFile extracts env names', () => {
      const envs = ['development', 'staging', 'production'];
      const content = generateKeysFile(envs);
      const map = parseKeysFile(content);
      for (const env of envs) {
        expect(map.has(env)).toBe(true);
      }
    });
  });

  // ===========================================================================
  // rotateKey
  // ===========================================================================
  describe('rotateKey', () => {
    let oldKey: Buffer;
    let newKey: Buffer;

    beforeEach(() => {
      oldKey = generateMasterKey();
      newKey = generateMasterKey();
    });

    it('encrypts data with the new key', () => {
      const plaintext = 'my-secret-data';
      const encrypted = rotateKey(oldKey, plaintext, newKey);
      // Should be encrypted with newKey
      const decrypted = decryptValue(encrypted, newKey);
      expect(decrypted).toBe(plaintext);
    });

    it('throws EncryptionError for wrong old key length', () => {
      expect(() => rotateKey(Buffer.alloc(16), 'data', newKey)).toThrow(EncryptionError);
    });

    it('throws EncryptionError for wrong new key length', () => {
      expect(() => rotateKey(oldKey, 'data', Buffer.alloc(16))).toThrow(EncryptionError);
    });

    it('rotated data cannot be decrypted with old key', () => {
      const plaintext = 'sensitive-value';
      const encrypted = rotateKey(oldKey, plaintext, newKey);
      expect(() => decryptValue(encrypted, oldKey)).toThrow();
    });

    it('rotated data CAN be decrypted with new key', () => {
      const plaintext = 'another-secret';
      const encrypted = rotateKey(oldKey, plaintext, newKey);
      expect(decryptValue(encrypted, newKey)).toBe(plaintext);
    });

    it('produces encrypted output starting with prefix', () => {
      const encrypted = rotateKey(oldKey, 'test', newKey);
      expect(encrypted.startsWith('encrypted:v1:aes-256-gcm:')).toBe(true);
    });
  });
});
