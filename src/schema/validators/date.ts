// =============================================================================
// ultraenv — Date Validator
// Parses ISO 8601, RFC 2822, timestamps. Returns Date object.
// With past/future/after/before validators.
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

// -----------------------------------------------------------------------------
// Date Parsing
// -----------------------------------------------------------------------------

/** Parse various date string formats into a Date object */
function parseDate(raw: string): ParseResult<Date> {
  const trimmed = raw.trim();

  // Try native Date parsing (handles ISO 8601, RFC 2822, and numeric timestamps)
  const timestamp = Date.parse(trimmed);
  if (!Number.isNaN(timestamp)) {
    return { success: true, value: new Date(timestamp) };
  }

  // Try as a numeric timestamp (milliseconds since epoch)
  if (/^\d+$/.test(trimmed)) {
    const numericDate = new Date(Number(trimmed));
    if (!Number.isNaN(numericDate.getTime())) {
      return { success: true, value: numericDate };
    }
  }

  return {
    success: false,
    error: `"${trimmed}" is not a valid date. Supported formats: ISO 8601, RFC 2822, or numeric timestamp`,
  };
}

// -----------------------------------------------------------------------------
// Date Validators
// -----------------------------------------------------------------------------

/** Validate that the date is in the past */
function validatePast(value: Date): string | null {
  if (value.getTime() >= Date.now()) {
    return `Date must be in the past, got ${value.toISOString()}`;
  }
  return null;
}

/** Validate that the date is in the future */
function validateFuture(value: Date): string | null {
  if (value.getTime() <= Date.now()) {
    return `Date must be in the future, got ${value.toISOString()}`;
  }
  return null;
}

/** Create a validator for dates after a reference date */
function validateAfter(ref: Date): (value: Date) => string | null {
  return (value: Date) => {
    if (value.getTime() <= ref.getTime()) {
      return `Date must be after ${ref.toISOString()}, got ${value.toISOString()}`;
    }
    return null;
  };
}

/** Create a validator for dates before a reference date */
function validateBefore(ref: Date): (value: Date) => string | null {
  return (value: Date) => {
    if (value.getTime() >= ref.getTime()) {
      return `Date must be before ${ref.toISOString()}, got ${value.toISOString()}`;
    }
    return null;
  };
}

// -----------------------------------------------------------------------------
// DateSchemaBuilder
// -----------------------------------------------------------------------------

/**
 * Chainable date schema builder.
 * Parses various date formats and validates date constraints.
 *
 * @example
 * ```typescript
 * const deadline = t.date().future();
 * const birthday = t.date().past();
 * const launch = t.date().after(new Date('2025-01-01'));
 * ```
 */
export class DateSchemaBuilder extends SchemaBuilder<Date> {
  constructor() {
    super(parseDate, 'date');
  }

  /** Date must be in the past */
  past(): DateSchemaBuilder {
    this._addValidator(validatePast);
    return this;
  }

  /** Date must be in the future */
  future(): DateSchemaBuilder {
    this._addValidator(validateFuture);
    return this;
  }

  /** Date must be after the given reference date */
  after(ref: Date): DateSchemaBuilder {
    this._addValidator(validateAfter(ref));
    return this;
  }

  /** Date must be before the given reference date */
  before(ref: Date): DateSchemaBuilder {
    this._addValidator(validateBefore(ref));
    return this;
  }

  /** Date must be a valid date (re-checks, useful after transforms) */
  valid(): DateSchemaBuilder {
    this._addValidator((value: Date) => {
      if (Number.isNaN(value.getTime())) {
        return `"${value.toISOString()}" is not a valid date`;
      }
      return null;
    });
    return this;
  }

  /** Use a custom date parser */
  parse(fn: (raw: string) => Date): DateSchemaBuilder {
    const parser = (raw: string): ParseResult<Date> => {
      try {
        const date = fn(raw);
        if (Number.isNaN(date.getTime())) {
          return { success: false, error: `"${raw}" is not a valid date` };
        }
        return { success: true, value: date };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return { success: false, error: `Failed to parse date: ${message}` };
      }
    };
    this._setParser(parser);
    return this;
  }
}

/** Create a new date schema builder */
export function createDateSchema(): DateSchemaBuilder {
  return new DateSchemaBuilder();
}
