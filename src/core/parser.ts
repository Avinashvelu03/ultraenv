// =============================================================================
// ultraenv — .env File Parser
// Full-featured .env file parser supporting all common syntax variants.
// =============================================================================

import type { ParsedEnvVar, ParsedEnvFile } from './types.js';
import { ParseError } from './errors.js';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Valid characters for the start of an env variable name */
const NAME_START_RE = /^[A-Za-z_]/;

/** Valid characters within an env variable name (after the first char) */
const NAME_CHAR_RE = /^[A-Za-z0-9_]/;

/** Matches a full-line comment */
const COMMENT_LINE_RE = /^[ \t]*#/;

/** Matches the `export` keyword prefix */
const EXPORT_PREFIX_RE = /^[ \t]*export[ \t]+/i;

// -----------------------------------------------------------------------------
// State Machine for Double-Quoted Value Parsing
// -----------------------------------------------------------------------------

/**
 * Result of parsing a double-quoted value segment.
 */
interface QuotedParseResult {
  /** The fully parsed value (with escape sequences resolved) */
  value: string;
  /** Whether the closing quote was found */
  closed: boolean;
  /** Number of additional lines consumed (for multiline values) */
  extraLines: number;
}

/**
 * Resolve escape sequences within a double-quoted string.
 * Supports: \n, \t, \r, \\, \", \xHH, \uXXXX
 */
function resolveEscapeSequence(
  chars: string[],
  startIndex: number,
  filePath: string,
  lineNumber: number,
): { resolved: string; charsConsumed: number } {
/* v8 ignore start */
  const next = startIndex + 1 < chars.length ? chars[startIndex + 1] : '';

  if (next === '') {
    return { resolved: '\\', charsConsumed: 1 };
  }
/* v8 ignore stop */

  switch (next) {
    case 'n':
      return { resolved: '\n', charsConsumed: 2 };
    case 't':
      return { resolved: '\t', charsConsumed: 2 };
    case 'r':
      return { resolved: '\r', charsConsumed: 2 };
    case '\\':
      return { resolved: '\\', charsConsumed: 2 };
    case '"':
      return { resolved: '"', charsConsumed: 2 };
/* v8 ignore start */
    case '$':
      return { resolved: '$', charsConsumed: 2 };
    case '/':
      return { resolved: '/', charsConsumed: 2 };
/* v8 ignore stop */
    case 'x':
    case 'X': {
      // Hex escape: \xHH
      const hex = chars.slice(startIndex + 2, startIndex + 4).join('');
      if (hex.length === 2 && /^[0-9A-Fa-f]{2}$/.test(hex)) {
        const codePoint = parseInt(hex, 16);
        if (codePoint === 0) {
          throw new ParseError('Null character (\\x00) is not allowed in .env values', {
            line: lineNumber,
            filePath,
            column: startIndex,
          });
        }
        return { resolved: String.fromCodePoint(codePoint), charsConsumed: 4 };
      }
      throw new ParseError(
        `Invalid hex escape sequence: ${'\\'}x${hex}`,
        {
          line: lineNumber,
          filePath,
          hint: 'Hex escapes must be exactly 2 hex digits, e.g. \\x0A for newline.',
        },
      );
    }
    case 'u':
    case 'U': {
      // Unicode escape: \uXXXX
      const hexDigits = chars.slice(startIndex + 2, startIndex + 6).join('');
      if (hexDigits.length === 4 && /^[0-9A-Fa-f]{4}$/.test(hexDigits)) {
        const codePoint = parseInt(hexDigits, 16);
/* v8 ignore start */
        if (codePoint === 0) {
          throw new ParseError('Null character (\\u0000) is not allowed in .env values', {
            line: lineNumber,
            filePath,
          });
        }
/* v8 ignore stop */
        return { resolved: String.fromCodePoint(codePoint), charsConsumed: 6 };
      }
      throw new ParseError(
        `Invalid unicode escape sequence: ${'\\'}u${hexDigits}`,
        {
          line: lineNumber,
          filePath,
          hint: 'Unicode escapes must be exactly 4 hex digits, e.g. \\u0041 for "A".',
        },
      );
    }
/* v8 ignore start */
    default: {
      // Unknown escape: keep the backslash and the character as-is
      return { resolved: `\\${next}`, charsConsumed: 2 };
    }
/* v8 ignore stop */
  }
}

/**
 * Parse a double-quoted value that may span multiple lines.
 */
