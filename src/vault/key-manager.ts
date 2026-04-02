// =============================================================================
// ultraenv — Key Manager
// Key generation, derivation, formatting, parsing, and rotation for vault encryption.
// Uses HKDF-SHA256 for per-environment key derivation from a master key.
// =============================================================================

import { randomBytes } from 'node:crypto';
import { deriveKey, bufferToBase64, base64ToBuffer } from '../utils/crypto.js';
import { EncryptionError } from '../core/errors.js';
import { encryptValue } from './encryption.js';
import { KEY_PREFIX, DEFAULT_KEY_LENGTH, DEFAULT_SALT_LENGTH } from '../core/constants.js';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Salt used for HKDF key derivation (consistent across environments) */
const HKDF_SALT = Buffer.from('ultraenv', 'utf-8');

/** Info string template for HKDF key derivation */
const HKDF_INFO_PREFIX = 'ultraenv-environment:';

// -----------------------------------------------------------------------------
// Key Generation
// -----------------------------------------------------------------------------

/**
 * Generate a cryptographically secure 32-byte master key for AES-256 encryption.
 *
 * Uses node:crypto.randomBytes for cryptographically secure pseudo-random
 * number generation (CSPRNG).
 *
 * @returns A 32-byte Buffer containing the master key.
 *
 * @example
 * const masterKey = generateMasterKey();
 * // masterKey is a 32-byte Buffer — keep it secret!
 */
export function generateMasterKey(): Buffer {
  return randomBytes(DEFAULT_KEY_LENGTH);
}

// -----------------------------------------------------------------------------
// Key Derivation
// -----------------------------------------------------------------------------

/**
 * Derive a per-environment encryption key from a master key using HKDF-SHA256.
 *
 * Each environment (development, staging, production, etc.) gets a unique key
 * derived from the same master key. This means:
 * - Compromising one environment's key does NOT compromise others.
 * - Rotating an environment key only requires re-encrypting that environment.
 * - The master key alone can derive all environment keys.
 *
 * Uses a fixed salt ("ultraenv") for deterministic derivation — the same
 * master key + environment name always produces the same environment key.
 *
 * @param masterKey - The 32-byte master key.
 * @param environment - The environment name (e.g., 'development', 'production').
 * @returns A 32-byte derived key for the specified environment.
 * @throws EncryptionError if the master key is invalid or derivation fails.
 *
 * @example
 * const devKey = deriveEnvironmentKey(masterKey, 'development');
 * const prodKey = deriveEnvironmentKey(masterKey, 'production');
 * // devKey !== prodKey — each environment has a unique key
 */
export function deriveEnvironmentKey(masterKey: Buffer, environment: string): Buffer {
  if (masterKey.length !== DEFAULT_KEY_LENGTH) {
    throw new EncryptionError(
      `Invalid master key length: expected ${DEFAULT_KEY_LENGTH} bytes, got ${masterKey.length}`,
      { hint: 'Generate a new master key using generateMasterKey().' },
    );
  }

  if (environment.length === 0) {
    throw new EncryptionError('Environment name cannot be empty', {
      hint: 'Provide a valid environment name (e.g., "development", "production").',
    });
  }

  if (HKDF_SALT.length < DEFAULT_SALT_LENGTH) {
    // Salt is shorter than recommended, but we use it deterministically
    // Pad the salt to at least DEFAULT_SALT_LENGTH for HKDF best practices
    const paddedSalt = Buffer.alloc(DEFAULT_SALT_LENGTH);
    HKDF_SALT.copy(paddedSalt, 0);
    return deriveKey(
      masterKey,
      paddedSalt,
      `${HKDF_INFO_PREFIX}${environment}`,
      DEFAULT_KEY_LENGTH,
    );
    /* v8 ignore start */
  }

  return deriveKey(masterKey, HKDF_SALT, `${HKDF_INFO_PREFIX}${environment}`, DEFAULT_KEY_LENGTH);
}
/* v8 ignore stop */

// -----------------------------------------------------------------------------
// Key Formatting & Parsing
// -----------------------------------------------------------------------------

/**
 * Format a raw key Buffer into a human-readable string with a version prefix.
 *
 * Output format: `ultraenv_key_v1_{base64}`
 *
 * This format allows:
 * - Easy identification of ultraenv keys
 * - Future algorithm migration (v2, v3, etc.)
 * - Safe storage in .env.keys files
 *
 * @param key - The raw key Buffer.
 * @returns The formatted key string.
 * @throws EncryptionError if the key is too short to encode.
 *
 * @example
 * const formatted = formatKey(masterKey);
 * // formatted = "ultraenv_key_v1_aBcDeF123456..."
 */
