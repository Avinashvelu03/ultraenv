// =============================================================================
// ultraenv — Vault Encryption
// AES-256-GCM encryption for environment variables and vault data.
// Uses node:crypto for all cryptographic operations.
// =============================================================================

import {
  encrypt as aesEncrypt,
  decrypt as aesDecrypt,
  bufferToBase64,
  base64ToBuffer,
} from '../utils/crypto.js';
import { EncryptionError } from '../core/errors.js';
import { ENCRYPTION_ALGORITHM, ENCRYPTED_PREFIX } from '../core/constants.js';
import type { EncryptionResult } from '../core/types.js';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** IV length for AES-256-GCM (12 bytes, as recommended by NIST) */
const IV_LENGTH = 12;

/** Auth tag length for AES-256-GCM (16 bytes) */
const AUTH_TAG_LENGTH = 16;

// -----------------------------------------------------------------------------
// Environment Data Serialization
// -----------------------------------------------------------------------------

/**
 * Serialize a Record of env vars into a newline-separated KEY=VALUE string.
 * Sorts keys for deterministic output.
 */
function serializeEnvData(data: Record<string, string>): string {
  const keys = Object.keys(data).sort();
  const lines: string[] = [];
  for (const key of keys) {
    const value = data[key]!;
    // Escape any newlines within values by replacing \n with \\n
    const escapedValue = value.replace(/\n/g, '\\n');
    lines.push(`${key}=${escapedValue}`);
  }
  return lines.join('\n');
}

/**
 * Deserialize a newline-separated KEY=VALUE string back into a Record.
 * Exported for use by vault consumers who need to parse decrypted env data.
 */
export function deserializeEnvData(serialized: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = serialized.split('\n');
  for (const line of lines) {
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex);
    const value = line.slice(eqIndex + 1).replace(/\\n/g, '\n');
    result[key] = value;
  }
  return result;
}

// -----------------------------------------------------------------------------
// encryptEnvironment
// -----------------------------------------------------------------------------

/**
 * Encrypt an entire environment variable set using AES-256-GCM.
 *
 * The data is serialized to a deterministic string format (sorted keys,
 * KEY=VALUE per line), then encrypted. The result includes the IV, auth tag,
 * ciphertext, and algorithm identifier for later decryption.
 *
 * @param data - Object of environment variable key-value pairs.
 * @param key - 32-byte encryption key.
 * @returns EncryptionResult containing IV, auth tag, ciphertext, and algorithm.
 * @throws EncryptionError if encryption fails.
 *
 * @example
 * const result = encryptEnvironment(
 *   { DATABASE_URL: 'postgres://localhost/mydb', API_KEY: 'sk-123' },
 *   masterKey,
 * );
 */
export function encryptEnvironment(data: Record<string, string>, key: Buffer): EncryptionResult {
  if (key.length !== 32) {
    throw new EncryptionError(
      `Invalid key length: expected 32 bytes for AES-256, got ${key.length}`,
      {
        hint: 'Generate a new key using generateMasterKey() or ensure you are using the correct key file.',
      },
    );
  }

  if (Object.keys(data).length === 0) {
    throw new EncryptionError('Cannot encrypt empty environment data', {
      hint: 'Provide at least one environment variable to encrypt.',
    });
  }

  try {
    const serialized = serializeEnvData(data);
    const plaintext = Buffer.from(serialized, 'utf-8');
    const result = aesEncrypt(key, plaintext);

    return {
      iv: result.iv,
      authTag: result.authTag,
      ciphertext: result.ciphertext,
      algorithm: ENCRYPTION_ALGORITHM,
    };
    /* v8 ignore start */
  } catch (error: unknown) {
    if (error instanceof EncryptionError) throw error;
    throw new EncryptionError('Failed to encrypt environment data', {
      cause: error instanceof Error ? error : undefined,
    });
  }
  /* v8 ignore stop */
}

// -----------------------------------------------------------------------------
// decryptEnvironment
// -----------------------------------------------------------------------------

/**
 * Decrypt environment data that was encrypted with encryptEnvironment.
 *
 * @param encrypted - The EncryptionResult from a previous encryptEnvironment call.
 * @param key - The 32-byte encryption key (must match the encryption key).
 * @returns The original serialized environment data string.
 * @throws EncryptionError if decryption fails, the key is wrong, or data was tampered with.
 *
 * @example
 * const serialized = decryptEnvironment(encryptedResult, masterKey);
 * // serialized = "API_KEY=sk-123\nDATABASE_URL=postgres://localhost/mydb"
 */
