// =============================================================================
// ultraenv — URL Validator
// Advanced URL validation with protocol, port, and query string checks.
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

export interface UrlValidatorOptions {
  /** Allowed protocols (default: ['http', 'https']) */
  protocols?: readonly string[];
  /** Require a specific hostname */
  hostname?: string;
  /** Allowed port numbers */
  allowedPorts?: readonly number[];
  /** Whether to allow query strings (default: true) */
  allowQuery?: boolean;
  /** Whether to allow fragments (default: true) */
  allowFragment?: boolean;
  /** Maximum URL length (default: 2048) */
  maxLength?: number;
}

function parseAndValidateUrl(raw: string, opts: UrlValidatorOptions): ParseResult<URL> {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);

    // Protocol check
    const protocols = (opts.protocols ?? ['http', 'https']).map(p => p.toLowerCase());
    if (!protocols.includes(url.protocol.replace(':', ''))) {
      return {
        success: false,
        error: `URL protocol must be one of: ${protocols.join(', ')}. Got "${url.protocol}"`,
      };
    }

    // Hostname check
    if (opts.hostname !== undefined && url.hostname !== opts.hostname) {
      return {
        success: false,
        error: `URL hostname must be "${opts.hostname}", got "${url.hostname}"`,
      };
    }

    // Port check
    if (opts.allowedPorts !== undefined) {
      const port = url.port !== '' ? Number(url.port) : (url.protocol === 'https:' ? 443 : 80);
      if (!opts.allowedPorts.includes(port)) {
        return {
          success: false,
          error: `URL port must be one of: ${opts.allowedPorts.join(', ')}. Got ${port}`,
        };
      }
    }

    // Query string check
    if (opts.allowQuery === false && url.search !== '') {
      return { success: false, error: 'URL must not contain a query string' };
    }

    // Fragment check
    if (opts.allowFragment === false && url.hash !== '') {
      return { success: false, error: 'URL must not contain a fragment' };
    }

    // Max length check
    const maxLen = opts.maxLength ?? 2048;
    if (trimmed.length > maxLen) {
      return {
        success: false,
        error: `URL must be at most ${maxLen} characters, got ${trimmed.length}`,
      };
    }

    return { success: true, value: url };
  } catch {
    return { success: false, error: `"${trimmed}" is not a valid URL` };
  }
}

/** Create a URL schema builder with advanced validation */
export function createUrlSchema(opts?: UrlValidatorOptions): SchemaBuilder<URL> {
  const options = opts ?? {};
  const parser = (raw: string): ParseResult<URL> => parseAndValidateUrl(raw, options);
  return new SchemaBuilder<URL>(parser, 'url');
}
