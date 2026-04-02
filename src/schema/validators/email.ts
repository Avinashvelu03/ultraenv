// =============================================================================
// ultraenv — Email Validator
// Advanced email validation with domain, length, and tld checks.
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

export interface EmailValidatorOptions {
  /** Maximum email length (default: 254 per RFC 5321) */
  maxLength?: number;
  /** Maximum local part length (default: 64 per RFC 5321) */
  maxLocalLength?: number;
  /** Allowed TLDs (if specified, restricts to these) */
  allowedTlds?: readonly string[];
  /** Blocked domains */
  blockedDomains?: readonly string[];
  /** Whether to allow plus addressing (e.g., user+tag@domain.com) */
  allowPlusAddressing?: boolean;
}

// RFC 5322 compliant email regex (simplified but robust)
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function parseAndValidateEmail(raw: string, opts: EmailValidatorOptions): ParseResult<string> {
  const trimmed = raw.trim();
  const maxLen = opts.maxLength ?? 254;
  const maxLocal = opts.maxLocalLength ?? 64;

  if (trimmed.length === 0) {
    return { success: false, error: 'Email must not be empty' };
  }

  if (trimmed.length > maxLen) {
    return {
      success: false,
      error: `Email must be at most ${maxLen} characters, got ${trimmed.length}`,
    };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { success: false, error: `"${trimmed}" is not a valid email address` };
  }

  const atIndex = trimmed.lastIndexOf('@');
  const localPart = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);

  // Local part length check
  if (localPart.length > maxLocal) {
    return {
      success: false,
      error: `Email local part must be at most ${maxLocal} characters, got ${localPart.length}`,
    };
  }

  // Plus addressing check
  if (opts.allowPlusAddressing === false && localPart.includes('+')) {
    return { success: false, error: 'Plus addressing (+) is not allowed' };
  }

  // Allowed TLDs check
  if (opts.allowedTlds !== undefined && opts.allowedTlds.length > 0) {
    const tld = domain.split('.').pop() ?? '';
    const allowed = opts.allowedTlds.map((t) => t.toLowerCase());
    if (!allowed.includes(tld.toLowerCase())) {
      return {
        success: false,
        error: `Email TLD must be one of: ${allowed.join(', ')}. Got ".${tld}"`,
      };
    }
  }

  // Blocked domains check
  if (opts.blockedDomains !== undefined) {
    const blocked = opts.blockedDomains.map((d) => d.toLowerCase());
    if (blocked.includes(domain.toLowerCase())) {
      return { success: false, error: `Email domain "${domain}" is not allowed` };
    }
  }

  return { success: true, value: trimmed };
}

/** Create an email schema builder with advanced validation */
export function createEmailSchema(opts?: EmailValidatorOptions): SchemaBuilder<string> {
  const options = opts ?? {};
  const parser = (raw: string): ParseResult<string> => parseAndValidateEmail(raw, options);
  return new SchemaBuilder<string>(parser, 'email');
}