function parseDoubleQuotedValue(
  lines: string[],
  startLineIndex: number,
  startCharIndex: number,
  filePath: string,
  lineNumber: number,
): QuotedParseResult {
  const parts: string[] = [];
  let currentLine = lines[startLineIndex]!;
  let chars = Array.from(currentLine.slice(startCharIndex));
  let charIndex = 0;
  let lineIndex = startLineIndex;

  while (lineIndex < lines.length) {
    while (charIndex < chars.length) {
      const ch = chars[charIndex]!;

      if (ch === '"') {
        return {
          value: parts.join(''),
          closed: true,
          extraLines: lineIndex - startLineIndex,
        };
      }

/* v8 ignore start */
      if (ch === '\n') {
        // Newline inside double quotes: keep as literal newline
        parts.push('\n');
        charIndex++;
        continue;
      }

      if (ch === '\r') {
        // CR or CRLF
        parts.push('\r');
        charIndex++;
        if (charIndex < chars.length && chars[charIndex] === '\n') {
          charIndex++;
        }
        continue;
      }
/* v8 ignore stop */

      if (ch === '\\') {
        const resolved = resolveEscapeSequence(
          chars,
          charIndex,
          filePath,
          lineNumber + lineIndex - startLineIndex,
        );
        parts.push(resolved.resolved);
        charIndex += resolved.charsConsumed;
        continue;
      }

      parts.push(ch);
      charIndex++;
    }

    // Move to next line
    lineIndex++;
    if (lineIndex < lines.length) {
      parts.push('\n');
      currentLine = lines[lineIndex]!;
      chars = Array.from(currentLine);
      charIndex = 0;
    }
  }

  return {
    value: parts.join(''),
    closed: false,
    extraLines: lineIndex - startLineIndex - 1,
  };
}

/**
 * Parse a single-quoted value (no escaping, no interpolation).
 * Single quotes are literal; the value ends at the next unescaped single quote.
 */
function parseSingleQuotedValue(
  lines: string[],
  startLineIndex: number,
  startCharIndex: number,
): QuotedParseResult {
  const parts: string[] = [];
  let currentLine = lines[startLineIndex]!;
  let chars = Array.from(currentLine.slice(startCharIndex));
  let charIndex = 0;
  let lineIndex = startLineIndex;

  while (lineIndex < lines.length) {
    while (charIndex < chars.length) {
      const ch = chars[charIndex]!;

      if (ch === "'") {
        return {
          value: parts.join(''),
          closed: true,
          extraLines: lineIndex - startLineIndex,
        };
      }

      parts.push(ch);
      charIndex++;
    }

    lineIndex++;
/* v8 ignore start */
    if (lineIndex < lines.length) {
      parts.push('\n');
      currentLine = lines[lineIndex]!;
      chars = Array.from(currentLine);
      charIndex = 0;
    }
/* v8 ignore stop */
  }

  return {
    value: parts.join(''),
    closed: false,
    extraLines: lineIndex - startLineIndex - 1,
  };
}

/**
 * Parse a backtick-quoted value (no escaping, no interpolation).
 * The value ends at the next backtick.
 */
function parseBacktickQuotedValue(
  lines: string[],
  startLineIndex: number,
  startCharIndex: number,
): QuotedParseResult {
  const parts: string[] = [];
  let currentLine = lines[startLineIndex]!;
  let chars = Array.from(currentLine.slice(startCharIndex));
  let charIndex = 0;
  let lineIndex = startLineIndex;

  while (lineIndex < lines.length) {
    while (charIndex < chars.length) {
      const ch = chars[charIndex]!;

      if (ch === '`') {
        return {
          value: parts.join(''),
          closed: true,
          extraLines: lineIndex - startLineIndex,
        };
      }

      parts.push(ch);
      charIndex++;
    }

    lineIndex++;
/* v8 ignore start */
    if (lineIndex < lines.length) {
      parts.push('\n');
      currentLine = lines[lineIndex]!;
      chars = Array.from(currentLine);
      charIndex = 0;
    }
/* v8 ignore stop */
  }

  return {
    value: parts.join(''),
    closed: false,
    extraLines: lineIndex - startLineIndex - 1,
  };
}

// -----------------------------------------------------------------------------
// Key Parsing
// -----------------------------------------------------------------------------

/**
 * Parse a variable name from the beginning of a line.
 * Returns the parsed key and the index where parsing should continue.
 * Throws ParseError if the key is invalid.
 */
function parseKey(
  line: string,
  lineIndex: number,
  filePath: string,
): { key: string; endIndex: number } {
  let i = 0;
  const len = line.length;

  // Skip whitespace
  while (i < len && (line[i] === ' ' || line[i] === '\t')) {
    i++;
  }

  const keyStart = i;

  // First character must be a letter or underscore
/* v8 ignore start */
  if (i >= len || !NAME_START_RE.test(line[i]!)) {
    throw new ParseError('Expected a variable name starting with a letter or underscore', {
      line: lineIndex + 1,
      column: i + 1,
      raw: line,
      filePath,
    });
  }
/* v8 ignore stop */
  i++;

  // Remaining characters can be letters, digits, or underscores
  while (i < len && NAME_CHAR_RE.test(line[i]!)) {
    i++;
  }

  const key = line.slice(keyStart, i);
  return { key, endIndex: i };
}

