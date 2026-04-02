// =============================================================================
// ultraenv — Cryptographic Utilities
// Encryption, hashing, key derivation, and secure comparison using node:crypto.
// =============================================================================

import {
  randomBytes as cryptoRandomBytes,
  createHash,
  createHmac,
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  timingSafeEqual as cryptoTimingSafeEqual,
} from 'node:crypto';

// -----------------------------------------------------------------------------
// Random Bytes
// -----------------------------------------------------------------------------

/**
 * Generate cryptographically secure random bytes.
 * @param length - Number of bytes to generate.
 * @returns Buffer of random bytes.
 */
export function randomBytes(length: number): Buffer {
  if (length < 1 || !Number.isInteger(length)) {
    throw new RangeError(`randomBytes: length must be a positive integer, got ${length}`);
  }
  return cryptoRandomBytes(length);
}

/**
 * Generate a random hex string of the specified length.
 * The resulting string has `length * 2` characters.
 *
 * @param byteLength - Number of random bytes (default: 32).
 * @returns Lowercase hex string.
 *
 * @example
 * randomHex(16)  // 'a1b2c3d4e5f6...'
 * randomHex(32)  // 'f47ac10b58cc8...'
 */
export function randomHex(byteLength: number = 32): string {
  return randomBytes(byteLength).toString('hex');
}

// -----------------------------------------------------------------------------
// Hashing
// -----------------------------------------------------------------------------

/**
 * Compute SHA-256 hash of a Buffer.
 * @param data - Input data.
 * @returns Buffer containing the 32-byte hash.
 */
export function sha256(data: Buffer): Buffer {
  return createHash('sha256').update(data).digest();
}

/**
 * Compute SHA-256 hash of a string, returned as a hex string.
 *
 * @param data - Input string.
 * @returns Lowercase hex-encoded hash (64 characters).
 *
 * @example
 * sha256Hex('hello')  // '2cf24dba5fb0a30e...'
 */
export function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf-8').digest('hex');
}

/**
 * Compute SHA-256 hash of a string, returned as a Buffer.
 */
export function sha256Buffer(data: string): Buffer {
  return createHash('sha256').update(data, 'utf-8').digest();
}

// -----------------------------------------------------------------------------
// HMAC
// -----------------------------------------------------------------------------

/**
 * Compute HMAC-SHA256 of data with the given key.
 *
 * @param key - The HMAC key.
 * @param data - The data to authenticate.
 * @returns Buffer containing the HMAC digest (32 bytes).
 */
export function hmac(key: Buffer, data: Buffer): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

/**
 * Compute HMAC-SHA256 of a string with the given key, returned as hex.
 */
export function hmacHex(key: Buffer, data: string): string {
  return createHmac('sha256', key).update(data, 'utf-8').digest('hex');
}

// -----------------------------------------------------------------------------
// Secure Comparison
// -----------------------------------------------------------------------------

/**
 * Constant-time comparison of two buffers to prevent timing attacks.
 * Both buffers must be the same length.
 *
 * @param a - First buffer.
 * @param b - Second buffer.
 * @returns true if the buffers are identical.
 * @throws RangeError if the buffers have different lengths.
 */
export function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    throw new RangeError(`timingSafeEqual: buffer lengths differ (${a.length} vs ${b.length})`);
  }
  return cryptoTimingSafeEqual(a, b);
}

/**
 * Constant-time string comparison.
 * Converts both strings to UTF-8 buffers and compares them securely.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  return timingSafeEqual(bufA, bufB);
}

// -----------------------------------------------------------------------------
// Key Generation & Derivation
// -----------------------------------------------------------------------------

/**
 * Generate a random encryption key.
 * @param length - Key length in bytes (default: 32 for AES-256).
 * @returns Buffer containing the key.
 */
export function generateKey(length: number = 32): Buffer {
  return randomBytes(length);
}

/**
 * Derive a key using HKDF (HMAC-based Extract-and-Expand Key Derivation Function).
 *
 * Uses SHA-256 as the underlying hash function.
 *
 * @param masterKey - The input keying material (IKM).
 * @param salt - Optional salt (recommended). Random salt generated if not provided.
 * @param info - Context/application-specific info string.
 * @param length - Desired output key length in bytes (default: 32).
 * @returns Derived key as a Buffer.
 *
 * @example
 * const key = deriveKey(masterKey, salt, 'ultraenv-v1', 32);
 */
export function deriveKey(
  masterKey: Buffer,
  salt: Buffer,
  info: string,
  length: number = 32,
): Buffer {
  if (length < 1 || length > 255) {
    throw new RangeError(`deriveKey: length must be between 1 and 255 bytes, got ${length}`);
  }

  try {
    const derived = hkdfSync('sha256', masterKey, salt, Buffer.from(info, 'utf-8'), length);
    return Buffer.from(derived);
  } catch {
    // Fallback: manual HKDF using extract + expand
    return manualHkdf(masterKey, salt, info, length);
  }
}

