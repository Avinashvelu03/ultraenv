import { describe, it, expect } from 'vitest';
import {
  UltraenvError,
  ValidationError,
  ParseError,
  InterpolationError,
  EncryptionError,
  VaultError,
  ScanError,
  ConfigError,
  FileSystemError,
  isUltraenvError,
} from '../../../src/core/errors.js';

describe('UltraenvError (base class)', () => {
  it('extends Error', () => {
    const err = new UltraenvError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(UltraenvError);
  });

  it('has a default code', () => {
    const err = new UltraenvError('test');
    expect(err.code).toBe('ULTRAENV_ERROR');
  });

  it('accepts a custom code', () => {
    const err = new UltraenvError('test', { code: 'CUSTOM' });
    expect(err.code).toBe('CUSTOM');
  });

  it('has a message', () => {
    const err = new UltraenvError('something went wrong');
    expect(err.message).toBe('something went wrong');
  });

  it('accepts a hint', () => {
    const err = new UltraenvError('test', { hint: 'Try again' });
    expect(err.hint).toBe('Try again');
  });

  it('accepts a cause', () => {
    const cause = new Error('original');
    const err = new UltraenvError('wrapped', { cause });
    expect(err.cause).toBe(cause);
  });

  it('toString includes code and message', () => {
    const err = new UltraenvError('bad thing');
    const str = err.toString();
    expect(str).toContain('[ULTRAENV_ERROR]');
    expect(str).toContain('bad thing');
  });

  it('toString includes hint when present', () => {
    const err = new UltraenvError('test', { hint: 'Check this' });
    const str = err.toString();
    expect(str).toContain('Hint: Check this');
  });

  it('has name set to constructor name', () => {
    const err = new UltraenvError('test');
    expect(err.name).toBe('UltraenvError');
  });
});

