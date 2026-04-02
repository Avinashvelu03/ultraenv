// =============================================================================
// ultraenv — JSON Reporter
// Structured JSON output for validation results, errors, and scan results.
// =============================================================================

import type { ValidationResult, ScanResult } from '../core/types.js';
import { UltraenvError } from '../core/errors.js';

// -----------------------------------------------------------------------------
// JSON Reporter Options
// -----------------------------------------------------------------------------

/** Options for the JSON reporter */
export interface JsonReporterOptions {
  /**
   * Whether to pretty-print the JSON output.
   * Default: true (2-space indent)
   */
  pretty?: boolean;

  /**
   * Number of spaces for indentation when pretty-printing.
   * Default: 2
   */
  indent?: number;

  /**
   * Whether to include stack traces for errors.
   * Default: false
   */
  includeStack?: boolean;
}

// -----------------------------------------------------------------------------
// Validation Result Reporting
// -----------------------------------------------------------------------------

/**
 * Report a validation result as a JSON string.
 *
 * @param result - The validation result to report
 * @param options - Reporter options
 * @returns JSON string
 *
 * @example
 * ```typescript
 * import { reportValidation } from 'ultraenv/reporters/json';
 * const json = reportValidation(result);
 * // → '{"valid":true,"errorCount":0,"warningCount":0,"...}'
 * ```
 */
export function reportValidation(
  result: ValidationResult,
  options: JsonReporterOptions = {},
): string {
  const { pretty = true, indent = 2 } = options;

  const output: Record<string, unknown> = {
    valid: result.valid,
    errorCount: result.errors.length,
    warningCount: result.warnings.length,
    validatedCount: Object.keys(result.validated).length,
    unknownCount: result.unknown.length,
  };

  // Include errors if any
  if (result.errors.length > 0) {
    output.errors = result.errors.map((error) => ({
      field: error.field,
      message: error.message,
      expected: error.expected,
      hint: error.hint,
      source: error.source ?? null,
      lineNumber: error.lineNumber ?? null,
    }));
  }

  // Include warnings if any
  if (result.warnings.length > 0) {
    output.warnings = result.warnings.map((warning) => ({
      field: warning.field,
      message: warning.message,
      code: warning.code,
    }));
  }

  // Include unknown vars
  if (result.unknown.length > 0) {
    output.unknown = result.unknown;
  }

  return serialize(output, pretty, indent);
}

/**
 * Report a validation result as a detailed JSON string.
 * Includes all validated values (useful for debugging).
 */
export function reportValidationDetailed(
  result: ValidationResult,
  options: JsonReporterOptions = {},
): string {
  const { pretty = true, indent = 2 } = options;

  const base = JSON.parse(reportValidation(result, { pretty: false })) as Record<string, unknown>;

  base.validated = result.validated;
  base.timestamp = new Date().toISOString();

  return serialize(base, pretty, indent);
}

// -----------------------------------------------------------------------------
// Error Reporting
// -----------------------------------------------------------------------------

/**
 * Report an UltraenvError as a JSON string.
 *
 * @param error - The error to report
 * @param options - Reporter options
 * @returns JSON string
 */
export function reportError(error: UltraenvError, options: JsonReporterOptions = {}): string {
  const { pretty = true, indent = 2, includeStack = false } = options;

  const output: Record<string, unknown> = {
    name: error.name,
    code: error.code,
    message: error.message,
  };

  if (error.hint !== undefined) {
    output.hint = error.hint;
  }

  if (includeStack && error.stack !== undefined) {
    output.stack = error.stack;
  }

  if (error.cause !== undefined) {
    output.cause =
      error.cause instanceof Error
        ? {
            name: error.cause.name,
            message: error.cause.message,
            ...(includeStack && error.cause.stack ? { stack: error.cause.stack } : {}),
          }
        : String(error.cause);
  }

  return serialize(output, pretty, indent);
}

// -----------------------------------------------------------------------------
// Scan Result Reporting
// -----------------------------------------------------------------------------

/**
 * Report a scan result as a JSON string.
 *
 * @param result - The scan result to report
 * @param options - Reporter options
 * @returns JSON string
 *
 * @example
 * ```typescript
 * import { reportScanResult } from 'ultraenv/reporters/json';
 * const json = reportScanResult(scanResult);
 * ```
 */
export function reportScanResult(result: ScanResult, options: JsonReporterOptions = {}): string {
  const { pretty = true, indent = 2 } = options;

  // Severity breakdown
  const severityCounts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const secret of result.secrets) {
    const severity = secret.pattern.severity;
    severityCounts[severity] = (severityCounts[severity] ?? 0) + 1;
  }

  const output: Record<string, unknown> = {
    found: result.found,
    totalSecrets: result.secrets.length,
    severityBreakdown: severityCounts,
    filesScanned: result.filesScanned.length,
    filesSkipped: result.filesSkipped.length,
    scanTimeMs: result.scanTimeMs,
    timestamp: result.timestamp,
  };

  if (result.secrets.length > 0) {
    output.secrets = result.secrets.map((secret) => ({
      type: secret.pattern.name,
      severity: secret.pattern.severity,
      category: secret.pattern.category,
      file: secret.file,
      line: secret.line,
      column: secret.column,
      value: maskValue(secret.value),
      confidence: secret.confidence,
      remediation: secret.pattern.remediation,
    }));
  }

  return serialize(output, pretty, indent);
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Serialize an object to JSON string.
 */
function serialize(obj: Record<string, unknown>, pretty: boolean, indent: number): string {
  if (pretty) {
    return JSON.stringify(obj, null, indent);
  }
  return JSON.stringify(obj);
}

/**
 * Mask a value for safe JSON output.
 */
function maskValue(value: string, visibleChars: number = 4): string {
  if (value.length <= visibleChars + 4) {
    return '*'.repeat(value.length);
  }
  const start = value.slice(0, visibleChars);
  const end = value.slice(-4);
  const masked = '*'.repeat(Math.max(4, value.length - visibleChars - 4));
  return `${start}${masked}${end}`;
}
