import { describe, it, expect } from 'vitest';
import {
  maskSecret,
  truncate,
  padRight,
  padLeft,
  formatBytes,
  formatDuration,
  pluralize,
  humanize,
  escapeHtml,
  stripAnsi,
} from '../../../src/utils/format.js';

describe('maskSecret', () => {
  it('masks a long value', () => {
    expect(maskSecret('sk-abc12345def67890')).toBe('sk-a***********7890');
  });

  it('returns empty string for empty input', () => {
    expect(maskSecret('')).toBe('');
  });

  it('masks short values entirely', () => {
    expect(maskSecret('short')).toBe('*****');
  });

  it('accepts custom visibleChars', () => {
    expect(maskSecret('sk-abc12345def67890', 6)).toBe('sk-abc*********7890');
  });

  it('uses at least 4 asterisks', () => {
    expect(maskSecret('abcdefghijklmno')).toMatch(/\*{4,}/);
  });
});

describe('truncate', () => {
  it('does not truncate short strings', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates long strings with default suffix', () => {
    expect(truncate('hello world!', 8)).toBe('hello...');
  });

  it('accepts custom suffix', () => {
    expect(truncate('hello world!', 10, '…')).toBe('hello wor…');
  });

  it('handles maxLength shorter than suffix', () => {
    expect(truncate('hello', 2, '...')).toBe('..');
  });

  it('handles exact length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });
});

describe('padRight', () => {
  it('pads a short string on the right', () => {
    expect(padRight('ab', 5)).toBe('ab   ');
  });

  it('does not pad a string at or above target length', () => {
    expect(padRight('abcde', 5)).toBe('abcde');
    expect(padRight('abcdef', 5)).toBe('abcdef');
  });

  it('accepts custom pad character', () => {
    expect(padRight('ab', 5, '-')).toBe('ab---');
  });
});

describe('padLeft', () => {
  it('pads a short string on the left', () => {
    expect(padLeft('ab', 5)).toBe('   ab');
  });

  it('does not pad a string at or above target length', () => {
    expect(padLeft('abcde', 5)).toBe('abcde');
  });

  it('accepts custom pad character', () => {
    expect(padLeft('ab', 5, '0')).toBe('000ab');
  });
});

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('2 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1.00 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1.00 GB');
  });

  it('formats terabytes', () => {
    expect(formatBytes(1099511627776)).toBe('1.00 TB');
  });

  it('handles negative bytes', () => {
    expect(formatBytes(-1024)).toBe('-1 KB');
  });
});

describe('formatDuration', () => {
  it('formats milliseconds', () => {
    expect(formatDuration(350)).toBe('350ms');
  });

  it('formats seconds', () => {
    expect(formatDuration(1500)).toBe('1.5s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(90000)).toBe('1m 30s');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(3660000)).toBe('1h 1m');
  });

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0ms');
  });

  it('handles negative values', () => {
    expect(formatDuration(-100)).toBe('0ms');
  });
});

describe('pluralize', () => {
  it('uses singular for 1', () => {
    expect(pluralize(1, 'file')).toBe('1 file');
  });

  it('adds "s" for other counts', () => {
    expect(pluralize(0, 'file')).toBe('0 files');
    expect(pluralize(2, 'file')).toBe('2 files');
  });

  it('uses custom plural', () => {
    expect(pluralize(2, 'child', 'children')).toBe('2 children');
  });
});

describe('humanize', () => {
  it('converts camelCase to Title Case', () => {
    expect(humanize('camelCase')).toBe('Camel Case');
  });

  it('converts snake_case to Title Case', () => {
    expect(humanize('snake_case')).toBe('Snake Case');
  });

  it('converts kebab-case to Title Case', () => {
    expect(humanize('kebab-case')).toBe('Kebab Case');
  });

  it('handles already uppercase (no separator found)', () => {
    // humanize replaces _ with space but only uppercases first letter of each word,
    // it does NOT lowercase existing uppercase letters
    expect(humanize('ALREADY_UPPER')).toBe('ALREADY UPPER');
  });

  it('handles mixed separators', () => {
    expect(humanize('my_variable.name-here')).toBe('My Variable Name Here');
  });
});

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b');
  });

  it('escapes angle brackets', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('escapes all special characters together', () => {
    expect(escapeHtml('<a href="x&y">it\'s</a>')).toBe(
      '&lt;a href=&quot;x&amp;y&quot;&gt;it&#39;s&lt;/a&gt;',
    );
  });
});

describe('stripAnsi', () => {
  it('removes ANSI escape codes', () => {
    expect(stripAnsi('\x1B[31mRed Text\x1B[0m')).toBe('Red Text');
  });

  it('handles plain text unchanged', () => {
    expect(stripAnsi('plain text')).toBe('plain text');
  });

  it('handles empty string', () => {
    expect(stripAnsi('')).toBe('');
  });

  it('removes multiple ANSI codes', () => {
    expect(stripAnsi('\x1B[1m\x1B[32mBold Green\x1B[0m')).toBe('Bold Green');
  });
});
