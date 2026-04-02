// =============================================================================
// ultraenv — Main Entry Point (Programmatic API)
// The Ultimate Environment Variable Manager
// =============================================================================

/**
 * ultraenv — The Ultimate Environment Variable Manager
 *
 * @example
 * ```typescript
 * // Simple loading (dotenv-compatible)
 * import { load } from 'ultraenv';
 * load();
 *
 * // Schema-based validation with full type inference
 * import { defineEnv, t } from 'ultraenv';
 * const env = defineEnv({
 *   PORT: t.number().port().default(3000),
 *   DATABASE_URL: t.string().url().required(),
 *   NODE_ENV: t.enum(['development', 'staging', 'production'] as const).required(),
 *   DEBUG: t.boolean().default(false),
 * });
 * // env.PORT → number (not string!)
 * // env.NODE_ENV → 'development' | 'staging' | 'production'
 * ```
 *
 * @module ultraenv
 */

// -----------------------------------------------------------------------------
// Core Loading
// -----------------------------------------------------------------------------

export { load, loadSync, loadWithResult, loadWithResultSync } from './core/loader.js';
export type { LoadOptions, LoadResult, LoadMetadata } from './core/types.js';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

export { findConfig, loadConfig } from './core/config.js';
export type { UltraenvConfig } from './core/types.js';

// -----------------------------------------------------------------------------
// Schema Validation
// -----------------------------------------------------------------------------

export { defineEnv, tryDefineEnv, validate, t } from './schema/index.js';
export type { SchemaDefinition, InferSchema, SchemaBuilder } from './schema/index.js';

// -----------------------------------------------------------------------------
// Watcher (Hot Reload)
// -----------------------------------------------------------------------------

export { createWatcher } from './core/watcher.js';
export type { Watcher, WatchOptions, WatcherEvent } from './core/types.js';

// -----------------------------------------------------------------------------
// Vault (Encryption)
// -----------------------------------------------------------------------------

export {
  encryptEnvironment,
  decryptEnvironment,
  encryptValue,
  decryptValue,
  isEncryptedValue,
} from './vault/encryption.js';
export type { EncryptionResult } from './core/types.js';

export {
  generateMasterKey,
  deriveEnvironmentKey,
  formatKey,
  parseKey,
  isValidKeyFormat,
  maskKey,
  generateKeysFile,
  parseKeysFile,
  rotateKey,
} from './vault/key-manager.js';

export {
  parseVaultFile,
  serializeVaultFile,
  readVaultFile,
  writeVaultFile,
  getEnvironmentData,
  getVaultEnvironments,
} from './vault/vault-file.js';

export {
  computeIntegrity,
  verifyIntegrity,
  computeVaultChecksum,
  verifyVaultChecksum,
} from './vault/integrity.js';

export {
  SecureBuffer,
  SecureString,
  createSecureString,
  createSecureStringFromBuffer,
  wipeString,
  secureCompare,
} from './vault/secure-memory.js';

// -----------------------------------------------------------------------------
// Scanner (Secret Detection)
// -----------------------------------------------------------------------------

export { scan } from './scanner/index.js';
export {
  matchPatterns,
  addCustomPattern,
  removeCustomPattern,
  resetPatterns,
} from './scanner/patterns.js';
export { detectHighEntropyStrings, scanLineForEntropy } from './scanner/entropy.js';
export { scanFiles } from './scanner/file-scanner.js';
export { scanGitHistory, scanDiff, scanStagedFiles } from './scanner/git-scanner.js';
export { formatScanResult } from './scanner/reporter.js';
export type { ScanResult, DetectedSecret, SecretPattern, ScanOptions } from './core/types.js';

// -----------------------------------------------------------------------------
// Sync (.env.example)
// -----------------------------------------------------------------------------

export { generateExampleFile, generateExampleContent, needsUpdate } from './sync/generator.js';
export { compareSync, compareValues } from './sync/comparator.js';
export { createSyncWatcher } from './sync/watcher.js';
export type { SyncResult, SyncDiff } from './core/types.js';

// -----------------------------------------------------------------------------
// TypeGen (TypeScript Type Generation)
// -----------------------------------------------------------------------------

export { generateDeclaration } from './typegen/declaration.js';
export { generateModule } from './typegen/module.js';
export { generateJsonSchema } from './typegen/json-schema.js';
export { createTypegenWatcher } from './typegen/watcher.js';
export type { TypegenOptions } from './core/types.js';

// -----------------------------------------------------------------------------
// Environments (Multi-Environment Management)
// -----------------------------------------------------------------------------

export {
  listEnvironments,
  validateAllEnvironments,
  switchEnvironment,
  getActiveEnvironment,
  discoverEnvironments,
} from './environments/manager.js';
export { compareEnvironments, formatComparison } from './environments/comparator.js';
export {
  createEnvironment,
  removeEnvironment,
  duplicateEnvironment,
} from './environments/creator.js';

// -----------------------------------------------------------------------------
// Presets
// -----------------------------------------------------------------------------

export {
  registerPreset,
  getPreset,
  listPresets,
  hasPreset,
  unregisterPreset,
  getAllPresets,
} from './presets/index.js';
export type { Preset } from './core/types.js';

// -----------------------------------------------------------------------------
// Middleware & Health
// -----------------------------------------------------------------------------

export { ultraenvMiddleware, healthCheckRoute } from './middleware/express.js';
export { ultraenvPlugin, createUltraenvPlugin } from './middleware/fastify.js';
export { healthCheck, liveCheck, readinessCheck } from './middleware/health.js';

// -----------------------------------------------------------------------------
// Reporters
// -----------------------------------------------------------------------------

export {
  reportValidation,
  reportError,
  reportSuccess,
  reportWarning,
  reportInfo,
  reportScanResult as reportScanResultTerminal,
} from './reporters/terminal.js';
export {
  reportValidation as reportValidationJson,
  reportError as reportErrorJson,
  reportScanResult as reportScanResultJson,
} from './reporters/json.js';
export { reportScanResult as reportScanResultSarif } from './reporters/sarif.js';

// -----------------------------------------------------------------------------
// Error Classes
// -----------------------------------------------------------------------------

export {
  UltraenvError,
  ValidationError as UltraenvValidationError,
  ParseError,
  InterpolationError,
  EncryptionError,
  VaultError,
  ScanError,
  ConfigError,
  FileSystemError,
  isUltraenvError,
} from './core/errors.js';

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

export { maskValue as maskSecretValue } from './utils/mask.js';
export { shannonEntropy, isHighEntropy } from './utils/entropy.js';
export { VERSION } from './core/constants.js';

// -----------------------------------------------------------------------------
// Parser (Advanced use)
// -----------------------------------------------------------------------------

export { parseEnvFile } from './core/parser.js';
export { expandVariables } from './core/interpolation.js';
export { resolveCascade, mergeCascade } from './core/cascade.js';
export type { ParsedEnvVar, ParsedEnvFile } from './core/types.js';

// -----------------------------------------------------------------------------
// File System Utilities
// -----------------------------------------------------------------------------

export {
  readFile,
  writeFile,
  readFileSync,
  exists,
  isFile,
  isDirectory,
  ensureDir,
  removeFile,
  copyFile,
  listFiles,
  findUp,
} from './utils/fs.js';

// -----------------------------------------------------------------------------
// Version
// -----------------------------------------------------------------------------

import { VERSION } from './core/constants.js';
export default { version: VERSION };
