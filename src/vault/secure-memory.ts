// =============================================================================
// ultraenv — Secure Memory Management
// Secure buffer and string handling that minimizes the window of exposure
// for sensitive data in memory. Buffers are automatically zeroed on GC.
// =============================================================================

import { randomBytes, timingSafeEqual as cryptoTimingSafeEqual } from 'node:crypto';

// -----------------------------------------------------------------------------
// SecureBuffer
// -----------------------------------------------------------------------------

/**
 * A secure buffer wrapper that automatically zeroes its contents on garbage
 * collection and provides safe access methods.
 *
 * Unlike a regular Buffer, SecureBuffer:
 * - Zeros its contents when garbage collected (via FinalizationRegistry)
 * - Does not expose the raw buffer to JSON.stringify or console.log
 * - Provides explicit zero() and fill() methods for manual cleanup
 *
 * **Important**: While SecureBuffer reduces the risk of sensitive data
 * remaining in memory, it cannot provide absolute guarantees. Node.js V8
 * engine may create copies of the data during garbage collection or
 * serialization. Use defense-in-depth practices.
 *
 * @example
 * const buf = new SecureBuffer(32);
 * buf.fill(0); // Fill with zeros
 * // ... use buf ...
 * buf.zero(); // Explicitly zero when done
 * // buf will also be zeroed automatically when garbage collected
 */
export class SecureBuffer {
  private _buffer: Buffer;
  private _length: number;
  private _zeroed: boolean;

  /** Track all live SecureBuffers for FinalizationRegistry cleanup */
  private static readonly registry = new FinalizationRegistry<Buffer>((buf) => {
    // Zero the buffer when the SecureBuffer is garbage collected
    buf.fill(0);
  });

  /** Counter for generating unique token identifiers */
  private static _instanceCount = 0;

  /**
   * Create a new SecureBuffer.
   *
   * @param size - The size of the buffer in bytes.
   * @throws RangeError if size is not a positive integer.
   */
  constructor(size: number) {
    if (size < 1 || !Number.isInteger(size)) {
      throw new RangeError(`SecureBuffer: size must be a positive integer, got ${size}`);
    }

    this._buffer = Buffer.alloc(size);
    this._length = size;
    this._zeroed = false;

    // Register for automatic cleanup on GC
    SecureBuffer._instanceCount++;
    SecureBuffer.registry.register(this, this._buffer, this);
  }

  /**
   * Create a SecureBuffer from an existing Buffer.
   * The source buffer is NOT modified — a copy is made.
   *
   * @param source - The source buffer to copy.
   * @returns A new SecureBuffer containing a copy of the source data.
   */
  static from(source: Buffer | Uint8Array): SecureBuffer {
    const buf = new SecureBuffer(source.length);
    Buffer.from(source).copy(buf._buffer);
    buf._zeroed = false;
    return buf;
  }

  /**
   * Create a SecureBuffer from a string.
   *
   * @param str - The string to encode.
   * @param encoding - The character encoding (default: 'utf-8').
   * @returns A new SecureBuffer containing the encoded string.
   */
  static fromString(str: string, encoding: BufferEncoding = 'utf-8'): SecureBuffer {
    const buf = new SecureBuffer(Buffer.byteLength(str, encoding));
    buf._buffer.write(str, encoding);
    buf._zeroed = false;
    return buf;
  }

  /**
   * The size of the buffer in bytes.
   */
  get length(): number {
    return this._length;
  }

  /**
   * Whether the buffer has been zeroed.
   */
  get isZeroed(): boolean {
    return this._zeroed;
  }

  /**
   * Fill the buffer with the specified byte value.
   *
   * @param value - The byte value to fill with (0-255).
   * @returns This SecureBuffer for chaining.
   */
  fill(value: number): SecureBuffer {
    if (value < 0 || value > 255 || !Number.isInteger(value)) {
      throw new RangeError(`SecureBuffer.fill: value must be an integer 0-255, got ${value}`);
    }

    this._buffer.fill(value);
    this._zeroed = value === 0;
    return this;
  }

  /**
   * Fill the buffer with random bytes.
   *
   * @returns This SecureBuffer for chaining.
   */
  fillRandom(): SecureBuffer {
    randomBytes(this._length).copy(this._buffer);
    this._zeroed = false;
    return this;
  }

  /**
   * Zero out all bytes in the buffer.
   *
   * This should be called as soon as the sensitive data is no longer needed.
   * The buffer will also be zeroed automatically on garbage collection, but
   * explicit zeroing provides faster cleanup for time-sensitive operations.
   *
   * @returns This SecureBuffer for chaining.
   */
  zero(): SecureBuffer {
    this._buffer.fill(0);
    this._zeroed = true;
    return this;
  }

