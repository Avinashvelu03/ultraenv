import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SecureBuffer,
  SecureString,
  createSecureString,
  secureCompare,
  isZeroed,
  wipeString,
} from '../../../src/vault/secure-memory.js';

describe('secure-memory', () => {
  // ===========================================================================
  // SecureBuffer — construction
  // ===========================================================================
  describe('SecureBuffer construction', () => {
    it('creates a buffer of the specified size', () => {
      const buf = new SecureBuffer(32);
      expect(buf.length).toBe(32);
    });

    it('throws RangeError for zero size', () => {
      expect(() => new SecureBuffer(0)).toThrow(RangeError);
    });

    it('throws RangeError for negative size', () => {
      expect(() => new SecureBuffer(-1)).toThrow(RangeError);
    });

    it('throws RangeError for non-integer size', () => {
      expect(() => new SecureBuffer(3.5)).toThrow(RangeError);
    });

    it('initializes with all zeros', () => {
      const buf = new SecureBuffer(16);
      const data = buf.getBuffer();
      for (let i = 0; i < data.length; i++) {
        expect(data[i]!).toBe(0);
      }
    });

    it('starts with isZeroed = false', () => {
      const buf = new SecureBuffer(16);
      expect(buf.isZeroed).toBe(false);
    });
  });

  // ===========================================================================
  // SecureBuffer — fill
  // ===========================================================================
  describe('SecureBuffer.fill', () => {
    it('fills all bytes with the specified value', () => {
      const buf = new SecureBuffer(16);
      buf.fill(0xab);
      const data = buf.getBuffer();
      for (let i = 0; i < data.length; i++) {
        expect(data[i]!).toBe(0xab);
      }
    });

    it('returns this for chaining', () => {
      const buf = new SecureBuffer(16);
      const result = buf.fill(0xff);
      expect(result).toBe(buf);
    });

    it('sets isZeroed to false when filling with non-zero', () => {
      const buf = new SecureBuffer(16);
      buf.fill(0x42);
      expect(buf.isZeroed).toBe(false);
    });

    it('sets isZeroed to true when filling with zero', () => {
      const buf = new SecureBuffer(16);
      buf.fill(0xff);
      buf.fill(0);
      expect(buf.isZeroed).toBe(true);
    });

    it('throws RangeError for values outside 0-255', () => {
      const buf = new SecureBuffer(16);
      expect(() => buf.fill(256)).toThrow(RangeError);
      expect(() => buf.fill(-1)).toThrow(RangeError);
      expect(() => buf.fill(1.5)).toThrow(RangeError);
    });
  });

  // ===========================================================================
  // SecureBuffer — zero
  // ===========================================================================
  describe('SecureBuffer.zero', () => {
    it('zeros all bytes in the buffer', () => {
      const buf = new SecureBuffer(16);
      buf.fill(0xff);
      buf.zero();
      const data = buf.getBuffer();
      for (let i = 0; i < data.length; i++) {
        expect(data[i]!).toBe(0);
      }
    });

    it('sets isZeroed to true', () => {
      const buf = new SecureBuffer(16);
      buf.fill(0xff);
      buf.zero();
      expect(buf.isZeroed).toBe(true);
    });

    it('returns this for chaining', () => {
      const buf = new SecureBuffer(16);
      const result = buf.zero();
      expect(result).toBe(buf);
    });

    it('returns empty buffer from getBuffer after zero', () => {
      const buf = new SecureBuffer(16);
      buf.fill(0xff);
      buf.zero();
      const data = buf.getBuffer();
      for (const byte of data) {
        expect(byte).toBe(0);
      }
    });
  });

  // ===========================================================================
  // SecureBuffer — dispose
  // ===========================================================================
  describe('SecureBuffer.dispose', () => {
    it('zeros the buffer', () => {
      const buf = new SecureBuffer(16);
      buf.fill(0xab);
      buf.dispose();
      expect(buf.isZeroed).toBe(true);
    });

    it('returns empty string from toString after dispose', () => {
      const buf = SecureBuffer.fromString('secret');
      buf.dispose();
      expect(buf.toString()).toBe('');
    });
  });

  // ===========================================================================
  // SecureBuffer — from
  // ===========================================================================
  describe('SecureBuffer.from', () => {
    it('creates a SecureBuffer from a Buffer', () => {
      const source = Buffer.from('hello world');
      const buf = SecureBuffer.from(source);
      expect(buf.length).toBe(source.length);
      expect(buf.toString()).toBe('hello world');
      // Source should NOT be modified
      expect(source.toString()).toBe('hello world');
    });

    it('creates a copy (not a reference)', () => {
      const source = Buffer.from('original');
      const buf = SecureBuffer.from(source);
      buf.fill(0);
      expect(source.toString()).toBe('original');
    });
  });

  // ===========================================================================
  // SecureBuffer — fromString
  // ===========================================================================
  describe('SecureBuffer.fromString', () => {
    it('creates a buffer from a string', () => {
      const buf = SecureBuffer.fromString('hello');
      expect(buf.toString()).toBe('hello');
    });

    it('preserves UTF-8 content', () => {
      const buf = SecureBuffer.fromString('こんにちは');
      expect(buf.toString()).toBe('こんにちは');
    });

    it('isZeroed is false after fromString', () => {
      const buf = SecureBuffer.fromString('test');
      expect(buf.isZeroed).toBe(false);
    });
  });

  // ===========================================================================
  // SecureBuffer — getByte
  // ===========================================================================
  describe('SecureBuffer.getByte', () => {
    it('returns the byte at the specified index', () => {
      const buf = SecureBuffer.fromString('ABCD');
      expect(buf.getByte(0)).toBe(65); // 'A'
      expect(buf.getByte(1)).toBe(66); // 'B'
    });

    it('throws RangeError for out-of-bounds index', () => {
      const buf = new SecureBuffer(4);
      expect(() => buf.getByte(-1)).toThrow(RangeError);
      expect(() => buf.getByte(4)).toThrow(RangeError);
    });
  });

  // ===========================================================================
  // SecureBuffer — toString / toHex / toBase64
  // ===========================================================================
  describe('SecureBuffer.toString', () => {
    it('returns the string content', () => {
      const buf = SecureBuffer.fromString('test-value');
      expect(buf.toString()).toBe('test-value');
    });

    it('returns empty string after zero', () => {
      const buf = SecureBuffer.fromString('secret');
      buf.zero();
      expect(buf.toString()).toBe('');
    });
  });

  describe('SecureBuffer.toHex', () => {
    it('returns lowercase hex string', () => {
      const buf = SecureBuffer.from(Buffer.from([0x0a, 0xff]));
      expect(buf.toHex()).toBe('0aff');
    });

    it('returns zeros after zero()', () => {
      const buf = SecureBuffer.from(Buffer.from([0xff, 0xff]));
      buf.zero();
      expect(buf.toHex()).toBe('0000');
    });
  });

  describe('SecureBuffer.toBase64', () => {
    it('returns base64 string', () => {
      const buf = SecureBuffer.fromString('hello');
      expect(buf.toBase64()).toBe(Buffer.from('hello').toString('base64'));
    });

    it('returns empty string after zero()', () => {
      const buf = SecureBuffer.fromString('hello');
      buf.zero();
      expect(buf.toBase64()).toBe('');
    });
  });

  // ===========================================================================
  // SecureBuffer — toJSON
  // ===========================================================================
  describe('SecureBuffer.toJSON', () => {
    it('returns placeholder string', () => {
      const buf = new SecureBuffer(16);
      expect(buf.toJSON()).toBe('[SecureBuffer]');
    });
  });

  // ===========================================================================
  // SecureBuffer — fillRandom
  // ===========================================================================
  describe('SecureBuffer.fillRandom', () => {
    it('fills with random bytes', () => {
      const buf = new SecureBuffer(32);
      buf.fillRandom();
      // It's extremely unlikely all bytes are the same
      const bytes = new Set(buf.getBuffer());
      expect(bytes.size).toBeGreaterThan(1);
    });

    it('sets isZeroed to false', () => {
      const buf = new SecureBuffer(32);
      buf.fillRandom();
      expect(buf.isZeroed).toBe(false);
    });

    it('returns this for chaining', () => {
      const buf = new SecureBuffer(32);
      const result = buf.fillRandom();
      expect(result).toBe(buf);
    });
  });

  // ===========================================================================
  // SecureString
  // ===========================================================================
  describe('SecureString', () => {
    it('returns the value from getter', () => {
      const ss = createSecureString('hello world');
      expect(ss.value).toBe('hello world');
    });

    it('returns correct length', () => {
      const ss = createSecureString('test');
      expect(ss.length).toBe(4);
    });

    it('disposed is false initially', () => {
      const ss = createSecureString('test');
      expect(ss.disposed).toBe(false);
    });

    it('dispose zeros the value', () => {
      const ss = createSecureString('secret');
      ss.dispose();
      expect(ss.value).toBe('');
      expect(ss.disposed).toBe(true);
    });

    it('toJSON returns placeholder', () => {
      const ss = createSecureString('secret');
      expect(ss.toJSON()).toBe('[SecureString]');
    });

    it('length returns 0 after dispose', () => {
      const ss = createSecureString('hello');
      ss.dispose();
      expect(ss.length).toBe(0);
    });
  });

  // ===========================================================================
  // createSecureString
  // ===========================================================================
  describe('createSecureString', () => {
    it('creates a SecureString from a string', () => {
      const ss = createSecureString('test-value');
      expect(ss.value).toBe('test-value');
    });

    it('throws RangeError for empty string', () => {
      expect(() => createSecureString('')).toThrow(RangeError);
    });

    it('handles UTF-8 strings', () => {
      const ss = createSecureString('🎉🚀');
      expect(ss.value).toBe('🎉🚀');
    });
  });

  // ===========================================================================
  // secureCompare
  // ===========================================================================
  describe('secureCompare', () => {
    it('returns true for identical strings', () => {
      expect(secureCompare('hello', 'hello')).toBe(true);
    });

    it('returns false for different strings', () => {
      expect(secureCompare('hello', 'world')).toBe(false);
    });

    it('returns true for identical buffers', () => {
      const buf = Buffer.from('test');
      expect(secureCompare(buf, buf)).toBe(true);
    });

    it('returns true for equal buffers (different references)', () => {
      expect(secureCompare(Buffer.from('test'), Buffer.from('test'))).toBe(true);
    });

    it('returns false for different buffers', () => {
      expect(secureCompare(Buffer.from('a'), Buffer.from('b'))).toBe(false);
    });

    it('returns false for different-length strings', () => {
      expect(secureCompare('short', 'a much longer string')).toBe(false);
    });

    it('returns false for different-length buffers', () => {
      expect(secureCompare(Buffer.from('a'), Buffer.from('ab'))).toBe(false);
    });

    it('returns false for empty vs non-empty', () => {
      expect(secureCompare('', 'a')).toBe(false);
    });

    it('returns true for two empty strings', () => {
      expect(secureCompare('', '')).toBe(true);
    });

    it('handles mixed string/buffer comparison', () => {
      expect(secureCompare('test', Buffer.from('test'))).toBe(true);
    });

    it('compares UTF-8 strings correctly', () => {
      expect(secureCompare('café', 'café')).toBe(true);
      expect(secureCompare('café', 'cafe')).toBe(false);
    });
  });

  // ===========================================================================
  // isZeroed
  // ===========================================================================
  describe('isZeroed', () => {
    it('returns true for an all-zero buffer', () => {
      expect(isZeroed(Buffer.alloc(16))).toBe(true);
    });

    it('returns false for a buffer with non-zero bytes', () => {
      const buf = Buffer.alloc(16);
      buf[0] = 1;
      expect(isZeroed(buf)).toBe(false);
    });

    it('returns true for empty buffer', () => {
      expect(isZeroed(Buffer.alloc(0))).toBe(true);
    });
  });

  // ===========================================================================
  // wipeString (best-effort)
  // ===========================================================================
  describe('wipeString', () => {
    it('does not throw for any input', () => {
      expect(() => wipeString('hello')).not.toThrow();
      expect(() => wipeString('')).not.toThrow();
      expect(() => wipeString('a'.repeat(10000))).not.toThrow();
    });
  });
});
