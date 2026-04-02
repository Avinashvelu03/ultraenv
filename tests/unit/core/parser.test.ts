import { describe, it, expect } from 'vitest';
import { parseEnvFile } from '../../../src/core/parser.js';
import { loadFixture, fixturePath } from '../../helpers/fixtures.js';

describe('parseEnvFile', () => {
  // ---------------------------------------------------------------------------
  // Basic KEY=value parsing
  // ---------------------------------------------------------------------------
  describe('basic KEY=value parsing', () => {
    it('parses a single key=value pair', () => {
      const result = parseEnvFile('KEY=value');
      expect(result.vars).toHaveLength(1);
      expect(result.vars[0]!.key).toBe('KEY');
      expect(result.vars[0]!.value).toBe('value');
    });

    it('parses multiple key=value pairs', () => {
      const content = 'A=1\nB=2\nC=3';
      const result = parseEnvFile(content);
      expect(result.vars).toHaveLength(3);
      expect(result.vars.map((v) => v.key)).toEqual(['A', 'B', 'C']);
      expect(result.vars.map((v) => v.value)).toEqual(['1', '2', '3']);
    });

    it('sets exists to true', () => {
      const result = parseEnvFile('KEY=value');
      expect(result.exists).toBe(true);
    });

    it('sets source to the filePath', () => {
      const result = parseEnvFile('KEY=value', '/path/.env');
      expect(result.path).toBe('/path/.env');
      expect(result.vars[0]!.source).toBe('/path/.env');
    });

    it('records correct line numbers', () => {
      const content = 'A=1\nB=2\nC=3';
      const result = parseEnvFile(content);
      expect(result.vars[0]!.lineNumber).toBe(1);
      expect(result.vars[1]!.lineNumber).toBe(2);
      expect(result.vars[2]!.lineNumber).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Double-quoted values with escape sequences
  // ---------------------------------------------------------------------------
  describe('double-quoted values', () => {
    it('parses double-quoted values', () => {
      const result = parseEnvFile('KEY="hello world"');
      expect(result.vars[0]!.value).toBe('hello world');
    });

    it('resolves \\n escape', () => {
      const result = parseEnvFile('KEY="line1\\nline2"');
      expect(result.vars[0]!.value).toBe('line1\nline2');
    });

    it('resolves \\t escape', () => {
      const result = parseEnvFile('KEY="col1\\tcol2"');
      expect(result.vars[0]!.value).toBe('col1\tcol2');
    });

    it('resolves \\\\ escape', () => {
      const result = parseEnvFile('KEY="back\\\\slash"');
      expect(result.vars[0]!.value).toBe('back\\slash');
    });

    it('resolves \\" escape', () => {
      const result = parseEnvFile('KEY="say \\"hello\\""');
      expect(result.vars[0]!.value).toBe('say "hello"');
    });

    it('resolves \\r escape', () => {
      const result = parseEnvFile('KEY="a\\rb"');
      expect(result.vars[0]!.value).toBe('a\rb');
    });

    it('resolves \\xHH escape', () => {
      const result = parseEnvFile('KEY="\\x41"');
      expect(result.vars[0]!.value).toBe('A');
    });

    it('resolves \\uXXXX escape', () => {
      const result = parseEnvFile('KEY="\\u0041"');
      expect(result.vars[0]!.value).toBe('A');
    });

    it('throws on \\x00 (null character)', () => {
      expect(() => parseEnvFile('KEY="\\x00"')).toThrow();
    });

    it('throws on invalid hex escape', () => {
      expect(() => parseEnvFile('KEY="\\xZZ"')).toThrow();
    });

    it('throws on invalid unicode escape', () => {
      expect(() => parseEnvFile('KEY="\\u123Z"')).toThrow();
    });

    it('throws on unterminated string with escaped quote at end', () => {
      // \" inside double quotes escapes the quote, so the string is unterminated
      expect(() => parseEnvFile('KEY="end\\"')).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Single-quoted values (literal, no interpolation)
  // ---------------------------------------------------------------------------
  describe('single-quoted values', () => {
    it('parses single-quoted values literally', () => {
      const result = parseEnvFile("KEY='literal ${VAR}'");
      expect(result.vars[0]!.value).toBe('literal ${VAR}');
    });

    it('does not resolve escape sequences in single quotes', () => {
      const result = parseEnvFile("KEY='no\\nescapes'");
      expect(result.vars[0]!.value).toBe('no\\nescapes');
    });

    it('throws on unterminated single-quoted string', () => {
      expect(() => parseEnvFile("KEY='unterminated")).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Backtick-quoted values
  // ---------------------------------------------------------------------------
  describe('backtick-quoted values', () => {
    it('parses backtick-quoted values', () => {
      const result = parseEnvFile('KEY=`backtick value`');
      expect(result.vars[0]!.value).toBe('backtick value');
    });

    it('throws on unterminated backtick-quoted string', () => {
      expect(() => parseEnvFile('KEY=`unterminated')).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Multiline values in double quotes
  // ---------------------------------------------------------------------------
  describe('multiline values', () => {
    it('parses multiline double-quoted values', () => {
      const content = 'MULTILINE="line1\nline2\nline3"';
      const result = parseEnvFile(content);
      expect(result.vars).toHaveLength(1);
      expect(result.vars[0]!.value).toBe('line1\nline2\nline3');
    });

    it('records correct line numbers after multiline value', () => {
      const content = 'MULTILINE="line1\nline2\nline3"\nSIMPLE=value';
      const result = parseEnvFile(content);
      expect(result.vars).toHaveLength(2);
      expect(result.vars[0]!.key).toBe('MULTILINE');
      expect(result.vars[1]!.key).toBe('SIMPLE');
      expect(result.vars[1]!.lineNumber).toBe(4);
    });

    it('loads multiline.env fixture correctly', () => {
      const content = loadFixture('env-files/multiline.env');
      const result = parseEnvFile(content);
      const multiline = result.vars.find((v) => v.key === 'MULTILINE');
      expect(multiline).toBeDefined();
      expect(multiline!.value).toBe('line1\nline2\nline3');
      const simple = result.vars.find((v) => v.key === 'SIMPLE');
      expect(simple).toBeDefined();
      expect(simple!.value).toBe('value');
    });
  });

  // ---------------------------------------------------------------------------
  // Full-line comments
  // ---------------------------------------------------------------------------
  describe('full-line comments', () => {
    it('skips full-line comments', () => {
      const content = '# comment\nKEY=value';
      const result = parseEnvFile(content);
      expect(result.vars).toHaveLength(1);
      expect(result.vars[0]!.key).toBe('KEY');
    });

    it('skips comments with leading whitespace', () => {
      const content = '  # indented comment\nKEY=value';
      const result = parseEnvFile(content);
      expect(result.vars).toHaveLength(1);
    });

    it('loads comments.env fixture correctly', () => {
      const content = loadFixture('env-files/comments.env');
      const result = parseEnvFile(content);
      expect(result.vars).toHaveLength(3);
      expect(result.vars.map((v) => v.key)).toEqual(['DATABASE_URL', 'PORT', 'HOST']);
    });
  });

  // ---------------------------------------------------------------------------
  // Inline comments
  // ---------------------------------------------------------------------------
  describe('inline comments', () => {
    it('preserves unquoted value with # as part of value', () => {
      // extractInlineComment only detects comments when value ends with whitespace + #
      const result = parseEnvFile('KEY=value # comment');
      expect(result.vars[0]!.value).toBe('value # comment');
      expect(result.vars[0]!.comment).toBe('');
    });

    it('does not treat # in middle of value as comment', () => {
      const result = parseEnvFile('KEY=value#notcomment');
      expect(result.vars[0]!.value).toBe('value#notcomment');
      expect(result.vars[0]!.comment).toBe('');
    });

    it('extracts inline comment after quoted value', () => {
      const result = parseEnvFile('KEY="quoted" # comment');
      expect(result.vars[0]!.value).toBe('quoted');
      expect(result.vars[0]!.comment).toBe('comment');
    });
  });

  // ---------------------------------------------------------------------------
  // export prefix
  // ---------------------------------------------------------------------------
  describe('export prefix', () => {
    it('parses export KEY=value', () => {
      const result = parseEnvFile('export KEY=value');
      expect(result.vars).toHaveLength(1);
      expect(result.vars[0]!.key).toBe('KEY');
      expect(result.vars[0]!.value).toBe('value');
    });

    it('handles case-insensitive export', () => {
      const result = parseEnvFile('EXPORT KEY=value');
      expect(result.vars).toHaveLength(1);
      expect(result.vars[0]!.key).toBe('KEY');
    });

    it('loads export-prefix.env fixture correctly', () => {
      const content = loadFixture('env-files/export-prefix.env');
      const result = parseEnvFile(content);
      expect(result.vars).toHaveLength(2);
      expect(result.vars.map((v) => v.key)).toEqual(['DATABASE_URL', 'PORT']);
    });
  });

  // ---------------------------------------------------------------------------
  // Empty values
  // ---------------------------------------------------------------------------
  describe('empty values', () => {
    it('handles KEY= (empty value)', () => {
      const result = parseEnvFile('KEY=');
      expect(result.vars[0]!.key).toBe('KEY');
      expect(result.vars[0]!.value).toBe('');
    });

    it('handles KEY="" (empty double-quoted)', () => {
      const result = parseEnvFile('KEY=""');
      expect(result.vars[0]!.key).toBe('KEY');
      expect(result.vars[0]!.value).toBe('');
    });

    it('handles KEY=\'\' (empty single-quoted)', () => {
      const result = parseEnvFile("KEY=''");
      expect(result.vars[0]!.key).toBe('KEY');
      expect(result.vars[0]!.value).toBe('');
    });

    it('loads quotes.env fixture correctly', () => {
      const content = loadFixture('env-files/quotes.env');
      const result = parseEnvFile(content);
      const dq = result.vars.find((v) => v.key === 'DOUBLE_QUOTED');
      expect(dq!.value).toBe('hello world');
      const sq = result.vars.find((v) => v.key === 'SINGLE_QUOTED');
      expect(sq!.value).toBe('literal ${VAR}');
      const bt = result.vars.find((v) => v.key === 'BACKTICK');
      expect(bt!.value).toBe('backtick value');
      const esc = result.vars.find((v) => v.key === 'ESCAPED');
      expect(esc!.value).toBe('line1\nline2');
      const ed = result.vars.find((v) => v.key === 'EMPTY_DOUBLE');
      expect(ed!.value).toBe('');
      const es = result.vars.find((v) => v.key === 'EMPTY_SINGLE');
      expect(es!.value).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // Bare keys (KEY with no value = empty string)
  // ---------------------------------------------------------------------------
  describe('bare keys', () => {
    it('treats KEY with no value as empty string', () => {
      const result = parseEnvFile('KEY');
      expect(result.vars).toHaveLength(1);
      expect(result.vars[0]!.key).toBe('KEY');
      expect(result.vars[0]!.value).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // Whitespace trimming
  // ---------------------------------------------------------------------------
  describe('whitespace trimming', () => {
    it('trims whitespace around key', () => {
      const result = parseEnvFile('  KEY  =value');
      expect(result.vars[0]!.key).toBe('KEY');
      expect(result.vars[0]!.value).toBe('value');
    });

    it('trims whitespace around equals sign', () => {
      const result = parseEnvFile('KEY = value');
      expect(result.vars[0]!.key).toBe('KEY');
      expect(result.vars[0]!.value).toBe('value');
    });

    it('trims whitespace after equals before quoted value', () => {
      const result = parseEnvFile('KEY =  "value"');
      expect(result.vars[0]!.value).toBe('value');
    });
  });

  // ---------------------------------------------------------------------------
  // UTF-8 values
  // ---------------------------------------------------------------------------
  describe('UTF-8 values', () => {
    it('handles Japanese characters', () => {
      const result = parseEnvFile('GREETING=こんにちは世界');
      expect(result.vars[0]!.value).toBe('こんにちは世界');
    });

    it('handles emoji', () => {
      const result = parseEnvFile('EMOJI=🎉🚀');
      expect(result.vars[0]!.value).toBe('🎉🚀');
    });

    it('handles accented characters', () => {
      const result = parseEnvFile('NAME=François');
      expect(result.vars[0]!.value).toBe('François');
    });

    it('loads utf8.env fixture correctly', () => {
      const content = loadFixture('env-files/utf8.env');
      const result = parseEnvFile(content);
      expect(result.vars).toHaveLength(3);
      const greeting = result.vars.find((v) => v.key === 'GREETING');
      expect(greeting!.value).toBe('こんにちは世界');
      const emoji = result.vars.find((v) => v.key === 'EMOJI');
      expect(emoji!.value).toBe('🎉🚀');
      const name = result.vars.find((v) => v.key === 'NAME');
      expect(name!.value).toBe('François');
    });
  });

  // ---------------------------------------------------------------------------
  // Windows line endings
  // ---------------------------------------------------------------------------
  describe('Windows line endings', () => {
    it('handles \\r\\n line endings', () => {
      const content = 'KEY=value\r\nOTHER=thing';
      const result = parseEnvFile(content);
      expect(result.vars).toHaveLength(2);
      expect(result.vars[0]!.value).toBe('value');
      expect(result.vars[1]!.value).toBe('thing');
    });

    it('handles \\r-only line endings', () => {
      const content = 'KEY=value\rOTHER=thing';
      const result = parseEnvFile(content);
      expect(result.vars).toHaveLength(2);
    });

    it('loads windows-line-endings.env fixture correctly', () => {
      const content = loadFixture('env-files/windows-line-endings.env');
      const result = parseEnvFile(content);
      expect(result.vars).toHaveLength(2);
      expect(result.vars[0]!.value).toBe('postgres://localhost/win');
      expect(result.vars[1]!.value).toBe('443');
    });
  });

  // ---------------------------------------------------------------------------
  // No newline at end of file
  // ---------------------------------------------------------------------------
  describe('no newline at end of file', () => {
    it('parses file with no trailing newline', () => {
      const content = 'KEY=value';
      const result = parseEnvFile(content);
      expect(result.vars).toHaveLength(1);
      expect(result.vars[0]!.value).toBe('value');
    });

    it('loads no-newline-at-end.env fixture correctly', () => {
      const content = loadFixture('env-files/no-newline-at-end.env');
      const result = parseEnvFile(content);
      expect(result.vars).toHaveLength(1);
      expect(result.vars[0]!.key).toBe('KEY');
      expect(result.vars[0]!.value).toBe('value');
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases (underscores, dashes, dots in keys)
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('handles underscores in key names', () => {
      const result = parseEnvFile('KEY_WITH_UNDERSCORE=value');
      expect(result.vars[0]!.key).toBe('KEY_WITH_UNDERSCORE');
    });

    it('skips keys with dashes (not valid env var names)', () => {
      // Dashes are not valid in key names per the parser's NAME_CHAR_RE
      const content = 'KEY-WITH-DASH=value';
      const result = parseEnvFile(content);
      // The parser will fail to parse the key and skip it
      expect(result.vars).toHaveLength(0);
    });

    it('skips keys with dots (not valid env var names)', () => {
      const content = 'KEY.WITH.DOTS=value';
      const result = parseEnvFile(content);
      expect(result.vars).toHaveLength(0);
    });

    it('handles equals sign in unquoted value', () => {
      const result = parseEnvFile('KEY=key=value=more');
      expect(result.vars[0]!.value).toBe('key=value=more');
    });

    it('loads edge-cases.env fixture', () => {
      const content = loadFixture('env-files/edge-cases.env');
      const result = parseEnvFile(content);
      expect(result.vars.length).toBeGreaterThanOrEqual(1);
      const underscore = result.vars.find((v) => v.key === 'KEY_WITH_UNDERSCORE');
      expect(underscore).toBeDefined();
      expect(underscore!.value).toBe('value123');
      const emptyVal = result.vars.find((v) => v.key === 'EMPTY_VALUE');
      expect(emptyVal).toBeDefined();
      expect(emptyVal!.value).toBe('');
      const noVal = result.vars.find((v) => v.key === 'NO_VALUE');
      expect(noVal).toBeDefined();
      expect(noVal!.value).toBe('');
      const equalsInVal = result.vars.find((v) => v.key === 'EQUALS_IN_VALUE');
      expect(equalsInVal).toBeDefined();
      expect(equalsInVal!.value).toBe('key=value=more');
    });
  });

  // ---------------------------------------------------------------------------
  // Empty file
  // ---------------------------------------------------------------------------
  describe('empty file', () => {
    it('returns empty vars for empty content', () => {
      const result = parseEnvFile('');
      expect(result.vars).toHaveLength(0);
      expect(result.exists).toBe(true);
    });

    it('returns empty vars for whitespace-only content', () => {
      const result = parseEnvFile('   \n  \n\t');
      expect(result.vars).toHaveLength(0);
    });

    it('loads empty.env fixture correctly', () => {
      const content = loadFixture('env-files/empty.env');
      const result = parseEnvFile(content);
      expect(result.vars).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Malformed lines
  // ---------------------------------------------------------------------------
  describe('malformed lines', () => {
    it('skips malformed lines silently', () => {
      const content = 'VALID=yes\nINVALID LINE WITHOUT EQUALS\nALSO=yes';
      const result = parseEnvFile(content);
      expect(result.vars).toHaveLength(2);
      expect(result.vars.map((v) => v.key)).toEqual(['VALID', 'ALSO']);
    });

    it('loads malformed.env fixture correctly', () => {
      const content = loadFixture('env-files/malformed.env');
      const result = parseEnvFile(content);
      expect(result.vars).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Load all fixture files
  // ---------------------------------------------------------------------------
  describe('all fixture files', () => {
    const fixtureFiles = [
      'env-files/basic.env',
      'env-files/quotes.env',
      'env-files/comments.env',
      'env-files/utf8.env',
      'env-files/windows-line-endings.env',
      'env-files/no-newline-at-end.env',
      'env-files/edge-cases.env',
      'env-files/empty.env',
      'env-files/malformed.env',
      'env-files/multiline.env',
      'env-files/interpolation.env',
      'env-files/export-prefix.env',
    ];

    for (const fixture of fixtureFiles) {
      it(`loads ${fixture} without throwing`, () => {
        const content = loadFixture(fixture);
        expect(() => parseEnvFile(content, fixture)).not.toThrow();
      });
    }
  });
});
