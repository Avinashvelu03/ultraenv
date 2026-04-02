// =============================================================================
// ultraenv — Core Types
// Complete TypeScript type definitions for the entire ultraenv project.
// NO `any` types. Strict mode compatible.
// =============================================================================

// -----------------------------------------------------------------------------
// File Types & Enumerations
// -----------------------------------------------------------------------------

export enum EnvFileType {
  /** .env — Default, shared across all environments */
  Env = '.env',
  /** .env.local — Local overrides, gitignored by default */
  EnvLocal = '.env.local',
  /** .env.development — Development-specific */
  EnvDevelopment = '.env.development',
  /** .env.development.local — Local development overrides */
  EnvDevelopmentLocal = '.env.development.local',
  /** .env.test — Test-specific */
  EnvTest = '.env.test',
  /** .env.test.local — Local test overrides */
  EnvTestLocal = '.env.test.local',
  /** .env.production — Production-specific */
  EnvProduction = '.env.production',
  /** .env.production.local — Local production overrides */
  EnvProductionLocal = '.env.production.local',
  /** .env.staging — Staging-specific */
  EnvStaging = '.env.staging',
  /** .env.staging.local — Local staging overrides */
  EnvStagingLocal = '.env.staging.local',
  /** .env.ci — CI/CD-specific */
  EnvCI = '.env.ci',
}

export type MergeStrategy = 'first-wins' | 'last-wins' | 'error-on-conflict';

export type OutputFormat = 'terminal' | 'json' | 'silent';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

export interface UltraenvConfig {
  /** Directory to search for .env files (default: '.') */
  envDir: string;
  /** Which .env file variants to load (default: [EnvFileType.Env]) */
  files: readonly EnvFileType[];
  /** Character encoding for reading files (default: 'utf-8') */
  encoding: BufferEncoding;
  /** Whether to expand $VAR references (default: true) */
  expandVariables: boolean;
  /** Whether to overwrite existing process.env values (default: false) */
  overrideProcessEnv: boolean;
  /** Merge strategy when multiple files define the same key */
  mergeStrategy: MergeStrategy;
  /** Whether to prefix error messages with "ultraenv" */
  prefixErrors: boolean;
  /** Whether to silence all output (equivalent to OutputFormat.silent) */
  silent: boolean;
  /** Custom schema for validation */
  schema?: EnvSchema;
  /** Vault configuration */
  vault?: VaultConfig;
  /** Watch configuration */
  watch?: WatchOptions;
  /** Scan options for secret detection */
  scan?: ScanOptions;
  /** Output format */
  outputFormat: OutputFormat;
  /** Whether to log debug information */
  debug: boolean;
  /** Custom reporter for events */
  reporter?: Reporter;
  /** Maximum allowed value length in bytes (default: 1MB) */
  maxValueLength: number;
  /** Maximum variable interpolation depth (default: 10) */
  maxInterpolationDepth: number;
}

export interface LoadOptions {
  /** Override the env directory */
  envDir?: string;
  /** Override the list of files to load */
  files?: readonly EnvFileType[];
  /** Override the encoding */
  encoding?: BufferEncoding;
  /** Whether to expand variables */
  expandVariables?: boolean;
  /** Whether to override process.env */
  overrideProcessEnv?: boolean;
  /** Merge strategy */
  mergeStrategy?: MergeStrategy;
  /** Schema for validation */
  schema?: EnvSchema;
  /** Whether to silence output */
  silent?: boolean;
  /** Maximum interpolation depth */
  maxInterpolationDepth?: number;
  /** Maximum value length */
  maxValueLength?: number;
  /** Process env to merge with (defaults to process.env) */
  processEnv?: Record<string, string | undefined>;
}

// -----------------------------------------------------------------------------
// Parsed Environment Variables & Files
// -----------------------------------------------------------------------------

export interface ParsedEnvVar {
  /** The variable name (key) */
  key: string;
  /** The resolved/interpolated value */
  value: string;
  /** The raw value as-is from the file (before interpolation) */
  raw: string;
  /** Which file this variable came from */
  source: string;
  /** 1-based line number in the source file */
  lineNumber: number;
  /** Any inline comment after the value */
  comment: string;
}

export interface ParsedEnvFile {
  /** Absolute path to the .env file */
  path: string;
  /** All parsed variables from this file */
  vars: readonly ParsedEnvVar[];
  /** Whether the file exists on disk */
  exists: boolean;
}

// -----------------------------------------------------------------------------
// Load Result
// -----------------------------------------------------------------------------

