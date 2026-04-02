// =============================================================================
// ultraenv — String Validator
// Full string type validator with email, url, uuid, hex, base64, etc.
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

// -----------------------------------------------------------------------------
// String Parse Result & URL Options
// -----------------------------------------------------------------------------

export interface UrlOptions {
  /** Allowed protocols (default: ['http', 'https']) */
  protocols?: readonly string[];
}

export interface UuidOptions {
  /** Specific UUID version to validate (1-7). If omitted, accepts any version. */
  version?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

// -----------------------------------------------------------------------------
// Validation Functions
// -----------------------------------------------------------------------------

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

const UUID_V4_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const HEX_REGEX = /^(0x)?[0-9a-fA-F]+$/;

const BASE64_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9]+$/;

/** Validate an email address */
function validateEmail(value: string): string | null {
  if (!EMAIL_REGEX.test(value)) {
    return `"${value}" is not a valid email address`;
  }
  return null;
}

/** Validate a URL with optional protocol restriction */
function validateUrl(value: string, opts: UrlOptions): string | null {
  try {
    const url = new URL(value);
    const protocols = opts.protocols ?? ['http', 'https'];
    const allowed = protocols.map(p => p.toLowerCase());
    if (!allowed.includes(url.protocol.replace(':', ''))) {
      return `URL protocol must be one of: ${allowed.join(', ')}. Got "${url.protocol}"`;
    }
    return null;
  } catch {
    return `"${value}" is not a valid URL`;
  }
}

/** Validate a UUID with optional version constraint */
function validateUuid(value: string, opts: UuidOptions): string | null {
  if (opts.version === 4) {
    if (!UUID_V4_REGEX.test(value)) {
      return `"${value}" is not a valid UUID v4`;
    }
    return null;
  }
  if (!UUID_REGEX.test(value)) {
    return `"${value}" is not a valid UUID`;
  }
  if (opts.version !== undefined) {
    const versionDigit = value[14];
    if (versionDigit !== String(opts.version)) {
      return `"${value}" is not a valid UUID v${opts.version}`;
    }
  }
  return null;
}

/** Validate hex string */
function validateHex(value: string): string | null {
  if (!HEX_REGEX.test(value)) {
    return `"${value}" is not a valid hex string`;
  }
  return null;
}

/** Validate base64 string */
function validateBase64(value: string): string | null {
  if (value.length === 0 || !BASE64_REGEX.test(value)) {
    return `"${value}" is not a valid base64 string`;
  }
  return null;
}

/** Validate alphanumeric string */
function validateAlphanumeric(value: string): string | null {
  if (!ALPHANUMERIC_REGEX.test(value)) {
    return `"${value}" must contain only letters and numbers (alphanumeric)`;
  }
  return null;
}

// -----------------------------------------------------------------------------
// StringSchemaBuilder
// -----------------------------------------------------------------------------

/**
 * Chainable string schema builder with all string-specific validators.
 *
 * @typeParam T - The string literal union type (defaults to string)
 *
 * @example
 * ```typescript
 * const email = t.string().email();
 * const role = t.string().oneOf(['admin', 'user'] as const); // type: 'admin' | 'user'
 * const host = t.string().url({ protocols: ['https'] });
 * ```
 */
export class StringSchemaBuilder<T extends string = string> extends SchemaBuilder<T> {
  constructor() {
    const parser = (raw: string): ParseResult<string> => ({ success: true, value: raw });
    super(parser as (raw: string) => ParseResult<T>, 'string');
  }

  // -------------------------------------------------------------------------
  // Format Validators
  // -------------------------------------------------------------------------

  /** Validate as an email address */
  email(): StringSchemaBuilder<T> {
    this._addValidator((value: T) => validateEmail(value as string));
    return this;
  }

  /** Validate as a URL with optional protocol restriction */
  url(opts?: UrlOptions): StringSchemaBuilder<T> {
    this._addValidator((value: T) => validateUrl(value as string, opts ?? {}));
    return this;
  }

  /** Validate as a UUID (optionally restrict to a specific version 1-7) */
  uuid(version?: 1 | 2 | 3 | 4 | 5 | 6 | 7): StringSchemaBuilder<T> {
    this._addValidator((value: T) => validateUuid(value as string, { version }));
    return this;
  }

  /** Validate as a hex string (with optional 0x prefix) */
  hex(): StringSchemaBuilder<T> {
    this._addValidator((value: T) => validateHex(value as string));
    return this;
  }

  /** Validate as a base64-encoded string */
  base64(): StringSchemaBuilder<T> {
    this._addValidator((value: T) => validateBase64(value as string));
    return this;
  }

  /** Validate that the string contains only letters and numbers */
  alphanumeric(): StringSchemaBuilder<T> {
    this._addValidator((value: T) => validateAlphanumeric(value as string));
    return this;
  }