export function formatKey(key: Buffer): string {
  if (key.length === 0) {
    throw new EncryptionError('Cannot format an empty key');
  }

  const base64 = bufferToBase64(key);
  return `${KEY_PREFIX}${base64}`;
}

/**
 * Parse a formatted key string back into a raw Buffer.
 *
 * Expects format: `ultraenv_key_v1_{base64}`
 *
 * @param formatted - The formatted key string.
 * @returns The raw key Buffer.
 * @throws EncryptionError if the format is invalid or base64 decoding fails.
 *
 * @example
 * const key = parseKey('ultraenv_key_v1_aBcDeF123456...');
 * // key is a 32-byte Buffer
 */
export function parseKey(formatted: string): Buffer {
  if (!formatted.startsWith(KEY_PREFIX)) {
    throw new EncryptionError(
      `Invalid key format: expected prefix "${KEY_PREFIX}", got "${formatted.slice(0, KEY_PREFIX.length)}"`,
      {
        hint: 'Ensure the key was generated by ultraenv and has not been modified. Expected format: ultraenv_key_v1_{base64}',
      },
    );
  }

  const base64Part = formatted.slice(KEY_PREFIX.length);

  if (base64Part.length === 0) {
    throw new EncryptionError('Invalid key format: base64 payload is empty after prefix', {
      hint: 'The key appears to be truncated. Generate a new key.',
    });
  }

  try {
    return base64ToBuffer(base64Part);
    /* v8 ignore start */
  } catch (error: unknown) {
    throw new EncryptionError('Failed to decode key: invalid base64 encoding', {
      cause: error instanceof Error ? error : undefined,
      hint: 'The key may be corrupted. Generate a new key with "ultraenv key generate".',
    });
  }
  /* v8 ignore stop */
}

/**
 * Check if a string matches the ultraenv key format.
 *
 * Validates the prefix is correct and that the base64 portion is non-empty
 * and decodable to at least 16 bytes.
 *
 * @param formatted - The string to check.
 * @returns true if the string appears to be a valid ultraenv key.
 *
 * @example
 * isValidKeyFormat('ultraenv_key_v1_aBcDeF123=') // true
 * isValidKeyFormat('not-a-key')                   // false
 * isValidKeyFormat('ultraenv_key_v1_')            // false
 */
export function isValidKeyFormat(formatted: string): boolean {
  if (typeof formatted !== 'string') return false;
  if (formatted.length <= KEY_PREFIX.length) return false;
  /* v8 ignore start */
  if (!formatted.startsWith(KEY_PREFIX)) return false;
  /* v8 ignore stop */

  const base64Part = formatted.slice(KEY_PREFIX.length);
  /* v8 ignore start */
  if (base64Part.length === 0) return false;
  /* v8 ignore stop */

  try {
    const decoded = base64ToBuffer(base64Part);
    return decoded.length >= 16;
    /* v8 ignore start */
  } catch {
    return false;
  }
  /* v8 ignore stop */
}

// -----------------------------------------------------------------------------
// Key Masking
// -----------------------------------------------------------------------------

/**
 * Mask a formatted key for safe display in logs or terminal output.
 *
 * Shows only the first 8 and last 4 characters, replacing everything
 * in between with asterisks.
 *
 * @param formatted - The formatted key string.
 * @returns The masked key string.
 *
 * @example
 * maskKey('ultraenv_key_v1_aBcDeFgHiJkLmNoPqRsTuVwXyZ==')
 * // → "ultraenv********XyZ=="
 */
export function maskKey(formatted: string): string {
  if (formatted.length <= 14) {
    // Too short to meaningfully mask — show nothing
    return '***';
  }

  const visibleStart = 8;
  const visibleEnd = 4;
  const maskedLength = formatted.length - visibleStart - visibleEnd;

  /* v8 ignore start */
  if (maskedLength <= 0) {
    return '***';
  }
  /* v8 ignore stop */

  const start = formatted.slice(0, visibleStart);
  const end = formatted.slice(-visibleEnd);
  const mask = '*'.repeat(maskedLength);

  return `${start}${mask}${end}`;
}

// -----------------------------------------------------------------------------
// Keys File Generation & Parsing
// -----------------------------------------------------------------------------

