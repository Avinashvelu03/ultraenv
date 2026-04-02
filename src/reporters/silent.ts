// =============================================================================
// ultraenv — Silent Reporter
// A no-op reporter that returns empty strings for all outputs.
// Useful when only exit codes matter (CI/CD, quiet mode).
// =============================================================================

import type {
  ValidationResult,
  ValidationWarning,
} from '../core/types.js';
import type { ScanResult } from '../core/types.js';
import { UltraenvError } from '../core/errors.js';

// -----------------------------------------------------------------------------
// Silent Reporter
// -----------------------------------------------------------------------------

/**
 * Report a validation result — returns empty string (silent).
 *
 * @param _result - The validation result (ignored)
 * @returns Empty string
 */
export function reportValidation(
  _result: ValidationResult,
): string {
  return '';
}

/**
 * Report an error — returns empty string (silent).
 *
 * @param _error - The error (ignored)
 * @returns Empty string
 */
export function reportError(
  _error: UltraenvError,
): string {
  return '';
}

/**
 * Report a scan result — returns empty string (silent).
 *
 * @param _result - The scan result (ignored)
 * @returns Empty string
 */
export function reportScanResult(
  _result: ScanResult,
): string {
  return '';
}

/**
 * Report a success message — returns empty string (silent).
 *
 * @param _message - The success message (ignored)
 * @returns Empty string
 */
export function reportSuccess(
  _message: string,
): string {
  return '';
}

/**
 * Report a warning — returns empty string (silent).
 *
 * @param _warning - The validation warning (ignored)
 * @returns Empty string
 */
export function reportWarning(
  _warning: ValidationWarning,
): string {
  return '';
}

/**
 * Report an info message — returns empty string (silent).
 *
 * @param _message - The info message (ignored)
 * @returns Empty string
 */
export function reportInfo(
  _message: string,
): string {
  return '';
}

// -----------------------------------------------------------------------------
// Silent Reporter Object
// -----------------------------------------------------------------------------

/**
 * A complete silent reporter object implementing all reporter methods.
 * Useful for passing as a reporter option where a full Reporter interface
 * is expected.
 *
 * @example
 * ```typescript
 * import { silentReporter } from 'ultraenv/reporters/silent';
 * // All methods are no-ops that return empty strings
 * ```
 */
export const silentReporter = {
  reportValidation,
  reportError,
  reportScanResult,
  reportSuccess,
  reportWarning,
  reportInfo,

  // Core Reporter interface methods (no-op implementations)
  varLoaded(): void { /* no-op */ },
  varError(): void { /* no-op */ },
  varWarning(): void { /* no-op */ },
  fileLoaded(): void { /* no-op */ },
  fileNotFound(): void { /* no-op */ },
  loadStart(): void { /* no-op */ },
  loadEnd(): void { /* no-op */ },
  secretDetected(): void { /* no-op */ },
  syncResult(): void { /* no-op */ },
  watchEvent(): void { /* no-op */ },
  debug(): void { /* no-op */ },
} as const;