export interface LoadResult {
  /** The final merged env key-value pairs */
  env: Record<string, string>;
  /** Metadata about the load operation */
  metadata: LoadMetadata;
  /** All parsed files with their contents */
  parsed: readonly ParsedEnvFile[];
  /** Validation results, if a schema was provided */
  validation?: ValidationResult;
}

export interface LoadMetadata {
  /** Total number of variables loaded */
  totalVars: number;
  /** Number of files successfully parsed */
  filesParsed: number;
  /** Number of files that existed */
  filesFound: number;
  /** Wall-clock time for the load operation in ms */
  loadTimeMs: number;
  /** Timestamp when the load was performed */
  timestamp: string;
  /** Environment directory used */
  envDir: string;
  /** Whether any overrides occurred (existing keys overwritten) */
  hadOverrides: boolean;
}

// -----------------------------------------------------------------------------
// Schema System
// -----------------------------------------------------------------------------

export type SchemaDefinition = Record<string, StringSchema | NumberSchema | BooleanSchema | EnumSchema<string[]> | ArraySchema | JsonSchema | DateSchema | BigIntSchema>;

/** Base schema shape shared by all types */
export interface BaseSchema<T> {
  /** Human-readable description for documentation */
  description?: string;
  /** If true, the variable is optional (defaults to false) */
  optional?: boolean;
  /** Default value when the variable is not set */
  default?: T;
  /** Transform function applied after parsing */
  transform?: (value: T) => T;
  /** Custom validation function — return a string for error message, or void/undefined for pass */
  validate?: (value: T) => string | undefined;
  /** Deprecation message, if set this variable is deprecated */
  deprecated?: string;
}

export interface StringSchema extends BaseSchema<string> {
  type: 'string';
  /** Minimum string length */
  minLength?: number;
  /** Maximum string length */
  maxLength?: number;
  /** Regex pattern the value must match */
  pattern?: RegExp;
  /** Predefined format shortcut (e.g., 'email', 'url', 'uuid') */
  format?: 'email' | 'url' | 'uuid' | 'hostname' | 'ip' | 'ipv4' | 'ipv6';
  /** Allowed values (enum shorthand) */
  enum?: readonly string[];
  /** Trim whitespace before validation */
  trim?: boolean;
}

export interface NumberSchema extends BaseSchema<number> {
  type: 'number';
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Value must be an integer */
  integer?: boolean;
  /** Value must be positive (> 0) */
  positive?: boolean;
  /** Value must be negative (< 0) */
  negative?: boolean;
  /** Value must be non-negative (>= 0) */
  nonNegative?: boolean;
  /** Value cannot be NaN or Infinity */
  finite?: boolean;
  /** Custom parsing function */
  parse?: (raw: string) => number;
}

export interface BooleanSchema extends BaseSchema<boolean> {
  type: 'boolean';
  /** Custom truthy values (default: ['true', '1', 'yes']) */
  truthy?: readonly string[];
  /** Custom falsy values (default: ['false', '0', 'no']) */
  falsy?: readonly string[];
}

export interface EnumSchema<T extends readonly string[]> extends BaseSchema<T[number]> {
  type: 'enum';
  /** Allowed values */
  values: T;
  /** Whether matching is case-insensitive (default: false) */
  caseInsensitive?: boolean;
}

export interface ArraySchema extends BaseSchema<readonly string[]> {
  type: 'array';
  /** Separator to split the value on (default: ',') */
  separator?: string;
  /** Trim each item after splitting */
  trimItems?: boolean;
  /** Remove empty strings from the result */
  filterEmpty?: boolean;
  /** Minimum number of items */
  minItems?: number;
  /** Maximum number of items */
  maxItems?: number;
  /** Unique items only */
  unique?: boolean;
  /** Schema to validate each item against */
  itemSchema?: BaseSchema<string>;
}

export interface JsonSchema<T = unknown> extends BaseSchema<T> {
  type: 'json';
  /** Custom reviver for JSON.parse */
  reviver?: (key: string, value: unknown) => unknown;
}

export interface DateSchema extends BaseSchema<Date> {
  type: 'date';
  /** Custom date format string or parsing function */
  format?: string;
  /** Custom parse function */
  parse?: (raw: string) => Date;
  /** Minimum date */
  min?: Date;
  /** Maximum date */
  max?: Date;
}

export interface BigIntSchema extends BaseSchema<bigint> {
  type: 'bigint';
  /** Radix for parsing (default: 10) */
  radix?: number;
  /** Custom parse function */
  parse?: (raw: string) => bigint;
  /** Minimum value */
  min?: bigint;
  /** Maximum value */
  max?: bigint;
}

