// =============================================================================
// ultraenv — Locale Validator
// Validates BCP 47 locale/language tags (e.g., en-US, zh-CN, fr-FR).
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

export interface LocaleValidatorOptions {
  /** Whether to require a region subtag (e.g., "en-US" not just "en") — default: false */
  requireRegion?: boolean;
  /** Allowed language subtags (ISO 639-1 codes) — default: any */
  allowedLanguages?: readonly string[];
  /** Whether to accept Unicode extensions (e.g., "en-US-u-ca-buddhist") — default: false */
  allowExtensions?: boolean;
}

// BCP 47 language tag format (we use LANGUAGE_REGION_REGEX for validation)

const LANGUAGE_REGION_REGEX = /^([a-zA-Z]{2,3})(?:-([a-zA-Z]{4}))?(?:-([a-zA-Z]{2}|[0-9]{3}))?/;

// Common ISO 639-1 language codes
const COMMON_LANGUAGES = new Set([
  'aa',
  'ab',
  'ae',
  'af',
  'ak',
  'am',
  'an',
  'ar',
  'as',
  'av',
  'ay',
  'az',
  'ba',
  'be',
  'bg',
  'bh',
  'bi',
  'bm',
  'bn',
  'bo',
  'br',
  'bs',
  'ca',
  'ce',
  'ch',
  'co',
  'cr',
  'cs',
  'cu',
  'cv',
  'cy',
  'da',
  'de',
  'dv',
  'dz',
  'ee',
  'el',
  'en',
  'eo',
  'es',
  'et',
  'eu',
  'fa',
  'ff',
  'fi',
  'fj',
  'fo',
  'fr',
  'fy',
  'ga',
  'gd',
  'gl',
  'gn',
  'gu',
  'gv',
  'ha',
  'he',
  'hi',
  'ho',
  'hr',
  'ht',
  'hu',
  'hy',
  'hz',
  'ia',
  'id',
  'ie',
  'ig',
  'ii',
  'ik',
  'io',
  'is',
  'it',
  'iu',
  'ja',
  'jv',
  'ka',
  'kg',
  'ki',
  'kj',
  'kk',
  'kl',
  'km',
  'kn',
  'ko',
  'kr',
  'ks',
  'ku',
  'kv',
  'kw',
  'ky',
  'la',
  'lb',
  'lg',
  'li',
  'ln',
  'lo',
  'lt',
  'lu',
  'lv',
  'mg',
  'mh',
  'mi',
  'mk',
  'ml',
  'mn',
  'mr',
  'ms',
  'mt',
  'my',
  'na',
  'nb',
  'nd',
  'ne',
  'ng',
  'nl',
  'nn',
  'no',
  'nr',
  'nv',
  'ny',
  'oc',
  'oj',
  'om',
  'or',
  'os',
  'pa',
  'pi',
  'pl',
  'ps',
  'pt',
  'qu',
  'rm',
  'rn',
  'ro',
  'ru',
  'rw',
  'sa',
  'sc',
  'sd',
  'se',
  'sg',
  'si',
  'sk',
  'sl',
  'sm',
  'sn',
  'so',
  'sq',
  'sr',
  'ss',
  'st',
  'su',
  'sv',
  'sw',
  'ta',
  'te',
  'tg',
  'th',
  'ti',
  'tk',
  'tl',
  'tn',
  'to',
  'tr',
  'ts',
  'tt',
  'tw',
  'ty',
  'ug',
  'uk',
  'ur',
  'uz',
  've',
  'vi',
  'vo',
  'wa',
  'wo',
  'xh',
  'yi',
  'yo',
  'za',
  'zh',
  'zu',
]);

function parseAndValidateLocale(raw: string, opts: LocaleValidatorOptions): ParseResult<string> {
  const trimmed = raw.trim().toLowerCase();

  if (trimmed.length === 0) {
    return { success: false, error: 'Locale must not be empty' };
  }

  // Check for Unicode extensions
  if (opts.allowExtensions !== true && /-[uU]-/.test(trimmed)) {
    return { success: false, error: 'Unicode locale extensions are not allowed' };
  }

  // Extract base locale (without extensions)
  const baseLocale = trimmed.split('-u-')[0] ?? trimmed;

  // Validate BCP 47 format
  const match = baseLocale.match(LANGUAGE_REGION_REGEX);
  if (!match) {
    return {
      success: false,
      error: `"${trimmed}" is not a valid BCP 47 locale tag`,
    };
  }

  const language = match[1];
  const script = match[2];
  const region = match[3];

  if (language === undefined) {
    return { success: false, error: 'Locale must include a language subtag' };
  }

  // Check allowed languages
  if (opts.allowedLanguages !== undefined) {
    const allowed = opts.allowedLanguages.map((l) => l.toLowerCase());
    if (!allowed.includes(language)) {
      return {
        success: false,
        error: `Language "${language}" is not allowed. Allowed: ${allowed.join(', ')}`,
      };
    }
  }

  // Warn about uncommon languages (but still pass)
  if (!COMMON_LANGUAGES.has(language) && opts.allowedLanguages === undefined) {
    // Still accept it, as there are many valid ISO 639 codes
  }

  // Check region requirement
  if (opts.requireRegion === true && region === undefined && script === undefined) {
    return {
      success: false,
      error: 'Locale must include a region subtag (e.g., "en-US")',
    };
  }

  void script;

  return { success: true, value: trimmed };
}

/** Create a locale schema builder */
export function createLocaleSchema(opts?: LocaleValidatorOptions): SchemaBuilder<string> {
  const options = opts ?? {};
  const parser = (raw: string): ParseResult<string> => parseAndValidateLocale(raw, options);
  return new SchemaBuilder<string>(parser, 'locale');
}
