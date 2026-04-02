// =============================================================================
// ultraenv — File Scanner
// Scans file contents for secrets using pattern matching and entropy analysis.
// Handles file filtering, binary detection, .gitignore respect, and more.
// =============================================================================

import { promises as fsp } from 'node:fs';
import type { Dirent } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import type { ScanOptions, ScanResult, DetectedSecret } from '../core/types.js';
import { matchPatterns } from './patterns.js';
import { detectHighEntropyStrings } from './entropy.js';
import { isGitIgnored } from '../utils/git.js';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Default paths to always skip during scanning */
const DEFAULT_SKIP_PATHS: ReadonlySet<string> = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'coverage',
  '.cache',
  '.turbo',
  '.vercel',
  '.netlify',
  '__pycache__',
  '.eggs',
  '*.egg-info',
  '.tox',
  '.mypy_cache',
  '.pytest_cache',
  'vendor',
  '.bundle',
]);

/** Binary file extensions to skip */
const BINARY_EXTENSIONS: ReadonlySet<string> = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg', '.tiff',
  '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.wav', '.ogg', '.m4a',
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar', '.xz', '.zst',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.dat', '.wasm',
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  '.sqlite', '.sqlite3', '.db',
  '.class', '.jar', '.war', '.ear',
  '.pyc', '.pyo',
  '.o', '.obj', '.a', '.lib',
]);

/** Maximum bytes to read for binary detection */
const BINARY_CHECK_SIZE = 8192;

/** Default max file size (1 MB) */
const DEFAULT_MAX_FILE_SIZE = 1024 * 1024;

// -----------------------------------------------------------------------------
// File Utilities
// -----------------------------------------------------------------------------

/**
 * Get the file extension from a path (lowercase).
 */
function getExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filePath.slice(lastDot).toLowerCase();
}

/**
 * Check if a file extension indicates a binary file.
 */
function isBinaryExtension(filePath: string): boolean {
  return BINARY_EXTENSIONS.has(getExtension(filePath));
}

/**
 * Check if a file path should be skipped based on directory name.
 */
function isInSkippedDirectory(filePath: string): boolean {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts.some((part) => DEFAULT_SKIP_PATHS.has(part));
}

/**
 * Check if a relative path matches any of the exclude patterns.
 * Supports simple glob-like patterns (* and **).
 */