/**
 * Manual HKDF implementation as fallback.
 */
function manualHkdf(ikm: Buffer, salt: Buffer, info: string, length: number): Buffer {
  // Extract
  const prk = createHmac('sha256', salt).update(ikm).digest();

  // Expand
  const infoBuffer = Buffer.from(info, 'utf-8');
  const hashLen = 32; // SHA-256 output length
  const n = Math.ceil(length / hashLen);

  if (n > 255) {
    throw new Error('deriveKey: cannot derive more than 255 * 32 bytes');
  }

  const okm = Buffer.alloc(length);
  let previous = Buffer.alloc(0);

  for (let i = 1; i <= n; i++) {
    const hmacData = Buffer.concat([previous, infoBuffer, Buffer.from([i])]);
    previous = createHmac('sha256', prk).update(hmacData).digest();
    const offset = (i - 1) * hashLen;
    const copyLen = Math.min(hashLen, length - offset);
    previous.copy(okm, offset, 0, copyLen);
  }

  return okm;
}

// -----------------------------------------------------------------------------
// Encryption / Decryption (AES-256-GCM)
// -----------------------------------------------------------------------------

export interface EncryptResult {
  /** Initialization vector (12 bytes for AES-GCM) */
  iv: Buffer;
  /** Authentication tag (16 bytes for AES-GCM) */
  authTag: Buffer;
  /** Encrypted ciphertext */
  ciphertext: Buffer;
}

/**
 * Encrypt plaintext using AES-256-GCM.
 *
 * @param key - 32-byte encryption key.
 * @param plaintext - Data to encrypt.
 * @returns Object containing IV, auth tag, and ciphertext.
 *
 * @example
 * const result = encrypt(key, Buffer.from('secret data'));
 * // result.iv, result.authTag, result.ciphertext
 */
export function encrypt(key: Buffer, plaintext: Buffer): EncryptResult {
  if (key.length !== 16 && key.length !== 24 && key.length !== 32) {
    throw new RangeError(
      `encrypt: key must be 16, 24, or 32 bytes (AES-128/192/256), got ${key.length}`,
    );
  }

  const iv = cryptoRandomBytes(12); // 12 bytes recommended for AES-GCM
  const algo = `aes-${key.length * 8}-gcm`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cipher = createCipheriv(algo, key, iv) as any;

  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  const authTag: Buffer = cipher.getAuthTag();

  return { iv, authTag, ciphertext };
}

/**
 * Decrypt ciphertext using AES-256-GCM.
 *
 * @param key - 32-byte encryption key (must match the encryption key).
 * @param iv - Initialization vector (12 bytes).
 * @param authTag - Authentication tag (16 bytes).
 * @param ciphertext - Encrypted data.
 * @returns Decrypted plaintext.
 * @throws Error if decryption or authentication fails.
 */
export function decrypt(key: Buffer, iv: Buffer, authTag: Buffer, ciphertext: Buffer): Buffer {
  if (key.length !== 16 && key.length !== 24 && key.length !== 32) {
    throw new RangeError(
      `decrypt: key must be 16, 24, or 32 bytes (AES-128/192/256), got ${key.length}`,
    );
  }

  const algo = `aes-${key.length * 8}-gcm`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decipher = createDecipheriv(algo, key, iv) as any;

  decipher.setAuthTag(authTag);

  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Decryption failed: ${message}. This usually means the key is wrong or the ciphertext was tampered with.`,
    );
  }
}

// -----------------------------------------------------------------------------
// Encoding Helpers
// -----------------------------------------------------------------------------

/**
 * Convert a Buffer to a URL-safe Base64 string (no padding).
 *
 * @example
 * keyToBase64(Buffer.from('hello'))  // 'aGVsbG8'
 */
export function keyToBase64(key: Buffer): string {
  return key.toString('base64url');
}

/**
 * Convert a Base64 string (URL-safe or standard) back to a Buffer.
 *
 * @example
 * base64ToKey('aGVsbG8')  // Buffer.from('hello')
 */
export function base64ToKey(b64: string): Buffer {
  // Normalize: handle both standard base64 and base64url
  const normalized = b64.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64');
}

/**
 * Convert a Buffer to a standard Base64 string (with padding).
 */
export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

/**
 * Convert a standard Base64 string to a Buffer.
 */
export function base64ToBuffer(b64: string): Buffer {
  return Buffer.from(b64, 'base64');
}

/**
 * Convert a Buffer to a hex string.
 */
export function bufferToHex(buffer: Buffer): string {
  return buffer.toString('hex');
}

/**
 * Convert a hex string to a Buffer.
 */
export function hexToBuffer(hex: string): Buffer {
  if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) {
    throw new Error(`hexToBuffer: invalid hex string (length: ${hex.length})`);
  }
  return Buffer.from(hex, 'hex');
}
