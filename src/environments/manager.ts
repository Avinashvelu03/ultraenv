// =============================================================================
// ultraenv — Multi-Environment Manager
// Detects, lists, validates, and switches between multiple .env environments.
// =============================================================================

import { resolve, join } from 'node:path';
import { statSync } from 'node:fs';
import type { SchemaDefinition } from '../core/types.js';
import { readFile, writeFile, exists, listFiles } from '../utils/fs.js';
import { parseEnvFile } from '../core/parser.js';
import { FileSystemError } from '../core/errors.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface EnvironmentInfo {
  name: string;
  fileName: string;
  absolutePath: string;
  exists: boolean;
  variableCount: number;
  fileSize: number;
  lastModified: string;
}

export type EnvironmentValidationMap = Map<
  string,
  {
    valid: boolean;
    errors: readonly { field: string; value: string; message: string; hint: string }[];
    warnings: readonly { field: string; value: string; message: string; code: string }[];
  }
>;

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const KNOWN_ENVIRONMENTS: readonly string[] = [
  'development',
  'staging',
  'production',
  'test',
] as const;

const ENV_FILE_PATTERNS: readonly string[] = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.development.local',
  '.env.staging',
  '.env.staging.local',
  '.env.production',
  '.env.production.local',
  '.env.test',
  '.env.test.local',
  '.env.ci',
] as const;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function extractEnvName(fileName: string): string | null {
  if (fileName === '.env' || fileName === '.env.local') {
    return null;
  }

  if (!fileName.startsWith('.env.')) {
    return null;
  }

  let name = fileName.slice(5);

  if (name.endsWith('.local')) {
    name = name.slice(0, -6);
    if (name === '') return null;
  }

  return name;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export async function listEnvironments(cwd?: string): Promise<EnvironmentInfo[]> {
  const baseDir = resolve(cwd ?? process.cwd());
  const environments: EnvironmentInfo[] = [];

  for (const pattern of ENV_FILE_PATTERNS) {
    const absolutePath = join(baseDir, pattern);
    const fileExists = await exists(absolutePath);
    const envName = extractEnvName(pattern);

    let fileSize = 0;
    let lastModified = '';
    let variableCount = 0;

    if (fileExists) {
      try {
        const stat = statSync(absolutePath);
        fileSize = stat.size;
        lastModified = stat.mtime.toISOString();
      } catch {
        // File may have been removed between exists() and statSync()
      }

      try {
        const content = await readFile(absolutePath);
        const parsed = parseEnvFile(content, absolutePath);
        variableCount = parsed.vars.length;
      } catch {
        // File may be unreadable
      }
    }

    environments.push({
      name: envName ?? 'base',
      fileName: pattern,
      absolutePath,
      exists: fileExists,
      variableCount,
      fileSize,
      lastModified,
    });
  }

  environments.sort((a, b) => {
    const nameOrder = (name: string): number => {
      if (name === 'base') return 0;
      const idx = KNOWN_ENVIRONMENTS.indexOf(name as (typeof KNOWN_ENVIRONMENTS)[number]);
      return idx >= 0 ? idx + 1 : 100;
    };
    return nameOrder(a.name) - nameOrder(b.name);
  });

  return environments;
}

export async function validateAllEnvironments(
  schema: SchemaDefinition,
  cwd?: string,
): Promise<EnvironmentValidationMap> {
  const baseDir = resolve(cwd ?? process.cwd());
  const results: EnvironmentValidationMap = new Map();

  for (const pattern of ENV_FILE_PATTERNS) {
    const absolutePath = join(baseDir, pattern);
    const envName = extractEnvName(pattern);

    if (!(await exists(absolutePath))) {
      continue;
    }

    try {
      const content = await readFile(absolutePath);
      const parsed = parseEnvFile(content, absolutePath);

      const vars: Record<string, string> = {};
      for (const envVar of parsed.vars) {
        vars[envVar.key] = envVar.value;
      }

      // Validate each schema field against the environment
      const errors: { field: string; value: string; message: string; hint: string }[] = [];
      const warnings: { field: string; value: string; message: string; code: string }[] = [];

      for (const [key, schemaEntry] of Object.entries(schema)) {
        const r = schemaEntry as unknown as Record<string, unknown>;
        const rawValue = vars[key];
        const isRequired =
          schemaEntry.optional !== true &&
          schemaEntry.default === undefined &&
          r.hasDefault !== true;

        // Check required fields
        if (isRequired && (rawValue === undefined || rawValue === '')) {
          errors.push({
            field: key,
            value: rawValue ?? '',
            message: `Required variable "${key}" is missing`,
            hint: `Set "${key}" in ${pattern}`,
          });
        }

        // Check type for number fields
        if (rawValue !== undefined && r.type === 'number') {
          if (Number.isNaN(Number(rawValue))) {
            errors.push({
              field: key,
              value: rawValue,
              message: `"${key}" should be a number but got "${rawValue}"`,
              hint: `Provide a valid number for "${key}"`,
            });
          }
        }

        // Check type for boolean fields
        if (rawValue !== undefined && r.type === 'boolean') {
          const lower = rawValue.toLowerCase();
          if (!['true', 'false', '1', '0', 'yes', 'no', 'on', 'off', ''].includes(lower)) {
            errors.push({
              field: key,
              value: rawValue,
              message: `"${key}" should be a boolean but got "${rawValue}"`,
              hint: `Use true/false, 1/0, or yes/no for "${key}"`,
            });
          }
        }

        // Check deprecation warnings
        if (r.isDeprecated === true && rawValue !== undefined && rawValue !== '') {
          const msg = r.deprecationMessage as string | undefined;
          warnings.push({
            field: key,
            value: rawValue,
            message: msg ?? `Variable "${key}" is deprecated`,
            code: 'DEPRECATED',
          });
        }
      }

      results.set(envName ?? pattern, {
        valid: errors.length === 0,
        errors,
        warnings,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      results.set(envName ?? pattern, {
        valid: false,
        errors: [
          {
            field: '',
            value: '',
            message: `Failed to read/parse file: ${message}`,
            hint: 'Check that the file is a valid .env file.',
          },
        ],
        warnings: [],
      });
    }
  }

  return results;
}

export async function switchEnvironment(envName: string, cwd?: string): Promise<void> {
  const baseDir = resolve(cwd ?? process.cwd());

  const envFile = join(baseDir, `.env.${envName}`);

  if (!(await exists(envFile))) {
    throw new FileSystemError(`Environment file ".env.${envName}" not found`, {
      path: envFile,
      operation: 'read',
      hint: `Create a ".env.${envName}" file first, or use "ultraenv env create ${envName}".`,
    });
  }

  const content = await readFile(envFile);

  const header = [
    '# ============================================================',
    `# Switched to environment: ${envName}`,
    `# Source: .env.${envName}`,
    `# Generated by ultraenv on ${new Date().toISOString()}`,
    '# ============================================================',
    '',
  ].join('\n');

  const localPath = join(baseDir, '.env.local');
  await writeFile(localPath, header + content);

  const basePath = join(baseDir, '.env');
  if (!(await exists(basePath))) {
    const baseHeader = [
      '# ============================================================',
      '# Base environment variables',
      '# Generated by ultraenv',
      '# ============================================================',
      '',
    ].join('\n');
    await writeFile(basePath, baseHeader);
  }
}

export async function getActiveEnvironment(cwd?: string): Promise<string> {
  const baseDir = resolve(cwd ?? process.cwd());
  const localPath = join(baseDir, '.env.local');

  if (!(await exists(localPath))) {
    return 'base';
  }

  try {
    const content = await readFile(localPath);
    const match = content.match(/^#\s*Switched to environment:\s*(\S+)/m);
    if (match !== null && match[1] !== undefined) {
      return match[1];
    }
  } catch {
    // Ignore read errors
  }

  return 'base';
}

export async function discoverEnvironments(cwd?: string): Promise<string[]> {
  const baseDir = resolve(cwd ?? process.cwd());
  const discovered: string[] = [];

  try {
    const files = await listFiles(baseDir, false);
    const knownNames = new Set<string>([...KNOWN_ENVIRONMENTS]);

    for (const file of files) {
      if (!file.startsWith('.env.')) continue;
      if (file.endsWith('.local')) continue;

      const name = extractEnvName(file);
      if (name !== null && !knownNames.has(name)) {
        discovered.push(name);
      }
    }
  } catch {
    // Ignore listing errors
  }

  return discovered.sort();
}
