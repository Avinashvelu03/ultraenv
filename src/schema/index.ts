// =============================================================================
// ultraenv — Schema Public API
// Barrel export with the `t` factory, `defineEnv`, and all types.
// =============================================================================

// Imports for local use (classes, functions, types needed in this file)
import { SchemaBuilder } from './builder.js';
import type {
  ParseResult,
  NoInfer,
  ExtractType,
  IsOptional,
  ExtractDefault,
  ResolveOutput,
  SchemaMetadata,
  ConditionalConfig,
} from './builder.js';

import { validate, validateValue, formatValidationResult } from './engine.js';
import type {
  SchemaDefinition,
  EngineValidationResult,
  EngineOptions,
  ValidationErrorEntry,
  ValidationWarningEntry,
} from './engine.js';

import type {
  InferSchema,
  RequiredSchema,
  PartialSchema,
  RequiredFields,
  OptionalFields,
  SchemaOmit,
  SchemaPick,
  SchemaMerge,
  SchemaValueUnion,
  AsyncSchema,
} from './inference.js';

import { StringSchemaBuilder, createStringSchema } from './validators/string.js';
import { NumberSchemaBuilder, createNumberSchema } from './validators/number.js';
import { BooleanSchemaBuilder, createBooleanSchema } from './validators/boolean.js';
import { EnumSchemaBuilder, createEnumSchema } from './validators/enum.js';
import { ArraySchemaBuilder, createArraySchema } from './validators/array.js';
import { JsonSchemaBuilder, createJsonSchema } from './validators/json.js';
import { DateSchemaBuilder, createDateSchema } from './validators/date.js';
import { RegexSchemaBuilder, createRegexSchema } from './validators/regex.js';
import { BigIntSchemaBuilder, createBigIntSchema } from './validators/bigint.js';
import { createUrlSchema } from './validators/url.js';
import type { UrlValidatorOptions } from './validators/url.js';
import { createEmailSchema } from './validators/email.js';
import type { EmailValidatorOptions } from './validators/email.js';
import { createIpSchema, createIpv4Schema, createIpv6Schema } from './validators/ip.js';
import type { IpValidatorOptions } from './validators/ip.js';
import { createHostnameSchema } from './validators/hostname.js';
import type { HostnameValidatorOptions } from './validators/hostname.js';
import { createPortSchema } from './validators/port.js';
import type { PortValidatorOptions } from './validators/port.js';
import { createPathSchema } from './validators/path.js';
import type { PathValidatorOptions } from './validators/path.js';
import { createUuidSchema } from './validators/uuid.js';
import type { UuidValidatorOptions } from './validators/uuid.js';
import { createHexSchema } from './validators/hex.js';
import type { HexValidatorOptions } from './validators/hex.js';
import { createBase64Schema } from './validators/base64.js';
import type { Base64ValidatorOptions } from './validators/base64.js';
import { createSemverSchema } from './validators/semver.js';
import type { SemverValidatorOptions } from './validators/semver.js';
import { createCronSchema } from './validators/cron.js';
import type { CronValidatorOptions } from './validators/cron.js';
import { createDurationSchema } from './validators/duration.js';
import type { DurationValidatorOptions } from './validators/duration.js';
import { createBytesSchema } from './validators/bytes.js';
import type { BytesValidatorOptions } from './validators/bytes.js';
import { createColorSchema } from './validators/color.js';
import type { ColorValidatorOptions } from './validators/color.js';
import { createLocaleSchema } from './validators/locale.js';
import type { LocaleValidatorOptions } from './validators/locale.js';
import { createTimezoneSchema } from './validators/timezone.js';
import type { TimezoneValidatorOptions } from './validators/timezone.js';
import { createCountrySchema } from './validators/country.js';
import type { CountryValidatorOptions } from './validators/country.js';
import { createCurrencySchema } from './validators/currency.js';
import type { CurrencyValidatorOptions } from './validators/currency.js';

import type { UrlOptions, UuidOptions } from './validators/string.js';

import { applyRequired, isRequired } from './modifiers/required.js';
import { applyOptional, isOptional as isOptionalMod } from './modifiers/optional.js';
import { applyDefault, hasDefault, getDefaultValue as getModDefault } from './modifiers/default.js';
import { applySecret, isSecret, maskValue } from './modifiers/secret.js';
import { applyDeprecated, isDeprecated, getDeprecationMessage } from './modifiers/deprecated.js';
import { applyAlias, getAliases, isAlias } from './modifiers/alias.js';
import { applyTransform, composeTransforms } from './modifiers/transform.js';
import { applyCustom, minLength as customMinLength, maxLength as customMaxLength, check, allOf } from './modifiers/custom.js';
import { applyConditional, hasConditional, shouldApply } from './modifiers/conditional.js';
import { applyDescription, getDescription, formatSchemaDescription } from './modifiers/description.js';

