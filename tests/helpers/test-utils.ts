/**
 * Shared test utilities for ultraenv test suite.
 *
 * Provides reusable helpers for temporary directory management,
 * process.env mocking, console capture, and async polling.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Create a temporary directory with an optional prefix.
 * The directory is automatically removed when the process exits.
 *
 * @param prefix - Optional directory name prefix (defaults to 'ultraenv-test-')
 * @returns Absolute path to the created temporary directory
 */
export function createTempDir(prefix?: string): string {
  const dirPath = fs.mkdtempSync(path.join(os.tmpdir(), prefix ?? 'ultraenv-test-'));

  // Auto-cleanup on process exit
  const cleanup = (): void => {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
    } catch {
      // Silently ignore cleanup errors (dir may already be removed)
    }
  };

  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  return dirPath;
}

/**
 * Create a temporary file with the given name and content inside a directory.
 *
 * @param dir - Directory path where the file will be created
 * @param name - File name (not a path — just the filename)
 * @param content - String content to write into the file
 * @returns Absolute path to the created file
 */
export function createTempFile(dir: string, name: string, content: string): string {
  const filePath = path.join(dir, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Write a .env file with the given name and content inside a directory.
 * Ensures the file has a `.env` extension if not already present.
 *
 * @param dir - Directory path where the env file will be written
 * @param name - File name (e.g., 'development' becomes 'development.env')
 * @param content - String content to write
 * @returns Absolute path to the created env file
 */
export function writeEnvFile(dir: string, name: string, content: string): string {
  const fileName = name.endsWith('.env') ? name : `${name}.env`;
  return createTempFile(dir, fileName, content);
}

/**
 * Mock process.env by merging the given variables on top of the current env.
 * Returns a restore function that reverts process.env to its original state.
 *
 * @param env - Key-value pairs to set on process.env
 * @returns Restore function that resets process.env to its previous state
 */
export function mockProcessEnv(env: Record<string, string>): () => void {
  const original = { ...process.env };

  // Set new values
  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }

  return (): void => {
    // Clear all current entries
    for (const key of Object.keys(process.env)) {
      if (!(key in original)) {
        delete process.env[key];
      }
    }
    // Restore original values
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

/**
 * Capture console stdout and stderr output.
 * Returns captured arrays and a restore function that re-attaches the original streams.
 *
 * @returns Object with `stdout` and `stderr` string arrays, plus a `restore` function
 */
export function captureConsole(): {
  stdout: string[];
  stderr: string[];
  restore: () => void;
} {
  const stdout: string[] = [];
  const stderr: string[] = [];

  const originalWrite = process.stdout.write.bind(process.stdout);
  const originalErrorWrite = process.stderr.write.bind(process.stderr);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  process.stdout.write = (chunk: any, ...args: any[]): boolean => {
    const str = typeof chunk === 'string' ? chunk : String(chunk);
    stdout.push(str);
    return originalWrite(chunk, ...args);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  process.stderr.write = (chunk: any, ...args: any[]): boolean => {
    const str = typeof chunk === 'string' ? chunk : String(chunk);
    stderr.push(str);
    return originalErrorWrite(chunk, ...args);
  };

  return {
    stdout,
    stderr,
    restore: (): void => {
      process.stdout.write = originalWrite;
      process.stderr.write = originalErrorWrite;
    },
  };
}

/**
 * Wait for a condition to become true, polling at ~10ms intervals.
 * Rejects if the timeout is exceeded before the condition is met.
 *
 * @param condition - Function that returns `true` when the desired state is reached
 * @param timeoutMs - Maximum time to wait in milliseconds (defaults to 5000)
 * @returns A promise that resolves when the condition is true
 * @throws Error if the timeout is exceeded
 */
export function waitFor(condition: () => boolean, timeoutMs: number = 5000): Promise<void> {
  return new Promise<void>((resolve, reject): void => {
    const startTime = Date.now();
    const interval = setInterval((): void => {
      if (condition()) {
        clearInterval(interval);
        resolve();
        return;
      }
      if (Date.now() - startTime >= timeoutMs) {
        clearInterval(interval);
        reject(new Error(`waitFor: condition not met within ${timeoutMs}ms`));
      }
    }, 10);
  });
}
