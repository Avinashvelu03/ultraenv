import { describe, it, expect } from 'vitest';
import {
  detectHighEntropyStrings,
  scanLineForEntropy,
  ENTROPY_SECRET_PATTERN,
} from '../../../src/scanner/entropy.js';

describe('scanner entropy', () => {
  // ===========================================================================
  // detectHighEntropyStrings
  // ===========================================================================
  describe('detectHighEntropyStrings', () => {
    it('detects high-entropy base64-like strings', () => {
      // A long random base64 string should have high entropy
      const content = `API_KEY="aB3cD7eF2gH5jK9lM1nO4pQ6rS8tU0vW2xY4zA6bC8dE0fG3hI5jK7"`;
      const results = detectHighEntropyStrings(content, 'test.env');
      // Should detect at least the high-entropy token-like string
      const highEntropy = results.filter((r) => r.type === 'High-Entropy String');
      expect(highEntropy.length).toBeGreaterThanOrEqual(1);
    });

    it('does not flag UUIDs as high-entropy secrets', () => {
      const content = `const uuid = "550e8400-e29b-41d4-a716-446655440000";`;
      const results = detectHighEntropyStrings(content, 'test.ts');
      // UUIDs should be filtered as false positives
      const highEntropy = results.filter((r) => r.type === 'High-Entropy String');
      expect(highEntropy.length).toBe(0);
    });

    it('does not flag git commit hashes', () => {
      const content = 'const hash = "a1b2c3d4e5f67890";';
      const results = detectHighEntropyStrings(content, 'test.ts');
      const highEntropy = results.filter((r) => r.type === 'High-Entropy String');
      expect(highEntropy.length).toBe(0);
    });

    it('does not flag semantic versions', () => {
      const content = 'version = "1.2.3";';
      const results = detectHighEntropyStrings(content, 'test.ts');
      const highEntropy = results.filter((r) => r.type === 'High-Entropy String');
      expect(highEntropy.length).toBe(0);
    });

    it('does not flag normal text', () => {
      const content = 'This is a normal paragraph of text that describes something.';
      const results = detectHighEntropyStrings(content, 'test.txt');
      const highEntropy = results.filter((r) => r.type === 'High-Entropy String');
      expect(highEntropy.length).toBe(0);
    });

    it('handles empty content', () => {
      const results = detectHighEntropyStrings('', 'test.ts');
      expect(results.length).toBe(0);
    });

    it('handles multi-line content', () => {
      const line1 = 'const normal = "hello";';
      const line2 = 'const secret = "aB3cD7eF2gH5jK9lM1nO4pQ6rS8tU0vW2xY4zA6bC8dE0fG3hI5jK7";';
      const line3 = 'const other = "world";';

      const results = detectHighEntropyStrings(`${line1}\n${line2}\n${line3}`, 'test.ts');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('reports correct file path', () => {
      const content = `SECRET="aB3cD7eF2gH5jK9lM1nO4pQ6rS8tU0vW2xY4zA6bC8dE0fG3hI5jK7"`;
      const results = detectHighEntropyStrings(content, '/path/to/config.env');
      expect(results[0]?.file).toBe('/path/to/config.env');
    });

    it('reports correct line number', () => {
      const line1 = 'normal line';
      const line2 = 'SECRET="aB3cD7eF2gH5jK9lM1nO4pQ6rS8tU0vW2xY4zA6bC8dE0fG3hI5jK7"';
      const results = detectHighEntropyStrings(`${line1}\n${line2}`, 'test.ts');
      if (results.length > 0) {
        expect(results[0]?.line).toBe(2);
      }
    });

    it('filters out pure numeric strings', () => {
      const content = 'const port = "123456789012345678901234567890";';
      const results = detectHighEntropyStrings(content, 'test.ts');
      const highEntropy = results.filter((r) => r.type === 'High-Entropy String');
      expect(highEntropy.length).toBe(0);
    });

    it('filters out repeated characters', () => {
      const content = 'const repeated = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";';
      const results = detectHighEntropyStrings(content, 'test.ts');
      const highEntropy = results.filter((r) => r.type === 'High-Entropy String');
      expect(highEntropy.length).toBe(0);
    });
  });

  // ===========================================================================
  // scanLineForEntropy
  // ===========================================================================
  describe('scanLineForEntropy', () => {
    it('returns empty array for empty line', () => {
      const results = scanLineForEntropy('', 1, 'test.ts');
      expect(results.length).toBe(0);
    });

    it('returns empty array for whitespace-only line', () => {
      const results = scanLineForEntropy('   ', 1, 'test.ts');
      expect(results.length).toBe(0);
    });

    it('detects high-entropy string in a line', () => {
      const line = `API_KEY="aB3cD7eF2gH5jK9lM1nO4pQ6rS8tU0vW2xY4zA6bC8dE0fG3hI5jK7"`;
      const results = scanLineForEntropy(line, 1, 'test.ts');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('respects the threshold option', () => {
      // Use a very high threshold — most things won't match
      const line = 'const value = "some-short-value";';
      const results = scanLineForEntropy(line, 1, 'test.ts', { threshold: 6.0 });
      expect(results.length).toBe(0);
    });

    it('respects the minLength option', () => {
      const line = `KEY="aB3cD7eF2gH5jK9lM1nO4pQ6rS8tU0vW2xY4zA6bC8dE0fG3hI5jK7"`;
      const results = scanLineForEntropy(line, 1, 'test.ts', { minLength: 100 });
      expect(results.length).toBe(0);
    });

    it('includes confidence score', () => {
      const line = `KEY="aB3cD7eF2gH5jK9lM1nO4pQ6rS8tU0vW2xY4zA6bC8dE0fG3hI5jK7"`;
      const results = scanLineForEntropy(line, 1, 'test.ts');
      if (results.length > 0) {
        expect(results[0]!.confidence).toBeGreaterThanOrEqual(0);
        expect(results[0]!.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('reports correct line number', () => {
      const line = `KEY="aB3cD7eF2gH5jK9lM1nO4pQ6rS8tU0vW2xY4zA6bC8dE0fG3hI5jK7"`;
      const results = scanLineForEntropy(line, 42, 'test.ts');
      if (results.length > 0) {
        expect(results[0]!.line).toBe(42);
      }
    });
  });

  // ===========================================================================
  // ENTROPY_SECRET_PATTERN
  // ===========================================================================
  describe('ENTROPY_SECRET_PATTERN', () => {
    it('has the correct id', () => {
      expect(ENTROPY_SECRET_PATTERN.id).toBe('entropy-high-entropy-string');
    });

    it('has the correct name', () => {
      expect(ENTROPY_SECRET_PATTERN.name).toBe('High-Entropy String');
    });

    it('has a valid RegExp pattern', () => {
      expect(ENTROPY_SECRET_PATTERN.pattern).toBeInstanceOf(RegExp);
    });

    it('has medium severity', () => {
      expect(ENTROPY_SECRET_PATTERN.severity).toBe('medium');
    });

    it('has entropy category', () => {
      expect(ENTROPY_SECRET_PATTERN.category).toBe('entropy');
    });

    it('has a confidence of 0.5', () => {
      expect(ENTROPY_SECRET_PATTERN.confidence).toBe(0.5);
    });

    it('has description and remediation', () => {
      expect(ENTROPY_SECRET_PATTERN.description.length).toBeGreaterThan(0);
      expect(ENTROPY_SECRET_PATTERN.remediation.length).toBeGreaterThan(0);
    });
  });
});
