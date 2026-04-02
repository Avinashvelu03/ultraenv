// =============================================================================
// ultraenv — Currency Code Validator
// Validates ISO 4217 currency codes (e.g., USD, EUR, JPY).
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

export interface CurrencyValidatorOptions {
  /** Whether to accept only active currencies — default: true */
  activeOnly?: boolean;
  /** Whether to accept cryptocurrency codes (e.g., BTC, ETH) — default: false */
  allowCrypto?: boolean;
}

// ISO 4217 currency codes (comprehensive list of active currencies)
const CURRENCY_CODES = new Set([
  'AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN',
  'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BOV',
  'BRL', 'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHE', 'CHF',
  'CHW', 'CLF', 'CLP', 'CNY', 'COP', 'COU', 'CRC', 'CUC', 'CUP', 'CVE',
  'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP', 'ERN', 'ETB', 'EUR', 'FJD',
  'FKP', 'GBP', 'GEL', 'GHS', 'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD',
  'HNL', 'HRK', 'HTG', 'HUF', 'IDR', 'ILS', 'INR', 'IQD', 'IRR', 'ISK',
  'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KPW', 'KRW', 'KWD',
  'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD', 'LSL', 'LYD', 'MAD', 'MDL',
  'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR', 'MVR', 'MWK', 'MXN',
  'MXV', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR',
  'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD',
  'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD', 'SHP', 'SLE',
  'SLL', 'SOS', 'SRD', 'SSP', 'STN', 'SVC', 'SYP', 'SZL', 'THB', 'TJS',
  'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX', 'USD',
  'USN', 'UYI', 'UYU', 'UYW', 'UZS', 'VED', 'VES', 'VND', 'VUV', 'WST',
  'XAF', 'XAG', 'XAU', 'XBA', 'XBB', 'XBC', 'XBD', 'XCD', 'XDR', 'XOF',
  'XPD', 'XPF', 'XPT', 'XSU', 'XTS', 'XUA', 'XXX', 'YER', 'ZAR', 'ZMW',
  'ZWL',
  // Historic / commonly used
  'BEF', 'BYR', 'CSD', 'EEK', 'FIM', 'GRD', 'IEP', 'ITL', 'LTL', 'LVL',
  'MRO', 'NLG', 'PTE', 'ROL', 'RUR', 'SKK', 'SRG', 'STD', 'VEF', 'VEB',
  'YUM',
]);

// Common cryptocurrency codes
const CRYPTO_CODES = new Set([
  'BTC', 'ETH', 'LTC', 'BCH', 'XRP', 'DASH', 'NEO', 'EOS', 'XLM', 'ADA',
  'XTZ', 'XMR', 'LINK', 'DOT', 'YFI', 'UNI', 'SOL', 'MATIC', 'AVAX', 'SHIB',
  'DOGE', 'USDT', 'USDC', 'BNB', 'FTM', 'ATOM', 'ALGO', 'VET', 'ICP', 'FIL',
  'TRX', 'ETC', 'HBAR', 'THETA', 'AXS', 'MANA', 'SAND', 'APE', 'GRT', 'FTT',
]);

const CURRENCY_REGEX = /^[A-Z]{3}$/;

function parseAndValidateCurrency(raw: string, opts: CurrencyValidatorOptions): ParseResult<string> {
  const trimmed = raw.trim().toUpperCase();

  if (trimmed.length === 0) {
    return { success: false, error: 'Currency code must not be empty' };
  }

  if (!CURRENCY_REGEX.test(trimmed)) {
    return {
      success: false,
      error: `Currency code must be exactly 3 uppercase letters, got "${trimmed}"`,
    };
  }

  const allowCrypto = opts.allowCrypto ?? false;

  if (CURRENCY_CODES.has(trimmed)) {
    return { success: true, value: trimmed };
  }

  if (allowCrypto && CRYPTO_CODES.has(trimmed)) {
    return { success: true, value: trimmed };
  }

  return {
    success: false,
    error: `"${trimmed}" is not a valid ISO 4217 currency code`,
  };
}

/** Create a currency code schema builder */
export function createCurrencySchema(opts?: CurrencyValidatorOptions): SchemaBuilder<string> {
  const options = opts ?? {};
  const parser = (raw: string): ParseResult<string> => parseAndValidateCurrency(raw, options);
  return new SchemaBuilder<string>(parser, 'currency');
}