describe('ValidationError', () => {
  it('extends UltraenvError', () => {
    const err = new ValidationError('field', 'val', 'bad value');
    expect(err).toBeInstanceOf(UltraenvError);
    expect(err).toBeInstanceOf(ValidationError);
  });

  it('has code VALIDATION_ERROR', () => {
    const err = new ValidationError('field', 'val', 'bad');
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('stores field, value, and message', () => {
    const err = new ValidationError('PORT', 'abc', 'must be a number');
    expect(err.field).toBe('PORT');
    expect(err.value).toBe('abc');
    expect(err.message).toContain('must be a number');
  });

  it('accepts a hint', () => {
    const err = new ValidationError('PORT', 'abc', 'bad', { hint: 'Use a number' });
    expect(err.hint).toBe('Use a number');
  });

  it('accepts a schema', () => {
    const schema = { type: 'number' };
    const err = new ValidationError('PORT', 'abc', 'bad', { schema });
    expect(err.schema).toEqual(schema);
  });

  it('has expected field', () => {
    const err = new ValidationError('PORT', 'abc', 'bad', { expected: 'number' });
    expect(err.expected).toBe('number');
  });
});

describe('ParseError', () => {
  it('extends UltraenvError', () => {
    const err = new ParseError('parse failure');
    expect(err).toBeInstanceOf(UltraenvError);
    expect(err).toBeInstanceOf(ParseError);
  });

  it('has code PARSE_ERROR', () => {
    const err = new ParseError('bad syntax');
    expect(err.code).toBe('PARSE_ERROR');
  });

  it('stores line and column', () => {
    const err = new ParseError('bad', { line: 5, column: 10 });
    expect(err.line).toBe(5);
    expect(err.column).toBe(10);
  });

  it('stores raw content', () => {
    const err = new ParseError('bad', { raw: 'KEY=@@@' });
    expect(err.raw).toBe('KEY=@@@');
  });

  it('stores filePath', () => {
    const err = new ParseError('bad', { filePath: '/path/.env' });
    expect(err.filePath).toBe('/path/.env');
  });

  it('includes location in message', () => {
    const err = new ParseError('bad syntax', { line: 3, column: 5, filePath: '/.env' });
    expect(err.message).toContain('line 3');
    expect(err.message).toContain('column 5');
    expect(err.message).toContain('/.env');
  });

  it('has default line=0, column=0, raw="", filePath=""', () => {
    const err = new ParseError('bad');
    expect(err.line).toBe(0);
    expect(err.column).toBe(0);
    expect(err.raw).toBe('');
    expect(err.filePath).toBe('');
  });
});

describe('InterpolationError', () => {
  it('extends UltraenvError', () => {
    const err = new InterpolationError('interp fail');
    expect(err).toBeInstanceOf(UltraenvError);
    expect(err).toBeInstanceOf(InterpolationError);
  });

  it('has code INTERPOLATION_ERROR', () => {
    const err = new InterpolationError('fail');
    expect(err.code).toBe('INTERPOLATION_ERROR');
  });

  it('stores variable name', () => {
    const err = new InterpolationError('fail', { variable: 'HOST' });
    expect(err.variable).toBe('HOST');
  });

  it('has circular flag', () => {
    const err = new InterpolationError('circular', { circular: true, variable: 'A' });
    expect(err.circular).toBe(true);
  });

  it('circular defaults to false', () => {
    const err = new InterpolationError('fail');
    expect(err.circular).toBe(false);
  });

  it('generates appropriate hint for circular refs', () => {
    const err = new InterpolationError('circular', { circular: true });
    expect(err.hint).toContain('Circular');
  });
});

describe('EncryptionError', () => {
  it('extends UltraenvError', () => {
    const err = new EncryptionError('enc fail');
    expect(err).toBeInstanceOf(UltraenvError);
    expect(err).toBeInstanceOf(EncryptionError);
  });

  it('has code ENCRYPTION_ERROR', () => {
    const err = new EncryptionError('fail');
    expect(err.code).toBe('ENCRYPTION_ERROR');
  });

  it('accepts a hint', () => {
    const err = new EncryptionError('fail', { hint: 'Check key' });
    expect(err.hint).toBe('Check key');
  });
});

describe('VaultError', () => {
  it('extends UltraenvError', () => {
    const err = new VaultError('vault fail');
    expect(err).toBeInstanceOf(UltraenvError);
    expect(err).toBeInstanceOf(VaultError);
  });

  it('has code VAULT_ERROR', () => {
    const err = new VaultError('fail');
    expect(err.code).toBe('VAULT_ERROR');
  });

  it('stores environment', () => {
    const err = new VaultError('fail', { environment: 'production' });
    expect(err.environment).toBe('production');
  });

  it('stores operation', () => {
    const err = new VaultError('fail', { operation: 'decrypt' });
    expect(err.operation).toBe('decrypt');
  });
});

describe('ScanError', () => {
  it('extends UltraenvError', () => {
    const err = new ScanError('scan fail');
    expect(err).toBeInstanceOf(UltraenvError);
    expect(err).toBeInstanceOf(ScanError);
  });

  it('has code SCAN_ERROR', () => {
    const err = new ScanError('fail');
    expect(err.code).toBe('SCAN_ERROR');
  });

  it('stores file, line, pattern', () => {
    const err = new ScanError('found', { file: 'src/index.ts', line: 10, pattern: 'AWS Key' });
    expect(err.file).toBe('src/index.ts');
    expect(err.line).toBe(10);
    expect(err.pattern).toBe('AWS Key');
  });
});

describe('ConfigError', () => {
  it('extends UltraenvError', () => {
    const err = new ConfigError('config fail');
    expect(err).toBeInstanceOf(UltraenvError);
    expect(err).toBeInstanceOf(ConfigError);
  });

  it('has code CONFIG_ERROR', () => {
    const err = new ConfigError('fail');
    expect(err.code).toBe('CONFIG_ERROR');
  });

  it('stores field', () => {
    const err = new ConfigError('invalid', { field: 'mergeStrategy' });
    expect(err.field).toBe('mergeStrategy');
  });
});

describe('FileSystemError', () => {
  it('extends UltraenvError', () => {
    const err = new FileSystemError('fs fail');
    expect(err).toBeInstanceOf(UltraenvError);
    expect(err).toBeInstanceOf(FileSystemError);
  });

  it('stores path and operation', () => {
    const err = new FileSystemError('fail', { path: '/tmp/.env', operation: 'read' });
    expect(err.path).toBe('/tmp/.env');
    expect(err.operation).toBe('read');
  });

  it('extracts code from errno cause', () => {
    const cause = new Error('not found') as NodeJS.ErrnoException;
    cause.code = 'ENOENT';
    const err = new FileSystemError('not found', { cause });
    expect(err.code).toBe('ENOENT');
  });

  it('defaults code to UNKNOWN when no cause', () => {
    const err = new FileSystemError('fail');
    expect(err.code).toBe('UNKNOWN');
  });

  it('accepts explicit code option', () => {
    const err = new FileSystemError('fail', { code: 'EACCES' });
    expect(err.code).toBe('EACCES');
  });
});

describe('isUltraenvError type guard', () => {
  it('returns true for UltraenvError instances', () => {
    expect(isUltraenvError(new UltraenvError('test'))).toBe(true);
    expect(isUltraenvError(new ValidationError('f', 'v', 'm'))).toBe(true);
    expect(isUltraenvError(new ParseError('m'))).toBe(true);
    expect(isUltraenvError(new InterpolationError('m'))).toBe(true);
    expect(isUltraenvError(new EncryptionError('m'))).toBe(true);
    expect(isUltraenvError(new VaultError('m'))).toBe(true);
    expect(isUltraenvError(new ScanError('m'))).toBe(true);
    expect(isUltraenvError(new ConfigError('m'))).toBe(true);
    expect(isUltraenvError(new FileSystemError('m'))).toBe(true);
  });

  it('returns false for plain Error', () => {
    expect(isUltraenvError(new Error('test'))).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(isUltraenvError('string')).toBe(false);
    expect(isUltraenvError(42)).toBe(false);
    expect(isUltraenvError(null)).toBe(false);
    expect(isUltraenvError(undefined)).toBe(false);
  });

  it('returns false for objects that are not errors', () => {
    expect(isUltraenvError({ code: 'PARSE_ERROR', message: 'fake' })).toBe(false);
  });
});

import { isValidationError, isParseError, isEncryptionError, isVaultError, getErrorMessage } from '../../../src/core/errors.js';

describe('Error type guards', () => {
  it('isValidationError works', () => {
    expect(isValidationError(new ValidationError('f', 'v', 'm'))).toBe(true);
    expect(isValidationError(new Error())).toBe(false);
  });
  it('isParseError works', () => {
    expect(isParseError(new ParseError('m'))).toBe(true);
    expect(isParseError(new Error())).toBe(false);
  });
  it('isEncryptionError works', () => {
    expect(isEncryptionError(new EncryptionError('m'))).toBe(true);
    expect(isEncryptionError(new Error())).toBe(false);
  });
  it('isVaultError works', () => {
    expect(isVaultError(new VaultError('m'))).toBe(true);
    expect(isVaultError(new Error())).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('extracts message from UltraenvError', () => {
    expect(getErrorMessage(new UltraenvError('test', { hint: 'h' }))).toContain('Hint: h');
  });
  it('extracts message from native Error', () => {
    expect(getErrorMessage(new Error('native'))).toBe('native');
  });
  it('returns string directly', () => {
    expect(getErrorMessage('str err')).toBe('str err');
  });
  it('handles unknown objects', () => {
    expect(getErrorMessage({ a: 1 })).toContain('Unknown error: [object Object]');
  });
});
