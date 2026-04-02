// =============================================================================
// ultraenv — Simple Glob Utilities
// Zero-dependency file pattern matching using Node.js fs.readdir.
// Supports *, **, and ? wildcards with cwd-relative matching.
// =============================================================================

import { readdir } from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import { join, normalize, relative } from 'node:path';

// -----------------------------------------------------------------------------
// Pattern Analysis
// -----------------------------------------------------------------------------

/**
 * Check if a string contains glob pattern characters (*, ?, [, {).
 */
export function isGlobPattern(str: string): boolean {
  // Escape backslashes first to avoid matching escaped wildcards
  const unescaped = str.replace(/\\(.)/g, '__escaped__$1');
  return /[*?[{]/.test(unescaped);
}

// -----------------------------------------------------------------------------
// Matching
// -----------------------------------------------------------------------------

/**
 * Convert a simple glob pattern to a RegExp.
 * Supports: * (any chars except /), ** (any chars including /), ? (single char)
 */
function globToRegex(pattern: string): RegExp {
  // Normalize separators to forward slashes for pattern processing
  const normalized = pattern.replace(/\\/g, '/');

  const parts = normalized.split('/');

  const regexParts: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === undefined) continue;

    if (part === '**') {
      // ** matches zero or more path segments
      regexParts.push('(?:.+\\/)?');
    } else {
      // Convert single-segment glob to regex
      const segRegex = part
        // Escape special regex chars (except * and ?)
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        // * → match any chars except /
        .replace(/\*/g, '[^/]*')
        // ? → match any single char except /
        .replace(/\?/g, '[^/]');

      regexParts.push(segRegex);
    }
  }

  const regexStr = regexParts.join('/');
  return new RegExp(`^${regexStr}$`);
}

/**
 * Test if a file path matches a glob pattern.
 * Both paths are normalized to use forward slashes for comparison.
 *
 * @param path - The file path to test.
 * @param pattern - The glob pattern to match against.
 * @returns true if the path matches the pattern.
 */
export function matchGlob(path: string, pattern: string): boolean {
  const normalizedPath = normalize(path).replace(/\\/g, '/');
  const regex = globToRegex(pattern);
  return regex.test(normalizedPath);
}

// -----------------------------------------------------------------------------
// File Globbing (recursive directory walk)
// -----------------------------------------------------------------------------

interface DirEntry {
  name: string;
  isDir: boolean;
}

/**
 * Recursively list all files in a directory.
 */
async function walkDir(
  dir: string,
  results: string[],
  maxDepth: number = 30,
  currentDepth: number = 0,
): Promise<void> {
  if (currentDepth >= maxDepth) return;

  let entries: DirEntry[];
  try {
    const raw: Dirent[] = await readdir(dir, { withFileTypes: true });
    entries = raw.map((entry: Dirent): DirEntry => ({
      name: entry.name,
      isDir: entry.isDirectory(),
    }));
  } catch {
    return; // Skip directories we can't read
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDir) {
      // Skip common ignored directories
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.')) {
        continue;
      }
      await walkDir(fullPath, results, maxDepth, currentDepth + 1);
    } else {
      results.push(fullPath);
    }
  }
}

/**
 * Glob files matching a pattern.
 *
 * Supports:
 * - `*` — match any characters within a single path segment
 * - `**` — match any number of path segments (recursive)
 * - `?` — match exactly one character within a segment
 *
 * @param pattern - Glob pattern (relative to cwd or absolute).
 * @param cwd - Working directory (default: process.cwd()).
 * @returns Array of matching file paths (absolute).
 *
 * @example
 * glob('*.env')             // Find all .env files in current dir
 * glob('src/ts')            // All .ts files under src (recursive)
 * glob('.env*')             // All files starting with .env
 */
export async function glob(pattern: string, cwd: string = process.cwd()): Promise<string[]> {
  const isAbsolutePattern = pattern.startsWith('/');
  const baseDir = isAbsolutePattern ? '/' : cwd;

  // If the pattern contains **, we need to walk the tree
  if (pattern.includes('**')) {
    // Find the base directory before **
    const beforeGlobstar = pattern.split('/**')[0] ?? '';
    const searchDir = join(baseDir, beforeGlobstar);

    const allFiles: string[] = [];
    await walkDir(searchDir, allFiles);

    const regex = globToRegex(pattern);
    return allFiles.filter((file) => {
      const relPath = relative(baseDir, file).replace(/\\/g, '/');
      return regex.test(relPath);
    });
  }

  // Simple single-segment glob — just list the directory
  const segments = pattern.split('/');
  const dirPart = segments.slice(0, -1).join('/');

  const searchDir = join(baseDir, dirPart || '.');
  const regex = globToRegex(pattern);

  const allFiles: string[] = [];
  await walkDir(searchDir, allFiles, 1); // maxDepth=1 for non-recursive patterns

  return allFiles.filter((file) => {
    const relPath = relative(baseDir, file).replace(/\\/g, '/');
    return regex.test(relPath);
  });
}