export interface EnvSchema {
  /** Schema definitions keyed by variable name */
  definitions: SchemaDefinition;
  /** Whether to strip unknown variables (default: false) */
  strict?: boolean;
  /** Whether to allow extra variables not in the schema (inverse of strict) */
  allowExtra?: boolean;
}

// -----------------------------------------------------------------------------
// Schema Builder Types (for ergonomic API)
// -----------------------------------------------------------------------------

export type SchemaType = StringSchema['type'] | NumberSchema['type'] | BooleanSchema['type'] | EnumSchema<string[]>['type'] | ArraySchema['type'] | JsonSchema['type'] | DateSchema['type'] | BigIntSchema['type'];

export interface SchemaBuilderBase<T> {
  /** Add a description */
  description(desc: string): this;
  /** Make this field optional */
  optional(): this & { __optional: true };
  /** Set a default value */
  default(value: T): this;
  /** Add a transform */
  transform(fn: (value: T) => T): this;
  /** Add custom validation */
  validate(fn: (value: T) => string | undefined): this;
  /** Mark as deprecated */
  deprecated(message: string): this;
}

export interface StringSchemaBuilder extends SchemaBuilderBase<string> {
  minLength(n: number): this;
  maxLength(n: number): this;
  pattern(regex: RegExp): this;
  format(fmt: StringSchema['format']): this;
  enum(values: readonly string[]): this;
  trim(enabled?: boolean): this;
}

export interface NumberSchemaBuilder extends SchemaBuilderBase<number> {
  min(n: number): this;
  max(n: number): this;
  integer(): this;
  positive(): this;
  negative(): this;
  nonNegative(): this;
  finite(): this;
  parse(fn: (raw: string) => number): this;
}

export interface BooleanSchemaBuilder extends SchemaBuilderBase<boolean> {
  truthy(values: readonly string[]): this;
  falsy(values: readonly string[]): this;
}

export interface EnumSchemaBuilder<T extends readonly string[]> extends SchemaBuilderBase<T[number]> {
  caseInsensitive(enabled?: boolean): this;
}

export interface ArraySchemaBuilder extends SchemaBuilderBase<readonly string[]> {
  separator(sep: string): this;
  trimItems(enabled?: boolean): this;
  filterEmpty(enabled?: boolean): this;
  minItems(n: number): this;
  maxItems(n: number): this;
  unique(): this;
  itemSchema(schema: BaseSchema<string>): this;
}

export interface JsonSchemaBuilder<T = unknown> extends SchemaBuilderBase<T> {
  reviver(fn: (key: string, value: unknown) => unknown): this;
}

export interface DateSchemaBuilder extends SchemaBuilderBase<Date> {
  format(fmt: string): this;
  parse(fn: (raw: string) => Date): this;
  min(date: Date): this;
  max(date: Date): this;
}

export interface BigIntSchemaBuilder extends SchemaBuilderBase<bigint> {
  radix(r: number): this;
  parse(fn: (raw: string) => bigint): this;
  min(value: bigint): this;
  max(value: bigint): this;
}

// -----------------------------------------------------------------------------
// InferEnv — Extract typed interface from schema definition
// -----------------------------------------------------------------------------

/** Infer the base JS type from a schema definition entry */
type InferTypeFromSchema<S> =
  S extends StringSchema ? string :
  S extends NumberSchema ? number :
  S extends BooleanSchema ? boolean :
  S extends EnumSchema<infer T> ? T extends readonly (infer U)[] ? U : never :
  S extends ArraySchema ? readonly string[] :
  S extends JsonSchema<infer T> ? T :
  S extends DateSchema ? Date :
  S extends BigIntSchema ? bigint :
  never;

/** Resolves the value type: default | inferred | undefined for optional */
type ResolveValue<S> =
  S extends { optional: true } ? InferTypeFromSchema<S> | undefined :
  S extends { default: infer D } ? D :
  InferTypeFromSchema<S>;

/** Main type utility: infer an env object from a schema definition */
export type InferEnv<T extends SchemaDefinition> = {
  readonly [K in keyof T]: ResolveValue<T[K]>;
};

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

export interface ValidationResult {
  /** Whether all validations passed */
  valid: boolean;
  /** All validation errors */
  errors: readonly ValidationError[];
  /** All validation warnings (non-blocking) */
  warnings: readonly ValidationWarning[];
  /** Variables that passed validation */
  validated: Record<string, unknown>;
  /** Unknown variables not in schema (when strict mode) */
  unknown: readonly string[];
}

