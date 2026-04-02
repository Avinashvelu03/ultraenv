// =============================================================================
// ultraenv — Vault File Handler
// Read, write, parse, and serialize .env.vault files.
// The vault file stores encrypted environment data safe to commit to version control.
// =============================================================================

import { readFile, writeFile } from '../utils/fs.js';
import { VaultError } from '../core/errors.js';
import type { VaultEnvironment } from '../core/types.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Internal vault entry that pairs the encrypted payload with environment metadata.
 * Extends the public VaultEnvironment type with the encrypted data needed for
 * serialization.
 */
export interface VaultEntry extends VaultEnvironment {
  /** The full encrypted payload string for this environment */
  encrypted: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Prefix for vault environment variable lines */
const VAULT_VAR_PREFIX = 'ULTRAENV_VAULT_';

// -----------------------------------------------------------------------------
// parseVaultFile
// -----------------------------------------------------------------------------

/**
 * Parse the content of a .env.vault file into a Map of environment entries.
 *
 * Expected format:
 * ```
 * # ultraenv encrypted vault — safe to commit
 * # Generated: {ISO timestamp}
 * # Environments: development, staging, production
 *
 * ULTRAENV_VAULT_DEVELOPMENT="encrypted:v1:aes-256-gcm:..."
 * ULTRAENV_VAULT_STAGING="encrypted:v1:aes-256-gcm:..."
 * ```
 *
 * Comments (lines starting with #) and blank lines are ignored.
 * Environment names are normalized to lowercase.
 *
 * @param content - The raw file content.
 * @returns A Map of environment name (lowercase) → VaultEntry.
 * @throws VaultError if the file format is invalid.
 *
 * @example
 * const vault = parseVaultFile(fileContent);
 * const devEntry = vault.get('development');
 * // devEntry?.encrypted = "encrypted:v1:aes-256-gcm:..."
 * // devEntry?.varCount = 5
 */
export function parseVaultFile(content: string): Map<string, VaultEntry> {
  const result = new Map<string, VaultEntry>();

  if (content.trim().length === 0) {
    return result;
  }

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const rawLine = lines[i];
/* v8 ignore start */
    if (rawLine === undefined) continue;
/* v8 ignore stop */
    const line = rawLine.trim();

    // Skip empty lines and comments
    if (line.length === 0 || line.startsWith('#')) continue;

    // Parse ULTRAENV_VAULT_{ENV}="encrypted:..."
    const match = line.match(
      new RegExp(`^${VAULT_VAR_PREFIX}([A-Za-z0-9_]+)="(.*)"$`),
    );

    if (!match) {
      // Try without quotes (legacy format support)
      const plainMatch = line.match(
        new RegExp(`^${VAULT_VAR_PREFIX}([A-Za-z0-9_]+)=(.*)$`),
      );

      if (!plainMatch) {
        throw new VaultError(
          `Invalid vault file format at line ${lineNumber}: "${line}"`,
          {
            operation: 'parse',
            hint: `Each environment entry should be in the format: ${VAULT_VAR_PREFIX}{ENVIRONMENT}="encrypted:..."`,
          },
        );
      }

      const envName = plainMatch[1]!.toLowerCase();
      const encryptedValue = plainMatch[2]!;
      const varCount = countEncryptedVars(encryptedValue);

      result.set(envName, {
        name: envName,
        varCount,
        lastModified: new Date().toISOString(),
        keyIds: extractKeyIds(encryptedValue),
        encrypted: encryptedValue,
      });
      continue;
    }

    const envName = match[1]!.toLowerCase();
    const encryptedValue = match[2]!;
    const varCount = countEncryptedVars(encryptedValue);

    result.set(envName, {
      name: envName,
      varCount,
      lastModified: new Date().toISOString(),
      keyIds: extractKeyIds(encryptedValue),
      encrypted: encryptedValue,
    });
  }

  return result;
}

// -----------------------------------------------------------------------------
// serializeVaultFile
// -----------------------------------------------------------------------------

/**
 * Serialize a Map of vault entries into the .env.vault file format.
 *
 * Output format:
 * ```
 * # ultraenv encrypted vault — safe to commit
 * # Generated: {ISO timestamp}
 * # Environments: development, staging, production
 *
 * ULTRAENV_VAULT_DEVELOPMENT="encrypted:v1:aes-256-gcm:..."
 * ULTRAENV_VAULT_STAGING="encrypted:v1:aes-256-gcm:..."
 * ```
 *
 * @param environments - A Map of environment name → VaultEntry.
 * @returns The complete vault file content as a string.
 *
 * @example
 * const content = serializeVaultFile(vaultMap);
 */
export function serializeVaultFile(environments: Map<string, VaultEntry>): string {
  const timestamp = new Date().toISOString();
  const envNames = Array.from(environments.keys()).sort();

  const lines: string[] = [
    '# ultraenv encrypted vault — safe to commit',
    `# Generated: ${timestamp}`,
    `# Environments: ${envNames.join(', ')}`,
    '',
  ];

  for (const envName of envNames) {
    const entry = environments.get(envName);
/* v8 ignore start */
    if (entry === undefined) continue;
/* v8 ignore stop */

    const varName = `${VAULT_VAR_PREFIX}${envName.toUpperCase()}`;
    lines.push(`${varName}="${entry.encrypted}"`);
  }

  // Ensure file ends with a newline
  if (lines[lines.length - 1] !== '') {
    lines.push('');
  }

  return lines.join('\n');
}

