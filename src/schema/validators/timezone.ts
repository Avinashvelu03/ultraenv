// =============================================================================
// ultraenv — Timezone Validator
// Validates IANA timezone identifiers (e.g., America/New_York, Europe/London).
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

export interface TimezoneValidatorOptions {
  /** Whether to allow UTC offset format (e.g., "UTC+5:30") — default: true */
  allowOffset?: boolean;
  /** Whether to allow short timezone names (e.g., "EST", "PST") — default: false */
  allowShort?: boolean;
  /** Whether to allow the special "Z" identifier — default: true */
  allowZ?: boolean;
}

// IANA timezone regex (area/location format)
const IANA_TZ_REGEX = /^(?:Africa|America|Antarctica|Arctic|Asia|Atlantic|Australia|Europe|Indian|Pacific|Etc|UTC)\/[a-zA-Z0-9_+-]+(?:\/[a-zA-Z0-9_+-]+)*$/;

// UTC offset regex (e.g., UTC+5:30, UTC-8, GMT+0)
const UTC_OFFSET_REGEX = /^(?:UTC|GMT)(?:[+-](?:[01]?\d|2[0-3])(?::(?:[0-5]\d))?)?$/;

// Common short timezone abbreviations
const SHORT_TIMEZONES = new Set([
  'UTC', 'GMT', 'EST', 'EDT', 'CST', 'CDT', 'MST', 'MDT', 'PST', 'PDT',
  'AKST', 'AKDT', 'HST', 'HDT', 'SST', 'SDT', 'CHST',
  'WET', 'WEST', 'CET', 'CEST', 'EET', 'EEST', 'MSK', 'MSD',
  'AST', 'ADT', 'NST', 'NDT', 'GST', 'AZT', 'AFT', 'PKT', 'IST',
  'NPT', 'BST', 'ICT', 'WIB', 'PHT', 'JST', 'KST', 'CST',
]);

function parseAndValidateTimezone(raw: string, opts: TimezoneValidatorOptions): ParseResult<string> {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return { success: false, error: 'Timezone must not be empty' };
  }

  // Special Z
  if (trimmed === 'Z') {
    if (opts.allowZ !== false) {
      return { success: true, value: trimmed };
    }
    return { success: false, error: '"Z" timezone identifier is not allowed' };
  }

  // IANA timezone
  if (IANA_TZ_REGEX.test(trimmed)) {
    return { success: true, value: trimmed };
  }

  // UTC/GMT offset
  if (opts.allowOffset !== false && UTC_OFFSET_REGEX.test(trimmed)) {
    return { success: true, value: trimmed };
  }

  // Short timezone
  if (opts.allowShort === true && SHORT_TIMEZONES.has(trimmed.toUpperCase())) {
    return { success: true, value: trimmed.toUpperCase() };
  }

  return {
    success: false,
    error: `"${trimmed}" is not a valid IANA timezone identifier. Expected format: "Area/Location" (e.g., "America/New_York", "Europe/London")`,
  };
}

/** Create a timezone schema builder */
export function createTimezoneSchema(opts?: TimezoneValidatorOptions): SchemaBuilder<string> {
  const options = opts ?? {};
  const parser = (raw: string): ParseResult<string> => parseAndValidateTimezone(raw, options);
  return new SchemaBuilder<string>(parser, 'timezone');
}
