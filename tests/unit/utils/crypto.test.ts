import { describe, it, expect } from 'vitest';
import {
  randomBytes,
  randomHex,
  sha256,
  sha256Hex,
  hmac,
  timingSafeEqual,
  generateKey,
  deriveKey,
  encrypt,
  decrypt,
  keyToBase64,
  base64ToKey,
  bufferToBase64,
  base64ToBuffer,
  bufferToHex,
  hexToBuffer,
  timingSafeEqualString,
} from '../../../src/utils/crypto.js';

describe('randomBytes', () => {
  it('generates a buffer of the requested length', () => {
    const buf = randomBytes(16);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBe(16);
  });

  it('generates different values on each call', () => {
    const a = randomBytes(32);
    const b = randomBytes(32);
    expect(a.equals(b)).toBe(false);
  });

  it('throws for invalid length', () => {
    expect(() => randomBytes(0)).toThrow(RangeError);
    expect(() => randomBytes(-1)).toThrow(RangeError);
    expect(() => randomBytes(1.5)).toThrow(RangeError);
  });
});

describe('randomHex', () => {
  it('generates a hex string', () => {
    const hex = randomHex(16);
    expect(hex).toMatch(/^[0-9a-f]{32}$/);
  });

  it('uses default byte length of 32', () => {
    const hex = randomHex();
    expect(hex.length).toBe(64);
  });
});

describe('sha256', () => {
  it('returns a 32-byte buffer', () => {
    const hash = sha256(Buffer.from('hello'));
    expect(hash).toBeInstanceOf(Buffer);
    expect(hash.length).toBe(32);
  });

  it('produces consistent results', () => {
    const a = sha256(Buffer.from('hello'));
    const b = sha256(Buffer.from('hello'));
    expect(a.equals(b)).toBe(true);
  });

  it('produces different results for different inputs', () => {
    const a = sha256(Buffer.from('hello'));
    const b = sha256(Buffer.from('world'));
    expect(a.equals(b)).toBe(false);
  });
});