export function decryptEnvironment(encrypted: EncryptionResult, key: Buffer): string {
  if (key.length !== 32) {
    throw new EncryptionError(
      `Invalid key length: expected 32 bytes for AES-256, got ${key.length}`,
      { hint: 'Ensure you are using the correct decryption key for this environment.' },
    );
  }

  if (encrypted.algorithm !== ENCRYPTION_ALGORITHM) {
    throw new EncryptionError(
      `Unsupported algorithm: "${encrypted.algorithm}". Expected "${ENCRYPTION_ALGORITHM}".`,
      {
        hint: 'This vault was encrypted with a different algorithm. You may need to migrate the vault.',
      },
    );
  }

  if (encrypted.iv.length !== IV_LENGTH) {
    throw new EncryptionError(
      `Invalid IV length: expected ${IV_LENGTH} bytes, got ${encrypted.iv.length}`,
      { hint: 'The encrypted data may be corrupted.' },
    );
  }

  if (encrypted.authTag.length !== AUTH_TAG_LENGTH) {
    throw new EncryptionError(
      `Invalid auth tag length: expected ${AUTH_TAG_LENGTH} bytes, got ${encrypted.authTag.length}`,
      { hint: 'The encrypted data may be corrupted.' },
    );
  }

  try {
    const plaintext = aesDecrypt(key, encrypted.iv, encrypted.authTag, encrypted.ciphertext);
    return plaintext.toString('utf-8');
  } catch (error: unknown) {
    /* v8 ignore start */
    if (error instanceof EncryptionError) throw error;
    /* v8 ignore stop */
    throw new EncryptionError(
      'Failed to decrypt environment data. The key may be incorrect or the ciphertext was tampered with.',
      /* v8 ignore start */
      { cause: error instanceof Error ? error : undefined },
      /* v8 ignore stop */
    );
  }
}

// -----------------------------------------------------------------------------
// encryptValue
// -----------------------------------------------------------------------------

/**
 * Encrypt a single value using AES-256-GCM and return it as a self-contained
 * encoded string that includes the algorithm version, IV, auth tag, and ciphertext.
 *
 * Output format: `encrypted:v1:aes-256-gcm:{iv_base64}:{authTag_base64}:{ciphertext_base64}`
 *
 * This format is safe to store in .env files and .env.vault files.
 * The IV and auth tag are generated fresh for each encryption.
 *
 * @param value - The plaintext string to encrypt.
 * @param key - 32-byte encryption key.
 * @returns The encrypted value in the standard ultraenv format.
 * @throws EncryptionError if encryption fails.
 *
 * @example
 * const encrypted = encryptValue('my-secret-password', masterKey);
 * // encrypted = "encrypted:v1:aes-256-gcm:aBcDeF...:XyZ123...:QrStUv..."
 */
export function encryptValue(value: string, key: Buffer): string {
  if (key.length !== 32) {
    throw new EncryptionError(
      `Invalid key length: expected 32 bytes for AES-256, got ${key.length}`,
      { hint: 'Generate a new key using generateMasterKey().' },
    );
  }

  try {
    const plaintext = Buffer.from(value, 'utf-8');
    const result = aesEncrypt(key, plaintext);

    const ivB64 = bufferToBase64(result.iv);
    const authTagB64 = bufferToBase64(result.authTag);
    const ciphertextB64 = bufferToBase64(result.ciphertext);

    return `${ENCRYPTED_PREFIX}${ivB64}:${authTagB64}:${ciphertextB64}`;
    /* v8 ignore start */
  } catch (error: unknown) {
    if (error instanceof EncryptionError) throw error;
    throw new EncryptionError('Failed to encrypt value', {
      cause: error instanceof Error ? error : undefined,
    });
  }
  /* v8 ignore stop */
}

// -----------------------------------------------------------------------------
// decryptValue
// -----------------------------------------------------------------------------

