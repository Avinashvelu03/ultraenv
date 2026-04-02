import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import {
  shannonEntropy,
  isHighEntropy,
  normalizedEntropy,
  byteEntropy,
} from '../../../src/utils/entropy.js';

describe('shannonEntropy', () => {
  it('returns 0 for empty string', () => {
    expect(shannonEntropy('')).toBe(0);
  });

  it('returns 0 for single character repeated', () => {
    expect(shannonEntropy('aaaa')).toBe(0);
  });

  it('returns 0 for single character', () => {
    expect(shannonEntropy('a')).toBe(0);
  });

  it('computes entropy for known strings', () => {
    // "hello" - characters: h, e, l, l, o → 4 unique chars
    const entropy = shannonEntropy('hello');
    expect(entropy).toBeGreaterThan(0);
    expect(entropy).toBeLessThan(5);
    // h:1/5, e:1/5, l:2/5, o:1/5
    // H = -(0.2*log2(0.2) + 0.2*log2(0.2) + 0.4*log2(0.4) + 0.2*log2(0.2))
    // = -(3*0.2*log2(0.2) + 0.4*log2(0.4))
    // log2(0.2) = -2.322, log2(0.4) = -1.322
    // = -(3*(-0.4644) + (-0.5288)) = -(-1.3932 - 0.5288) = 1.9220
    expect(entropy).toBeCloseTo(1.92, 1);
  });

  it('computes entropy for uniform random characters', () => {
    const entropy = shannonEntropy('abcdefghijklmnopqrstuvwxyz');
    expect(entropy).toBeGreaterThan(4);
  });

  it('entropy of all-same-char string is 0', () => {
    expect(shannonEntropy('aaaaaaaaaa')).toBe(0);
  });
});

describe('isHighEntropy', () => {
  it('returns false for empty string', () => {
    expect(isHighEntropy('')).toBe(false);
  });

  it('returns false for low-entropy strings', () => {
    expect(isHighEntropy('hello world')).toBe(false);
  });

  it('returns true for high-entropy strings (default threshold 3.5)', () => {
    // A long hex string has high entropy
    expect(isHighEntropy('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6')).toBe(true);
  });

  it('accepts custom threshold', () => {
    const str = 'hello';
    // Default threshold 3.5 should be false
    expect(isHighEntropy(str, 3.5)).toBe(false);
    // Very low threshold should be true
    expect(isHighEntropy(str, 1.0)).toBe(true);
  });

  it('returns false for dictionary words', () => {
    expect(isHighEntropy('my-database-password')).toBe(false);
  });
});

describe('normalizedEntropy', () => {
  it('returns 0 for empty string', () => {
    expect(normalizedEntropy('')).toBe(0);
  });

  it('returns 0 for single unique character', () => {
    expect(normalizedEntropy('aaaa')).toBe(0);
  });

  it('returns 1.0 for perfectly uniform distribution', () => {
    // "ab" has 2 unique chars, each with p=0.5
    // entropy = -(0.5*log2(0.5) + 0.5*log2(0.5)) = 1.0
    // maxEntropy = log2(2) = 1.0
    // normalized = 1.0/1.0 = 1.0
    expect(normalizedEntropy('ab')).toBe(1.0);
  });

  it('returns value between 0 and 1', () => {
    const result = normalizedEntropy('hello world');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

describe('byteEntropy', () => {
  it('returns 0 for empty buffer', () => {
    expect(byteEntropy(Buffer.alloc(0))).toBe(0);
  });

  it('returns 0 for uniform buffer', () => {
    expect(byteEntropy(Buffer.from('aaaa'))).toBe(0);
  });

  it('computes entropy for varied buffer', () => {
    const entropy = byteEntropy(Buffer.from('Hello, World!'));
    expect(entropy).toBeGreaterThan(0);
  });

  it('returns at most 8.0 bits per byte', () => {
    // Random bytes should have high entropy
    const buf = randomBytes(1000);
    const entropy = byteEntropy(buf);
    expect(entropy).toBeLessThanOrEqual(8);
    expect(entropy).toBeGreaterThan(7);
  });
});