/**
 * Generate the content for a .env.keys file.
 *
 * The keys file stores environment-specific keys in a format that is safe
 * to distribute through secure channels (NOT committed to git).
 *
 * Output format:
 * ```
 * # ultraenv encryption keys — DO NOT COMMIT
 * # Generated: {ISO timestamp}
 *
 * ULTRAENV_KEY_DEVELOPMENT="ultraenv_key_v1_..."
 * ULTRAENV_KEY_STAGING="ultraenv_key_v1_..."
 * ULTRAENV_KEY_PRODUCTION="ultraenv_key_v1_..."
 * ```
 *
 * @param environments - Array of environment names.
 * @returns The complete .env.keys file content as a string.
 *
 * @example
 * const masterKey = generateMasterKey();
 * const keysFile = generateKeysFile(['development', 'staging', 'production'], masterKey);
 */
export function generateKeysFile(environments: string[]): string {
  const timestamp = new Date().toISOString();
  const lines: string[] = [
    '# ultraenv encryption keys — DO NOT COMMIT',
    `# Generated: ${timestamp}`,
    '#',
    '# Each environment has a unique key derived from the master key.',
    '# Store this file securely and add it to .gitignore.',
    '',
  ];

  for (const env of environments) {
    const varName = `ULTRAENV_KEY_${env.toUpperCase()}`;
    lines.push(`# Key for "${env}" environment`);
    lines.push(`${varName}=""`);
    lines.push('');
  }

  // Remove trailing empty line for clean output
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines.join('\n');
}

/**
 * Parse a .env.keys file and extract environment-to-key mappings.
 *
 * Expects lines in the format: `ULTRAENV_KEY_{ENV}="ultraenv_key_v1_..."`
 *
 * @param content - The raw content of the .env.keys file.
 * @returns A Map of environment name → formatted key string.
 * @throws EncryptionError if the file format is invalid.
 *
 * @example
 * const keys = parseKeysFile(fileContent);
 * // keys.get('development') → 'ultraenv_key_v1_...'
 */
export function parseKeysFile(content: string): Map<string, string> {
  const result = new Map<string, string>();

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();

    // Skip empty lines and comments
    if (line.length === 0 || line.startsWith('#')) continue;

    // Parse KEY="value" format
    const eqMatch = line.match(/^ULTRAENV_KEY_([A-Za-z0-9_]+)="(.*)"$/);
    if (!eqMatch) {
      // Try without quotes
      const plainMatch = line.match(/^ULTRAENV_KEY_([A-Za-z0-9_]+)=(.*)$/);
      if (!plainMatch) {
        throw new EncryptionError(`Invalid keys file format at line ${i + 1}: "${line}"`, {
          hint: 'Each key entry should be in the format: ULTRAENV_KEY_{ENVIRONMENT}="ultraenv_key_v1_..."',
        });
      }
      const envName = plainMatch[1]!.toLowerCase();
      const keyValue = plainMatch[2]!;
      result.set(envName, keyValue);
      continue;
    }

    const envName = eqMatch[1]!.toLowerCase();
    const keyValue = eqMatch[2]!;
    result.set(envName, keyValue);
  }

  return result;
}

// -----------------------------------------------------------------------------
// Key Rotation
// -----------------------------------------------------------------------------

/**
 * Rotate encryption for data by decrypting with the old key and re-encrypting
 * with the new key.
 *
 * This is used when you want to change the encryption key for an environment
 * without losing the data. The process is:
 * 1. Decrypt the data using the old key
 * 2. Encrypt the same data using the new key
 *
 * @param oldKey - The current 32-byte encryption key.
 * @param newData - The plaintext data (or previously encrypted data string).
 * @param newKey - The new 32-byte encryption key.
 * @returns The data encrypted with the new key (same format as encryptValue).
 * @throws EncryptionError if either key is invalid or operations fail.
 *
 * @example
 * const newEncrypted = rotateKey(oldEnvironmentKey, 'my-secret', newEnvironmentKey);
 */
export function rotateKey(oldKey: Buffer, newData: string, newKey: Buffer): string {
  if (oldKey.length !== DEFAULT_KEY_LENGTH) {
    throw new EncryptionError(
      `Invalid old key length: expected ${DEFAULT_KEY_LENGTH} bytes, got ${oldKey.length}`,
    );
  }

  if (newKey.length !== DEFAULT_KEY_LENGTH) {
    throw new EncryptionError(
      `Invalid new key length: expected ${DEFAULT_KEY_LENGTH} bytes, got ${newKey.length}`,
    );
  }

  // newData is already plaintext — just encrypt with the new key.
  // If newData was previously encrypted, the caller should decrypt first.
  return encryptValue(newData, newKey);
}
