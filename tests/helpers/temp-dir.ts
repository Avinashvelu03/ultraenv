/**
 * TempDir — managed temporary directory for tests.
 *
 * Creates a temporary directory that can be used to write files during tests.
 * Automatically cleaned up when `cleanup()` is called or via process exit handler.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export class TempDir {
  private _path: string | null = null;
  private _cleaned = false;

  constructor(private readonly prefix?: string) {}

  /**
   * Create the temporary directory on disk.
   * Safe to call multiple times — subsequent calls are no-ops.
   *
   * @returns The absolute path to the created directory
   */
  create(): string {
    if (this._path !== null) {
      return this._path;
    }

    this._path = fs.mkdtempSync(path.join(os.tmpdir(), this.prefix ?? 'ultraenv-test-'));

    // Auto-cleanup on process exit as a safety net
    const dirPath = this._path;
    const cleanup = (): void => {
      this.cleanup();
    };
    process.on('exit', cleanup);

    return this._path;
  }

  /**
   * Get the path to the temporary directory.
   * Calls `create()` if the directory has not been created yet.
   */
  get path(): string {
    if (this._path === null) {
      return this.create();
    }
    return this._path;
  }

  /**
   * Write a file relative to the temporary directory.
   * Nested directories are created automatically.
   *
   * @param relativePath - Path relative to the temp dir root (e.g., 'subdir/file.txt')
   * @param content - File content as a string
   * @returns The absolute path to the written file
   */
  write(relativePath: string, content: string): string {
    const fullPath = path.join(this.path, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
    return fullPath;
  }

  /**
   * Remove the temporary directory and all its contents from disk.
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  cleanup(): void {
    if (this._cleaned || this._path === null) {
      return;
    }
    try {
      fs.rmSync(this._path, { recursive: true, force: true });
    } catch {
      // Silently ignore — directory may already be gone
    }
    this._cleaned = true;
  }
}
