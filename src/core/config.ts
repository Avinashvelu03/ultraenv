// =============================================================================
// ultraenv — Configuration Loader
// Reads and validates ultraenv configuration from multiple file formats.
// =============================================================================

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { UltraenvConfig, MergeStrategy, OutputFormat, EnvFileType } from './types.js';
import { DEFAULT_ENV_DIR, ENCODING, MAX_INTERPOLATION_DEPTH, MAX_VALUE_LENGTH } from './constants.js';
import { ConfigError } from './errors.js';
import { findUpSync } from '../utils/fs.js';

// -----------------------------------------------------------------------------
// Config File Names (searched in order, first match wins)
// -----------------------------------------------------------------------------

const CONFIG_FILE_NAMES: readonly string[] = [
  '.ultraenvrc.json',
  '.ultraenvrc.yaml',
  '.ultraenvrc.yml',
  'ultraenv.config.js',
  'ultraenv.config.cjs',
] as const;

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

/**
 * The default UltraenvConfig with all required fields populated.
 */
export const DEFAULT_CONFIG: UltraenvConfig = {
  envDir: DEFAULT_ENV_DIR,
  files: [],
  encoding: ENCODING,
  expandVariables: true,
  overrideProcessEnv: false,
  mergeStrategy: 'last-wins' as MergeStrategy,
  prefixErrors: true,
  silent: false,
  outputFormat: 'terminal' as OutputFormat,
  debug: false,
  maxValueLength: MAX_VALUE_LENGTH,
  maxInterpolationDepth: MAX_INTERPOLATION_DEPTH,
};

// -----------------------------------------------------------------------------
// Raw Config (before validation/normalization)
// -----------------------------------------------------------------------------

/** Shape of the JSON/YAML config file before normalization */
interface RawConfigFile {
  envDir?: string;
  files?: string[];
  encoding?: string;
  expandVariables?: boolean;
  overrideProcessEnv?: boolean;
  mergeStrategy?: string;
  prefixErrors?: boolean;
  silent?: boolean;
  outputFormat?: string;
  debug?: boolean;
  maxValueLength?: number;
  maxInterpolationDepth?: number;
  schema?: unknown;
  vault?: unknown;
  watch?: unknown;
  scan?: unknown;
  reporter?: unknown;
}

// -----------------------------------------------------------------------------
// Find Config File
// -----------------------------------------------------------------------------

/**
 * Search for an ultraenv configuration file starting from `cwd`
 * and walking up the directory tree.
 *
 * Searches for (in order):
 * - .ultraenvrc.json
 * - .ultraenvrc.yaml
 * - .ultraenvrc.yml
 * - ultraenv.config.js
 * - ultraenv.config.cjs
 * - "ultraenv" key in package.json
 *
 * @param cwd - Starting directory (default: process.cwd())
 * @returns Absolute path to the config file, or null if none found
 */
export function findConfig(cwd?: string): string | null {
  const startDir = resolve(cwd ?? process.cwd());

  for (const fileName of CONFIG_FILE_NAMES) {
    const found = findUpSync(fileName, startDir);
    if (found !== null) {
      return found;
    }
  }

  // Check for "ultraenv" key in package.json
  const pkgJson = findUpSync('package.json', startDir);
  if (pkgJson !== null) {
    try {
      const content = readFileSync(pkgJson, 'utf-8');
      const pkg = JSON.parse(content) as Record<string, unknown>;
      if (pkg.ultraenv !== undefined && pkg.ultraenv !== null && typeof pkg.ultraenv === 'object') {
        return pkgJson;
      }
    } catch {
      // Ignore parse errors
    }
  }

  return null;
}

// -----------------------------------------------------------------------------
// Load Config
// -----------------------------------------------------------------------------

/**
 * Load and validate ultraenv configuration from a file.
 *
 * @param configPath - Explicit path to a config file. If not provided,
 *                     auto-discovers using findConfig().
 * @returns The fully resolved and validated UltraenvConfig
 * @throws ConfigError if the config file is invalid or cannot be read
 */
export function loadConfig(configPath?: string): UltraenvConfig {
  const resolvedPath = configPath ?? findConfig();

  if (resolvedPath === null) {
    return { ...DEFAULT_CONFIG };
  }

  const baseName = resolvedPath.split('/').pop() ?? resolvedPath;
  const ext = getExtension(baseName);

  let rawConfig: RawConfigFile;

  if (baseName === 'package.json') {
    rawConfig = loadFromPackageJson(resolvedPath);
  } else if (ext === '.json') {
    rawConfig = loadFromJson(resolvedPath);
  } else if (ext === '.yaml' || ext === '.yml') {
    rawConfig = loadFromYaml(resolvedPath);
  } else if (ext === '.js' || ext === '.cjs') {
    rawConfig = loadFromJs(resolvedPath);
  } else {
    return { ...DEFAULT_CONFIG };
  }

  return normalizeConfig(rawConfig, resolvedPath);
}