  // -------------------------------------------------------------------------
  // Case & Whitespace
  // -------------------------------------------------------------------------

  /** Convert to lowercase */
  lowercase(): StringSchemaBuilder<T> {
    this._addTransform((value: T) => (value as string).toLowerCase() as T);
    this._addValidator((value: T) => {
      if ((value as string) !== (value as string).toLowerCase()) {
        return `"${String(value)}" must be lowercase`;
      }
      return null;
    });
    return this;
  }

  /** Convert to uppercase */
  uppercase(): StringSchemaBuilder<T> {
    this._addTransform((value: T) => (value as string).toUpperCase() as T);
    this._addValidator((value: T) => {
      if ((value as string) !== (value as string).toUpperCase()) {
        return `"${String(value)}" must be uppercase`;
      }
      return null;
    });
    return this;
  }

  /** Trim whitespace from both ends */
  trim(): StringSchemaBuilder<T> {
    this._addTransform((value: T) => (value as string).trim() as T);
    return this;
  }

  // -------------------------------------------------------------------------
  // Length Constraints
  // -------------------------------------------------------------------------

  /** Minimum string length */
  minLength(n: number): StringSchemaBuilder<T> {
    this._addValidator((value: T) => {
      if ((value as string).length < n) {
        return `String must be at least ${n} characters long, got ${(value as string).length}`;
      }
      return null;
    });
    return this;
  }

  /** Maximum string length */
  maxLength(n: number): StringSchemaBuilder<T> {
    this._addValidator((value: T) => {
      if ((value as string).length > n) {
        return `String must be at most ${n} characters long, got ${(value as string).length}`;
      }
      return null;
    });
    return this;
  }

  /** Exact string length */
  length(n: number): StringSchemaBuilder<T> {
    this._addValidator((value: T) => {
      if ((value as string).length !== n) {
        return `String must be exactly ${n} characters long, got ${(value as string).length}`;
      }
      return null;
    });
    return this;
  }

  // -------------------------------------------------------------------------
  // Pattern Matching
  // -------------------------------------------------------------------------

  /** Match a regular expression pattern */
  pattern(regex: RegExp): StringSchemaBuilder<T> {
    this._addValidator((value: T) => {
      if (!regex.test(value as string)) {
        return `String must match pattern ${regex.toString()}`;
      }
      return null;
    });
    return this;
  }

  /** Must start with a specific prefix */
  startsWith(prefix: string): StringSchemaBuilder<T> {
    this._addValidator((value: T) => {
      if (!(value as string).startsWith(prefix)) {
        return `String must start with "${prefix}"`;
      }
      return null;
    });
    return this;
  }

  /** Must end with a specific suffix */
  endsWith(suffix: string): StringSchemaBuilder<T> {
    this._addValidator((value: T) => {
      if (!(value as string).endsWith(suffix)) {
        return `String must end with "${suffix}"`;
      }
      return null;
    });
    return this;
  }

  /** Must contain a specific substring */
  includes(substring: string): StringSchemaBuilder<T> {
    this._addValidator((value: T) => {
      if (!(value as string).includes(substring)) {
        return `String must contain "${substring}"`;
      }
      return null;
    });
    return this;
  }

  // -------------------------------------------------------------------------
  // Enum / OneOf — Type Narrowing
  // -------------------------------------------------------------------------

  /** Restrict to one of the specified values (alias for enum) */
  oneOf<L extends string>(values: readonly L[]): StringSchemaBuilder<L> {
    const set = new Set<string>(values);
    this._addValidator((value: string) => {
      if (!set.has(value)) {
        return `Value must be one of: ${Array.from(set).join(', ')}. Got "${value}"`;
      }
      return null;
    });
    return this as unknown as StringSchemaBuilder<L>;
  }

  /** Restrict to an enum of literal values — narrows the output type */
  enum<L extends string>(values: readonly L[]): StringSchemaBuilder<L> {
    return this.oneOf(values);
  }

  /** Non-empty string */
  nonempty(): StringSchemaBuilder<T> {
    this._addValidator((value: T) => {
      if ((value as string).length === 0) {
        return 'String must not be empty';
      }
      return null;
    });
    return this;
  }

  /** Must match a valid JSON string (checks parseability) */
  json(): StringSchemaBuilder<T> {
    this._addValidator((value: T) => {
      try {
        JSON.parse(value as string);
        return null;
      } catch {
        return `"${String(value).slice(0, 50)}" is not valid JSON`;
      }
    });
    return this;
  }
}

/** Create a new string schema builder */
export function createStringSchema<T extends string = string>(): StringSchemaBuilder<T> {
  return new StringSchemaBuilder<T>();
}
