// =============================================================================
// ultraenv — Custom Error Classes
// All errors extend UltraenvError (which extends Error) with structured data
// and actionable hints for developers.
// =============================================================================

// -----------------------------------------------------------------------------
// Base Error
// -----------------------------------------------------------------------------

/**
 * Base error class for all ultraenv errors.
 * Provides a structured `code` field, an optional `hint` for remediation,
 * and a `cause` wrapper for chaining.
 */
export class UltraenvError extends Error {
  /** Machine-readable error code (e.g., 'PARSE_ERROR', 'ENCRYPTION_ERROR') */
  readonly code: string;

  /** Human-readable hint for how to fix this error */
  readonly hint?: string;

  /** The original cause of this error, if wrapping another error */
  readonly cause?: Error;

  constructor(
    message: string,
    options: {
      code?: string;
      hint?: string;
      cause?: Error;
    } = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code ?? 'ULTRAENV_ERROR';
    this.hint = options.hint;
    this.cause = options.cause;

    // Restore prototype chain (required for extending built-ins in TS)
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Return a formatted string with code, message, and hint */
  override toString(): string {
    const parts = [`[${this.code}] ${this.message}`];
    if (this.hint !== undefined) {
      parts.push(`  Hint: ${this.hint}`);
    }
    return parts.join('\n');
  }
}

// -----------------------------------------------------------------------------
// Validation Error
// -----------------------------------------------------------------------------

/**
 * Thrown when an environment variable fails schema validation.
 */
export class ValidationError extends UltraenvError {
  /** The variable name that failed validation */
  readonly field: string;

  /** The actual value that was provided */
  readonly value: string;

  /** The schema definition that was violated */
  readonly schema: unknown;

  /** Expected type or constraint description */
  readonly expected: string;

  constructor(
    field: string,
    value: string,
    message: string,
    options: {
      hint?: string;
      schema?: unknown;
      expected?: string;
      cause?: Error;
    } = {},
  ) {
    /* v8 ignore start */
    const fullMessage = message || `Validation failed for "${field}"`;
    /* v8 ignore stop */
    super(fullMessage, {
      code: 'VALIDATION_ERROR',
      hint:
        options.hint ??
        `Check the value of "${field}" in your .env file. Expected: ${options.expected ?? 'see schema definition'}.`,
      cause: options.cause,
    });
    this.field = field;
    this.value = value;
    this.schema = options.schema;
    this.expected = options.expected ?? 'valid value';
  }
}

// -----------------------------------------------------------------------------
// Parse Error
// -----------------------------------------------------------------------------

/**
 * Thrown when an .env file cannot be parsed due to malformed syntax.
 */
export class ParseError extends UltraenvError {
  /** 1-based line number where the error occurred */
  readonly line: number;

  /** 1-based column number where the error occurred */
  readonly column: number;

  /** The raw content of the line that caused the error */
  readonly raw: string;

  /** Path to the file being parsed */
  readonly filePath: string;

  constructor(
    message: string,
    options: {
      line?: number;
      column?: number;
      raw?: string;
      filePath?: string;
      hint?: string;
      cause?: Error;
    } = {},
  ) {
    const location =
      options.line !== undefined
        ? ` at line ${options.line}${options.column !== undefined ? `, column ${options.column}` : ''}`
        : '';
    const file = options.filePath !== undefined ? ` in "${options.filePath}"` : '';
    const fullMessage = `${message}${file}${location}`;

    super(fullMessage, {
      code: 'PARSE_ERROR',
      hint:
        options.hint ??
        'Check your .env file for invalid syntax. Each line should be in the format KEY=VALUE or # comment.',
      cause: options.cause,
    });
    this.line = options.line ?? 0;
    this.column = options.column ?? 0;
    this.raw = options.raw ?? '';
    this.filePath = options.filePath ?? '';
  }
}

// -----------------------------------------------------------------------------
// Interpolation Error
// -----------------------------------------------------------------------------

/**
 * Thrown when variable interpolation (e.g., $VAR or ${VAR}) fails.
 */
export class InterpolationError extends UltraenvError {
  /** The variable reference that caused the error */
  readonly variable: string;

  /** Whether this was caused by a circular reference */
  readonly circular: boolean;

  constructor(
    message: string,
    options: {
      variable?: string;
      circular?: boolean;
      hint?: string;
      cause?: Error;
    } = {},
  ) {
    super(message, {
      code: 'INTERPOLATION_ERROR',
      hint:
        options.hint ??
        (options.circular
          ? 'Circular variable references are not allowed. Check that no two variables reference each other.'
          : `Make sure "${options.variable ?? 'the referenced variable'}" is defined before it is referenced.`),
      cause: options.cause,
    });
    this.variable = options.variable ?? '';
    this.circular = options.circular ?? false;
  }
}

// -----------------------------------------------------------------------------
// Encryption Error
// -----------------------------------------------------------------------------

/**
 * Thrown when encryption or decryption operations fail.
 */
export class EncryptionError extends UltraenvError {
  constructor(
    message: string,
    options: {
      hint?: string;
      cause?: Error;
    } = {},
  ) {
    super(message, {
      code: 'ENCRYPTION_ERROR',
      hint:
        options.hint ??
        'Ensure your encryption key is valid and has not been corrupted. Try regenerating the key with "ultraenv key generate".',
      cause: options.cause,
    });
  }
}

// -----------------------------------------------------------------------------
// Vault Error
// -----------------------------------------------------------------------------

/**
 * Thrown when vault operations fail (lock/unlock/encrypt/decrypt).
 */
export class VaultError extends UltraenvError {
  /** The environment name involved */
  readonly environment: string;