  /**
   * Get a read-only copy of the underlying buffer.
   *
   * **Warning**: This returns a COPY of the buffer contents.
   * The caller is responsible for zeroing the returned buffer when done.
   * Use toString() when possible to avoid managing raw buffers.
   *
   * @returns A copy of the buffer contents.
   */
  getBuffer(): Buffer {
    if (this._zeroed) {
      return Buffer.alloc(this._length);
    }
    return Buffer.from(this._buffer);
  }

  /**
   * Get a single byte at the specified index.
   *
   * @param index - The byte index.
   * @returns The byte value (0-255).
   */
  getByte(index: number): number {
    if (index < 0 || index >= this._length) {
      throw new RangeError(
        `SecureBuffer.getByte: index ${index} out of bounds (length: ${this._length})`,
      );
    }
    return this._buffer[index]!;
  }

  /**
   * Convert the buffer contents to a string.
   *
   * @param encoding - The character encoding (default: 'utf-8').
   * @returns The decoded string.
   */
  toString(encoding: BufferEncoding = 'utf-8'): string {
    if (this._zeroed) {
      return '';
    }
    return this._buffer.toString(encoding);
  }

  /**
   * Convert to hex string.
   *
   * @returns Lowercase hex string.
   */
  toHex(): string {
    if (this._zeroed) {
      return '0'.repeat(this._length * 2);
    }
    return this._buffer.toString('hex');
  }

  /**
   * Convert to base64 string.
   *
   * @returns Base64-encoded string.
   */
  toBase64(): string {
    if (this._zeroed) {
      return '';
    }
    return this._buffer.toString('base64');
  }

  /**
   * JSON serialization — never exposes the buffer contents.
   * Returns a placeholder string to prevent accidental logging of secrets.
   *
   * @returns A safe placeholder string.
   */
  toJSON(): string {
    return '[SecureBuffer]';
  }

  /**
   * Custom inspect for console.log — never exposes contents.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [Symbol.for('nodejs.util.inspect.custom')](
    _depth: number,
    _options: Record<string, unknown>,
  ): string {
    /* v8 ignore start */
    return `[SecureBuffer: ${this._length} bytes${this._zeroed ? ' (zeroed)' : ''}]`;
  }
  /* v8 ignore stop */

  /**
   * Manual cleanup — call when the SecureBuffer is no longer needed.
   * Zeros the buffer and unregisters from the FinalizationRegistry.
   *
   * After calling dispose(), the buffer cannot be used.
   */
  dispose(): void {
    this._buffer.fill(0);
    this._zeroed = true;
    SecureBuffer.registry.unregister(this);
  }
}

// -----------------------------------------------------------------------------
// SecureString
// -----------------------------------------------------------------------------

/**
 * A secure string that stores its backing data in a SecureBuffer.
 * Provides string-like methods while ensuring the underlying data
 * can be securely zeroed.
 *
 * @example
 * const secret = createSecureString('my-api-key-12345');
 * console.log(secret.value); // 'my-api-key-12345'
 * secret.dispose(); // Zeros the backing buffer
 * console.log(secret.value); // ''
 */
export class SecureString {
  private _buffer: SecureBuffer;
  private _disposed: boolean;

  /**
   * Create a new SecureString.
   *
   * **Internal**: Use the `createSecureString()` factory function instead
   * of calling this constructor directly.
   *
   * @param buffer - The SecureBuffer backing this string.
   * @internal
   */
  constructor(buffer: SecureBuffer) {
    this._buffer = buffer;
    this._disposed = false;
  }

  /**
   * The string value.
   * Returns empty string if the backing buffer has been zeroed/disposed.
   */
  get value(): string {
    if (this._disposed) return '';
    return this._buffer.toString('utf-8');
  }

  /**
   * The length of the string in characters.
   */
  get length(): number {
    return this.value.length;
  }

  /**
   * Whether this SecureString has been disposed.
   */
  get disposed(): boolean {
    return this._disposed;
  }

  /**
   * Zero the backing buffer and mark as disposed.
   * After calling dispose(), value will always return ''.
   */
  dispose(): void {
    this._buffer.zero();
    this._buffer.dispose();
    this._disposed = true;
  }

  /**
   * JSON serialization — never exposes the string contents.
   */
  toJSON(): string {
    return '[SecureString]';
  }

  /**
   * Custom inspect for console.log.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [Symbol.for('nodejs.util.inspect.custom')](
    _depth: number,
    _options: Record<string, unknown>,
  ): string {
    /* v8 ignore start */
    return `[SecureString: ${this._disposed ? 'disposed' : `${this.length} chars`}]`;
  }
  /* v8 ignore stop */
}

// -----------------------------------------------------------------------------
// Factory Functions
// -----------------------------------------------------------------------------

/**
 * Create a SecureString from a plain string.
 *
 * The plain string's data is copied into a SecureBuffer. Note that the
 * original string may still exist in V8's string table until GC runs.
 *
 * @param value - The string value to wrap securely.
 * @returns A SecureString instance.
 *
 * @example
 * const apiKey = createSecureString('sk-abc123def456');
 * console.log(apiKey.value); // 'sk-abc123def456'
 * apiKey.dispose();
 */
