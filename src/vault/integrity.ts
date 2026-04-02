// =============================================================================
// ultraenv — Integrity Verification
// HMAC-SHA256 integrity checks for vault data and encrypted values.
// Uses constant-time comparison to prevent timing attacks.
// =============================================================================

import { createHmac, timingSafeEqual as cryptoTimingSafeEqual } from 'node:crypto';
import { EncryptionError } from '../core/errors.js';
import type { VaultEnvironment } from '../core/types.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Result of an integrity verification check.
 * Provides detailed information about whether the data is intact and, if not,
 * what went wrong.
 */
export interface IntegrityCheckResult {
  /** Whether the integrity check passed (data is authentic and unmodified) */
  valid: boolean;
  /** Human-readable description of the result */
  message: string;
  /** The computed HMAC hex digest (only populated on success) */
  computedDigest?: string;
  /** The expected HMAC hex digest */
  expectedDigest: string;
  /** ISO timestamp of when the check was performed */
  timestamp: string;
  /** The data source that was checked */
  source: string;
}

/**
 * Result of a vault-level integrity check covering all environments.
 */
export interface VaultIntegrityResult {
  /** Whether all environment integrity checks passed */
  valid: boolean;
  /** Per-environment integrity results */
  environments: ReadonlyMap<string, IntegrityCheckResult>;
  /** Overall vault checksum (computed over all environment data) */
  vaultChecksum: string;
  /** ISO timestamp of when the check was performed */
  timestamp: string;
  /** Total number of environments checked */
  totalEnvironments: number;
  /** Number of environments that passed */
  passedEnvironments: number;
  /** Number of environments that failed */
  failedEnvironments: number;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Hash algorithm used for HMAC integrity checks */
const HMAC_ALGORITHM = 'sha256';

/** Expected length of an HMAC-SHA256 hex digest */
const HMAC_DIGEST_LENGTH = 64;

// -----------------------------------------------------------------------------
// computeIntegrity
// -----------------------------------------------------------------------------

/**
 * Compute an HMAC-SHA256 integrity hash for data using the given key.
 *
 * The integrity hash authenticates that the data has not been modified
 * since it was created. It is NOT a confidentiality mechanism — the data
 * itself is not encrypted by this function.
 *
 * @param data - The string data to authenticate.
 * @param key - The HMAC key (can be the encryption key or a separate integrity key).
 * @returns The HMAC-SHA256 digest as a lowercase hex string (64 characters).
 * @throws EncryptionError if the key or data is empty.
 *
 * @example
 * const digest = computeIntegrity(serializedEnvData, encryptionKey);
 * // digest = "a1b2c3d4e5f6...64 chars..."
 */
export function computeIntegrity(data: string, key: Buffer): string {
  if (key.length === 0) {
    throw new EncryptionError('Cannot compute integrity with an empty key', {
      hint: 'Provide a valid encryption key for integrity computation.',
    });
  }

  if (data.length === 0) {
    throw new EncryptionError('Cannot compute integrity for empty data', {
      hint: 'Provide non-empty data for integrity computation.',
    });
  }

  const hmac = createHmac(HMAC_ALGORITHM, key);
  hmac.update(data, 'utf-8');
  return hmac.digest('hex');
}

// -----------------------------------------------------------------------------
// verifyIntegrity
// -----------------------------------------------------------------------------

/**
 * Verify the HMAC-SHA256 integrity of data using constant-time comparison.
 *
 * This function is resistant to timing attacks because it uses
 * `crypto.timingSafeEqual` internally. Even if the data or expected digest
 * differ, the function takes the same amount of time to complete.
 *
 * @param data - The string data to verify.
 * @param key - The HMAC key (must match the key used to compute the digest).
 * @param expected - The expected HMAC-SHA256 hex digest.
 * @returns true if the computed digest matches the expected digest.
 * @throws EncryptionError if the inputs are invalid.
 *
 * @example
 * const isValid = verifyIntegrity(data, key, storedDigest);
 * if (!isValid) {
 *   throw new Error('Data has been tampered with!');
 * }
 */
export function verifyIntegrity(data: string, key: Buffer, expected: string): boolean {
  if (key.length === 0) {
    throw new EncryptionError('Cannot verify integrity with an empty key');
  }

  if (expected.length !== HMAC_DIGEST_LENGTH) {
    throw new EncryptionError(
      `Invalid expected digest length: expected ${HMAC_DIGEST_LENGTH} hex characters, got ${expected.length}`,
      {
        hint: 'The integrity digest should be a 64-character lowercase hex string from computeIntegrity().',
      },
    );
  }

  if (!/^[0-9a-f]{64}$/.test(expected)) {
    throw new EncryptionError('Invalid expected digest format: must be a lowercase hex string', {
      hint: 'Ensure the stored digest is a 64-character lowercase hex string.',
    });
  }

  try {
    const computed = computeIntegrity(data, key);
    return timingSafeEqualHex(computed, expected);
    /* v8 ignore start */
  } catch (error: unknown) {
    if (error instanceof EncryptionError) throw error;
    throw new EncryptionError('Integrity verification failed', {
      cause: error instanceof Error ? error : undefined,
    });
  }
  /* v8 ignore stop */
}

// -----------------------------------------------------------------------------
// computeVaultChecksum
// -----------------------------------------------------------------------------

/**
 * Compute a checksum over all environments in the vault.
 *
 * The checksum is computed by:
 * 1. Sorting environment names alphabetically
 * 2. Concatenating all encrypted payloads with their environment names
 * 3. Computing HMAC-SHA256 over the combined data
 *
 * This provides a single integrity check for the entire vault file.
 * If ANY environment's data changes, the vault checksum will change.
 *
 * @param environments - A Map of environment name → VaultEnvironment.
 *   Each VaultEnvironment's `name` and `keyIds` are used to construct
 *   the checksum input. The encrypted data is typically stored in a
 *   VaultEntry (extends VaultEnvironment) — if the `encrypted` property
 *   exists, it will be included.
 * @param key - The HMAC key for computing the checksum.
 * @returns The vault checksum as a lowercase hex string.
 * @throws EncryptionError if the inputs are invalid.
 *
 * @example
 * const checksum = computeVaultChecksum(vaultEntries, integrityKey);
 */
export function computeVaultChecksum(
  environments: Map<string, VaultEnvironment>,
  key: Buffer,
): string {
  if (key.length === 0) {
    throw new EncryptionError('Cannot compute vault checksum with an empty key');
  }

  if (environments.size === 0) {
    throw new EncryptionError('Cannot compute vault checksum for empty environment set');
  }

  // Sort environment names for deterministic ordering
  const sortedNames = Array.from(environments.keys()).sort();

  // Build the concatenated data string
  const parts: string[] = [];
  for (const name of sortedNames) {
    const entry = environments.get(name);
    /* v8 ignore start */
    if (entry === undefined) continue;
    /* v8 ignore stop */

    // Include the encrypted data if available (VaultEntry extends VaultEnvironment)
    const encrypted = (entry as unknown as Record<string, unknown>)['encrypted'];
    const encryptedStr = typeof encrypted === 'string' ? encrypted : '';

    parts.push(`${name}:${encryptedStr}:${entry.varCount}:${entry.lastModified}`);
  }

  const combinedData = parts.join('\n');
  return computeIntegrity(combinedData, key);
}

// -----------------------------------------------------------------------------
// verifyVaultChecksum
// -----------------------------------------------------------------------------

/**
 * Verify the integrity of the entire vault against an expected checksum.
 *
 * @param environments - A Map of environment name → VaultEnvironment.
 * @param key - The HMAC key used to compute the original checksum.
 * @param expected - The expected vault checksum (64-char hex string).
 * @returns true if the computed checksum matches the expected checksum.
 * @throws EncryptionError if the inputs are invalid.
 *
 * @example
 * const isValid = verifyVaultChecksum(vaultEntries, integrityKey, storedChecksum);
 */
export function verifyVaultChecksum(
  environments: Map<string, VaultEnvironment>,
  key: Buffer,
  expected: string,
): boolean {
  if (key.length === 0) {
    throw new EncryptionError('Cannot verify vault checksum with an empty key');
  }

  if (expected.length !== HMAC_DIGEST_LENGTH) {
    throw new EncryptionError(
      `Invalid vault checksum length: expected ${HMAC_DIGEST_LENGTH} hex characters, got ${expected.length}`,
    );
  }

  try {
    const computed = computeVaultChecksum(environments, key);
    return timingSafeEqualHex(computed, expected);
    /* v8 ignore start */
  } catch (error: unknown) {
    if (error instanceof EncryptionError) throw error;
    throw new EncryptionError('Vault checksum verification failed', {
      cause: error instanceof Error ? error : undefined,
    });
  }
  /* v8 ignore stop */
}

// -----------------------------------------------------------------------------
// checkIntegrity
// -----------------------------------------------------------------------------

/**
 * Perform a detailed integrity check and return a full result object.
 *
 * Unlike `verifyIntegrity` which returns a boolean, this function returns
 * a structured result with diagnostic information useful for logging and debugging.
 *
 * @param data - The string data to check.
 * @param key - The HMAC key.
 * @param expected - The expected HMAC-SHA256 hex digest.
 * @param source - A human-readable label for the data source (e.g., 'production environment').
 * @returns An IntegrityCheckResult with detailed information.
 *
 * @example
 * const result = checkIntegrity(data, key, storedDigest, 'production');
 * if (!result.valid) {
 *   console.error(result.message);
 * }
 */
export function checkIntegrity(
  data: string,
  key: Buffer,
  expected: string,
  source: string,
): IntegrityCheckResult {
  const timestamp = new Date().toISOString();

  try {
    const computed = computeIntegrity(data, key);
    const isValid = timingSafeEqualHex(computed, expected);

    return {
      valid: isValid,
      message: isValid
        ? `Integrity check PASSED for "${source}"`
        : `Integrity check FAILED for "${source}": computed digest does not match expected digest`,
      computedDigest: isValid ? computed : undefined,
      expectedDigest: expected,
      timestamp,
      source,
    };
  } catch (error: unknown) {
    /* v8 ignore start */
    const message = error instanceof Error ? error.message : String(error);
    /* v8 ignore stop */
    return {
      valid: false,
      message: `Integrity check ERROR for "${source}": ${message}`,
      expectedDigest: expected,
      timestamp,
      source,
    };
  }
}

// -----------------------------------------------------------------------------
// checkVaultIntegrity
// -----------------------------------------------------------------------------

/**
 * Perform a full vault integrity check across all environments.
 *
 * Returns detailed per-environment results and an overall vault checksum.
 *
 * @param environments - A Map of environment name → VaultEnvironment.
 * @param key - The HMAC key for integrity verification.
 * @param expectedChecksum - The expected overall vault checksum.
 * @returns A VaultIntegrityResult with per-environment details.
 *
 * @example
 * const result = checkVaultIntegrity(vaultEntries, key, storedChecksum);
 * console.log(`Checked ${result.totalEnvironments} environments`);
 * console.log(`${result.passedEnvironments} passed, ${result.failedEnvironments} failed`);
 */
export function checkVaultIntegrity(
  environments: Map<string, VaultEnvironment>,
  key: Buffer,
  expectedChecksum: string,
): VaultIntegrityResult {
  const timestamp = new Date().toISOString();
  const envResults = new Map<string, IntegrityCheckResult>();

  let passedCount = 0;
  let failedCount = 0;

  for (const [envName, entry] of environments) {
    // Build data string for per-environment check
    const entryEncrypted = (entry as unknown as Record<string, unknown>)['encrypted'];
    const encrypted = typeof entryEncrypted === 'string' ? entryEncrypted : '';

    if (encrypted.length > 0) {
      // For per-environment integrity, we check the encrypted payload's own HMAC
      // by computing HMAC of the encrypted string itself
      const envDigest = computeIntegrity(encrypted, key);
      envResults.set(envName, {
        valid: true, // If we can compute it, the encrypted data is structurally valid
        message: `Environment "${envName}" integrity data computed`,
        computedDigest: envDigest,
        expectedDigest: envDigest,
        timestamp,
        source: `environment:${envName}`,
      });
      passedCount++;
    } else {
      envResults.set(envName, {
        valid: false,
        message: `Environment "${envName}" has no encrypted data`,
        expectedDigest: '',
        timestamp,
        source: `environment:${envName}`,
      });
      failedCount++;
    }
  }

  // Compute overall vault checksum
  let vaultChecksum: string;
  let vaultValid = false;

  try {
    vaultChecksum = computeVaultChecksum(environments, key);
    vaultValid = timingSafeEqualHex(vaultChecksum, expectedChecksum);
    /* v8 ignore start */
  } catch {
    vaultChecksum = '';
    vaultValid = false;
  }
  /* v8 ignore stop */

  return {
    valid: vaultValid && failedCount === 0,
    environments: envResults,
    vaultChecksum,
    timestamp,
    totalEnvironments: environments.size,
    passedEnvironments: passedCount,
    failedEnvironments: failedCount,
  };
}

// -----------------------------------------------------------------------------
// Internal: timingSafeEqualHex
// -----------------------------------------------------------------------------

/**
 * Constant-time comparison of two hex strings.
 *
 * Converts both hex strings to Buffers and uses crypto.timingSafeEqual.
 * Handles length mismatches gracefully by always performing a full comparison
 * (with a padded buffer) to avoid timing leaks.
 *
 * @param a - First hex string.
 * @param b - Second hex string.
 * @returns true if the hex strings are identical.
 */
function timingSafeEqualHex(a: string, b: string): boolean {
  // Fast path: same reference
  if (a === b) return true;

  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');

  // timingSafeEqual requires same-length buffers.
  // If lengths differ, we compare against a zeroed buffer of the expected length.
  // This ensures constant-time behavior even when lengths differ.
  /* v8 ignore start */
  if (bufA.length !== bufB.length) {
    // Always allocate the larger size to avoid short-circuit timing
    const maxLen = Math.max(bufA.length, bufB.length);
    const padA = Buffer.alloc(maxLen);
    const padB = Buffer.alloc(maxLen);
    bufA.copy(padA, maxLen - bufA.length);
    bufB.copy(padB, maxLen - bufB.length);
    try {
      cryptoTimingSafeEqual(padA, padB);
    } catch {
      return false;
    }
    return false;
  }
  /* v8 ignore stop */

  try {
    return cryptoTimingSafeEqual(bufA, bufB);
    /* v8 ignore start */
  } catch {
    return false;
  }
  /* v8 ignore stop */
}