function matchesExcludePattern(relPath: string, excludes: readonly string[]): boolean {
  for (const pattern of excludes) {
    // Convert glob pattern to regex
    const normalizedPattern = pattern.replace(/\\/g, '/').replace(/\./g, '\\.');

    if (normalizedPattern.includes('**')) {
      // Double glob — match any depth
      const regexStr = normalizedPattern
        .replace(/\*\*/g, '<<DOUBLESTAR>>')
        .replace(/\*/g, '[^/]*')
        .replace(/<<DOUBLESTAR>>/g, '.*');
      const regex = new RegExp(`^${regexStr}$`);
      if (regex.test(relPath)) return true;
    } else if (normalizedPattern.includes('*')) {
      // Single glob
      const regexStr = normalizedPattern.replace(/\*/g, '[^/]*');
      const regex = new RegExp(`^${regexStr}$`);
      if (regex.test(relPath)) return true;
    } else {
      // Exact match (directory or file)
      if (relPath === normalizedPattern || relPath.startsWith(normalizedPattern + '/')) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if a relative path matches any of the include patterns.
 * If no include patterns are specified, all files are included.
 */
function matchesIncludePattern(relPath: string, includes: readonly string[]): boolean {
  if (includes.length === 0) return true;

  for (const pattern of includes) {
    const normalizedPattern = pattern.replace(/\\/g, '/').replace(/\./g, '\\.');

    if (normalizedPattern.includes('**')) {
      const regexStr = normalizedPattern
        .replace(/\*\*/g, '<<DOUBLESTAR>>')
        .replace(/\*/g, '[^/]*')
        .replace(/<<DOUBLESTAR>>/g, '.*');
      const regex = new RegExp(`^${regexStr}$`);
      if (regex.test(relPath)) return true;
    } else if (normalizedPattern.includes('*')) {
      const regexStr = normalizedPattern.replace(/\*/g, '[^/]*');
      const regex = new RegExp(`^${regexStr}$`);
      if (regex.test(relPath)) return true;
    } else {
      if (relPath === normalizedPattern || relPath.startsWith(normalizedPattern + '/')) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Detect if a buffer contains binary content by checking for null bytes.
 */
function isBinaryContent(buffer: Buffer): boolean {
  for (let i = 0; i < Math.min(buffer.length, BINARY_CHECK_SIZE); i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

// -----------------------------------------------------------------------------
// File Walking
// -----------------------------------------------------------------------------

/**
 * Recursively collect files from the given paths, respecting filters.
 */
async function collectFiles(
  basePaths: readonly string[],
  options: {
    excludes: readonly string[];
    includes: readonly string[];
    maxFileSize: number;
    cwd: string;
  },
): Promise<{ files: string[]; skipped: string[] }> {
  const files: string[] = [];
  const skipped: string[] = [];
  const visited = new Set<string>();

  async function walk(dir: string): Promise<void> {
    const absDir = resolve(options.cwd, dir);
    const canonicalDir = resolve(absDir);

    if (visited.has(canonicalDir)) return;
    visited.add(canonicalDir);

    let entries: Dirent[];
    try {
      entries = await fsp.readdir(absDir, { withFileTypes: true });
    } catch {
      return; // Skip unreadable directories
    }

    for (const entry of entries) {
      const fullPath = join(absDir, entry.name);
      const relPath = relative(options.cwd, fullPath).replace(/\\/g, '/');

      // Skip excluded paths
      if (matchesExcludePattern(relPath, options.excludes)) {
        skipped.push(relPath);
        continue;
      }

      // Skip default skip directories
      if (entry.isDirectory() && DEFAULT_SKIP_PATHS.has(entry.name)) {
        skipped.push(relPath);
        continue;
      }

      if (entry.isDirectory()) {
        await walk(relPath);
      } else if (entry.isFile()) {
        // Check include patterns
        if (!matchesIncludePattern(relPath, options.includes)) {
          skipped.push(relPath);
          continue;
        }

        // Check binary extensions
        if (isBinaryExtension(relPath)) {
          skipped.push(relPath);
          continue;
        }

        files.push(relPath);
      }
    }
  }

  for (const basePath of basePaths) {
    const absPath = resolve(options.cwd, basePath);

    // Check if it's a file or directory
    try {
      const stat = await fsp.stat(absPath);
      if (stat.isFile()) {
        const relPath = relative(options.cwd, absPath).replace(/\\/g, '/');
        if (!matchesExcludePattern(relPath, options.excludes) &&
            matchesIncludePattern(relPath, options.includes) &&
            !isBinaryExtension(relPath)) {
          files.push(relPath);
        } else {
          skipped.push(relPath);
        }
      } else if (stat.isDirectory()) {
        await walk(basePath);
      }
    } catch {
      skipped.push(basePath);
    }
  }

  return { files, skipped };
}

// -----------------------------------------------------------------------------
// File Scanning
// -----------------------------------------------------------------------------

/**
 * Scan a single file for secrets.
 *
 * Reads the file content, performs binary detection, and runs
 * both pattern matching and entropy analysis.
 *
 * @param filePath - Absolute path to the file.
 * @param cwd - Working directory for relative path computation.
 * @returns Array of detected secrets, or empty array if the file is skipped.
 */
export async function scanFile(
  filePath: string,
  cwd: string,
): Promise<DetectedSecret[]> {
  const relPath = relative(cwd, filePath).replace(/\\/g, '/');

  // Skip binary extensions
  if (isBinaryExtension(relPath)) return [];

  // Skip default directories
  if (isInSkippedDirectory(relPath)) return [];

  let content: string;
  try {
    const buffer = await fsp.readFile(filePath);

    // Binary detection
    if (isBinaryContent(buffer)) return [];

    content = buffer.toString('utf-8');
  } catch {
    return [];
  }

  // Run pattern matching
  const patternDetections = matchPatterns(content, relPath);

  // Run entropy analysis
  const entropyDetections = detectHighEntropyStrings(content, relPath);

  return [...patternDetections, ...entropyDetections];
}

/**
 * Scan multiple files for secrets.
 *
 * Collects files from the given paths, respects include/exclude patterns,
 * skips binary files and common non-source directories, checks .gitignore,
 * and runs both pattern matching and entropy analysis on each file.
 *
 * @param paths - File or directory paths to scan.
 * @param options - Scan configuration options.
 * @returns A ScanResult with all detected secrets and metadata.
 */
export async function scanFiles(
  paths: readonly string[],
  options?: Partial<ScanOptions>,
): Promise<ScanResult> {
  const startTime = performance.now();

  const resolvedOptions: Required<ScanOptions> = {
    include: options?.include ?? ['**'],
    exclude: options?.exclude ?? [],
    scanGitHistory: options?.scanGitHistory ?? false,
    maxFileSize: options?.maxFileSize ?? DEFAULT_MAX_FILE_SIZE,
    customPatterns: options?.customPatterns ?? [],
    includeDefaults: options?.includeDefaults ?? true,
    failFast: options?.failFast ?? false,
  };

  const cwd = process.cwd();

  // Collect files to scan
  const { files, skipped: preSkipped } = await collectFiles(paths, {
    excludes: resolvedOptions.exclude,
    includes: resolvedOptions.include,
    maxFileSize: resolvedOptions.maxFileSize,
    cwd,
  });

  const filesScanned: string[] = [];
  const filesSkipped: string[] = [...preSkipped];
  const allSecrets: DetectedSecret[] = [];

  for (const relPath of files) {
    const absPath = resolve(cwd, relPath);

    // Check .gitignore
    if (await isGitIgnored(relPath, cwd)) {
      filesSkipped.push(relPath);
      continue;
    }

    // Check file size
    try {
      const stat = await fsp.stat(absPath);
      if (stat.size > resolvedOptions.maxFileSize) {
        filesSkipped.push(relPath);
        continue;
      }
    } catch {
      filesSkipped.push(relPath);
      continue;
    }

    // Scan the file
    const secrets = await scanFile(absPath, cwd);
    filesScanned.push(relPath);
    allSecrets.push(...secrets);

    // Fail fast if requested
    if (resolvedOptions.failFast && allSecrets.length > 0) {
      break;
    }
  }

  const scanTimeMs = performance.now() - startTime;

  return {
    found: allSecrets.length > 0,
    secrets: allSecrets,
    filesScanned,
    filesSkipped,
    scanTimeMs,
    timestamp: new Date().toISOString(),
  };
}