// Re-export everything
export {
  SchemaBuilder,
  validate,
  validateValue,
  formatValidationResult,
  StringSchemaBuilder,
  createStringSchema,
  NumberSchemaBuilder,
  createNumberSchema,
  BooleanSchemaBuilder,
  createBooleanSchema,
  EnumSchemaBuilder,
  createEnumSchema,
  ArraySchemaBuilder,
  createArraySchema,
  JsonSchemaBuilder,
  createJsonSchema,
  DateSchemaBuilder,
  createDateSchema,
  RegexSchemaBuilder,
  createRegexSchema,
  BigIntSchemaBuilder,
  createBigIntSchema,
  createUrlSchema,
  createEmailSchema,
  createIpSchema,
  createIpv4Schema,
  createIpv6Schema,
  createHostnameSchema,
  createPortSchema,
  createPathSchema,
  createUuidSchema,
  createHexSchema,
  createBase64Schema,
  createSemverSchema,
  createCronSchema,
  createDurationSchema,
  createBytesSchema,
  createColorSchema,
  createLocaleSchema,
  createTimezoneSchema,
  createCountrySchema,
  createCurrencySchema,
  applyRequired,
  isRequired,
  applyOptional,
  isOptionalMod as isOptional,
  applyDefault,
  hasDefault,
  getModDefault,
  applySecret,
  isSecret,
  maskValue,
  applyDeprecated,
  isDeprecated,
  getDeprecationMessage,
  applyAlias,
  getAliases,
  isAlias,
  applyTransform,
  composeTransforms,
  applyCustom,
  customMinLength,
  customMaxLength,
  check,
  allOf,
  applyConditional,
  hasConditional,
  shouldApply,
  applyDescription,
  getDescription,
  formatSchemaDescription,
};

export type {
  ParseResult,
  NoInfer,
  ExtractType,
  IsOptional,
  ExtractDefault,
  ResolveOutput,
  SchemaMetadata,
  ConditionalConfig,
  SchemaDefinition,
  EngineValidationResult,
  EngineOptions,
  ValidationErrorEntry,
  ValidationWarningEntry,
  InferSchema,
  RequiredSchema,
  PartialSchema,
  RequiredFields,
  OptionalFields,
  SchemaOmit,
  SchemaPick,
  SchemaMerge,
  SchemaValueUnion,
  AsyncSchema,
  UrlValidatorOptions,
  EmailValidatorOptions,
  IpValidatorOptions,
  HostnameValidatorOptions,
  PortValidatorOptions,
  PathValidatorOptions,
  UuidValidatorOptions,
  HexValidatorOptions,
  Base64ValidatorOptions,
  SemverValidatorOptions,
  CronValidatorOptions,
  DurationValidatorOptions,
  BytesValidatorOptions,
  ColorValidatorOptions,
  LocaleValidatorOptions,
  TimezoneValidatorOptions,
  CountryValidatorOptions,
  CurrencyValidatorOptions,
  UrlOptions,
  UuidOptions,
};

// -----------------------------------------------------------------------------
// The `t` Factory — Schema Builder Factory
// -----------------------------------------------------------------------------

/**
 * The schema builder factory. Use this to create type-safe schemas.
 *
 * @example
 * ```typescript
 * import { t, defineEnv } from 'ultraenv/schema';
 *
 * const env = defineEnv({
 *   PORT: t.number().port().default(3000),
 *   HOST: t.string().hostname().default('localhost'),
 *   NODE_ENV: t.enum(['development', 'production', 'test'] as const),
 *   DEBUG: t.boolean().optional(),
 *   ALLOWED_ORIGINS: t.array().separator(','),
 *   TIMEOUT: t.duration(),
 *   MAX_SIZE: t.bytes(),
 *   LOCALE: t.locale(),
 *   TIMEZONE: t.timezone(),
 * });
 * ```
 */