describe('sha256Hex', () => {
  it('returns a 64-character hex string', () => {
    const hex = sha256Hex('hello');
    expect(hex).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces known value for "hello"', () => {
    const hex = sha256Hex('hello');
    expect(hex).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('is consistent with sha256', () => {
    const hex = sha256Hex('hello');
    const buf = sha256(Buffer.from('hello'));
    expect(buf.toString('hex')).toBe(hex);
  });
});

describe('hmac', () => {
  it('returns a 32-byte buffer', () => {
    const key = randomBytes(32);
    const mac = hmac(key, Buffer.from('data'));
    expect(mac).toBeInstanceOf(Buffer);
    expect(mac.length).toBe(32);
  });

  it('produces consistent results with same key and data', () => {
    const key = Buffer.from('secret-key');
    const a = hmac(key, Buffer.from('data'));
    const b = hmac(key, Buffer.from('data'));
    expect(a.equals(b)).toBe(true);
  });

  it('produces different results with different keys', () => {
    const key1 = Buffer.from('key1');
    const key2 = Buffer.from('key2');
    const a = hmac(key1, Buffer.from('data'));
    const b = hmac(key2, Buffer.from('data'));
    expect(a.equals(b)).toBe(false);
  });
});

describe('timingSafeEqual', () => {
  it('returns true for identical buffers', () => {
    const a = Buffer.from('hello');
    const b = Buffer.from('hello');
    expect(timingSafeEqual(a, b)).toBe(true);
  });

  it('returns false for different buffers', () => {
    const a = Buffer.from('hello');
    const b = Buffer.from('world');
    expect(timingSafeEqual(a, b)).toBe(false);
  });

  it('throws for different-length buffers', () => {
    const a = Buffer.from('hello');
    const b = Buffer.from('hi');
    expect(() => timingSafeEqual(a, b)).toThrow(RangeError);
  });
});

describe('timingSafeEqualString', () => {
  it('returns true for identical strings', () => {
    expect(timingSafeEqualString('hello', 'hello')).toBe(true);
  });

  it('returns false for different strings', () => {
    expect(timingSafeEqualString('hello', 'world')).toBe(false);
  });
});

describe('generateKey', () => {
  it('generates a 32-byte key by default', () => {
    const key = generateKey();
    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
  });

  it('generates a key of the specified length', () => {
    const key = generateKey(16);
    expect(key.length).toBe(16);
  });
});

describe('deriveKey', () => {
  it('derives a key using HKDF', () => {
    const masterKey = randomBytes(32);
    const salt = randomBytes(16);
    const key = deriveKey(masterKey, salt, 'ultraenv-v1', 32);
    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
  });

  it('produces consistent results with same inputs', () => {
    const masterKey = Buffer.from('master-key-material');
    const salt = Buffer.from('salt-value');
    const a = deriveKey(masterKey, salt, 'info', 32);
    const b = deriveKey(masterKey, salt, 'info', 32);
    expect(a.equals(b)).toBe(true);
  });

  it('produces different results with different info', () => {
    const masterKey = Buffer.from('master-key-material');
    const salt = Buffer.from('salt-value');
    const a = deriveKey(masterKey, salt, 'info-a', 32);
    const b = deriveKey(masterKey, salt, 'info-b', 32);
    expect(a.equals(b)).toBe(false);
  });

  it('throws for invalid length', () => {
    const masterKey = randomBytes(32);
    const salt = randomBytes(16);
    expect(() => deriveKey(masterKey, salt, 'info', 0)).toThrow(RangeError);
    expect(() => deriveKey(masterKey, salt, 'info', 256)).toThrow(RangeError);
  });
});

describe('encrypt / decrypt roundtrip (AES-256-GCM)', () => {
  it('encrypts and decrypts successfully with 32-byte key', () => {
    const key = randomBytes(32);
    const plaintext = Buffer.from('secret message');
    const encrypted = encrypt(key, plaintext);
    const decrypted = decrypt(key, encrypted.iv, encrypted.authTag, encrypted.ciphertext);
    expect(decrypted.equals(plaintext)).toBe(true);
  });

  it('works with 16-byte key (AES-128)', () => {
    const key = randomBytes(16);
    const plaintext = Buffer.from('short key msg');
    const encrypted = encrypt(key, plaintext);
    const decrypted = decrypt(key, encrypted.iv, encrypted.authTag, encrypted.ciphertext);
    expect(decrypted.equals(plaintext)).toBe(true);
  });

  it('works with 24-byte key (AES-192)', () => {
    const key = randomBytes(24);
    const plaintext = Buffer.from('medium key msg');
    const encrypted = encrypt(key, plaintext);
    const decrypted = decrypt(key, encrypted.iv, encrypted.authTag, encrypted.ciphertext);
    expect(decrypted.equals(plaintext)).toBe(true);
  });

  it('produces different ciphertext each time (random IV)', () => {
    const key = randomBytes(32);
    const plaintext = Buffer.from('same message');
    const enc1 = encrypt(key, plaintext);
    const enc2 = encrypt(key, plaintext);
    expect(enc1.ciphertext.equals(enc2.ciphertext)).toBe(false);
    // But both should decrypt to the same plaintext
    const dec1 = decrypt(key, enc1.iv, enc1.authTag, enc1.ciphertext);
    const dec2 = decrypt(key, enc2.iv, enc2.authTag, enc2.ciphertext);
    expect(dec1.equals(plaintext)).toBe(true);
    expect(dec2.equals(plaintext)).toBe(true);
  });

  it('throws for invalid key length', () => {
    const badKey = randomBytes(15);
    const plaintext = Buffer.from('test');
    expect(() => encrypt(badKey, plaintext)).toThrow(RangeError);
  });

  it('throws when decrypting with wrong key', () => {
    const key1 = randomBytes(32);
    const key2 = randomBytes(32);
    const plaintext = Buffer.from('secret');
    const encrypted = encrypt(key1, plaintext);
    expect(() => decrypt(key2, encrypted.iv, encrypted.authTag, encrypted.ciphertext)).toThrow();
  });

  it('throws when decrypting with tampered ciphertext', () => {
    const key = randomBytes(32);
    const plaintext = Buffer.from('secret');
    const encrypted = encrypt(key, plaintext);
    const tampered = Buffer.from(encrypted.ciphertext);
    tampered[0] = (tampered[0] as number) ^ 0xff;
    expect(() => decrypt(key, encrypted.iv, encrypted.authTag, tampered)).toThrow();
  });

  it('has correct iv and authTag lengths', () => {
    const key = randomBytes(32);
    const encrypted = encrypt(key, Buffer.from('test'));
    expect(encrypted.iv.length).toBe(12);
    expect(encrypted.authTag.length).toBe(16);
  });
});

describe('keyToBase64 / base64ToKey', () => {
  it('roundtrips correctly', () => {
    const key = randomBytes(32);
    const b64 = keyToBase64(key);
    const restored = base64ToKey(b64);
    expect(restored.equals(key)).toBe(true);
  });

  it('produces URL-safe base64', () => {
    const key = Buffer.from([0xff, 0xfe, 0xfd]);
    const b64 = keyToBase64(key);
    expect(b64).not.toContain('+');
    expect(b64).not.toContain('/');
    expect(b64).not.toContain('=');
  });

  it('handles standard base64 input in base64ToKey', () => {
    const key = Buffer.from('hello');
    const standardB64 = key.toString('base64');
    const restored = base64ToKey(standardB64);
    expect(restored.equals(key)).toBe(true);
  });
});

describe('bufferToBase64 / base64ToBuffer', () => {
  it('roundtrips correctly', () => {
    const buf = Buffer.from('hello world');
    const b64 = bufferToBase64(buf);
    const restored = base64ToBuffer(b64);
    expect(restored.equals(buf)).toBe(true);
  });
});

describe('bufferToHex / hexToBuffer', () => {
  it('roundtrips correctly', () => {
    const buf = randomBytes(16);
    const hex = bufferToHex(buf);
    const restored = hexToBuffer(hex);
    expect(restored.equals(buf)).toBe(true);
  });

  it('throws for invalid hex', () => {
    expect(() => hexToBuffer('zzzz')).toThrow();
    expect(() => hexToBuffer('abc')).toThrow(); // odd length
  });
});
