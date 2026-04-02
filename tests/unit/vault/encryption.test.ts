import { describe, it, expect, beforeEach } from 'vitest';
import {
  encryptEnvironment,
  decryptEnvironment,
  deserializeEnvData,
  encryptValue,
  decryptValue,
  isEncryptedValue,
} from '../../../src/vault/encryption.js';
import { EncryptionError } from '../../../src/core/errors.js';
import { randomBytes } from '../../../src/utils/crypto.js';

describe('vault encryption', () => {
  let key: Buffer;

  beforeEach(() => {
    key = randomBytes(32);
  });

  // ---------------------------------------------------------------------------
  // Helper: generate a valid 32-byte key
  // ---------------------------------------------------------------------------
  function makeKey(bytes?: Buffer): Buffer {
    return bytes ?? randomBytes(32);
  }

  // ===========================================================================
  // encryptEnvironment / decryptEnvironment roundtrip
  // ===========================================================================
  describe('encryptEnvironment / decryptEnvironment roundtrip', () => {
    it('encrypts and decrypts a single env var', () => {
      const data = { DATABASE_URL: 'postgres://localhost/mydb' };
      const encrypted = encryptEnvironment(data, key);
      const serialized = decryptEnvironment(encrypted, key);
      expect(serialized).toBe('DATABASE_URL=postgres://localhost/mydb');
    });

    it('encrypts and decrypts multiple env vars', () => {
      const data = {
        DATABASE_URL: 'postgres://localhost/mydb',
        API_KEY: 'sk-abc123',
        PORT: '5432',
        HOST: 'localhost',
      };
      const encrypted = encryptEnvironment(data, key);
      const serialized = decryptEnvironment(encrypted, key);
      // Keys should be sorted alphabetically
      expect(serialized).toContain('API_KEY=sk-abc123');
      expect(serialized).toContain('DATABASE_URL=postgres://localhost/mydb');
      expect(serialized).toContain('HOST=localhost');
      expect(serialized).toContain('PORT=5432');
    });

    it('roundtrip preserves values with special characters', () => {
      const data = {
        CONNECTION_STRING: 'postgresql://user:p@ssw0rd!@db.example.com:5432/mydb?sslmode=require',
        JWT_SECRET: 'my-secret-123_456.789',
      };
      const encrypted = encryptEnvironment(data, key);
      const serialized = decryptEnvironment(encrypted, key);
      expect(serialized).toContain('CONNECTION_STRING=postgresql://user:p@ssw0rd!@db.example.com:5432/mydb?sslmode=require');
      expect(serialized).toContain('JWT_SECRET=my-secret-123_456.789');
    });

    it('roundtrip preserves values with equals signs', () => {
      const data = { MATH_EXPR: '1+1=2' };
      const encrypted = encryptEnvironment(data, key);
      const serialized = decryptEnvironment(encrypted, key);
      expect(serialized).toContain('MATH_EXPR=1+1=2');
    });

    it('roundtrip preserves empty values', () => {
      const data = { EMPTY_VAR: '', NON_EMPTY: 'hello' };
      const encrypted = encryptEnvironment(data, key);
      const serialized = decryptEnvironment(encrypted, key);
      expect(serialized).toContain('EMPTY_VAR=');
      expect(serialized).toContain('NON_EMPTY=hello');
    });

    it('roundtrip preserves values with newlines', () => {
      const data = { MULTI_LINE: 'line1\nline2\nline3' };
      const encrypted = encryptEnvironment(data, key);
      const serialized = decryptEnvironment(encrypted, key);
      // Newlines in values should be escaped as \\n in the serialized form
      expect(serialized).toContain('MULTI_LINE=line1\\nline2\\nline3');
    });

    it('roundtrip preserves UTF-8 values', () => {
      const data = {
        GREETING: 'こんにちは世界',
        EMOJI: '🎉🚀',
        NAME: 'François',
      };
      const encrypted = encryptEnvironment(data, key);
      const serialized = decryptEnvironment(encrypted, key);
      expect(serialized).toContain('GREETING=こんにちは世界');
      expect(serialized).toContain('EMOJI=🎉🚀');
      expect(serialized).toContain('NAME=François');
    });

    it('produces different ciphertext on each call (random IV)', () => {
      const data = { SECRET: 'my-value' };
      const enc1 = encryptEnvironment(data, key);
      const enc2 = encryptEnvironment(data, key);
      expect(enc1.ciphertext.equals(enc2.ciphertext)).toBe(false);
    });

    it('sets algorithm to aes-256-gcm', () => {
      const encrypted = encryptEnvironment({ A: '1' }, key);
      expect(encrypted.algorithm).toBe('aes-256-gcm');
    });

    it('returns IV of correct length (12 bytes)', () => {
      const encrypted = encryptEnvironment({ A: '1' }, key);
      expect(encrypted.iv.length).toBe(12);
    });

    it('returns auth tag of correct length (16 bytes)', () => {
      const encrypted = encryptEnvironment({ A: '1' }, key);
      expect(encrypted.authTag.length).toBe(16);
    });

    it('returns non-empty ciphertext', () => {
      const encrypted = encryptEnvironment({ A: '1' }, key);
      expect(encrypted.ciphertext.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // encryptEnvironment — error cases
  // ===========================================================================
  describe('encryptEnvironment errors', () => {
    it('throws EncryptionError for wrong key length (too short)', () => {
      const shortKey = randomBytes(16);
      expect(() => encryptEnvironment({ A: '1' }, shortKey)).toThrow(EncryptionError);
    });

    it('throws EncryptionError for wrong key length (too long)', () => {
      const longKey = randomBytes(64);
      expect(() => encryptEnvironment({ A: '1' }, longKey)).toThrow(EncryptionError);
    });

    it('throws EncryptionError for empty data', () => {
      expect(() => encryptEnvironment({}, key)).toThrow(EncryptionError);
    });

    it('throws EncryptionError with message about key length', () => {
      try {
        encryptEnvironment({ A: '1' }, randomBytes(16));
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(EncryptionError);
        expect((err as EncryptionError).message).toContain('32 bytes');
      }
    });

    it('throws EncryptionError with message about empty data', () => {
      try {
        encryptEnvironment({}, key);
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(EncryptionError);
        expect((err as EncryptionError).message).toContain('empty');
      }
    });
  });

  // ===========================================================================
  // decryptEnvironment — error cases
  // ===========================================================================
  describe('decryptEnvironment errors', () => {
    it('throws EncryptionError for wrong key length', () => {
      const encrypted = encryptEnvironment({ A: '1' }, key);
      const wrongKey = randomBytes(16);
      expect(() => decryptEnvironment(encrypted, wrongKey)).toThrow(EncryptionError);
    });

    it('throws EncryptionError when using completely wrong key', () => {
      const encrypted = encryptEnvironment({ A: '1' }, key);
      const wrongKey = randomBytes(32);
      expect(() => decryptEnvironment(encrypted, wrongKey)).toThrow(EncryptionError);
    });

    it('throws EncryptionError for unsupported algorithm', () => {
      const encrypted = encryptEnvironment({ A: '1' }, key);
      const tampered = { ...encrypted, algorithm: 'aes-128-cbc' };
      expect(() => decryptEnvironment(tampered, key)).toThrow(EncryptionError);
      try {
        decryptEnvironment(tampered, key);
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect((err as EncryptionError).message).toContain('Unsupported algorithm');
      }
    });

    it('throws EncryptionError for wrong IV length', () => {
      const encrypted = encryptEnvironment({ A: '1' }, key);
      const tampered = { ...encrypted, iv: randomBytes(8) };
      expect(() => decryptEnvironment(tampered, key)).toThrow(EncryptionError);
    });

    it('throws EncryptionError for wrong auth tag length', () => {
      const encrypted = encryptEnvironment({ A: '1' }, key);
      const tampered = { ...encrypted, authTag: randomBytes(8) };
      expect(() => decryptEnvironment(tampered, key)).toThrow(EncryptionError);
    });

    it('throws EncryptionError for tampered ciphertext', () => {
      const encrypted = encryptEnvironment({ A: '1' }, key);
      const tamperedCiphertext = Buffer.from(encrypted.ciphertext);
      tamperedCiphertext[0] = (tamperedCiphertext[0] as number) ^ 0xff;
      const tampered = { ...encrypted, ciphertext: tamperedCiphertext };
      expect(() => decryptEnvironment(tampered, key)).toThrow(EncryptionError);
    });
  });

  // ===========================================================================
  // encryptValue / decryptValue roundtrip
  // ===========================================================================
  describe('encryptValue / decryptValue roundtrip', () => {
    it('encrypts and decrypts a value', () => {
      const plaintext = 'my-secret-password';
      const encrypted = encryptValue(plaintext, key);
      const decrypted = decryptValue(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it('encrypts and decrypts a single-character string', () => {
      const encrypted = encryptValue('a', key);
      const decrypted = decryptValue(encrypted, key);
      expect(decrypted).toBe('a');
    });

    it('encrypts and decrypts special characters', () => {
      const plaintext = 'p@$$w0rd!#&*=+';
      const encrypted = encryptValue(plaintext, key);
      const decrypted = decryptValue(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it('encrypts and decrypts long values', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encryptValue(plaintext, key);
      const decrypted = decryptValue(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it('encrypts and decrypts UTF-8 values', () => {
      const plaintext = 'こんにちは世界🎉🚀François';
      const encrypted = encryptValue(plaintext, key);
      const decrypted = decryptValue(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it('produces different ciphertext on each call', () => {
      const encrypted1 = encryptValue('secret', key);
      const encrypted2 = encryptValue('secret', key);
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('starts with the encrypted prefix', () => {
      const encrypted = encryptValue('secret', key);
      expect(encrypted.startsWith('encrypted:v1:aes-256-gcm:')).toBe(true);
    });

    it('has three colon-separated components after prefix', () => {
      const encrypted = encryptValue('secret', key);
      const prefix = 'encrypted:v1:aes-256-gcm:';
      const payload = encrypted.slice(prefix.length);
      const parts = payload.split(':');
      expect(parts).toHaveLength(3);
      expect(parts[0]!.length).toBeGreaterThan(0);
      expect(parts[1]!.length).toBeGreaterThan(0);
      expect(parts[2]!.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // encryptValue — error cases
  // ===========================================================================
  describe('encryptValue errors', () => {
    it('throws EncryptionError for wrong key length', () => {
      const shortKey = randomBytes(16);
      expect(() => encryptValue('secret', shortKey)).toThrow(EncryptionError);
    });

    it('throws EncryptionError with key length message', () => {
      try {
        encryptValue('secret', randomBytes(24));
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(EncryptionError);
        expect((err as EncryptionError).message).toContain('32 bytes');
      }
    });
  });

  // ===========================================================================
  // decryptValue — error cases
  // ===========================================================================
  describe('decryptValue errors', () => {
    it('throws EncryptionError for wrong key length', () => {
      const encrypted = encryptValue('secret', key);
      const wrongKey = randomBytes(16);
      expect(() => decryptValue(encrypted, wrongKey)).toThrow(EncryptionError);
    });

    it('throws EncryptionError for completely wrong key', () => {
      const encrypted = encryptValue('secret', key);
      const wrongKey = randomBytes(32);
      expect(() => decryptValue(encrypted, wrongKey)).toThrow(EncryptionError);
    });

    it('throws EncryptionError for missing prefix', () => {
      expect(() => decryptValue('not-encrypted', key)).toThrow(EncryptionError);
      try {
        decryptValue('not-encrypted', key);
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect((err as EncryptionError).message).toContain('prefix');
      }
    });

    it('throws EncryptionError for corrupted base64', () => {
      const badEncrypted = 'encrypted:v1:aes-256-gcm:!!!invalid:base64:data!!!';
      expect(() => decryptValue(badEncrypted, key)).toThrow(EncryptionError);
    });

    it('throws EncryptionError for tampered encrypted value', () => {
      const encrypted = encryptValue('secret', key);
      // Flip a bit in the middle of the encrypted string
      const mid = Math.floor(encrypted.length / 2);
      const tampered = encrypted.slice(0, mid) +
        (encrypted[mid] === 'A' ? 'B' : 'A') +
        encrypted.slice(mid + 1);
      expect(() => decryptValue(tampered, key)).toThrow();
    });

    it('throws EncryptionError for wrong number of components', () => {
      const badEncrypted = 'encrypted:v1:aes-256-gcm:only-one-part';
      expect(() => decryptValue(badEncrypted, key)).toThrow(EncryptionError);
    });

    it('throws EncryptionError with descriptive message for wrong key', () => {
      const encrypted = encryptValue('secret', key);
      try {
        decryptValue(encrypted, randomBytes(32));
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(EncryptionError);
        const msg = (err as EncryptionError).message.toLowerCase();
        expect(msg).toContain('decrypt');
      }
    });
  });

  // ===========================================================================
  // isEncryptedValue
  // ===========================================================================
  describe('isEncryptedValue', () => {
    it('returns true for a valid encrypted value', () => {
      const encrypted = encryptValue('secret', key);
      expect(isEncryptedValue(encrypted)).toBe(true);
    });

    it('returns false for a plain string', () => {
      expect(isEncryptedValue('my-secret')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isEncryptedValue('')).toBe(false);
    });

    it('returns false for a string that starts with "encrypted" but is shorter than prefix', () => {
      expect(isEncryptedValue('encrypted:v1')).toBe(false);
    });

    it('returns false for a string that has the prefix characters but not exact match', () => {
      expect(isEncryptedValue('encrypted:v2:aes-256-gcm:abc:def:ghi')).toBe(false);
    });
  });

  // ===========================================================================
  // deserializeEnvData
  // ===========================================================================
  describe('deserializeEnvData', () => {
    it('deserializes a simple KEY=VALUE string', () => {
      expect(deserializeEnvData('A=1')).toEqual({ A: '1' });
    });

    it('deserializes multiple lines', () => {
      const input = 'A=1\nB=2\nC=3';
      expect(deserializeEnvData(input)).toEqual({ A: '1', B: '2', C: '3' });
    });

    it('handles escaped newlines in values', () => {
      const input = 'MULTI=line1\\nline2\\nline3';
      expect(deserializeEnvData(input)).toEqual({ MULTI: 'line1\nline2\nline3' });
    });

    it('skips lines without equals sign', () => {
      const input = 'A=1\nno_equals\nB=2';
      expect(deserializeEnvData(input)).toEqual({ A: '1', B: '2' });
    });

    it('handles empty values', () => {
      const input = 'EMPTY=\nNON_EMPTY=hello';
      expect(deserializeEnvData(input)).toEqual({ EMPTY: '', NON_EMPTY: 'hello' });
    });

    it('handles values containing equals signs', () => {
      const input = 'MATH=1+1=2';
      expect(deserializeEnvData(input)).toEqual({ MATH: '1+1=2' });
    });

    it('handles empty input', () => {
      expect(deserializeEnvData('')).toEqual({});
    });

    it('handles values with escaped backslash-n as literal text', () => {
      // In the serialized form, \n is stored as \\n
      // deserializeEnvData converts \\n back to \n
      const input = 'KEY=value\\nwith\\nnewlines';
      expect(deserializeEnvData(input)).toEqual({ KEY: 'value\nwith\nnewlines' });
    });
  });

  // ===========================================================================
  // Cross-key independence
  // ===========================================================================
  describe('cross-key independence', () => {
    it('values encrypted with one key cannot be decrypted with another', () => {
      const key1 = makeKey();
      const key2 = makeKey();
      const encrypted = encryptEnvironment({ SECRET: 'value' }, key1);
      expect(() => decryptEnvironment(encrypted, key2)).toThrow(EncryptionError);
    });

    it('multiple keys produce independent encrypted results', () => {
      const key1 = makeKey();
      const key2 = makeKey();
      const data = { SECRET: 'value' };
      const enc1 = encryptEnvironment(data, key1);
      const enc2 = encryptEnvironment(data, key2);
      // Both should decrypt with their respective keys
      const dec1 = decryptEnvironment(enc1, key1);
      const dec2 = decryptEnvironment(enc2, key2);
      expect(dec1).toContain('SECRET=value');
      expect(dec2).toContain('SECRET=value');
      // But ciphertext should differ
      expect(enc1.ciphertext.equals(enc2.ciphertext)).toBe(false);
    });
  });

  // ===========================================================================
  // Key edge cases
  // ===========================================================================
  describe('key edge cases', () => {
    it('works with key of exactly 32 bytes', () => {
      const exactKey = Buffer.alloc(32, 0x42);
      const encrypted = encryptValue('test', exactKey);
      expect(decryptValue(encrypted, exactKey)).toBe('test');
    });

    it('encryptEnvironment rejects key of 31 bytes', () => {
      expect(() => encryptEnvironment({ A: '1' }, Buffer.alloc(31))).toThrow(EncryptionError);
    });

    it('encryptEnvironment rejects key of 33 bytes', () => {
      expect(() => encryptEnvironment({ A: '1' }, Buffer.alloc(33))).toThrow(EncryptionError);
    });

    it('encryptValue rejects key of 31 bytes', () => {
      expect(() => encryptValue('test', Buffer.alloc(31))).toThrow(EncryptionError);
    });

    it('decryptEnvironment rejects key of 31 bytes', () => {
      const encrypted = encryptEnvironment({ A: '1' }, key);
      expect(() => decryptEnvironment(encrypted, Buffer.alloc(31))).toThrow(EncryptionError);
    });

    it('decryptValue rejects key of 31 bytes', () => {
      const encrypted = encryptValue('test', key);
      expect(() => decryptValue(encrypted, Buffer.alloc(31))).toThrow(EncryptionError);
    });
  });
});