// -----------------------------------------------------------------------------
// File Format Loaders
// -----------------------------------------------------------------------------

/**
 * Load config from a JSON file.
 */
function loadFromJson(filePath: string): RawConfigFile {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as RawConfigFile;
  } catch (error: unknown) {
    throw new ConfigError(`Failed to parse JSON config file "${filePath}"`, {
      field: 'config',
      cause: error instanceof Error ? error : undefined,
      hint: 'Ensure the JSON file is valid. Check for trailing commas or missing quotes.',
    });
  }
}

/**
 * Load config from a YAML file (simple parser, no external dependency).
 * Supports basic YAML: key-value pairs, strings, numbers, booleans, arrays, nesting.
 */
function loadFromYaml(filePath: string): RawConfigFile {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return parseSimpleYaml(content) as RawConfigFile;
  } catch (error: unknown) {
    if (error instanceof ConfigError) throw error;
    throw new ConfigError(`Failed to parse YAML config file "${filePath}"`, {
      field: 'config',
      cause: error instanceof Error ? error : undefined,
      hint: 'Ensure the YAML file is valid. For advanced YAML features, consider using JSON format instead.',
    });
  }
}

/**
 * Load config from a JS/CJS file.
 * Requires the file to export a default object or module.exports.
 */
function loadFromJs(filePath: string): RawConfigFile {
  try {
    // Dynamic import for ESM, require() fallback for CJS
    // Since we're in Node, use a simplified approach
    const content = readFileSync(filePath, 'utf-8');

    // For .js files, try to evaluate as CommonJS module.exports
    if (filePath.endsWith('.cjs')) {
      // Use Function constructor for .cjs (safer than eval)
      const moduleExports: Record<string, unknown> = {};
      const factory = new Function('module', 'exports', content);
      factory(moduleExports, moduleExports);
      return (moduleExports.exports ?? moduleExports) as RawConfigFile;
    }

    // For .js files, try CJS-style
    const moduleExports: Record<string, unknown> = {};
    const factory = new Function('module', 'exports', content);
    factory(moduleExports, moduleExports);
    return (moduleExports.exports ?? moduleExports) as RawConfigFile;
  } catch (error: unknown) {
    throw new ConfigError(`Failed to load JS config file "${filePath}"`, {
      field: 'config',
      cause: error instanceof Error ? error : undefined,
      hint: 'Ensure the JS file exports a configuration object. Use module.exports = { ... } for CommonJS.',
    });
  }
}

/**
 * Load the "ultraenv" key from package.json.
 */
function loadFromPackageJson(filePath: string): RawConfigFile {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const pkg = JSON.parse(content) as Record<string, unknown>;
    const ultraenv = pkg.ultraenv;

    if (ultraenv === undefined || ultraenv === null || typeof ultraenv !== 'object') {
      throw new ConfigError(`"ultraenv" key in package.json is not an object`, {
        field: 'ultraenv',
        hint: 'Add an "ultraenv" key with your configuration to package.json.',
      });
    }

    return ultraenv as RawConfigFile;
  } catch (error: unknown) {
    if (error instanceof ConfigError) throw error;
    throw new ConfigError(`Failed to parse package.json "${filePath}"`, {
      field: 'config',
      cause: error instanceof Error ? error : undefined,
    });
  }
}

// -----------------------------------------------------------------------------
// Config Normalization & Validation
// -----------------------------------------------------------------------------

/**
 * Normalize a raw config object into a validated UltraenvConfig.
 * Merges with defaults and validates all fields.
 */
