// =============================================================================
// ultraenv — Encoding Detection & Conversion
// Detect and convert between common text encodings.
// =============================================================================

import { TextDecoder } from 'node:util';

// -----------------------------------------------------------------------------
// Supported Encodings
// -----------------------------------------------------------------------------

const SUPPORTED_ENCODINGS = ['utf-8', 'utf-16le', 'utf-16be', 'ascii', 'latin1', 'binary'] as const;

type SupportedEncoding = (typeof SUPPORTED_ENCODINGS)[number];

/**
 * Check if a Buffer looks like valid UTF-8.
 * Uses the same heuristic as the `utf-8` npm package:
 * - No single bytes in range 0x80–0xBF (unexpected continuation bytes)
 * - Proper multi-byte sequence lengths
 */
export function isUtf8(buffer: Buffer): boolean {
  let i = 0;
  const len = buffer.length;

  while (i < len) {
    const byte = buffer[i]!; // Safe: i < len guarantees this is defined

    if (byte <= 0x7f) {
      // ASCII — single byte
      i += 1;
      continue;
    }

    if (byte >= 0xc2 && byte <= 0xdf) {
      // 2-byte sequence
      if (i + 1 >= len) return false;
      if ((buffer[i + 1]! & 0xc0) !== 0x80) return false;
      i += 2;
      continue;
    }

    if (byte >= 0xe0 && byte <= 0xef) {
      // 3-byte sequence
      if (i + 2 >= len) return false;
      if ((buffer[i + 1]! & 0xc0) !== 0x80) return false;
      if ((buffer[i + 2]! & 0xc0) !== 0x80) return false;

      // Check for overlong encodings and surrogates
      if (byte === 0xe0 && buffer[i + 1]! < 0xa0) return false;
      if (byte === 0xed && buffer[i + 1]! > 0x9f) return false; // surrogate

      i += 3;
      continue;
    }

    if (byte >= 0xf0 && byte <= 0xf4) {
      // 4-byte sequence
      if (i + 3 >= len) return false;
      if ((buffer[i + 1]! & 0xc0) !== 0x80) return false;
      if ((buffer[i + 2]! & 0xc0) !== 0x80) return false;
      if ((buffer[i + 3]! & 0xc0) !== 0x80) return false;

      // Check for overlong encoding
      if (byte === 0xf0 && buffer[i + 1]! < 0x90) return false;
      // Check for code points above U+10FFFF
      if (byte === 0xf4 && buffer[i + 1]! > 0x8f) return false;

      i += 4;
      continue;
    }

    // Invalid UTF-8 start byte
    return false;
  }

  return true;
}

/**
 * Check if a Buffer looks like valid ASCII (all bytes 0x00–0x7F).
 */
function isAscii(buffer: Buffer): boolean {
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i]! > 0x7f) return false;
  }
  return true;
}

/**
 * Check if a Buffer looks like UTF-16 LE (little-endian) by checking for BOM
 * or by heuristic analysis of byte patterns.
 */
function isUtf16LE(buffer: Buffer): boolean {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return true;
  }
  // Heuristic: check if every other byte is 0x00 (common for ASCII in UTF-16 LE)
  if (buffer.length >= 4) {
    let nullByteCount = 0;
    let checked = 0;
    for (let i = 1; i < Math.min(buffer.length, 200); i += 2) {
      checked++;
      if (buffer[i] === 0x00) nullByteCount++;
    }
    return checked > 0 && nullByteCount / checked > 0.7;
  }
  return false;
}

/**
 * Check if a Buffer looks like UTF-16 BE (big-endian).
 */
function isUtf16BE(buffer: Buffer): boolean {
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return true;
  }
  // Heuristic: check if every other byte starting at index 0 is 0x00
  if (buffer.length >= 4) {
    let nullByteCount = 0;
    let checked = 0;
    for (let i = 0; i < Math.min(buffer.length - 1, 200); i += 2) {
      checked++;
      if (buffer[i] === 0x00) nullByteCount++;
    }
    return checked > 0 && nullByteCount / checked > 0.7;
  }
  return false;
}

/**
 * Detect the encoding of a Buffer.
 * Returns one of: 'utf-8', 'utf-16le', 'utf-16be', 'ascii', 'latin1'.
 *
 * Detection priority:
 * 1. BOM (Byte Order Mark)
 * 2. UTF-8 validation
 * 3. UTF-16 LE/BE heuristic
 * 4. ASCII check
 * 5. Fallback to latin1
 */
export function detectEncoding(buffer: Buffer): string {
  if (buffer.length === 0) return 'utf-8';

  // Check for BOM
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return 'utf-8';
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return 'utf-16le';
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return 'utf-16be';
  }

  // Check UTF-8 validity
  if (isUtf8(buffer)) {
    if (isAscii(buffer)) return 'ascii';
    return 'utf-8';
  }

  // Check UTF-16
  if (isUtf16LE(buffer)) return 'utf-16le';
  if (isUtf16BE(buffer)) return 'utf-16be';

  // Fallback
  return 'latin1';
}

/**
 * Decode a Buffer to string using the specified or detected encoding.
 */
export function decodeBuffer(buffer: Buffer, encoding?: string): string {
  const detected = encoding ?? detectEncoding(buffer);
  const decoder = new TextDecoder(detected as BufferEncoding, {
    fatal: false,
  });
  return decoder.decode(buffer);
}

/**
 * Encode a string to a Buffer using the specified encoding.
 * Defaults to UTF-8.
 */
export function encodeString(str: string, encoding: SupportedEncoding = 'utf-8'): Buffer {
  const encoder = new TextEncoder();
  if (encoding === 'utf-8' || encoding === 'ascii') {
    return Buffer.from(encoder.encode(str));
  }
  return Buffer.from(str, encoding as BufferEncoding);
}
