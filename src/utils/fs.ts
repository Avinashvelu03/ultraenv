// =============================================================================
// ultraenv — File System Utilities
// Thin async wrappers around node:fs/promises with consistent error handling.
// =============================================================================

import { promises as fsp, existsSync, readFileSync as fsReadFileSync } from 'node:fs';
import type { Dirent } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { FileSystemError } from '../core/errors.js';

// -----------------------------------------------------------------------------
// Reading
// -----------------------------------------------------------------------------

/**
 * Read a file and return its contents as a string.
 * @throws FileSystemError if the file cannot be read.
 */
export async function readFile(
  filePath: string,
  encoding: BufferEncoding = 'utf-8',
): Promise<string> {
  try {
    return await fsp.readFile(filePath, { encoding });
  } catch (error: unknown) {
    throw new FileSystemError(`Failed to read file "${filePath}"`, {
      path: filePath,
      operation: 'read',
      cause: error instanceof Error ? error : undefined,
    });
  }
}

/**
 * Synchronously read a file and return its contents as a string.
 * Use sparingly — prefer the async version.
 */
export function readFileSync(filePath: string, encoding: BufferEncoding = 'utf-8'): string {
  try {
    return fsReadFileSync(filePath, { encoding });
  } catch (error: unknown) {
    throw new FileSystemError(`Failed to read file "${filePath}"`, {
      path: filePath,
      operation: 'read',
      cause: error instanceof Error ? error : undefined,
    });
  }
}

// -----------------------------------------------------------------------------
// Writing
// -----------------------------------------------------------------------------

/**
 * Write content to a file, creating parent directories if needed.
 * @throws FileSystemError if the write fails.
 */
export async function writeFile(
  filePath: string,
  content: string,
  encoding: BufferEncoding = 'utf-8',
): Promise<void> {
  try {
    await ensureDir(dirname(filePath));
    await fsp.writeFile(filePath, content, { encoding });
  } catch (error: unknown) {
    throw new FileSystemError(`Failed to write file "${filePath}"`, {
      path: filePath,
      operation: 'write',
      cause: error instanceof Error ? error : undefined,
    });
  }
}

// -----------------------------------------------------------------------------
// Existence & Type Checks
// -----------------------------------------------------------------------------

/**
 * Check if a path exists on the filesystem.
 */
export async function exists(filePath: string): Promise<boolean> {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Synchronously check if a path exists.
 */
export function existsSyncCheck(filePath: string): boolean {
  return existsSync(filePath);
}

/**
 * Check if the given path points to a regular file.
 */
export async function isFile(filePath: string): Promise<boolean> {
  try {
    const stat = await fsp.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

/**
 * Check if the given path points to a directory.
 */
export async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    const stat = await fsp.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// Directory Operations
// -----------------------------------------------------------------------------

/**
 * Ensure a directory exists, creating it recursively if necessary (mkdir -p).
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fsp.mkdir(dirPath, { recursive: true });
  } catch (error: unknown) {
    // EEXIST is fine — directory already exists
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw new FileSystemError(`Failed to create directory "${dirPath}"`, {
        path: dirPath,
        operation: 'mkdir',
        cause: error instanceof Error ? error : undefined,
      });
    }
  }
}

// -----------------------------------------------------------------------------
// File Operations
// -----------------------------------------------------------------------------

/**
 * Remove a file. Does nothing if the file does not exist.
 */
export async function removeFile(filePath: string): Promise<void> {
  try {
    await fsp.unlink(filePath);
  } catch (error: unknown) {
    // ENOENT is fine — file already gone
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw new FileSystemError(`Failed to remove file "${filePath}"`, {
        path: filePath,
        operation: 'unlink',
        cause: error instanceof Error ? error : undefined,
      });
    }
  }
}

/**
 * Copy a file from src to dest, creating parent directories if needed.
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  try {
    await ensureDir(dirname(dest));
    await fsp.copyFile(src, dest);
  } catch (error: unknown) {
    throw new FileSystemError(`Failed to copy "${src}" to "${dest}"`, {
      path: src,
      operation: 'copy',
      cause: error instanceof Error ? error : undefined,
    });
  }
}

// -----------------------------------------------------------------------------
// Listing & Search
// -----------------------------------------------------------------------------

/**
 * List files in a directory.
 * @param dirPath - Directory to scan.
 * @param recursive - Whether to recurse into subdirectories (default: false).
 * @returns Array of file paths relative to dirPath.
 */
export async function listFiles(dirPath: string, recursive: boolean = false): Promise<string[]> {
  const results: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await fsp.readdir(currentDir, { withFileTypes: true });
    } catch (error: unknown) {
      throw new FileSystemError(`Failed to list directory "${currentDir}"`, {
        path: currentDir,
        operation: 'readdir',
        cause: error instanceof Error ? error : undefined,
      });
    }

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isFile()) {
        results.push(relative(dirPath, fullPath));
      } else if (
        entry.isDirectory() &&
        recursive &&
        !entry.name.startsWith('.') &&
        entry.name !== 'node_modules'
      ) {
        await walk(fullPath);
      }
    }
  }

  await walk(dirPath);
  return results;
}

/**
 * Walk up the directory tree looking for a file with the given name.
 * @param name - File name to search for (e.g., '.env').
 * @param cwd - Starting directory (default: process.cwd()).
 * @returns Absolute path to the found file, or null if not found.
 */
export async function findUp(name: string, cwd?: string): Promise<string | null> {
  let current = resolve(cwd ?? process.cwd());

  // Guard against infinite loops — stop at root
  const root = resolve('/');

  while (current !== root && current !== dirname(current)) {
    const candidate = join(current, name);
    if (await exists(candidate)) {
      return candidate;
    }
    current = dirname(current);
  }

  // Check root one final time
  const rootCandidate = join(root, name);
  if (await exists(rootCandidate)) {
    return rootCandidate;
  }

  return null;
}

/**
 * Synchronously walk up the directory tree looking for a file.
 * @param name - File name to search for.
 * @param cwd - Starting directory (default: process.cwd()).
 */
export function findUpSync(name: string, cwd?: string): string | null {
  let current = resolve(cwd ?? process.cwd());
  const root = resolve('/');

  while (current !== root && current !== dirname(current)) {
    const candidate = join(current, name);
    if (existsSync(candidate)) {
      return candidate;
    }
    current = dirname(current);
  }

  const rootCandidate = join(root, name);
  if (existsSync(rootCandidate)) {
    return rootCandidate;
  }

  return null;
}
