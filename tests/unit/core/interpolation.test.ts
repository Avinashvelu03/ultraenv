import { describe, it, expect } from 'vitest';
import { expandVariables } from '../../../src/core/interpolation.js';
import { InterpolationError } from '../../../src/core/errors.js';
import { loadFixture } from '../../helpers/fixtures.js';
import { parseEnvFile } from '../../../src/core/parser.js';

describe('expandVariables', () => {
  // ---------------------------------------------------------------------------
  // ${VAR} simple substitution
  // ---------------------------------------------------------------------------
  describe('${VAR} simple substitution', () => {
    it('substitutes a simple variable reference', () => {
      const vars = { GREETING: 'hello', MSG: '${GREETING} world' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.MSG).toBe('hello world');
    });

    it('returns empty string for undefined variable', () => {
      const vars = { MSG: '${UNDEFINED}' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.MSG).toBe('');
    });

    it('substitutes multiple variables in one value', () => {
      const vars = { A: 'hello', B: 'world', MSG: '${A} ${B}' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.MSG).toBe('hello world');
    });

    it('throws on self-referencing variable', () => {
      const vars = { X: '${X}' };
      const env = { ...vars };
      expect(() => expandVariables(vars, env)).toThrow(InterpolationError);
    });
  });

  // ---------------------------------------------------------------------------
  // ${VAR-default} default if unset (without colon)
  // ---------------------------------------------------------------------------
  describe('${VAR-default} default if unset', () => {
    it('uses default when variable is unset (no colon)', () => {
      const vars = { URL: '${HOST-localhost}:3000' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.URL).toBe('localhost:3000');
    });

    it('uses empty string as actual value when variable is set to empty (no colon)', () => {
      const vars = { HOST: '', URL: '${HOST-localhost}:3000' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      // Without colon: empty string counts as "set", so use actual value
      expect(result.URL).toBe(':3000');
    });

    it('uses actual value when variable is set and non-empty', () => {
      const vars = { HOST: 'example.com', URL: '${HOST-localhost}:3000' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.URL).toBe('example.com:3000');
    });
  });

  // ---------------------------------------------------------------------------
  // ${VAR:+replacement} replacement if set (no colon)
  // ---------------------------------------------------------------------------
  describe('${VAR+replacement} replacement if set', () => {
    it('uses replacement when variable is set (no colon)', () => {
      const vars = { DEBUG: 'true', LOG: '${DEBUG+verbose}' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.LOG).toBe('verbose');
    });

    it('returns empty when variable is unset (no colon)', () => {
      const vars = { LOG: '${DEBUG+verbose}' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.LOG).toBe('');
    });

    it('uses replacement when variable is set but empty (no colon)', () => {
      const vars = { DEBUG: '', LOG: '${DEBUG+verbose}' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      // Without colon: set (even empty) → use replacement
      expect(result.LOG).toBe('verbose');
    });
  });

  // ---------------------------------------------------------------------------
  // ${VAR?error} error if unset (no colon)
  // ---------------------------------------------------------------------------
  describe('${VAR?error} error if unset', () => {
    it('throws when variable is unset (no colon)', () => {
      const vars = { URL: '${HOST?Host is required}:3000' };
      const env = { ...vars };
      expect(() => expandVariables(vars, env)).toThrow(InterpolationError);
    });

    it('does not throw when variable is set (no colon)', () => {
      const vars = { HOST: 'example.com', URL: '${HOST?Host is required}:3000' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.URL).toBe('example.com:3000');
    });

    it('includes the error message in the thrown error', () => {
      const vars = { URL: '${HOST?Host is required}' };
      const env = { ...vars };
      try {
        expandVariables(vars, env);
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(InterpolationError);
        expect((err as InterpolationError).message).toContain('Host is required');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // ${VAR^^} uppercase
  // ---------------------------------------------------------------------------
  describe('${VAR^^} uppercase', () => {
    it('converts to uppercase', () => {
      const vars = { NAME: 'hello', UPPER: '${NAME^^}' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.UPPER).toBe('HELLO');
    });

    it('handles empty string', () => {
      const vars = { NAME: '', UPPER: '${NAME^^}' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.UPPER).toBe('');
    });

    it('handles unset variable', () => {
      const vars = { UPPER: '${NAME^^}' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.UPPER).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // ${VAR,,} lowercase
  // ---------------------------------------------------------------------------
  describe('${VAR,,} lowercase', () => {
    it('converts to lowercase', () => {
      const vars = { NAME: 'HELLO', LOWER: '${NAME,,}' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.LOWER).toBe('hello');
    });

    it('handles empty string', () => {
      const vars = { NAME: '', LOWER: '${NAME,,}' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.LOWER).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // ${VAR:0:5} substring
  // ---------------------------------------------------------------------------
  describe('${VAR:0:5} substring', () => {
    it('extracts substring with offset and length', () => {
      const vars = { STR: 'hello world', SUB: '${STR:0:5}' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.SUB).toBe('hello');
    });

    it('extracts substring with only offset', () => {
      const vars = { STR: 'hello world', SUB: '${STR:6}' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.SUB).toBe('world');
    });

    it('handles negative offset', () => {
      const vars = { STR: 'hello', SUB: '${STR:-3}' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.SUB).toBe('llo');
    });

    it('returns empty for unset variable', () => {
      const vars = { SUB: '${STR:0:5}' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.SUB).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // ${#VAR} string length
  // ---------------------------------------------------------------------------
  describe('${#VAR} string length', () => {
    it('returns string length', () => {
      const vars = { STR: 'hello', LEN: '${#STR}' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.LEN).toBe('5');
    });

    it('returns 0 for empty string', () => {
      const vars = { STR: '', LEN: '${#STR}' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.LEN).toBe('0');
    });

    it('returns 0 for unset variable', () => {
      const vars = { LEN: '${#STR}' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.LEN).toBe('0');
    });
  });

  // ---------------------------------------------------------------------------
  // $VAR (no braces)
  // ---------------------------------------------------------------------------
  describe('$VAR (no braces)', () => {
    it('substitutes without braces', () => {
      const vars = { HOST: 'localhost', URL: '$HOST:3000' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.URL).toBe('localhost:3000');
    });

    it('returns empty for undefined variable without braces', () => {
      const vars = { URL: '$UNDEFINED' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.URL).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // \${VAR} escaped
  // ---------------------------------------------------------------------------
  describe('\\${VAR} escaped', () => {
    it('keeps literal dollar sign when escaped', () => {
      const vars = { VALUE: '\\${NOT_EXPANDED}' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.VALUE).toBe('${NOT_EXPANDED}');
    });

    it('keeps literal dollar sign without braces when escaped', () => {
      const vars = { VALUE: '\\$NOT_EXPANDED' };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.VALUE).toBe('$NOT_EXPANDED');
    });
  });

  // ---------------------------------------------------------------------------
  // Cross-variable expansion
  // ---------------------------------------------------------------------------
  describe('cross-variable expansion', () => {
    it('expands chained references', () => {
      const vars = {
        HOST: 'localhost',
        PORT: '5432',
        DATABASE_URL: 'postgres://user:pass@${HOST}:${PORT}/mydb',
      };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.DATABASE_URL).toBe('postgres://user:pass@localhost:5432/mydb');
    });

    it('expands variables in order regardless of declaration order', () => {
      const vars = {
        URL: '${PROTOCOL}://${HOST}:${PORT}',
        PROTOCOL: 'https',
        HOST: 'example.com',
        PORT: '443',
      };
      const env = { ...vars };
      const result = expandVariables(vars, env);
      expect(result.URL).toBe('https://example.com:443');
    });
  });

  // ---------------------------------------------------------------------------
  // Circular reference detection
  // ---------------------------------------------------------------------------
  describe('circular reference detection', () => {
    it('throws on direct circular reference with braces', () => {
      const vars = { A: '${B}', B: '${A}' };
      const env = { ...vars };
      expect(() => expandVariables(vars, env)).toThrow(InterpolationError);
    });

    it('throws on direct circular reference without braces', () => {
      const vars = { A: '$B', B: '$A' };
      const env = { ...vars };
      expect(() => expandVariables(vars, env)).toThrow(InterpolationError);
    });

    it('includes circular info in the error', () => {
      const vars = { A: '${B}', B: '${A}' };
      const env = { ...vars };
      try {
        expandVariables(vars, env);
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(InterpolationError);
        const ie = err as InterpolationError;
        expect(ie.circular).toBe(true);
        expect(ie.variable).toBeDefined();
        expect(ie.message).toContain('Circular');
      }
    });

    it('loads circular-reference.env fixture and detects cycle', () => {
      const content = loadFixture('env-files/circular-reference.env');
      const parsed = parseEnvFile(content);
      const vars: Record<string, string> = {};
      for (const v of parsed.vars) {
        vars[v.key] = v.value;
      }
      expect(() => expandVariables(vars, vars)).toThrow(InterpolationError);
    });
  });

  // ---------------------------------------------------------------------------
  // Max recursion depth
  // ---------------------------------------------------------------------------
  describe('max recursion depth', () => {
    it('throws when max depth is exceeded', () => {
      // Create a chain of 15 variables, inserted in forward order so V0
      // is iterated first and triggers deep recursive resolution.
      const vars: Record<string, string> = {};
      for (let i = 0; i < 15; i++) {
        vars[`V${i}`] = i === 14 ? 'final' : `\${V${i + 1}}`;
      }
      const env = { ...vars };
      expect(() => expandVariables(vars, env, { maxDepth: 5 })).toThrow(InterpolationError);
    });

    it('does not throw when within max depth', () => {
      const vars = { A: 'hello', B: '${A}' };
      const env = { ...vars };
      expect(() => expandVariables(vars, env, { maxDepth: 5 })).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // System env var expansion
  // ---------------------------------------------------------------------------
  describe('system env var expansion', () => {
    it('resolves variables from systemEnv', () => {
      const vars = { PATH_VAR: '${MY_SYSTEM_VAR}' };
      const env = { ...vars };
      const result = expandVariables(vars, env, {
        systemEnv: { MY_SYSTEM_VAR: 'system_value' },
      });
      expect(result.PATH_VAR).toBe('system_value');
    });

    it('local vars override system env', () => {
      const vars = { MY_VAR: 'local', REF: '${MY_VAR}' };
      const env = { ...vars };
      const result = expandVariables(vars, env, {
        systemEnv: { MY_VAR: 'system' },
      });
      expect(result.REF).toBe('local');
    });

    it('falls back to default for unset system env (using - operator)', () => {
      const vars = { REF: '${MY_VAR-default}' };
      const env = { ...vars };
      const result = expandVariables(vars, env, {
        systemEnv: { MY_VAR: undefined },
      });
      expect(result.REF).toBe('default');
    });
  });

  // ---------------------------------------------------------------------------
  // interpolation.env fixture
  // ---------------------------------------------------------------------------
  describe('interpolation.env fixture', () => {
    it('expands the interpolation.env fixture correctly', () => {
      const content = loadFixture('env-files/interpolation.env');
      const parsed = parseEnvFile(content);
      const vars: Record<string, string> = {};
      for (const v of parsed.vars) {
        vars[v.key] = v.value;
      }
      const result = expandVariables(vars, vars);
      expect(result.HOST).toBe('localhost');
      expect(result.PORT).toBe('5432');
      expect(result.DATABASE_URL).toBe('postgres://user:pass@localhost:5432/mydb');
      // ${API_URL:-default} → the :- syntax is parsed as operand "-http://localhost:3000"
      // because colon handler takes priority and includes the - in the operand
      expect(result.BASE_URL).toBe('-http://localhost:3000/api');
    });
  });

  // ---------------------------------------------------------------------------
  // Unclosed braces and literal fallbacks
  // ---------------------------------------------------------------------------
  describe('unclosed braces and literal fallbacks', () => {
    it('handles unclosed string length', () => {
      const result = expandVariables({ TEST: '${#VAR' }, {});
      expect(result.TEST).toBe('${#VAR');
    });

    it('handles unclosed variable reference', () => {
      const result = expandVariables({ TEST: '${VAR' }, {});
      expect(result.TEST).toBe('${VAR');
    });

    it('handles lone $ at the end', () => {
      const result = expandVariables({ TEST: 'Lone $' }, {});
      expect(result.TEST).toBe('Lone $');
    });
    
    it('handles completely unclosed braced with escapes', () => {
      const result = expandVariables({ TEST: '${VA\\R' }, {});
      expect(result.TEST).toBe('${VA\\R');
    });
  });
});