export interface ValidationError {
  /** The variable name */
  field: string;
  /** The actual value that failed validation */
  value: string;
  /** Human-readable error message */
  message: string;
  /** Actionable hint for fixing the error */
  hint: string;
  /** The schema that was violated */
  schema: BaseSchema<unknown>;
  /** The expected type or constraint */
  expected: string;
  /** Source file, if applicable */
  source?: string;
  /** Line number, if applicable */
  lineNumber?: number;
}

export interface ValidationWarning {
  /** The variable name */
  field: string;
  /** The value that triggered the warning */
  value: string;
  /** Warning message */
  message: string;
  /** Warning code for programmatic handling */
  code: string;
}

// -----------------------------------------------------------------------------
// Vault & Encryption
// -----------------------------------------------------------------------------

export interface VaultConfig {
  /** Path to the vault file (default: '.env.vault') */
  vaultFile: string;
  /** Path to the keys file (default: '.env.keys') */
  keysFile: string;
  /** Current environment name (e.g., 'development', 'production') */
  environment: string;
  /** Master encryption key (if not using keys file) */
  masterKey?: string;
  /** Whether to auto-generate a key if none exists */
  autoGenerateKey: boolean;
}

export interface VaultStatus {
  /** Whether the vault file exists */
  vaultExists: boolean;
  /** Whether the keys file exists */
  keysExists: boolean;
  /** Whether the vault is properly encrypted */
  encrypted: boolean;
  /** Available environments in the vault */
  environments: readonly VaultEnvironment[];
  /** Current active environment */
  currentEnvironment: string;
}

export interface VaultEnvironment {
  /** Environment name */
  name: string;
  /** Number of encrypted variables */
  varCount: number;
  /** ISO timestamp of last modification */
  lastModified: string;
  /** Which keys are available for this environment */
  keyIds: readonly string[];
}

export interface EncryptionResult {
  /** Initialization vector */
  iv: Buffer;
  /** Authentication tag (for AEAD modes like AES-GCM) */
  authTag: Buffer;
  /** Encrypted ciphertext */
  ciphertext: Buffer;
  /** Algorithm used (e.g., 'aes-256-gcm') */
  algorithm: string;
}

// -----------------------------------------------------------------------------
// Secret Scanning
// -----------------------------------------------------------------------------

export interface ScanOptions {
  /** Files/patterns to include */
  include: readonly string[];
  /** Files/patterns to exclude */
  exclude: readonly string[];
  /** Whether to scan git history (more thorough but slower) */
  scanGitHistory: boolean;
  /** Maximum file size to scan in bytes (default: 1MB) */
  maxFileSize: number;
  /** Custom secret patterns to match */
  customPatterns?: readonly SecretPattern[];
  /** Whether to include default patterns */
  includeDefaults: boolean;
  /** Whether to stop on first match */
  failFast: boolean;
}

export interface ScanResult {
  /** Whether any secrets were detected */
  found: boolean;
  /** All detected secrets */
  secrets: readonly DetectedSecret[];
  /** Files that were scanned */
  filesScanned: readonly string[];
  /** Files that were skipped (binary, too large, etc.) */
  filesSkipped: readonly string[];
  /** Wall-clock time for the scan in ms */
  scanTimeMs: number;
  /** Timestamp of the scan */
  timestamp: string;
}

export interface DetectedSecret {
  /** The type of secret detected */
  type: string;
  /** The full matched string (masked) */
  value: string;
  /** The file where it was detected */
  file: string;
  /** Line number (1-based) */
  line: number;
  /** Column number (1-based) */
  column: number;
  /** The pattern that matched */
  pattern: SecretPattern;
  /** Confidence score (0-1) */
  confidence: number;
  /** The variable name, if the secret is in a .env file */
  varName?: string;
}

export interface SecretPattern {
  /** Human-readable name (e.g., 'AWS Access Key') */
  name: string;
  /** Unique identifier */
  id: string;
  /** Regex pattern to match */
  pattern: RegExp;
  /** Confidence score (0-1) for this pattern */
  confidence: number;
  /** Description of what this pattern detects */
  description: string;
  /** Recommended remediation */
  remediation: string;
  /** Severity level: critical, high, or medium */
  severity: 'critical' | 'high' | 'medium';
  /** Category for grouping (e.g., 'aws', 'github', 'database') */
  category: string;
}

// -----------------------------------------------------------------------------
// Sync
// -----------------------------------------------------------------------------