/**
 * Decrypt a single value that was encrypted with encryptValue.
 *
 * Parses the self-contained encrypted format:
 * `encrypted:v1:aes-256-gcm:{iv_base64}:{authTag_base64}:{ciphertext_base64}`
 *
 * @param encrypted - The encrypted string in ultraenv format.
 * @param key - 32-byte encryption key (must match the encryption key).
 * @returns The original plaintext string.
 * @throws EncryptionError if the format is invalid, decryption fails, or the key is wrong.
 *
 * @example
 * const plaintext = decryptValue(
 *   'encrypted:v1:aes-256-gcm:aBcDeF...:XyZ123...:QrStUv...',
 *   masterKey,
 * );
 * // plaintext = 'my-secret-password'
 */
export function decryptValue(encrypted: string, key: Buffer): string {
  if (key.length !== 32) {
    throw new EncryptionError(
      `Invalid key length: expected 32 bytes for AES-256, got ${key.length}`,
      { hint: 'Ensure you are using the correct decryption key.' },
    );
  }

  // Validate and strip the prefix
  if (!encrypted.startsWith(ENCRYPTED_PREFIX)) {
    throw new EncryptionError('Invalid encrypted value format: missing required prefix', {
      hint: `Expected the value to start with "${ENCRYPTED_PREFIX}". This value may not have been encrypted by ultraenv.`,
    });
  }

  // Strip the prefix and split remaining parts
  const payload = encrypted.slice(ENCRYPTED_PREFIX.length);
  const parts = payload.split(':');

  if (parts.length !== 3) {
    throw new EncryptionError(
      `Invalid encrypted value format: expected 3 colon-separated components after prefix, got ${parts.length}`,
      {
        hint: 'The encrypted value should be in the format: encrypted:v1:aes-256-gcm:{iv}:{authTag}:{ciphertext}',
      },
    );
  }

  const ivB64 = parts[0];
  const authTagB64 = parts[1];
  const ciphertextB64 = parts[2];

  // Validate base64 components (safe after length check above)
  /* v8 ignore start */
  if (ivB64 === undefined || authTagB64 === undefined || ciphertextB64 === undefined) {
    throw new EncryptionError('Invalid encrypted value: unexpected component structure', {
      hint: 'The encrypted data may be corrupted. Try re-encrypting the value.',
    });
  }
  /* v8 ignore stop */

  if (ivB64.length === 0 || authTagB64.length === 0 || ciphertextB64.length === 0) {
    throw new EncryptionError('Invalid encrypted value: one or more base64 components are empty', {
      hint: 'The encrypted data may be corrupted. Try re-encrypting the value.',
    });
  }

  try {
    const iv = base64ToBuffer(ivB64);
    const authTag = base64ToBuffer(authTagB64);
    const ciphertext = base64ToBuffer(ciphertextB64);

    if (iv.length !== IV_LENGTH) {
      throw new EncryptionError(
        `Invalid IV length: expected ${IV_LENGTH} bytes, got ${iv.length}`,
        {
          hint: 'The encrypted data may be corrupted or was produced by a different version of ultraenv.',
        },
      );
    }

    /* v8 ignore start */
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new EncryptionError(
        `Invalid auth tag length: expected ${AUTH_TAG_LENGTH} bytes, got ${authTag.length}`,
        { hint: 'The encrypted data may be corrupted.' },
      );
    }
    /* v8 ignore stop */

    const plaintext = aesDecrypt(key, iv, authTag, ciphertext);
    return plaintext.toString('utf-8');
  } catch (error: unknown) {
    if (error instanceof EncryptionError) throw error;

    // Check if the error is from base64 decoding
    /* v8 ignore start */
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Invalid') || message.includes('base64')) {
      throw new EncryptionError('Invalid base64 encoding in encrypted value', {
        hint: 'The encrypted data may be corrupted. Ensure the value was not modified.',
      });
    }
    /* v8 ignore stop */

    throw new EncryptionError(
      'Failed to decrypt value. The key may be incorrect or the ciphertext was tampered with.',
      /* v8 ignore start */
      { cause: error instanceof Error ? error : undefined },
      /* v8 ignore stop */
    );
  }
}

// -----------------------------------------------------------------------------
// Utility: isEncryptedValue
// -----------------------------------------------------------------------------

/**
 * Check if a string is an ultraenv-encrypted value.
 *
 * @param value - The string to check.
 * @returns true if the value matches the encrypted format prefix.
 */
export function isEncryptedValue(value: string): boolean {
  if (value.length < ENCRYPTED_PREFIX.length) return false;
  return value.startsWith(ENCRYPTED_PREFIX);
}
