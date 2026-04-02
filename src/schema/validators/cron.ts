// =============================================================================
// ultraenv — Cron Validator
// Validates cron expressions (standard 5-field and extended 6/7-field).
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

export interface CronValidatorOptions {
  /** Whether to allow 6-field expressions (with year) — default: false */
  allowYear?: boolean;
  /** Whether to allow 6-field expressions (with seconds) — default: false */
  allowSeconds?: boolean;
  /** Whether to allow predefined expressions (e.g., @yearly, @daily) — default: true */
  allowAliases?: boolean;
}

const PREDEFINED_CRON = new Set([
  '@yearly', '@annually', '@monthly', '@weekly', '@daily', '@midnight',
  '@hourly',
]);

const CRON_FIELD_REGEX = /^(?:\*|[0-9]+(?:-[0-9]+)?(?:,[0-9]+(?:-[0-9]+)?)*)(?:\/[0-9]+)?$/;

const MONTH_NAMES: Record<string, string> = {
  jan: '1', feb: '2', mar: '3', apr: '4', may: '5', jun: '6',
  jul: '7', aug: '8', sep: '9', oct: '10', nov: '11', dec: '12',
};

const DAY_NAMES: Record<string, string> = {
  sun: '0', mon: '1', tue: '2', wed: '3', thu: '4', fri: '5', sat: '6',
};

function replaceNames(field: string, names: Record<string, string>): string {
  let result = field.toLowerCase();
  for (const [name, num] of Object.entries(names)) {
    result = result.replace(new RegExp(name, 'gi'), num);
  }
  return result;
}

function validateCronField(field: string, min: number, max: number): string | null {
  const normalized = replaceNames(field, { ...MONTH_NAMES, ...DAY_NAMES });

  // Handle comma-separated values
  const parts = normalized.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!CRON_FIELD_REGEX.test(trimmed)) {
      return `Invalid cron field: "${field}"`;
    }

    // Extract range values
    const rangeMatch = trimmed.match(/^(\*|\d+)(?:-(\d+))?(?:\/(\d+))?$/);
    if (!rangeMatch) {
      return `Invalid cron field: "${field}"`;
    }

    const start = rangeMatch[1] === '*' ? min : Number(rangeMatch[1]);
    const end = rangeMatch[2] !== undefined ? Number(rangeMatch[2]) : start;
    const step = rangeMatch[3] !== undefined ? Number(rangeMatch[3]) : 1;

    if (start < min || start > max) {
      return `Cron field value ${start} is out of range [${min}, ${max}]`;
    }
    if (end < min || end > max) {
      return `Cron field value ${end} is out of range [${min}, ${max}]`;
    }
    if (step < 1) {
      return `Cron step must be positive, got ${step}`;
    }
  }
  return null;
}

function parseAndValidateCron(raw: string, opts: CronValidatorOptions): ParseResult<string> {
  const trimmed = raw.trim();

  // Check predefined aliases
  if (trimmed.startsWith('@')) {
    if (opts.allowAliases !== false && PREDEFINED_CRON.has(trimmed.toLowerCase())) {
      return { success: true, value: trimmed };
    }
    return { success: false, error: `Invalid predefined cron expression: "${trimmed}"` };
  }

  const fields = trimmed.split(/\s+/);

  if (opts.allowSeconds === true && fields.length === 6) {
    // seconds, minute, hour, day-of-month, month, day-of-week
    const ranges = [[0, 59], [0, 59], [0, 23], [1, 31], [1, 12], [0, 6]];
    for (let i = 0; i < fields.length; i++) {
      const range = ranges[i] ?? [0, 59];
      const error = validateCronField(fields[i] ?? '', range[0] ?? 0, range[1] ?? 0);
      if (error) return { success: false, error };
    }
    return { success: true, value: trimmed };
  }

  if (opts.allowYear === true && fields.length === 6) {
    // minute, hour, day-of-month, month, day-of-week, year
    const ranges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 6], [1970, 2099]];
    for (let i = 0; i < fields.length; i++) {
      const range = ranges[i] ?? [0, 59];
      const error = validateCronField(fields[i] ?? '', range[0] ?? 0, range[1] ?? 0);
      if (error) return { success: false, error };
    }
    return { success: true, value: trimmed };
  }

  if (fields.length === 5) {
    // Standard: minute, hour, day-of-month, month, day-of-week
    const ranges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 6]];
    for (let i = 0; i < fields.length; i++) {
      const range = ranges[i] ?? [0, 59];
      const error = validateCronField(fields[i] ?? '', range[0] ?? 0, range[1] ?? 0);
      if (error) return { success: false, error };
    }
    return { success: true, value: trimmed };
  }

  return {
    success: false,
    error: `Cron expression must have 5 fields (got ${fields.length}). Format: "min hour day month weekday"`,
  };
}

/** Create a cron expression schema builder */
export function createCronSchema(opts?: CronValidatorOptions): SchemaBuilder<string> {
  const options = opts ?? {};
  const parser = (raw: string): ParseResult<string> => parseAndValidateCron(raw, options);
  return new SchemaBuilder<string>(parser, 'cron');
}
