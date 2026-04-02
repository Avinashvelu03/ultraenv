// =============================================================================
// ultraenv — Hostname Validator
// Validates hostnames per RFC 952 and RFC 1123.
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

export interface HostnameValidatorOptions {
  /** Maximum total length (default: 253 per RFC 1035) */
  maxLength?: number;
  /** Maximum label length (default: 63 per RFC 1035) */
  maxLabelLength?: number;
  /** Whether to allow trailing dot (FQDN, default: false) */
  allowTrailingDot?: boolean;
  /** Whether to allow internationalized domain names (default: true) */
  allowIdn?: boolean;
  /** Whether to allow underscores in labels (default: false, but common in DNS) */
  allowUnderscore?: boolean;
}

const HOSTNAME_LABEL_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;

const HOSTNAME_LABEL_REGEX_UNDERSCORE = /^[a-zA-Z0-9_]([a-zA-Z0-9_-]*[a-zA-Z0-9_])?$/;

function parseAndValidateHostname(raw: string, opts: HostnameValidatorOptions): ParseResult<string> {
  const trimmed = raw.trim();
  const maxLen = opts.maxLength ?? 253;
  const maxLabel = opts.maxLabelLength ?? 63;
  const allowTrailingDot = opts.allowTrailingDot ?? false;
  const allowIdn = opts.allowIdn ?? true;
  const allowUnderscore = opts.allowUnderscore ?? false;

  if (trimmed.length === 0) {
    return { success: false, error: 'Hostname must not be empty' };
  }

  if (trimmed.length > maxLen + (allowTrailingDot ? 1 : 0)) {
    return {
      success: false,
      error: `Hostname must be at most ${maxLen} characters, got ${trimmed.length}`,
    };
  }

  // Remove trailing dot for label validation
  const forValidation = allowTrailingDot && trimmed.endsWith('.')
    ? trimmed.slice(0, -1)
    : trimmed;

  if (forValidation.length === 0) {
    return { success: false, error: 'Hostname must not be just a dot' };
  }

  // Check for IDN (Unicode characters)
  if (!allowIdn && /[^\x00-\x7F]/.test(trimmed)) {
    return { success: false, error: 'Internationalized domain names are not allowed' };
  }

  const labels = forValidation.split('.');

  if (labels.length < 1) {
    return { success: false, error: 'Hostname must have at least one label' };
  }

  const labelRegex = allowUnderscore ? HOSTNAME_LABEL_REGEX_UNDERSCORE : HOSTNAME_LABEL_REGEX;

  for (const label of labels) {
    if (label.length === 0) {
      return { success: false, error: 'Hostname contains an empty label' };
    }
    if (label.length > maxLabel) {
      return {
        success: false,
        error: `Hostname label "${label}" exceeds maximum length of ${maxLabel}`,
      };
    }
    if (!labelRegex.test(label)) {
      return { success: false, error: `Hostname label "${label}" contains invalid characters` };
    }
  }

  // Labels must not start or end with hyphen (enforced by regex above)

  return { success: true, value: trimmed };
}

/** Create a hostname schema builder */
export function createHostnameSchema(opts?: HostnameValidatorOptions): SchemaBuilder<string> {
  const options = opts ?? {};
  const parser = (raw: string): ParseResult<string> => parseAndValidateHostname(raw, options);
  return new SchemaBuilder<string>(parser, 'hostname');
}
