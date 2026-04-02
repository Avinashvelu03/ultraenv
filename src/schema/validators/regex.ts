// =============================================================================
// ultraenv — Regex Validator
// Parses a regex string → RegExp. Validates regex syntax.
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

// -----------------------------------------------------------------------------
// Regex Parsing
// -----------------------------------------------------------------------------

/** Parse a regex string (with optional flags) into a RegExp object */
function parseRegex(raw: string): ParseResult<RegExp> {
  const trimmed = raw.trim();

  // Try to detect format: /pattern/flags
  const regexMatch = trimmed.match(/^\/(.+)\/([gimsuy]*)$/);
  if (regexMatch) {
    try {
      const pattern = regexMatch[1] ?? '';
      const flags = regexMatch[2] ?? '';
      return { success: true, value: new RegExp(pattern, flags) };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, error: `Invalid regex: ${message}` };
    }
  }

  // Try plain pattern (no flags)
  try {
    return { success: true, value: new RegExp(trimmed) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { success: false, error: `Invalid regex: ${message}` };
  }
}

// -----------------------------------------------------------------------------
// RegexSchemaBuilder
// -----------------------------------------------------------------------------

/**
 * Chainable regex schema builder.
 *
 * @example
 * ```typescript
 * const pattern = t.regex();
 * // pattern._parse("\\d+")       → { success: true, value: /\d+/ }
 * // pattern._parse("/^\\w+$/gi") → { success: true, value: /^\w+$/gi }
 * // pattern._parse("[invalid")   → { success: false, error: "Invalid regex: ..." }
 * ```
 */
export class RegexSchemaBuilder extends SchemaBuilder<RegExp> {
  constructor() {
    super(parseRegex, 'regex');
  }

  /** Require the regex to have a specific flag */
  hasFlag(flag: string): RegexSchemaBuilder {
    this._addValidator((value: RegExp) => {
      if (!value.flags.includes(flag)) {
        return `Regex must have flag "${flag}"`;
      }
      return null;
    });
    return this;
  }

  /** Require the regex to NOT have a specific flag */
  noFlag(flag: string): RegexSchemaBuilder {
    this._addValidator((value: RegExp) => {
      if (value.flags.includes(flag)) {
        return `Regex must not have flag "${flag}"`;
      }
      return null;
    });
    return this;
  }

  /** Require the regex to be case-insensitive */
  caseInsensitive(): RegexSchemaBuilder {
    return this.hasFlag('i');
  }

  /** Require the regex to be global */
  global(): RegexSchemaBuilder {
    return this.hasFlag('g');
  }

  /** Require the regex to be multiline */
  multiline(): RegexSchemaBuilder {
    return this.hasFlag('m');
  }

  /** Test the regex against a string (validation-only, doesn't change the value) */
  test(testString: string, expectMatch: boolean): RegexSchemaBuilder {
    this._addValidator((value: RegExp) => {
      const matches = value.test(testString);
      if (expectMatch && !matches) {
        return `Regex must match "${testString}"`;
      }
      if (!expectMatch && matches) {
        return `Regex must not match "${testString}"`;
      }
      return null;
    });
    return this;
  }
}

/** Create a new regex schema builder */
export function createRegexSchema(): RegexSchemaBuilder {
  return new RegexSchemaBuilder();
}