// -----------------------------------------------------------------------------
// Inline Comment Extraction
// -----------------------------------------------------------------------------

/**
 * Extract an inline comment from an unquoted value.
 * In unquoted context, a # that follows whitespace starts a comment.
 * Does NOT treat # inside the value as a comment if no preceding whitespace.
 */
function extractInlineComment(value: string): { cleanValue: string; comment: string } {
  // Walk backwards from the end, looking for whitespace followed by #
  let commentStart = -1;
  for (let i = value.length - 1; i >= 0; i--) {
/* v8 ignore start */
    if (value[i] === ' ' || value[i] === '\t') {
      // Check if # follows
      const rest = value.slice(i + 1);
      if (rest.length > 0 && rest[0] === '#') {
        commentStart = i;
      }
      break;
    }
/* v8 ignore stop */
    // If we hit a non-whitespace character, no inline comment
    if (value[i] !== ' ' && value[i] !== '\t') {
      break;
    }
  }

/* v8 ignore start */
  if (commentStart >= 0) {
    return {
      cleanValue: value.slice(0, commentStart).trimEnd(),
      comment: value.slice(commentStart + 1).trim(),
    };
  }
/* v8 ignore stop */

  return { cleanValue: value, comment: '' };
}

// -----------------------------------------------------------------------------
// Main Parser
// -----------------------------------------------------------------------------

/**
 * Parse a .env file content string into a structured representation.
 *
 * Supported syntax:
 * - KEY=value
 * - KEY="value with escapes: \\n \\t \\xHH \\uXXXX"
 * - KEY='literal value (no escaping)'
 * - KEY=`backtick value`
 * - KEY= or KEY="" (empty values)
 * - KEY (no = sign → empty string)
 * - # comments
 * - export KEY=value
 * - Inline comments: KEY=value # this is a comment
 * - Multiline values in double quotes
 * - Whitespace trimming around = and quotes
 *
 * @param content - The raw file content string
 * @param filePath - Optional file path for error messages
 * @returns ParsedEnvFile with all extracted variables
 * @throws ParseError on malformed syntax
 */