export interface SyncResult {
  /** Whether the sync was successful */
  success: boolean;
  /** Differences detected */
  diffs: readonly SyncDiff[];
  /** Number of variables added */
  added: number;
  /** Number of variables removed */
  removed: number;
  /** Number of variables changed */
  changed: number;
  /** Number of variables unchanged */
  unchanged: number;
  /** Source environment name */
  source: string;
  /** Target environment name */
  target: string;
}

export interface SyncDiff {
  /** The variable name */
  key: string;
  /** Type of difference */
  type: 'added' | 'removed' | 'changed';
  /** Value in the source (masked) */
  sourceValue: string;
  /** Value in the target (masked) */
  targetValue: string;
}

// -----------------------------------------------------------------------------
// Type Generation
// -----------------------------------------------------------------------------

export interface TypegenOptions {
  /** Output file path for generated .d.ts */
  outFile: string;
  /** Interface name (default: 'UltraenvEnv') */
  interfaceName: string;
  /** Whether to export as default */
  exportAsDefault: boolean;
  /** Whether to make it a const assertion */
  constAssertion: boolean;
  /** Custom header comment */
  header?: string;
  /** Whether to generate JSDoc comments from schema descriptions */
  jsdoc: boolean;
  /** Indentation (spaces) */
  indent: number;
}

// -----------------------------------------------------------------------------
// Watch
// -----------------------------------------------------------------------------

export interface WatchOptions {
  /** Files/patterns to watch */
  files: readonly string[];
  /** Whether to watch recursively */
  recursive: boolean;
  /** Debounce interval in ms (default: 100) */
  debounceMs: number;
  /** Whether to trigger on initial load */
  initial: boolean;
  /** Polling interval in ms (0 = use native fs.watch) */
  pollIntervalMs: number;
  /** Ignore patterns */
  ignore: readonly string[];
}

export interface Watcher {
  /** Start watching */
  start(): void;
  /** Stop watching */
  stop(): void;
  /** Whether the watcher is currently active */
  readonly active: boolean;
  /** Register a callback for file changes */
  on(event: 'change' | 'error' | 'ready', callback: WatcherCallback): Watcher;
  /** Remove a callback */
  off(event: 'change' | 'error' | 'ready', callback: WatcherCallback): Watcher;
}

export type WatcherCallback = (event: WatcherEvent) => void;

export interface WatcherEvent {
  /** Type of file system event */
  type: 'add' | 'change' | 'unlink' | 'rename';
  /** The file path that triggered the event */
  path: string;
  /** Timestamp of the event */
  timestamp: number;
}

// -----------------------------------------------------------------------------
// Presets
// -----------------------------------------------------------------------------

export interface Preset {
  /** Unique preset identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this preset configures */
  description: string;
  /** Schema definitions for this preset */
  schema: SchemaDefinition;
  /** Recommended .env file variants */
  files: readonly EnvFileType[];
  /** Recommended vault settings */
  vault?: Partial<VaultConfig>;
  /** Tags for categorization */
  tags: readonly string[];
}

// -----------------------------------------------------------------------------
// Reporter
// -----------------------------------------------------------------------------

export interface Reporter {
  /** Report a successfully loaded variable */
  varLoaded(key: string, source: string): void;
  /** Report a validation error */
  varError(error: ValidationError): void;
  /** Report a validation warning */
  varWarning(warning: ValidationWarning): void;
  /** Report a file being loaded */
  fileLoaded(path: string, varCount: number): void;
  /** Report a file that was not found */
  fileNotFound(path: string): void;
  /** Report the beginning of a load operation */
  loadStart(config: UltraenvConfig): void;
  /** Report the end of a load operation */
  loadEnd(result: LoadResult): void;
  /** Report a secret detection */
  secretDetected(secret: DetectedSecret): void;
  /** Report a sync operation */
  syncResult(result: SyncResult): void;
  /** Report a watch event */
  watchEvent(event: WatcherEvent): void;
  /** Report debug information */
  debug(message: string, metadata?: Record<string, unknown>): void;
}

// -----------------------------------------------------------------------------
// Utility Types
// -----------------------------------------------------------------------------

/** Make all properties in T required */
export type RequiredFields<T> = {
  [K in keyof T]-?: T[K];
};

/** Make specific keys optional */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Deep partial — recurse into nested objects */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/** Extract keys of T whose values are assignable to U */
export type KeysMatching<T, U> = {
  [K in keyof T]-?: T[K] extends U ? K : never;
}[keyof T];

/** A readonly version of Record */
export type ReadonlyRecord<K extends string, V> = Readonly<{ readonly [key in K]: V }>;

/** Prettify — expand a type for better IDE hover display */
export type Prettify<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;