  /** The vault operation that failed */
  readonly operation: string;

  constructor(
    message: string,
    options: {
      environment?: string;
      operation?: string;
      hint?: string;
      cause?: Error;
    } = {},
  ) {
    super(message, {
      code: 'VAULT_ERROR',
      hint:
        options.hint ??
        `Check that the vault file exists and is properly formatted for environment "${options.environment ?? 'unknown'}". Run "ultraenv vault status" for diagnostics.`,
      cause: options.cause,
    });
    this.environment = options.environment ?? '';
    this.operation = options.operation ?? '';
  }
}

// -----------------------------------------------------------------------------
// Scan Error
// -------------------------------------------------------------------------------

/**
 * Thrown when secret scanning encounters an issue.
 */
export class ScanError extends UltraenvError {
  /** The file being scanned */
  readonly file: string;

  /** The line number where the error occurred */
  readonly line: number;

  /** The secret pattern that triggered the error */
  readonly pattern: string;

  constructor(
    message: string,
    options: {
      file?: string;
      line?: number;
      pattern?: string;
      hint?: string;
      cause?: Error;
    } = {},
  ) {
    super(message, {
      code: 'SCAN_ERROR',
      hint:
        options.hint ??
        'Check that all files being scanned are accessible and contain valid text content.',
      cause: options.cause,
    });
    this.file = options.file ?? '';
    this.line = options.line ?? 0;
    this.pattern = options.pattern ?? '';
  }
}

// -----------------------------------------------------------------------------
// Config Error
// -----------------------------------------------------------------------------

/**
 * Thrown when the ultraenv configuration is invalid.
 */
export class ConfigError extends UltraenvError {
  /** The configuration field that is invalid */
  readonly field: string;

  constructor(
    message: string,
    options: {
      field?: string;
      hint?: string;
      cause?: Error;
    } = {},
  ) {
    super(message, {
      code: 'CONFIG_ERROR',
      hint:
        options.hint ??
        `Check your ultraenv configuration. The field "${options.field ?? 'unknown'}" may have an invalid value or type.`,
      cause: options.cause,
    });
    this.field = options.field ?? '';
  }
}

// -----------------------------------------------------------------------------
// File System Error
// -----------------------------------------------------------------------------

/**
 * Thrown when file system operations fail.
 */
export class FileSystemError extends UltraenvError {
  /** The file or directory path involved */
  readonly path: string;

  /** The operation that failed (e.g., 'read', 'write', 'mkdir') */
  readonly operation: string;

  /** The underlying system error code (e.g., 'ENOENT', 'EACCES') */
  readonly code: string;

  constructor(
    message: string,
    options: {
      path?: string;
      operation?: string;
      code?: string;
      hint?: string;
      cause?: Error;
    } = {},
  ) {
    const fsCode =
      options.code ?? (options.cause as NodeJS.ErrnoException | undefined)?.code ?? 'UNKNOWN';
    const opHint =
      options.path !== undefined
        ? /* v8 ignore start */
          `Could not ${options.operation ?? 'access'} "${options.path}".`
        : /* v8 ignore stop */
          '';

    super(message, {
      code: `FS_${fsCode}`,
      hint:
        options.hint ?? `${opHint} Ensure the file exists and you have the necessary permissions.`,
      cause: options.cause,
    });
    this.path = options.path ?? '';
    this.operation = options.operation ?? '';
    // Override the base `code` field with the specific fs error code
    this.code = fsCode;
  }
}

// -----------------------------------------------------------------------------
// Type Guard Helpers
// -----------------------------------------------------------------------------

/**
 * Check if an error is an ultraenv error (or subclass thereof).
 */
export function isUltraenvError(error: unknown): error is UltraenvError {
  return error instanceof UltraenvError;
}

/**
 * Check if an error is a validation error.
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Check if an error is a parse error.
 */
export function isParseError(error: unknown): error is ParseError {
  return error instanceof ParseError;
}

/**
 * Check if an error is an encryption error.
 */
export function isEncryptionError(error: unknown): error is EncryptionError {
  return error instanceof EncryptionError;
}

/**
 * Check if an error is a vault error.
 */
export function isVaultError(error: unknown): error is VaultError {
  return error instanceof VaultError;
}

/**
 * Extract a user-friendly message from any error value.
 * Handles both UltraenvError instances and native Error objects.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof UltraenvError) {
    return error.toString();
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return `Unknown error: ${String(error)}`;
}
