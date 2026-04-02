// =============================================================================
// ultraenv — IP Address Validator
// Validates IPv4 and IPv6 addresses with CIDR notation support.
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

export interface IpValidatorOptions {
  /** IP version to accept: '4', '6', or 'both' (default: 'both') */
  version?: '4' | '6' | 'both';
  /** Whether to accept CIDR notation (default: false) */
  allowCidr?: boolean;
  /** Whether to accept IPv4-mapped IPv6 addresses (default: true) */
  allowMappedV4?: boolean;
}

const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/;

const IPV6_REGEX =
  /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^[0-9a-fA-F]{1,4}::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}:(?:[0-9a-fA-F]{1,4}:){0,4}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,3}:(?:[0-9a-fA-F]{1,4}:){0,3}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,4}:(?:[0-9a-fA-F]{1,4}:){0,2}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}:(?:[0-9a-fA-F]{1,4}:)?[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^::$/;

const IPV4_CIDR_REGEX =
  /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\/(?:3[0-2]|[12]?\d)$/;

const IPV6_MAPPED_V4_REGEX = /^::ffff:(?:\d{1,3}\.){3}\d{1,3}$/i;

function parseAndValidateIp(raw: string, opts: IpValidatorOptions): ParseResult<string> {
  const trimmed = raw.trim();
  const version = opts.version ?? 'both';
  const allowCidr = opts.allowCidr ?? false;

  const isV4 = IPV4_REGEX.test(trimmed);
  const isV6 = IPV6_REGEX.test(trimmed);
  const isV4Cidr = allowCidr && IPV4_CIDR_REGEX.test(trimmed);
  const isMappedV4 = IPV6_MAPPED_V4_REGEX.test(trimmed);

  if (version === '4' && !isV4 && !isV4Cidr) {
    return { success: false, error: `"${trimmed}" is not a valid IPv4 address` };
  }

  if (version === '6' && !isV6) {
    if (opts.allowMappedV4 === false && isMappedV4) {
      return {
        success: false,
        error: `"${trimmed}" is an IPv4-mapped IPv6 address, which is not allowed`,
      };
    }
    return { success: false, error: `"${trimmed}" is not a valid IPv6 address` };
  }

  if (version === 'both' && !isV4 && !isV6 && !isV4Cidr) {
    return { success: false, error: `"${trimmed}" is not a valid IP address` };
  }

  if (version === '6' && isMappedV4 && opts.allowMappedV4 === false) {
    return {
      success: false,
      error: `"${trimmed}" is an IPv4-mapped IPv6 address, which is not allowed`,
    };
  }

  return { success: true, value: trimmed };
}

/** Create an IP address schema builder */
export function createIpSchema(opts?: IpValidatorOptions): SchemaBuilder<string> {
  const options = opts ?? {};
  const parser = (raw: string): ParseResult<string> => parseAndValidateIp(raw, options);
  return new SchemaBuilder<string>(parser, 'ip');
}

/** Create an IPv4-only schema builder */
export function createIpv4Schema(
  opts?: Omit<IpValidatorOptions, 'version'>,
): SchemaBuilder<string> {
  return createIpSchema({ ...opts, version: '4' });
}

/** Create an IPv6-only schema builder */
export function createIpv6Schema(
  opts?: Omit<IpValidatorOptions, 'version'>,
): SchemaBuilder<string> {
  return createIpSchema({ ...opts, version: '6' });
}