export function createSecureString(value: string): SecureString {
  const buffer = SecureBuffer.fromString(value, 'utf-8');
  return new SecureString(buffer);
}

/**
 * Create a SecureString from a Buffer.
 *
 * @param buffer - The buffer containing the string data.
 * @param encoding - The character encoding (default: 'utf-8').
 * @returns A SecureString instance.
 */
/* v8 ignore start */
export function createSecureStringFromBuffer(
  buffer: Buffer,
  encoding: BufferEncoding = 'utf-8',
): SecureString {
  const secureBuf = SecureBuffer.from(buffer);
  const strBuf = SecureBuffer.fromString(buffer.toString(encoding), encoding);
  secureBuf.zero();
  return new SecureString(strBuf);
}
/* v8 ignore stop */

// -----------------------------------------------------------------------------
// wipeString
// -----------------------------------------------------------------------------

/**
 * Attempt to overwrite a string's memory with zeros.
 *
 * **Important limitation**: JavaScript strings are immutable in V8. This
 * function works by creating a modified string that replaces characters,
 * but V8 may retain copies of the original string in memory. This is a
 * best-effort mitigation, not a guarantee.
 *
 * For truly secure handling, prefer SecureBuffer and SecureString which
 * use mutable Buffer storage that CAN be reliably zeroed.
 *
 * @param str - The string to attempt to wipe.
 *
 * @example
 * let password = 'my-secret-password';
 * // ... use password ...
 * wipeString(password);
 * password = '';
 */
export function wipeString(str: string): void {
  // Best-effort: overwrite each character code with 0
  // This doesn't work in V8 due to string interning and copy-on-write,
  // but we try anyway as a defense-in-depth measure.
  try {
    // String.fromCharCode creates a new string with null characters
    // We overwrite the original reference by using split/join
    const chars = str.split('');
    for (let i = 0; i < chars.length; i++) {
      chars[i] = '\x00';
    }
    // Attempt to force the old string to be collected
    // by referencing the "wiped" version
    const _wiped = chars.join('');
    void _wiped;
    /* v8 ignore start */
  } catch {
    // Silently fail — this is a best-effort operation
  }
  /* v8 ignore stop */
}

// -----------------------------------------------------------------------------
// secureCompare
// -----------------------------------------------------------------------------

/**
 * Constant-time comparison of two strings or Buffers.
 *
 * This function always takes the same amount of time regardless of where
 * the first difference occurs, preventing timing attacks that could
 * reveal information about the expected value.
 *
 * For strings: converts to UTF-8 Buffers and compares.
 * For Buffers: compares directly.
 * Different-length inputs are safely handled (returns false in constant time).
 *
 * @param a - First value (string or Buffer).
 * @param b - Second value (string or Buffer).
 * @returns true if the values are identical.
 *
 * @example
 * // Safe for comparing passwords, tokens, API keys, etc.
 * const isMatch = secureCompare(userInput, storedHash);
 *
 * // Also works with Buffers
 * const isMatch = secureCompare(keyBuffer, expectedKeyBuffer);
 */
export function secureCompare(a: string | Buffer, b: string | Buffer): boolean {
  // Fast path: same reference
  if (a === b) return true;

  const bufA = typeof a === 'string' ? Buffer.from(a, 'utf-8') : a;
  const bufB = typeof b === 'string' ? Buffer.from(b, 'utf-8') : b;

  // Handle different lengths safely.
  // We always do a comparison of the same length to avoid timing leaks.
  // If lengths differ, we compare against a zero-padded version.
  if (bufA.length !== bufB.length) {
    const maxLen = Math.max(bufA.length, bufB.length);

    // Create padded buffers (always the same size)
    const padA = Buffer.alloc(maxLen, 0);
    const padB = Buffer.alloc(maxLen, 0);
    bufA.copy(padA, maxLen - bufA.length);
    bufB.copy(padB, maxLen - bufB.length);

    try {
      cryptoTimingSafeEqual(padA, padB);
      return false; // Different lengths → never equal
      /* v8 ignore start */
    } catch {
      return false;
    }
    /* v8 ignore stop */
  }

  try {
    return cryptoTimingSafeEqual(bufA, bufB);
    /* v8 ignore start */
  } catch {
    return false;
  }
  /* v8 ignore stop */
}

// -----------------------------------------------------------------------------
// isZeroed
// -----------------------------------------------------------------------------

/**
 * Check if a Buffer contains only zero bytes.
 *
 * @param buffer - The buffer to check.
 * @returns true if all bytes in the buffer are 0x00.
 */
export function isZeroed(buffer: Buffer): boolean {
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] !== 0) {
      return false;
    }
  }
  return true;
}