// -----------------------------------------------------------------------------
// readVaultFile
// -----------------------------------------------------------------------------

/**
 * Read a .env.vault file from disk and parse it into a Map of entries.
 *
 * @param path - Absolute or relative path to the vault file.
 * @returns A Map of environment name → VaultEntry.
 * @throws VaultError if the file cannot be read or has an invalid format.
 *
 * @example
 * const vault = await readVaultFile('.env.vault');
 */
export async function readVaultFile(path: string): Promise<Map<string, VaultEntry>> {
  try {
    const content = await readFile(path, 'utf-8');
    return parseVaultFile(content);
  } catch (error: unknown) {
    if (error instanceof VaultError) throw error;
    throw new VaultError(
      `Failed to read vault file "${path}"`,
      {
        operation: 'read',
/* v8 ignore start */
        cause: error instanceof Error ? error : undefined,
/* v8 ignore stop */
      },
    );
  }
}

// -----------------------------------------------------------------------------
// writeVaultFile
// -----------------------------------------------------------------------------

/**
 * Write vault entries to a .env.vault file on disk.
 *
 * Creates parent directories if needed. The file is overwritten atomically
 * (written in full, not appended).
 *
 * @param path - Absolute or relative path to the vault file.
 * @param environments - A Map of environment name → VaultEntry to write.
 * @throws VaultError if the file cannot be written.
 *
 * @example
 * await writeVaultFile('.env.vault', vaultMap);
 */
export async function writeVaultFile(
  path: string,
  environments: Map<string, VaultEntry>,
): Promise<void> {
  if (environments.size === 0) {
    throw new VaultError(
      'Cannot write an empty vault file',
      {
        operation: 'write',
        hint: 'Add at least one environment to the vault before writing.',
      },
    );
  }

  try {
    const content = serializeVaultFile(environments);
    await writeFile(path, content, 'utf-8');
  } catch (error: unknown) {
/* v8 ignore start */
    if (error instanceof VaultError) throw error;
/* v8 ignore stop */
    throw new VaultError(
      `Failed to write vault file "${path}"`,
      {
        operation: 'write',
/* v8 ignore start */
        cause: error instanceof Error ? error : undefined,
/* v8 ignore stop */
      },
    );
  }
}

// -----------------------------------------------------------------------------
// getEnvironmentData
// -----------------------------------------------------------------------------

/**
 * Get the vault entry for a specific environment from a parsed vault.
 *
 * @param vault - The parsed vault Map.
 * @param env - The environment name (case-insensitive).
 * @returns The VaultEntry if found, undefined otherwise.
 *
 * @example
 * const entry = getEnvironmentData(vault, 'production');
 * if (entry) {
 *   console.log(`Found ${entry.varCount} encrypted variables`);
 * }
 */
export function getEnvironmentData(
  vault: Map<string, VaultEntry>,
  env: string,
): VaultEntry | undefined {
  return vault.get(env.toLowerCase());
}

// -----------------------------------------------------------------------------
// getVaultEnvironments
// -----------------------------------------------------------------------------

/**
 * Get a list of all environment names stored in the vault.
 *
 * @param vault - The parsed vault Map.
 * @returns Array of environment names sorted alphabetically.
 */
export function getVaultEnvironments(
  vault: Map<string, VaultEntry>,
): string[] {
  return Array.from(vault.keys()).sort();
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Count the number of encrypted variables from the serialized encrypted payload.
 *
 * When the encrypted data contains multiple newline-separated KEY=VALUE pairs,
 * this function decrypts the var count from the entry metadata.
 * Since we can't decrypt here, we estimate from the entry's varCount field.
 */
function countEncryptedVars(encrypted: string): number {
  // If the encrypted data is not in the ultraenv format, return 1 (single value)
  if (!encrypted.startsWith('encrypted:')) {
    return encrypted.split('\n').filter((line) => line.includes('=')).length || 1;
  }

  // We can't determine var count without decryption.
  // Return 1 as a conservative estimate for individual encrypted values.
  // When the environment data is encrypted as a whole (encryptEnvironment),
  // the caller should update varCount after decryption.
  return 1;
}

/**
 * Extract key identifiers from the encrypted payload.
 *
 * Since we can't inspect the encrypted content, we return a default
 * key ID based on the algorithm version found in the prefix.
 */
function extractKeyIds(encrypted: string): string[] {
  if (!encrypted.startsWith('encrypted:')) {
    return ['unknown'];
  }

  // Parse the version from the prefix: "encrypted:v1:..."
  const colonIndex = encrypted.indexOf(':', 'encrypted:'.length);
/* v8 ignore start */
  if (colonIndex === -1) {
    return ['unknown'];
  }
/* v8 ignore stop */

  const version = encrypted.slice('encrypted:'.length, colonIndex);
/* v8 ignore start */
  return [`v${version === 'v1' ? '1' : version}`];
/* v8 ignore stop */
}
