// =============================================================================
// ultraenv — Secret Masking Utility
// Mask sensitive values to prevent accidental exposure in logs/outputs.
// =============================================================================

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

export interface MaskOptions {
  /** Number of characters visible at the start (default: 3) */
  visibleStart?: number;
  /** Number of characters visible at the end (default: 4) */
  visibleEnd?: number;
  /** Character used for masking (default: '*') */
  maskChar?: string;
  /** Minimum value length before masking is applied (default: 8) */
  minLength?: number;
}

const DEFAULT_MASK_OPTIONS: Required<MaskOptions> = {
  visibleStart: 3,
  visibleEnd: 4,
  maskChar: '*',
  minLength: 8,
};

// -----------------------------------------------------------------------------
// Mask Value
// -----------------------------------------------------------------------------

/**
 * Mask a secret value for safe display.
 *
 * @example
 * maskValue('sk-abc12345def67890') → 'sk-***********7890'
 * maskValue('short') → 'short' (below minLength, not masked)
 * maskValue('') → ''
 */
export function maskValue(value: string, options?: MaskOptions): string {
  const opts = { ...DEFAULT_MASK_OPTIONS, ...options };

  if (value.length === 0) return '';
  if (value.length < opts.minLength) return value;

  const startLen = Math.min(opts.visibleStart, value.length - opts.visibleEnd - 1);
  const endLen = Math.min(opts.visibleEnd, value.length - startLen - 1);
  const maskedLen = Math.max(4, value.length - startLen - endLen);

  const start = value.slice(0, startLen);
  const end = value.slice(-endLen);
  const mask = opts.maskChar.repeat(maskedLen);

  return `${start}${mask}${end}`;
}

// -----------------------------------------------------------------------------
// High-Entropy / Secret-Like Detection
// -----------------------------------------------------------------------------

/**
 * Patterns commonly found in secret values (API keys, tokens, passwords, etc.).
 */
const SECRET_INDICATORS: readonly RegExp[] = [
  /^[a-zA-Z0-9]{20,}$/, // Long alphanumeric strings (20+ chars)
  /^[a-f0-9]{32,}$/, // Hex strings (32+ chars, likely hashes/keys)
  /^sk-[a-zA-Z0-9]{20,}$/, // Stripe-style API keys
  /^sk_live_[a-zA-Z0-9]{20,}$/, // Stripe live keys
  /^sk_test_[a-zA-Z0-9]{20,}$/, // Stripe test keys
  /^key-[a-zA-Z0-9]{16,}$/, // Generic key- prefixed
  /^token-[a-zA-Z0-9]{16,}$/, // Generic token- prefixed
  /^pk_[a-zA-Z0-9]{20,}$/, // Public key patterns
  /^secret_[a-zA-Z0-9]{16,}$/, // Secret key patterns
  /^[A-Za-z0-9+/]{40,}={0,2}$/, // Base64-like strings (40+ chars)
  /^[A-Za-z0-9_-]{40,}$/, // Base64url-like strings (40+ chars)
];

/**
 * Common key names that indicate a value is a secret.
 */
const SECRET_KEY_PATTERNS: readonly RegExp[] = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /access[_-]?key/i,
  /auth/i,
  /credential/i,
  /certificate/i,
  /private/i,
];

/**
 * Heuristic check to determine if a value looks like a secret/token.
 * Uses pattern matching and length heuristics.
 */
export function isSecretLike(value: string): boolean {
  if (value.length === 0) return false;
  if (value.length < 16) return false;

  // Check against known secret patterns
  for (const pattern of SECRET_INDICATORS) {
    if (pattern.test(value)) return true;
  }

  return false;
}

/**
 * Check if a key name suggests its value is a secret.
 */
export function isSecretKey(key: string): boolean {
  return SECRET_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

// -----------------------------------------------------------------------------
// Object Masking
// -----------------------------------------------------------------------------

type StringRecord = Record<string, unknown>;

/**
 * Create a new object with specified keys masked.
 * Works with nested objects and arrays.
 *
 * @param obj - The object to mask.
 * @param keys - Keys whose values should be masked.
 * @returns A new object with specified values masked.
 *
 * @example
 * maskObject({ API_KEY: 'sk-abc123', NAME: 'app' }, ['API_KEY'])
 * // → { API_KEY: 'sk-************123', NAME: 'app' }
 */
export function maskObject<T extends StringRecord>(
  obj: T,
  keys: readonly string[],
  options?: MaskOptions,
): T {
  const keySet = new Set(keys.map((k) => k.toLowerCase()));

  function maskDeep(value: unknown): unknown {
    if (value === null || value === undefined) return value;

    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => maskDeep(item));
    }

    if (typeof value === 'object') {
      const result: StringRecord = {};
      for (const [k, v] of Object.entries(value as StringRecord)) {
        if (keySet.has(k.toLowerCase())) {
          if (typeof v === 'string') {
            result[k] = maskValue(v, options);
          } else {
            result[k] = '[MASKED]';
          }
        } else {
          result[k] = maskDeep(v);
        }
      }
      return result;
    }

    return value;
  }

  return maskDeep(obj) as T;
}

/**
 * Automatically mask any values in an object that look like secrets.
 * Combines key-name heuristics with value-pattern heuristics.
 */
export function autoMaskObject<T extends StringRecord>(obj: T, options?: MaskOptions): T {
  function maskDeep(value: unknown): unknown {
    if (value === null || value === undefined) return value;

    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => maskDeep(item));
    }

    if (typeof value === 'object') {
      const result: StringRecord = {};
      for (const [k, v] of Object.entries(value as StringRecord)) {
        if (typeof v === 'string' && (isSecretKey(k) || isSecretLike(v))) {
          result[k] = maskValue(v, options);
        } else {
          result[k] = maskDeep(v);
        }
      }
      return result;
    }

    return value;
  }

  return maskDeep(obj) as T;
}