function normalizeConfig(raw: RawConfigFile, filePath: string): UltraenvConfig {
  const config: UltraenvConfig = { ...DEFAULT_CONFIG };

  // envDir
  if (raw.envDir !== undefined && typeof raw.envDir === 'string') {
    config.envDir = raw.envDir;
    if (!isValidDirectory(config.envDir)) {
      throw new ConfigError(`Invalid envDir: "${config.envDir}"`, {
        field: 'envDir',
        hint: 'envDir must be a valid directory path.',
      });
    }
  }

  // files
  if (raw.files !== undefined && Array.isArray(raw.files)) {
    const validFiles: EnvFileType[] = [];
    for (const f of raw.files) {
      if (typeof f === 'string' && isValidEnvFile(f)) {
        validFiles.push(f as EnvFileType);
      } else {
        throw new ConfigError(`Invalid file type "${String(f)}" in files array`, {
          field: 'files',
          hint: 'Each entry must be a valid .env file variant (e.g., ".env", ".env.local", ".env.production").',
        });
      }
    }
    config.files = validFiles;
  }

  // encoding
  if (raw.encoding !== undefined && typeof raw.encoding === 'string') {
    config.encoding = raw.encoding as BufferEncoding;
    if (!isValidEncoding(config.encoding)) {
      throw new ConfigError(`Invalid encoding: "${config.encoding}"`, {
        field: 'encoding',
        hint: 'Supported encodings: utf-8, utf-16le, utf-16be, ascii, latin1, binary.',
      });
    }
  }

  // expandVariables
  if (raw.expandVariables !== undefined) {
    config.expandVariables = Boolean(raw.expandVariables);
  }

  // overrideProcessEnv
  if (raw.overrideProcessEnv !== undefined) {
    config.overrideProcessEnv = Boolean(raw.overrideProcessEnv);
  }

  // mergeStrategy
  if (raw.mergeStrategy !== undefined && typeof raw.mergeStrategy === 'string') {
    const validStrategies = ['first-wins', 'last-wins', 'error-on-conflict'];
    if (validStrategies.includes(raw.mergeStrategy)) {
      config.mergeStrategy = raw.mergeStrategy as MergeStrategy;
    } else {
      throw new ConfigError(`Invalid mergeStrategy: "${raw.mergeStrategy}"`, {
        field: 'mergeStrategy',
        hint: 'Must be one of: "first-wins", "last-wins", "error-on-conflict".',
      });
    }
  }

  // prefixErrors
  if (raw.prefixErrors !== undefined) {
    config.prefixErrors = Boolean(raw.prefixErrors);
  }

  // silent
  if (raw.silent !== undefined) {
    config.silent = Boolean(raw.silent);
  }

  // outputFormat
  if (raw.outputFormat !== undefined && typeof raw.outputFormat === 'string') {
    const validFormats = ['terminal', 'json', 'silent'];
    if (validFormats.includes(raw.outputFormat)) {
      config.outputFormat = raw.outputFormat as OutputFormat;
    } else {
      throw new ConfigError(`Invalid outputFormat: "${raw.outputFormat}"`, {
        field: 'outputFormat',
        hint: 'Must be one of: "terminal", "json", "silent".',
      });
    }
  }

  // debug
  if (raw.debug !== undefined) {
    config.debug = Boolean(raw.debug);
  }

  // maxValueLength
  if (raw.maxValueLength !== undefined && typeof raw.maxValueLength === 'number') {
    if (raw.maxValueLength > 0 && Number.isFinite(raw.maxValueLength)) {
      config.maxValueLength = raw.maxValueLength;
    } else {
      throw new ConfigError(`Invalid maxValueLength: ${raw.maxValueLength}`, {
        field: 'maxValueLength',
        hint: 'maxValueLength must be a positive finite number.',
      });
    }
  }

  // maxInterpolationDepth
  if (raw.maxInterpolationDepth !== undefined && typeof raw.maxInterpolationDepth === 'number') {
    if (raw.maxInterpolationDepth > 0 && Number.isInteger(raw.maxInterpolationDepth)) {
      config.maxInterpolationDepth = raw.maxInterpolationDepth;
    } else {
      throw new ConfigError(`Invalid maxInterpolationDepth: ${raw.maxInterpolationDepth}`, {
        field: 'maxInterpolationDepth',
        hint: 'maxInterpolationDepth must be a positive integer.',
      });
    }
  }

  // schema — stored as-is (validated by the schema module)
  if (raw.schema !== undefined) {
    config.schema = raw.schema as UltraenvConfig['schema'];
  }

  // vault — stored as-is (validated by the vault module)
  if (raw.vault !== undefined) {
    config.vault = raw.vault as UltraenvConfig['vault'];
  }

  // watch — stored as-is (validated by the watcher module)
  if (raw.watch !== undefined) {
    config.watch = raw.watch as UltraenvConfig['watch'];
  }

  // scan — stored as-is (validated by the scan module)
  if (raw.scan !== undefined) {
    config.scan = raw.scan as UltraenvConfig['scan'];
  }

  // Resolve envDir relative to config file location
  if (filePath && config.envDir) {
    const configDir = resolve(filePath, '..');
    const resolvedDir = resolve(configDir, config.envDir);
    if (existsSync(resolvedDir)) {
      config.envDir = resolvedDir;
    }
  }

  return config;
}

// -----------------------------------------------------------------------------
// Simple YAML Parser (no external dependency)
// -----------------------------------------------------------------------------

/**
 * A minimal YAML parser that handles the subset of YAML used in config files.
 * Supports: key-value pairs, strings, numbers, booleans, arrays, nesting.
 */
function parseSimpleYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split('\n');
  const stack: { obj: Record<string, unknown>; indent: number }[] = [{ obj: result, indent: -1 }];

  for (const rawLine of lines) {
    const trimmed = rawLine.trimStart();
    const indent = rawLine.length - trimmed.length;

    // Skip empty lines and comments
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    // Determine the current level in the stack
    while (stack.length > 1 && stack[stack.length - 1]!.indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1]!;

    // Parse key: value
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const afterColon = trimmed.slice(colonIdx + 1).trim();

    if (afterColon === '' || afterColon.startsWith('#')) {
      // Nested object follows
      const newObj: Record<string, unknown> = {};
      parent.obj[key] = newObj;
      stack.push({ obj: newObj, indent });
    } else if (afterColon.startsWith('[')) {
      // Array value
      const arrayMatch = afterColon.match(/^\[(.*)\]$/s);
      if (arrayMatch !== null) {
        parent.obj[key] = parseYamlInlineArray(arrayMatch[1]!);
      } else {
        parent.obj[key] = afterColon;
      }
    } else if (afterColon.startsWith('{')) {
      // Inline object
      parent.obj[key] = parseYamlInlineObject(afterColon);
    } else if (afterColon.startsWith('|') || afterColon.startsWith('>')) {
      // Multi-line string (simplified — just grab the rest)
      parent.obj[key] = '';
    } else {
      parent.obj[key] = parseYamlScalar(afterColon);
    }
  }

  return result;
}

/**
 * Parse a YAML scalar value (string, number, boolean, null).
 */
function parseYamlScalar(value: string): string | number | boolean | null {
  // Remove inline comments
  const commentIdx = value.indexOf(' #');
  const cleanValue = commentIdx >= 0 ? value.slice(0, commentIdx).trim() : value.trim();

  if (cleanValue === '') return '';

  // Boolean
  if (cleanValue === 'true' || cleanValue === 'True' || cleanValue === 'TRUE') return true;
  if (cleanValue === 'false' || cleanValue === 'False' || cleanValue === 'FALSE') return false;

  // Null
  if (cleanValue === 'null' || cleanValue === 'Null' || cleanValue === 'NULL' || cleanValue === '~') return null;

  // Number
  if (/^-?\d+$/.test(cleanValue)) return parseInt(cleanValue, 10);
  if (/^-?\d+\.\d+$/.test(cleanValue)) return parseFloat(cleanValue);

  // Quoted string
  if ((cleanValue.startsWith('"') && cleanValue.endsWith('"')) ||
      (cleanValue.startsWith("'") && cleanValue.endsWith("'"))) {
    return cleanValue.slice(1, -1);
  }

  // Plain string
  return cleanValue;
}

/**
 * Parse an inline YAML array like [item1, item2, item3].
 */
function parseYamlInlineArray(content: string): string[] {
  const trimmed = content.trim();
  if (trimmed === '') return [];
  return trimmed.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
}

/**
 * Parse an inline YAML object like {key: value, key2: value2}.
 */
function parseYamlInlineObject(content: string): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  const trimmed = content.trim().replace(/^\{|\}$/g, '');
  if (trimmed === '') return obj;

  const pairs = splitYamlObjectPairs(trimmed);
  for (const pair of pairs) {
    const colonIdx = pair.indexOf(':');
    if (colonIdx === -1) continue;
    const key = pair.slice(0, colonIdx).trim();
    const value = pair.slice(colonIdx + 1).trim();
    obj[key] = parseYamlScalar(value);
  }

  return obj;
}

/**
 * Split YAML object pairs respecting nested braces.
 */
function splitYamlObjectPairs(content: string): string[] {
  const pairs: string[] = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]!;
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') depth--;

    if (ch === ',' && depth === 0) {
      pairs.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }

  if (current.trim()) pairs.push(current.trim());
  return pairs;
}

// -----------------------------------------------------------------------------
// Validation Helpers
// -----------------------------------------------------------------------------

/**
 * Get the file extension (lowercase, including the dot).
 */
function getExtension(fileName: string): string {
  const dotIdx = fileName.lastIndexOf('.');
  if (dotIdx === -1) return '';
  return fileName.slice(dotIdx).toLowerCase();
}

/**
 * Check if a directory path is valid (non-empty string).
 */
function isValidDirectory(dir: string): boolean {
  return typeof dir === 'string' && dir.length > 0;
}

/**
 * Check if a string is a valid .env file name.
 */
function isValidEnvFile(file: string): boolean {
  return typeof file === 'string' && file.startsWith('.env');
}

/**
 * Check if an encoding string is supported by Node.js Buffer.
 */
function isValidEncoding(encoding: string): boolean {
  const supported = ['utf-8', 'utf-16le', 'utf-16be', 'ascii', 'latin1', 'binary', 'ucs2', 'utf8'];
  return supported.includes(encoding.toLowerCase());
}
