# Schema Reference

Complete reference for all ultraenv schema validators and modifiers.

## Table of Contents

- [The `t` Factory](#the-t-factory)
- [Core Validators](#core-validators)
  - [t.string()](#tstring)
  - [t.number()](#tnumber)
  - [t.boolean()](#tboolean)
  - [t.enum()](#tenum)
  - [t.array()](#tarray)
  - [t.json()](#tjson)
  - [t.date()](#tdate)
  - [t.bigint()](#tbigint)
  - [t.regex()](#tregex)
- [Specialized String Validators](#specialized-string-validators)
  - [t.url()](#turl)
  - [t.email()](#temail)
  - [t.ip() / t.ipv4() / t.ipv6()](#tip--tipv4--tipv6)
  - [t.hostname()](#thostname)
  - [t.port()](#tport)
  - [t.uuid()](#tuuid)
  - [t.hex()](#thex)
  - [t.base64()](#tbase64)
  - [t.semver()](#tsemver)
  - [t.path()](#tpath)
  - [t.color()](#tcolor)
  - [t.locale()](#tlocale)
  - [t.timezone()](#ttimezone)
  - [t.country()](#tcountry)
  - [t.currency()](#tcurrency)
- [Unit Validators](#unit-validators)
  - [t.duration()](#tduration)
  - [t.bytes()](#tbytes)
  - [t.cron()](#tcron)
- [Common Modifiers](#common-modifiers)
  - [.required()](#required)
  - [.optional()](#optional)
  - [.default(value)](#defaultvalue)
  - [.description(desc)](#descriptiondesc)
  - [.transform(fn)](#transformfn)
  - [.validate(fn)](#validatefn)
  - [.deprecated(msg)](#deprecatedmsg)
  - [.secret()](#secret)
  - [.alias(name)](#aliasname)
  - [.conditional(config)](#conditionalconfig)
- [Type Inference](#type-inference)
- [Error Handling](#error-handling)

---

## The `t` Factory

All schema builders are created via the `t` factory:

```typescript
import { t } from 'ultraenv';
```

The `t` object provides methods for every validator type:

| Method | Returns | Inferred Type |
|---|---|---|
| `t.string()` | `StringSchemaBuilder` | `string` |
| `t.number()` | `NumberSchemaBuilder` | `number` |
| `t.boolean()` | `BooleanSchemaBuilder` | `boolean` |
| `t.enum(values)` | `EnumSchemaBuilder<T>` | `T[number]` |
| `t.array()` | `ArraySchemaBuilder` | `readonly string[]` |
| `t.json()` | `JsonSchemaBuilder<T>` | `T` |
| `t.date()` | `DateSchemaBuilder` | `Date` |
| `t.bigint()` | `BigIntSchemaBuilder` | `bigint` |
| `t.regex()` | `RegexSchemaBuilder` | `RegExp` |
| `t.url()` | Schema builder | `string` |
| `t.email()` | Schema builder | `string` |
| `t.ip()` | Schema builder | `string` |
| `t.ipv4()` | Schema builder | `string` |
| `t.ipv6()` | Schema builder | `string` |
| `t.hostname()` | Schema builder | `string` |
| `t.port()` | Schema builder | `number` |
| `t.uuid()` | Schema builder | `string` |
| `t.hex()` | Schema builder | `string` |
| `t.base64()` | Schema builder | `string` |
| `t.semver()` | Schema builder | `string` |
| `t.path()` | Schema builder | `string` |
| `t.color()` | Schema builder | `string` |
| `t.locale()` | Schema builder | `string` |
| `t.timezone()` | Schema builder | `string` |
| `t.country()` | Schema builder | `string` |
| `t.currency()` | Schema builder | `string` |
| `t.duration()` | Schema builder | `string` |
| `t.bytes()` | Schema builder | `string` |
| `t.cron()` | Schema builder | `string` |

---

## Core Validators

### `t.string()`

Validates string environment variables.

```typescript
t.string(): StringSchemaBuilder<string>
t.string<T extends string>(): StringSchemaBuilder<T>
```

#### Methods

| Method | Parameter | Description |
|---|---|---|
| `.required()` | — | Field must be set (default behavior) |
| `.optional()` | — | Field may be undefined |
| `.default(value)` | `string` | Default value when not set |
| `.minLength(n)` | `number` | Minimum string length |
| `.maxLength(n)` | `number` | Maximum string length |
| `.pattern(regex)` | `RegExp` | Value must match regex |
| `.format(fmt)` | `Format` | Predefined format shortcut |
| `.enum(values)` | `readonly string[]` | Allowed values |
| `.trim()` | `boolean?` | Trim whitespace (default: true) |
| `.description(desc)` | `string` | JSDoc description |
| `.transform(fn)` | `(v: string) => string` | Transform after parsing |
| `.validate(fn)` | `(v: string) => string \| void` | Custom validation |
| `.deprecated(msg)` | `string` | Deprecation warning |
| `.secret()` | — | Mask in output |
| `.alias(name)` | `string` | Alternative variable name |
| `.conditional(config)` | `ConditionalConfig` | Conditional validation |

#### Format Shortcuts

The `.format()` method accepts these predefined formats:

| Format | Validation |
|---|---|
| `'email'` | RFC 5322 email address |
| `'url'` | URL with protocol |
| `'uuid'` | UUID v4 format |
| `'hostname'` | RFC 952/1123 hostname |
| `'ip'` | IPv4 or IPv6 |
| `'ipv4'` | IPv4 address |
| `'ipv6'` | IPv6 address |

#### Examples

```typescript
// Basic required string
API_KEY: t.string().required(),

// With format
WEBSITE_URL: t.string().format('url').required(),
ADMIN_EMAIL: t.string().format('email').optional(),

// Length constraints
USERNAME: t.string().minLength(3).maxLength(50).required(),
API_KEY: t.string().minLength(32).maxLength(128).required(),

// Regex pattern
SLUG: t.string().pattern(/^[a-z0-9-]+$/).required(),
HEX_COLOR: t.string().pattern(/^#[0-9A-Fa-f]{6}$/).required(),

// Enum shorthand
LOG_LEVEL: t.string().enum(['debug', 'info', 'warn', 'error'] as const).default('info'),

// Auto-trim
USER_INPUT: t.string().trim().required(),

// With default
APP_NAME: t.string().default('my-app'),

// Optional
FEATURE_FLAG: t.string().optional(),
// Type: string | undefined

// With transform
BASE_URL: t.string()
  .transform(v => v.replace(/\/$/, ''))
  .default('http://localhost:3000'),

// With custom validation
PASSWORD: t.string()
  .minLength(8)
  .validate(v => {
    if (!/[A-Z]/.test(v)) return 'Must contain uppercase';
    if (!/[0-9]/.test(v)) return 'Must contain a number';
  })
  .required(),

// Generic typed string
const StatusValues = ['active', 'inactive', 'pending'] as const;
STATUS: t.string<typeof StatusValues[number]>().enum(StatusValues).required(),
```

---

### `t.number()`

Validates and parses numeric environment variables (always parsed from strings).

```typescript
t.number(): NumberSchemaBuilder<number>
t.number<T extends number>(): NumberSchemaBuilder<T>
```

#### Methods

| Method | Parameter | Description |
|---|---|---|
| `.min(n)` | `number` | Minimum value |
| `.max(n)` | `number` | Maximum value |
| `.integer()` | — | Must be an integer |
| `.positive()` | — | Must be > 0 |
| `.negative()` | — | Must be < 0 |
| `.nonNegative()` | — | Must be >= 0 |
| `.finite()` | — | No NaN or Infinity |
| `.port()` | — | Valid TCP port (1–65535) |
| `.parse(fn)` | `(raw: string) => number` | Custom parser |
| Plus all common modifiers | | |

#### Examples

```typescript
// Basic number
PAGE_SIZE: t.number().required(),
// "20" → 20

// Port validation
PORT: t.number().port().default(3000),
// "65535" → 65535 ✅
// "0" → Error (port must be 1-65535)
// "70000" → Error

// Range
MIN_AGE: t.number().min(0).max(150).required(),
TEMPERATURE: t.number().min(-273.15).required(),

// Integer
PAGE: t.number().integer().min(1).default(1),
THREAD_COUNT: t.number().integer().positive().default(4),

// Positive / negative / non-negative
BALANCE: t.number().nonNegative().default(0),
DISCOUNT: t.number().negative().optional(),
TAX_RATE: t.number().positive().max(1).default(0.1),

// Finite (no NaN / Infinity)
RATIO: t.number().finite().positive().required(),

// Custom parser
HEX_PORT: t.number()
  .parse(v => parseInt(v, 16))
  .default(0x1F90),

// With transform
PERCENTAGE: t.number()
  .transform(v => Math.round(v * 100))
  .default(50),
```

---

### `t.boolean()`

Validates boolean environment variables from string values.

```typescript
t.boolean(): BooleanSchemaBuilder
```

#### Default Truthy Values
`'true'`, `'1'`, `'yes'`, `'on'`, `'TRUE'`, `'True'`, `'YES'`, `'ON'`

#### Default Falsy Values
`'false'`, `'0'`, `'no'`, `'off'`, `'FALSE'`, `'False'`, `'NO'`, `'OFF'`, `''`

#### Methods

| Method | Parameter | Description |
|---|---|---|
| `.truthy(values)` | `readonly string[]` | Custom truthy values |
| `.falsy(values)` | `readonly string[]` | Custom falsy values |
| Plus all common modifiers | | |

#### Examples

```typescript
// Basic boolean
DEBUG: t.boolean().default(false),
// "true" → true
// "false" → false
// "1" → true
// "0" → false
// "" → false

ENABLE_CACHE: t.boolean().required(),

// Custom truthy/falsy
FEATURE_FLAG: t.boolean()
  .truthy(['on', 'enabled', '1', 'yes', 'true'])
  .falsy(['off', 'disabled', '0', 'no', 'false'])
  .default(false),

VERBOSE: t.boolean()
  .truthy(['verbose', 'v'])
  .default(false),
```

---

### `t.enum()`

Validates against a predefined list of allowed string values. Infers literal union types.

```typescript
t.enum<L extends string>(values: readonly L[]): EnumSchemaBuilder<L>
```

#### Methods

| Method | Parameter | Description |
|---|---|---|
| `.caseInsensitive()` | `boolean?` | Case-insensitive matching |
| Plus all common modifiers | | |

#### Examples

```typescript
// Basic enum — infers literal types
NODE_ENV: t.enum(['development', 'staging', 'production'] as const).required(),
// Type: 'development' | 'staging' | 'production'

// With default
LOG_LEVEL: t.enum(['debug', 'info', 'warn', 'error', 'fatal'] as const)
  .default('info'),

// Case insensitive
COLOR_SCHEME: t.enum(['light', 'dark', 'system'] as const)
  .caseInsensitive()
  .default('system'),
// "LIGHT", "Light", "light" → "light" ✅

// Optional enum
ENVIRONMENT: t.enum(['dev', 'staging', 'prod'] as const).optional(),
// Type: 'dev' | 'staging' | 'prod' | undefined
```

---

### `t.array()`

Parses delimited string values into arrays.

```typescript
t.array(): ArraySchemaBuilder
```

#### Methods

| Method | Parameter | Description |
|---|---|---|
| `.separator(sep)` | `string` | Split character (default: `,`) |
| `.trimItems()` | `boolean?` | Trim whitespace from items |
| `.filterEmpty()` | `boolean?` | Remove empty strings |
| `.minItems(n)` | `number` | Minimum number of items |
| `.maxItems(n)` | `number` | Maximum number of items |
| `.unique()` | — | Remove duplicate items |
| `.itemSchema(schema)` | `BaseSchema<string>` | Validate each item |
| Plus all common modifiers | | |

#### Examples

```typescript
// Basic array (comma-separated)
ALLOWED_ORIGINS: t.array().required(),
// "http://a.com,http://b.com,http://c.com" → ["http://a.com", "http://b.com", "http://c.com"]

// Custom separator
TAGS: t.array().separator(';').required(),
// "nodejs;typescript;web" → ["nodejs", "typescript", "web"]

// Clean items
FEATURES: t.array().trimItems().filterEmpty().required(),
// " auth ,  payments , ,  search " → ["auth", "payments", "search"]

// Size constraints
ROLES: t.array().minItems(1).maxItems(10).required(),

// Unique items
ALLOWED_IPS: t.array().unique().required(),
// "1.1.1.1,2.2.2.2,1.1.1.1" → ["1.1.1.1", "2.2.2.2"]

// With default
CORS_ORIGINS: t.array().default(['http://localhost:3000']),

// Optional
EXTRA_HEADERS: t.array().optional(),
// Type: readonly string[] | undefined
```

---

### `t.json()`

Parses JSON string values into objects.

```typescript
t.json<T = unknown>(): JsonSchemaBuilder<T>
```

#### Methods

| Method | Parameter | Description |
|---|---|---|
| `.reviver(fn)` | `(key, value) => unknown` | JSON.parse reviver |
| Plus all common modifiers | | |

#### Examples

```typescript
// Unknown type
FEATURE_FLAGS: t.json().required(),
// '{"darkMode":true,"version":2}' → { darkMode: true, version: 2 }

// Typed object
APP_CONFIG: t.json<{ theme: string; lang: string }>().required(),

// Optional
MIDDLEWARE: t.json().optional(),

// With reviver
DATES_CONFIG: t.json()
  .reviver((key, value) => {
    if (key === 'createdAt') return new Date(value);
    return value;
  })
  .required(),

// With default
OAUTH_SCOPES: t.json<string[]>().default(['openid', 'profile', 'email']),
```

---

### `t.date()`

Parses date strings into Date objects.

```typescript
t.date(): DateSchemaBuilder
```

#### Methods

| Method | Parameter | Description |
|---|---|---|
| `.format(fmt)` | `string` | Expected date format |
| `.parse(fn)` | `(raw: string) => Date` | Custom parse function |
| `.min(date)` | `Date` | Minimum date |
| `.max(date)` | `Date` | Maximum date |
| Plus all common modifiers | | |

#### Examples

```typescript
// ISO 8601 date
START_DATE: t.date().required(),
// "2024-01-15T10:30:00.000Z" → Date object

// With min/max
EXPIRY: t.date().min(new Date('2024-01-01')).optional(),

// Custom format
CREATED_AT: t.date().format('YYYY-MM-DD').required(),
```

---

### `t.bigint()`

Parses environment variable strings into BigInt values.

```typescript
t.bigint(): BigIntSchemaBuilder
```

#### Methods

| Method | Parameter | Description |
|---|---|---|
| `.radix(r)` | `number` | Parsing radix (default: 10) |
| `.parse(fn)` | `(raw: string) => bigint` | Custom parser |
| `.min(value)` | `bigint` | Minimum value |
| `.max(value)` | `bigint` | Maximum value |
| Plus all common modifiers | | |

#### Examples

```typescript
// Basic bigint
TWITCH_ID: t.bigint().required(),
// "123456789012345678" → 123456789012345678n

// Hex radix
HEX_ID: t.bigint().radix(16).required(),

// Range
SATOSHIS: t.bigint().min(0n).required(),

// Custom parser
BITMASK: t.bigint().parse(v => BigInt(v.replace(/_/g, ''))).required(),
```

---

### `t.regex()`

Validates that a string is a valid regular expression.

```typescript
t.regex(): RegexSchemaBuilder
```

#### Examples

```typescript
PATTERN: t.regex().required(),
// "^[a-z]+$" → /^[a-z]+$/ (RegExp object)

ROUTE_MATCHER: t.regex().optional(),
```

---

## Specialized String Validators

### `t.url()`

Validates URL strings.

```typescript
t.url(opts?: UrlValidatorOptions): SchemaBuilder
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `protocols` | `string[]` | `['http', 'https', 'ftp']` | Allowed protocols |
| `allowRelative` | `boolean` | `false` | Allow relative URLs |
| `allowQuery` | `boolean` | `true` | Allow query strings |
| `requireTld` | `boolean` | `true` | Require top-level domain |

#### Examples

```typescript
PUBLIC_URL: t.url().required(),
API_ENDPOINT: t.url({ protocols: ['https'] }).required(),
WEBSOCKET_URL: t.url({ protocols: ['ws', 'wss'] }).optional(),
REDIRECT_URL: t.url({ allowRelative: true }).optional(),
```

---

### `t.email()`

Validates email addresses.

```typescript
t.email(opts?: EmailValidatorOptions): SchemaBuilder
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `allowDisplayName` | `boolean` | `false` | Allow display names |
| `allowUnicode` | `boolean` | `false` | Allow unicode characters |
| `requireTld` | `boolean` | `true` | Require top-level domain |

#### Examples

```typescript
ADMIN_EMAIL: t.email().required(),
CONTACT_EMAIL: t.email({ allowDisplayName: true }).optional(),
// "John Doe <john@example.com>" → valid
```

---

### `t.ip()` / `t.ipv4()` / `t.ipv6()`

Validates IP addresses.

```typescript
t.ip(opts?: IpValidatorOptions): SchemaBuilder       // IPv4 or IPv6
t.ipv4(opts?): SchemaBuilder                          // IPv4 only
t.ipv6(opts?): SchemaBuilder                          // IPv6 only
```

#### Examples

```typescript
SERVER_IP: t.ip().required(),
BIND_ADDRESS: t.ipv4().required(),
LISTEN_IPV6: t.ipv6().optional(),
```

---

### `t.hostname()`

Validates hostnames per RFC 952/1123.

```typescript
t.hostname(opts?: HostnameValidatorOptions): SchemaBuilder
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `allowWildcard` | `boolean` | `false` | Allow `*` wildcard |
| `allowUnderscore` | `boolean` | `false` | Allow underscores |
| `maxLength` | `number` | `253` | Maximum length |

#### Examples

```typescript
SERVER_HOST: t.hostname().default('localhost'),
APP_DOMAIN: t.hostname({ allowWildcard: false }).required(),
CDN_HOST: t.hostname({ allowWildcard: true }).optional(),
// "*.example.com" → valid
```

---

### `t.port()`

Validates TCP/UDP port numbers (1–65535).

```typescript
t.port(opts?: PortValidatorOptions): SchemaBuilder
```

#### Examples

```typescript
PORT: t.port().default(3000),
REDIS_PORT: t.port().default(6379),
DB_PORT: t.port().default(5432),
```

---

### `t.uuid()`

Validates UUID strings.

```typescript
t.uuid(opts?: UuidValidatorOptions): SchemaBuilder
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `version` | `1 \| 3 \| 4 \| 5 \| null` | `null` | Require specific UUID version |
| `strict` | `boolean` | `false` | Strict format validation |

#### Examples

```typescript
REQUEST_ID: t.uuid().required(),
SESSION_ID: t.uuid({ version: 4 }).required(),
CORRELATION_ID: t.uuid({ version: 4 }).optional(),
```

---

### `t.hex()`

Validates hexadecimal strings.

```typescript
t.hex(opts?: HexValidatorOptions): SchemaBuilder
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `minLength` | `number` | — | Minimum length |
| `maxLength` | `number` | — | Maximum length |
| `prefix` | `string` | — | Required prefix (e.g., `'0x'`) |

#### Examples

```typescript
COLOR: t.hex().required(),
// "FF5733" → valid

API_KEY_HEX: t.hex({ minLength: 32, maxLength: 64 }).required(),
ETHEREUM_ADDR: t.hex({ prefix: '0x', minLength: 40, maxLength: 40 }).optional(),
// "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38" → valid
```

---

### `t.base64()`

Validates Base64-encoded strings.

```typescript
t.base64(opts?: Base64ValidatorOptions): SchemaBuilder
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `paddingRequired` | `boolean` | `false` | Require `=` padding |
| `urlSafe` | `boolean` | `false` | Allow URL-safe alphabet |

#### Examples

```typescript
ENCODED_DATA: t.base64().required(),
CERT_B64: t.base64({ paddingRequired: true }).required(),
JWT_PAYLOAD: t.base64({ urlSafe: true }).optional(),
```

---

### `t.semver()`

Validates semantic version strings.

```typescript
t.semver(opts?: SemverValidatorOptions): SchemaBuilder
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `loose` | `boolean` | `false` | Allow loose semver format |
| `includePrerelease` | `boolean` | `true` | Allow pre-release versions |

#### Examples

```typescript
APP_VERSION: t.semver().required(),
// "1.2.3" → valid
// "1.2.3-beta.1" → valid
// "v1.2.3" → valid (loose)

MIN_VERSION: t.semver({ loose: true }).optional(),
```

---

### `t.path()`

Validates file system paths.

```typescript
t.path(opts?: PathValidatorOptions): SchemaBuilder
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `mustExist` | `boolean` | `false` | Path must exist on disk |
| `resolve` | `boolean` | `false` | Resolve to absolute path |
| `type` | `'file' \| 'dir' \| 'any'` | `'any'` | Expected path type |

#### Examples

```typescript
CONFIG_PATH: t.path().required(),
OUTPUT_DIR: t.path({ mustExist: false }).optional(),
LOG_FILE: t.path({ mustExist: false, resolve: true }).default('/var/log/app.log'),
DATA_DIR: t.path({ type: 'dir' }).required(),
```

---

### `t.color()`

Validates color strings in various formats.

```typescript
t.color(opts?: ColorValidatorOptions): SchemaBuilder
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `formats` | `string[]` | `['hex', 'rgb', 'hsl', 'named', 'css']` | Allowed color formats |

#### Supported Formats

- Hex: `#FF5733`, `#F53`, `FF5733`
- RGB: `rgb(255, 87, 51)`, `rgba(255, 87, 51, 0.5)`
- HSL: `hsl(11, 100%, 60%)`
- Named: `red`, `blue`, `green`, etc.

#### Examples

```typescript
BRAND_COLOR: t.color().required(),
ACCENT: t.color({ formats: ['hex', 'rgb'] }).default('#0ea5e9'),
```

---

### `t.locale()`

Validates IETF BCP 47 locale codes.

```typescript
t.locale(opts?: LocaleValidatorOptions): SchemaBuilder
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `lenient` | `boolean` | `false` | Allow non-standard locales |

#### Examples

```typescript
DEFAULT_LOCALE: t.locale().default('en-US'),
// "en-US" → valid
// "fr-FR" → valid
// "ja" → valid
// "xx-XX" → invalid (unless lenient)
```

---

### `t.timezone()`

Validates IANA timezone identifiers.

```typescript
t.timezone(opts?: TimezoneValidatorOptions): SchemaBuilder
```

#### Examples

```typescript
TZ: t.timezone().default('UTC'),
USER_TIMEZONE: t.timezone().required(),
// "America/New_York" → valid
// "Europe/London" → valid
// "Asia/Tokyo" → valid
// "Invalid/Zone" → error
```

Uses the full IANA timezone database for validation.

---

### `t.country()`

Validates ISO 3166-1 country codes.

```typescript
t.country(opts?: CountryValidatorOptions): SchemaBuilder
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `format` | `'alpha-2' \| 'alpha-3'` | `'alpha-2'` | Code format |

#### Examples

```typescript
COUNTRY: t.country().required(),
// "US" → valid (alpha-2)
// "USA" → valid (alpha-3 with format: 'alpha-3')

REGION: t.country({ format: 'alpha-3' }).optional(),
// "GBR" → valid
```

---

### `t.currency()`

Validates ISO 4217 currency codes.

```typescript
t.currency(opts?: object): SchemaBuilder
```

#### Examples

```typescript
CURRENCY: t.currency().required(),
// "USD" → valid
// "EUR" → valid
// "JPY" → valid
// "XXX" → invalid
```

---

## Unit Validators

### `t.duration()`

Parses and validates human-readable duration strings.

```typescript
t.duration(opts?: DurationValidatorOptions): SchemaBuilder
```

#### Supported Units

| Unit | Equivalent |
|---|---|
| `ms` | Milliseconds |
| `s` | Seconds |
| `m` | Minutes |
| `h` | Hours |
| `d` | Days |
| `w` | Weeks |

#### Examples

```typescript
TIMEOUT: t.duration().default('30s'),
CACHE_TTL: t.duration().default('1h'),
LEASE_TIME: t.duration().default('24h'),
GRACE_PERIOD: t.duration().default('500ms'),
BACKUP_INTERVAL: t.duration().default('1w'),

// Complex durations
COMPOUND: t.duration().default('1h30m'),
// Not supported by default — use separate fields or custom validation
```

---

### `t.bytes()`

Parses human-readable byte size strings.

```typescript
t.bytes(opts?: BytesValidatorOptions): SchemaBuilder
```

#### Supported Units

| Unit | Equivalent |
|---|---|
| `B` | Bytes |
| `KB` | Kilobytes (1024) |
| `MB` | Megabytes |
| `GB` | Gigabytes |
| `TB` | Terabytes |
| `PB` | Petabytes |

#### Examples

```typescript
MAX_UPLOAD: t.bytes().default('10MB'),
MEMORY_LIMIT: t.bytes().default('512MB'),
DISK_QUOTA: t.bytes().default('1GB'),
CONNECTION_BUFFER: t.bytes().default('64KB'),
```

---

### `t.cron()`

Validates cron expression syntax.

```typescript
t.cron(opts?: CronValidatorOptions): SchemaBuilder
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `allowSeconds` | `boolean` | `false` | Allow 6-field cron (with seconds) |
| `allowAliases` | `boolean` | `true` | Allow `@yearly`, `@monthly`, etc. |

#### Examples

```typescript
SCHEDULE: t.cron().required(),
// "0 * * * *" → valid (every hour)
// "*/15 * * * *" → valid (every 15 minutes)
// "0 0 1 * *" → valid (monthly)

BACKUP_CRON: t.cron({ allowSeconds: true }).default('0 2 * * *'),
// "0 0 2 * * *" → valid (seconds: 0, minute: 0, hour: 2)

YEARLY_REPORT: t.cron({ allowAliases: true }).default('@yearly'),
```

---

## Common Modifiers

These modifiers can be chained onto any validator.

### `.required()`

Makes the field required. This is the default behavior for all validators.

```typescript
PORT: t.number().required(),
```

If the variable is not set and has no default, a `ValidationError` is thrown.

### `.optional()`

Makes the field optional. The inferred type includes `undefined`.

```typescript
ADMIN_EMAIL: t.email().optional(),
// Type: string | undefined
```

### `.default(value)`

Sets a default value when the variable is not set.

```typescript
PORT: t.number().default(3000),
HOST: t.string().default('localhost'),
ENABLED: t.boolean().default(false),
NODE_ENV: t.enum(['development', 'production'] as const).default('development'),
```

The type is inferred from the default value — it will NOT include `undefined`.

### `.description(desc)`

Adds a human-readable description. Used in:
- JSDoc comments in generated `.d.ts` files
- Comments in generated `.env.example` files
- Help text in CLI output

```typescript
DATABASE_URL: t.string()
  .format('url')
  .description('Primary PostgreSQL connection string for the application')
  .required(),
```

### `.transform(fn)`

Transforms the value after parsing and validation.

```typescript
// Floor the port number
PORT: t.number()
  .transform(v => Math.floor(v))
  .default(3000),

// Normalize URL (remove trailing slash)
BASE_URL: t.string()
  .transform(v => v.replace(/\/$/, ''))
  .required(),

// Uppercase
REGION: t.string()
  .transform(v => v.toUpperCase())
  .default('us-east-1'),
```

### `.validate(fn)`

Adds custom validation logic. Return a string for an error message, or `undefined` to pass.

```typescript
PASSWORD: t.string()
  .minLength(12)
  .validate(v => {
    if (!/[A-Z]/.test(v)) return 'Must contain an uppercase letter';
    if (!/[a-z]/.test(v)) return 'Must contain a lowercase letter';
    if (!/[0-9]/.test(v)) return 'Must contain a number';
    if (!/[!@#$%^&*]/.test(v)) return 'Must contain a special character';
    return undefined;
  })
  .required(),

// Range validation on parsed value
PERCENTAGE: t.number()
  .validate(v => {
    if (v < 0 || v > 100) return 'Must be between 0 and 100';
  })
  .default(50),
```

### `.deprecated(msg)`

Marks the variable as deprecated. Generates warnings during validation.

```typescript
OLD_API_KEY: t.string()
  .deprecated('Use NEW_API_KEY instead — will be removed in v2.0')
  .optional(),

LEGACY_MODE: t.boolean()
  .deprecated('Legacy mode is deprecated. Use STANDARD_MODE instead.')
  .default(false),
```

### `.secret()`

Marks the variable as a secret. The value is masked in logs, scan output, and CLI display.

```typescript
DATABASE_PASSWORD: t.string().secret().required(),
JWT_SECRET: t.string().secret().required(),
API_KEY: t.string().secret().minLength(32).required(),
```

### `.alias(name)`

Provides an alternative variable name that will be checked if the primary name is not set.

```typescript
DB_URL: t.string()
  .alias('DATABASE_URL')
  .format('url')
  .required(),

// Checks process.env.DB_URL first, falls back to process.env.DATABASE_URL
```

### `.conditional(config)`

Applies different validation rules based on the values of other environment variables.

```typescript
STRIPE_KEY: t.string()
  .conditional({
    check: (env) => env.PAYMENT_PROVIDER === 'stripe',
    then: (schema) => schema.required().minLength(32),
    otherwise: (schema) => schema.optional(),
  }),

SSL_CERT: t.string()
  .conditional({
    check: (env) => env.SSL_ENABLED === 'true',
    then: (schema) => schema.required(),
    otherwise: (schema) => schema.optional(),
  }),
```

---

## Type Inference

ultraenv infers TypeScript types directly from your schema definition:

```typescript
const env = defineEnv({
  // string
  DATABASE_URL: t.string().format('url').required(),
  // → string

  // number
  PORT: t.number().port().default(3000),
  // → number (not string!)

  // boolean
  DEBUG: t.boolean().default(false),
  // → boolean

  // enum literal union
  NODE_ENV: t.enum(['development', 'staging', 'production'] as const).required(),
  // → 'development' | 'staging' | 'production'

  // optional
  ADMIN_EMAIL: t.email().optional(),
  // → string | undefined

  // array
  ALLOWED_ORIGINS: t.array().default(['http://localhost:3000']),
  // → readonly string[]

  // json
  CONFIG: t.json<{ theme: string }>().required(),
  // → { theme: string }

  // date
  CREATED_AT: t.date().required(),
  // → Date

  // bigint
  BIG_ID: t.bigint().required(),
  // → bigint
});

// TypeScript knows all the types:
env.DATABASE_URL;   // string
env.PORT;           // number
env.DEBUG;          // boolean
env.NODE_ENV;       // 'development' | 'staging' | 'production'
env.ADMIN_EMAIL;    // string | undefined
env.ALLOWED_ORIGINS; // readonly string[]
env.CONFIG;         // { theme: string }
env.CREATED_AT;     // Date
env.BIG_ID;         // bigint
```

---

## Error Handling

### defineEnv — Throws on Failure

```typescript
import { defineEnv, t } from 'ultraenv';

try {
  const env = defineEnv({
    PORT: t.number().port().required(),
    DATABASE_URL: t.string().format('url').required(),
  });
} catch (error) {
  // Error message includes all failures:
  // "Environment validation failed:
  //   - PORT: Expected a valid port number (1-65535), got "abc"
  //   - DATABASE_URL: Required but not set
  //   Unknown variables: NODE_ENV"
}
```

### tryDefineEnv — Non-Throwing

```typescript
import { tryDefineEnv, t } from 'ultraenv';

const result = tryDefineEnv({
  PORT: t.number().port().required(),
  DATABASE_URL: t.string().format('url').required(),
});

if (result.valid) {
  // TypeScript knows result.values is fully typed
  console.log(result.values.PORT);
  console.log(result.values.DATABASE_URL);
} else {
  // result.errors contains all validation errors
  for (const error of result.errors) {
    console.log(`${error.field}: ${error.message}`);
    console.log(`  Expected: ${error.expected}`);
    console.log(`  Hint: ${error.hint}`);
  }

  // result.unknown contains variables not in schema
  console.log('Unknown:', result.unknown);

  // result.warnings contains non-blocking warnings
  for (const warning of result.warnings) {
    console.log(`Warning: ${warning.field}: ${warning.message}`);
  }
}
```

### Error Properties

Each validation error includes:

| Property | Type | Description |
|---|---|---|
| `field` | `string` | Variable name |
| `value` | `string` | Actual value provided |
| `message` | `string` | Human-readable error |
| `expected` | `string` | What was expected |
| `hint` | `string` | How to fix it |
| `source` | `string?` | Source file |
| `lineNumber` | `number?` | Line number |
