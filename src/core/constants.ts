// =============================================================================
// ultraenv — Core Constants
// Centralized constants used throughout the ultraenv project.
// =============================================================================

import { EnvFileType } from './types.js';

// -----------------------------------------------------------------------------
// Version
// -----------------------------------------------------------------------------

/** Current ultraenv version */
export const VERSION = '1.0.0';

// -----------------------------------------------------------------------------
// File Paths & Directories
// -----------------------------------------------------------------------------

/** Default directory to look for .env files */
export const DEFAULT_ENV_DIR = '.';

/** Default .env file name */
export const DEFAULT_ENV_FILE = '.env';

/** Default vault file name */
export const DEFAULT_VAULT_FILE = '.env.vault';

/** Default encryption keys file name */
export const DEFAULT_KEYS_FILE = '.env.keys';

// -----------------------------------------------------------------------------
// Encoding & Limits
// -----------------------------------------------------------------------------

/** Default file encoding */
export const ENCODING: BufferEncoding = 'utf-8';

/** Maximum depth for recursive variable interpolation */
export const MAX_INTERPOLATION_DEPTH = 10;

/** Maximum allowed value length in bytes (1 MB) */
export const MAX_VALUE_LENGTH = 1048576;

// -----------------------------------------------------------------------------
// Encryption
// -----------------------------------------------------------------------------

/** Encryption algorithm used for vault operations */
export const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

/** Prefix applied to generated encryption keys */
export const KEY_PREFIX = 'ultraenv_key_v1_';

/** Prefix applied to encrypted values in .env files */
export const ENCRYPTED_PREFIX = 'encrypted:v1:aes-256-gcm:';

// -----------------------------------------------------------------------------
// Supported .env File Variants
// -----------------------------------------------------------------------------

/**
 * All supported .env file variants in their standard form.
 * These map to the EnvFileType enum values.
 */
export const SUPPORTED_ENV_FILES: readonly string[] = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.development.local',
  '.env.test',
  '.env.test.local',
  '.env.production',
  '.env.production.local',
  '.env.staging',
  '.env.staging.local',
  '.env.ci',
] as const;

/**
 * Known loading order for .env files (priority cascade).
 * Files listed first have LOWER priority; files listed last have HIGHER priority.
 * Higher-priority files override lower-priority files under `last-wins` strategy.
 */
export const KNOWN_ENV_ORDER: readonly EnvFileType[] = [
  EnvFileType.Env,
  EnvFileType.EnvLocal,
  EnvFileType.EnvDevelopment,
  EnvFileType.EnvDevelopmentLocal,
  EnvFileType.EnvTest,
  EnvFileType.EnvTestLocal,
  EnvFileType.EnvProduction,
  EnvFileType.EnvProductionLocal,
  EnvFileType.EnvStaging,
  EnvFileType.EnvStagingLocal,
  EnvFileType.EnvCI,
] as const;

// -----------------------------------------------------------------------------
// Git Configuration
// -----------------------------------------------------------------------------

/**
 * Entries that should be in .gitignore for ultraenv.
 * Includes vault, keys, and local environment files.
 */
export const DEFAULT_GITIGNORE_ENTRIES: readonly string[] = [
  '',
  '# ultraenv — auto-generated entries',
  '.env.vault',
  '.env.keys',
  '.env.*.local',
  '',
  '# End ultraenv entries',
] as const;

// -----------------------------------------------------------------------------
// Environment Detection
// -----------------------------------------------------------------------------

/**
 * Common environment variable names used for environment detection.
 * Checked in order; the first match wins.
 */
export const ENVIRONMENT_VARIABLES: readonly string[] = [
  'NODE_ENV',
  'APP_ENV',
  'ENVIRONMENT',
  'ENV',
  'STAGE',
  'ULTRAENV_ENV',
] as const;

// -----------------------------------------------------------------------------
// Default Truthy / Falsy Values for Boolean Parsing
// -----------------------------------------------------------------------------

/** Values interpreted as `true` */
export const DEFAULT_TRUTHY_VALUES: readonly string[] = [
  'true',
  '1',
  'yes',
  'on',
  'TRUE',
  'True',
  'YES',
  'ON',
] as const;

/** Values interpreted as `false` */
export const DEFAULT_FALSY_VALUES: readonly string[] = [
  'false',
  '0',
  'no',
  'off',
  'FALSE',
  'False',
  'NO',
  'OFF',
  '',
] as const;

// -----------------------------------------------------------------------------
// Default Array Separator
// -----------------------------------------------------------------------------

/** Default separator used when parsing array values */
export const DEFAULT_ARRAY_SEPARATOR = ',';

// -----------------------------------------------------------------------------
// Default Vault Settings
// -----------------------------------------------------------------------------

/** Default key length for generated encryption keys (256 bits = 32 bytes) */
export const DEFAULT_KEY_LENGTH = 32;

/** Default salt length for HKDF key derivation (16 bytes) */
export const DEFAULT_SALT_LENGTH = 16;

/** Default IV length for AES-GCM (12 bytes) */
export const DEFAULT_IV_LENGTH = 12;

/** Default auth tag length for AES-GCM (16 bytes) */
export const DEFAULT_AUTH_TAG_LENGTH = 16;

// -----------------------------------------------------------------------------
// Banner (ASCII Art)
// -----------------------------------------------------------------------------

/**
 * Ultraenv CLI banner — displayed at startup.
 * Uses only standard ASCII characters for maximum compatibility.
 */
export const BANNER = `
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║     ██████╗ ██████╗ ███████╗██╗  ██╗██╗  ██╗     ║
  ║    ██╔════╝██╔═══██╗██╔════╝██║ ██╔╝██║ ██╔╝     ║
  ║    ██║     ██║   ██║███████╗█████╔╝ █████╔╝      ║
  ║    ██║     ██║   ██║╚════██║██╔═██╗ ██╔═██╗      ║
  ║    ╚██████╗╚██████╔╝███████║██║  ██╗██║  ██╗     ║
  ║     ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝     ║
  ║                                                   ║
  ║   The Ultimate Environment Variable Manager        ║
  ║   v${VERSION.padEnd(42)}║
  ╚═══════════════════════════════════════════════════╝
`.trimStart();