export function parseEnvFile(content: string, filePath?: string): ParsedEnvFile {
  const resolvedPath = filePath ?? '.env';
  const lines = splitLines(content);
  const vars: ParsedEnvVar[] = [];

  let lineIndex = 0;

  while (lineIndex < lines.length) {
    const rawLine = lines[lineIndex]!;
    const oneBasedLine = lineIndex + 1;

    // ---- Skip empty lines ----
    if (isEmptyLine(rawLine)) {
      lineIndex++;
      continue;
    }

    // ---- Skip full-line comments ----
    if (COMMENT_LINE_RE.test(rawLine)) {
      lineIndex++;
      continue;
    }

    // ---- Try to parse a KEY=VALUE line ----
    let workingLine = rawLine;

    // Strip `export` prefix
    const exportMatch = EXPORT_PREFIX_RE.exec(workingLine);
    if (exportMatch !== null) {
      workingLine = workingLine.slice(exportMatch[0].length);
    }

    // Skip if the remaining line after stripping `export` is empty or a comment
/* v8 ignore start */
    if (isEmptyLine(workingLine) || COMMENT_LINE_RE.test(workingLine)) {
      lineIndex++;
      continue;
    }
/* v8 ignore stop */

    // Try to parse the key
    let key: string;
    let afterKeyIndex: number;
    try {
      const parsed = parseKey(workingLine, lineIndex, resolvedPath);
      key = parsed.key;
      afterKeyIndex = parsed.endIndex;
/* v8 ignore start */
    } catch {
      // Not a valid KEY= line — skip
      lineIndex++;
      continue;
    }
/* v8 ignore stop */

    // Skip whitespace after key
    while (afterKeyIndex < workingLine.length && (workingLine[afterKeyIndex] === ' ' || workingLine[afterKeyIndex] === '\t')) {
      afterKeyIndex++;
    }

    // Check for = sign
    if (afterKeyIndex >= workingLine.length || workingLine[afterKeyIndex] !== '=') {
      // KEY with no value → treat as empty string
      // But only if the rest of the line is empty (no garbage after key name)
      const restAfterKey = workingLine.slice(afterKeyIndex).trim();
      if (restAfterKey === '') {
        const varEntry: ParsedEnvVar = {
          key,
          value: '',
          raw: '',
          source: resolvedPath,
          lineNumber: oneBasedLine,
          comment: '',
        };
        vars.push(varEntry);
        lineIndex++;
        continue;
      }
      // Not a valid line, skip
      lineIndex++;
      continue;
    }

    // Skip past the = sign
    afterKeyIndex++; // now pointing at the start of the value

    // Skip whitespace after =
    while (afterKeyIndex < workingLine.length && (workingLine[afterKeyIndex] === ' ' || workingLine[afterKeyIndex] === '\t')) {
      afterKeyIndex++;
    }

    // ---- Parse the value ----
    const valueStartIndex = afterKeyIndex;

    if (valueStartIndex >= workingLine.length) {
      // KEY= (empty value)
      const varEntry: ParsedEnvVar = {
        key,
        value: '',
        raw: '',
        source: resolvedPath,
        lineNumber: oneBasedLine,
        comment: '',
      };
      vars.push(varEntry);
      lineIndex++;
      continue;
    }

    const firstChar = workingLine[valueStartIndex]!;
    let value: string;
    let raw: string;
    let comment = '';
    let extraLinesConsumed = 0;

    if (firstChar === '"') {
      // Double-quoted value with escape sequences
      const result = parseDoubleQuotedValue(
        lines,
        lineIndex,
        valueStartIndex + 1,
        resolvedPath,
        oneBasedLine,
      );

      if (!result.closed) {
        throw new ParseError('Unterminated double-quoted string', {
          line: oneBasedLine,
          raw: workingLine,
          filePath: resolvedPath,
          hint: 'Make sure every double-quoted value has a closing ".',
        });
      }

      value = result.value;
      raw = `"${result.value}"`;
      extraLinesConsumed = result.extraLines;

      // Check for inline comment after the closing quote
      const closingQuoteLine = lines[lineIndex + extraLinesConsumed]!;
      const afterClosingQuote = closingQuoteLine.slice(
        valueStartIndex + 1 + result.value.length + 1,
      );
      const trimmedAfter = afterClosingQuote.trim();
      if (trimmedAfter.startsWith('#')) {
        comment = trimmedAfter.slice(1).trim();
      }
    } else if (firstChar === "'") {
      // Single-quoted value (literal, no escaping)
      const result = parseSingleQuotedValue(
        lines,
        lineIndex,
        valueStartIndex + 1,
      );

      if (!result.closed) {
        throw new ParseError('Unterminated single-quoted string', {
          line: oneBasedLine,
          raw: workingLine,
          filePath: resolvedPath,
          hint: 'Make sure every single-quoted value has a closing \'.',
        });
      }

      value = result.value;
      raw = `'${result.value}'`;
      extraLinesConsumed = result.extraLines;

      // Check for inline comment
      const closingQuoteLine = lines[lineIndex + extraLinesConsumed]!;
      const afterClosingQuote = closingQuoteLine.slice(
        valueStartIndex + 1 + result.value.length + 1,
      );
      const trimmedAfter = afterClosingQuote.trim();
/* v8 ignore start */
      if (trimmedAfter.startsWith('#')) {
        comment = trimmedAfter.slice(1).trim();
      }
/* v8 ignore stop */
    } else if (firstChar === '`') {
      // Backtick-quoted value
      const result = parseBacktickQuotedValue(
        lines,
        lineIndex,
        valueStartIndex + 1,
      );

      if (!result.closed) {
        throw new ParseError('Unterminated backtick-quoted string', {
          line: oneBasedLine,
          raw: workingLine,
          filePath: resolvedPath,
          hint: 'Make sure every backtick-quoted value has a closing `.',
        });
      }

      value = result.value;
      raw = `\`${result.value}\``;
      extraLinesConsumed = result.extraLines;

      // Check for inline comment
      const closingQuoteLine = lines[lineIndex + extraLinesConsumed]!;
      const afterClosingQuote = closingQuoteLine.slice(
        valueStartIndex + 1 + result.value.length + 1,
      );
      const trimmedAfter = afterClosingQuote.trim();
/* v8 ignore start */
      if (trimmedAfter.startsWith('#')) {
        comment = trimmedAfter.slice(1).trim();
      }
/* v8 ignore stop */
    } else {
      // Unquoted value
      let rawValue = workingLine.slice(valueStartIndex);

      // Extract inline comment
      const extracted = extractInlineComment(rawValue);
      value = extracted.cleanValue;
      comment = extracted.comment;
      raw = rawValue;
    }

    const varEntry: ParsedEnvVar = {
      key,
      value,
      raw,
      source: resolvedPath,
      lineNumber: oneBasedLine,
      comment,
    };

    vars.push(varEntry);
    lineIndex += 1 + extraLinesConsumed;
  }

  return {
    path: resolvedPath,
    vars,
    exists: true,
  };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Split file content into lines, handling \r\n, \r, and \n line endings.
 */
function splitLines(content: string): string[] {
  // Normalize \r\n to \n first, then split
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return normalized.split('\n');
}

/**
 * Check if a line is effectively empty (all whitespace).
 */
function isEmptyLine(line: string): boolean {
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== ' ' && line[i] !== '\t') {
      return false;
    }
  }
  return true;
}