export const t = {
  string: <T extends string = string>(): StringSchemaBuilder<T> => createStringSchema<T>(),
  number: <T extends number = number>(): NumberSchemaBuilder<T> => createNumberSchema<T>(),
  boolean: (): BooleanSchemaBuilder => createBooleanSchema(),
  enum: <L extends string>(values: readonly L[]): EnumSchemaBuilder<L> => createEnumSchema(values),
  array: (): ArraySchemaBuilder => createArraySchema(),
  json: <T = unknown>(): JsonSchemaBuilder<T> => createJsonSchema<T>(),
  date: (): DateSchemaBuilder => createDateSchema(),
  regex: (): RegexSchemaBuilder => createRegexSchema(),
  bigint: (): BigIntSchemaBuilder => createBigIntSchema(),
  url: (opts?: UrlValidatorOptions) => createUrlSchema(opts),
  email: (opts?: EmailValidatorOptions) => createEmailSchema(opts),
  ip: (opts?: IpValidatorOptions) => createIpSchema(opts),
  ipv4: (opts?: Omit<IpValidatorOptions, 'version'>) => createIpv4Schema(opts),
  ipv6: (opts?: Omit<IpValidatorOptions, 'version'>) => createIpv6Schema(opts),
  hostname: (opts?: HostnameValidatorOptions) => createHostnameSchema(opts),
  port: (opts?: PortValidatorOptions) => createPortSchema(opts),
  path: (opts?: PathValidatorOptions) => createPathSchema(opts),
  uuid: (opts?: UuidValidatorOptions) => createUuidSchema(opts),
  hex: (opts?: HexValidatorOptions) => createHexSchema(opts),
  base64: (opts?: Base64ValidatorOptions) => createBase64Schema(opts),
  semver: (opts?: SemverValidatorOptions) => createSemverSchema(opts),
  cron: (opts?: CronValidatorOptions) => createCronSchema(opts),
  duration: (opts?: DurationValidatorOptions) => createDurationSchema(opts),
  bytes: (opts?: BytesValidatorOptions) => createBytesSchema(opts),
  color: (opts?: ColorValidatorOptions) => createColorSchema(opts),
  locale: (opts?: LocaleValidatorOptions) => createLocaleSchema(opts),
  timezone: (opts?: TimezoneValidatorOptions) => createTimezoneSchema(opts),
  country: (opts?: CountryValidatorOptions) => createCountrySchema(opts),
  currency: (opts?: CurrencyValidatorOptions) => createCurrencySchema(opts),
} as const;

// -----------------------------------------------------------------------------
// defineEnv — The Main Schema Validation Function
// -----------------------------------------------------------------------------

/**
 * Define and validate environment variables from a schema.
 * Returns a fully typed object where TypeScript infers ALL types from the schema.
 *
 * @example
 * ```typescript
 * const env = defineEnv({
 *   PORT: t.number().port().default(3000),
 *   HOST: t.string().default('localhost'),
 *   NODE_ENV: t.enum(['development', 'production', 'test'] as const),
 *   DEBUG: t.boolean().optional(),
 * });
 *
 * // TypeScript knows:
 * // env.PORT     → number
 * // env.HOST     → string
 * // env.NODE_ENV → 'development' | 'production' | 'test'
 * // env.DEBUG    → boolean | undefined
 * ```
 */
export function defineEnv<
  S extends Record<string, SchemaBuilder<unknown>>,
>(schema: S, vars?: Record<string, string>, options?: EngineOptions): InferSchema<S> {
  const envVars = vars ?? getProcessEnv();
  const result = validate(envVars, schema, options);

  for (const warning of result.warnings) {
    process.stderr.write(`[ultraenv] Warning: ${warning.field}: ${warning.message}\n`);
  }

  if (!result.valid) {
    const messages = result.errors
      .map((e: ValidationErrorEntry) => `  - ${e.field}: ${e.message}`)
      .join('\n');

    const unknownMsg = result.unknown.length > 0
      ? `\nUnknown variables: ${result.unknown.join(', ')}`
      : '';

    throw new Error(
      `Environment validation failed:\n${messages}${unknownMsg}`,
    );
  }

  return result.values as InferSchema<S>;
}

/**
 * Define environment variables without throwing on validation failure.
 * Returns the result object with valid/warning/error information.
 */
export function tryDefineEnv<
  S extends Record<string, SchemaBuilder<unknown>>,
>(schema: S, vars?: Record<string, string>, options?: EngineOptions): {
  valid: true;
  values: InferSchema<S>;
  warnings: readonly ValidationWarningEntry[];
} | {
  valid: false;
  values: Record<string, unknown>;
  warnings: readonly ValidationWarningEntry[];
  errors: readonly ValidationErrorEntry[];
  unknown: readonly string[];
} {
  const envVars = vars ?? getProcessEnv();
  const result = validate(envVars, schema, options);

  if (result.valid) {
    return {
      valid: true,
      values: result.values as InferSchema<S>,
      warnings: result.warnings,
    };
  }

  return {
    valid: false,
    values: result.values,
    warnings: result.warnings,
    errors: result.errors,
    unknown: result.unknown,
  };
}

function getProcessEnv(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}
