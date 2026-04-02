import { describe, it, expect } from 'vitest';
import { maskValue, isSecretLike, isSecretKey, maskObject } from '../../../src/utils/mask.js';

describe('maskValue', () => {
  it('masks a long value', () => {
    const result = maskValue('sk-abc12345def67890');
    expect(result).toContain('sk-');
    expect(result).toContain('7890');
    expect(result).toContain('*');
  });

  it('returns empty string for empty input', () => {
    expect(maskValue('')).toBe('');
  });

  it('returns short values unchanged (below minLength)', () => {
    expect(maskValue('short')).toBe('short');
  });

  it('accepts custom options', () => {
    const result = maskValue('sk-abc12345def67890', {
      visibleStart: 2,
      visibleEnd: 2,
      maskChar: '#',
    });
    expect(result).toContain('sk');
    expect(result).toContain('90');
    expect(result).toContain('#');
  });

  it('uses at least 4 mask characters', () => {
    const result = maskValue('abcdefghijklmno');
    const maskCount = (result.match(/\*/g) ?? []).length;
    expect(maskCount).toBeGreaterThanOrEqual(4);
  });
});

describe('isSecretLike', () => {
  it('returns false for empty string', () => {
    expect(isSecretLike('')).toBe(false);
  });

  it('returns false for short strings', () => {
    expect(isSecretLike('short')).toBe(false);
  });

  it('returns true for long alphanumeric strings (20+)', () => {
    expect(isSecretLike('abcdefghijklmnopqrstuvwxyz')).toBe(true);
  });

  it('returns true for long hex strings (32+)', () => {
    expect(isSecretLike('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6')).toBe(true);
  });

  it('returns true for Stripe-style API keys', () => {
    expect(isSecretLike('sk_live_abc123def456ghi789jkl0')).toBe(true);
  });

  it('returns true for key- prefixed values', () => {
    expect(isSecretLike('key-abcdefghijklmnopqrst')).toBe(true);
  });

  it('returns false for normal text', () => {
    expect(isSecretLike('just some normal text here')).toBe(false);
  });

  it('returns false for text under 16 chars', () => {
    expect(isSecretLike('shortvalue')).toBe(false);
  });
});

describe('isSecretKey', () => {
  it('detects password key', () => {
    expect(isSecretKey('DATABASE_PASSWORD')).toBe(true);
  });

  it('detects api_key', () => {
    expect(isSecretKey('API_KEY')).toBe(true);
  });

  it('detects secret', () => {
    expect(isSecretKey('MY_SECRET')).toBe(true);
  });

  it('detects token', () => {
    expect(isSecretKey('AUTH_TOKEN')).toBe(true);
  });

  it('detects access_key', () => {
    expect(isSecretKey('AWS_ACCESS_KEY_ID')).toBe(true);
  });

  it('is case insensitive', () => {
    expect(isSecretKey('password')).toBe(true);
    expect(isSecretKey('Password')).toBe(true);
  });

  it('returns false for non-secret keys', () => {
    expect(isSecretKey('APP_NAME')).toBe(false);
    expect(isSecretKey('PORT')).toBe(false);
    expect(isSecretKey('DEBUG')).toBe(false);
  });
});

describe('maskObject', () => {
  it('masks specified keys', () => {
    const obj = { API_KEY: 'sk-abc12345def67890', NAME: 'myapp' };
    const result = maskObject(obj, ['API_KEY']);
    expect(result.API_KEY).toContain('*');
    expect(result.NAME).toBe('myapp');
  });

  it('is case-insensitive for key matching', () => {
    const obj = { api_key: 'sk-abc12345def67890', NAME: 'myapp' };
    const result = maskObject(obj, ['API_KEY']);
    expect(result.api_key).toContain('*');
  });

  it('returns [MASKED] for non-string secret values', () => {
    const obj = { SECRET: 12345, NAME: 'app' };
    const result = maskObject(obj, ['SECRET']);
    expect(result.SECRET).toBe('[MASKED]');
  });

  it('preserves nested objects', () => {
    const obj = { NESTED: { API_KEY: 'sk-abc12345def67890', OTHER: 'val' } };
    const result = maskObject(obj, ['API_KEY']);
    expect(result.NESTED.API_KEY).toContain('*');
    expect(result.NESTED.OTHER).toBe('val');
  });

  it('handles arrays', () => {
    const obj = { ITEMS: [{ KEY: 'sk-abc12345def67890' }] };
    const result = maskObject(obj, ['KEY']);
    expect(result.ITEMS[0]!.KEY).toContain('*');
  });

  it('returns a new object (does not mutate original)', () => {
    const obj = { API_KEY: 'sk-abc12345def67890', NAME: 'app' };
    const result = maskObject(obj, ['API_KEY']);
    expect(obj.API_KEY).toBe('sk-abc12345def67890');
    expect(result.API_KEY).not.toBe('sk-abc12345def67890');
  });
});
