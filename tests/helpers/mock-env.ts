/**
 * process.env mocking utilities for tests.
 *
 * Provides a clean API to set, get, and restore environment variables
 * without polluting the real process.env across test boundaries.
 */

export interface MockEnvHandle {
  /**
   * Set a single environment variable.
   *
   * @param key - Variable name
   * @param value - Variable value
   */
  set(key: string, value: string): void;

  /**
   * Get the current value of a mocked environment variable.
   *
   * @param key - Variable name
   * @returns The variable value, or `undefined` if not set
   */
  get(key: string): string | undefined;

  /**
   * Restore process.env to its original state before `mockEnv()` was called.
   * After calling `restore()`, the handle should no longer be used.
   */
  restore(): void;

  /**
   * Clear all mocked variables (reset them to the state before `mockEnv()`).
   * Unlike `restore()`, this keeps the handle active for further `set()` calls.
   */
  clear(): void;
}

/**
 * Mock process.env with the given key-value pairs.
 *
 * The original values are snapshot'd so they can be restored later.
 * New keys are added and can be fully removed via `clear()` or `restore()`.
 *
 * @param vars - Environment variables to mock
 * @returns A handle with `set`, `get`, `restore`, and `clear` methods
 *
 * @example
 * ```ts
 * const env = mockEnv({ NODE_ENV: 'test', PORT: '3000' });
 * expect(process.env.NODE_ENV).toBe('test');
 *
 * env.set('DEBUG', 'true');
 * expect(env.get('DEBUG')).toBe('true');
 *
 * env.clear();
 * expect(env.get('NODE_ENV')).toBeUndefined();
 *
 * env.restore();
 * ```
 */
export function mockEnv(vars: Record<string, string>): MockEnvHandle {
  // Snapshot the current state of the vars we're about to override
  const snapshot = new Map<string, string | undefined>();
  for (const key of Object.keys(vars)) {
    snapshot.set(key, process.env[key]);
  }

  // Track any new keys that didn't exist before
  const newKeys = new Set<string>();

  // Apply the mock values
  for (const [key, value] of Object.entries(vars)) {
    if (!(key in process.env)) {
      newKeys.add(key);
    }
    process.env[key] = value;
  }

  return {
    set(key: string, value: string): void {
      if (!(key in process.env) && !snapshot.has(key)) {
        newKeys.add(key);
      }
      if (!snapshot.has(key)) {
        snapshot.set(key, process.env[key]);
      }
      process.env[key] = value;
    },

    get(key: string): string | undefined {
      return process.env[key];
    },

    restore(): void {
      // Remove any keys that were newly added
      for (const key of newKeys) {
        delete process.env[key];
      }
      // Restore original values
      for (const [key, originalValue] of snapshot) {
        if (originalValue === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = originalValue;
        }
      }
      snapshot.clear();
      newKeys.clear();
    },

    clear(): void {
      // Remove any keys that were newly added
      for (const key of newKeys) {
        delete process.env[key];
      }
      // Restore original values
      for (const [key, originalValue] of snapshot) {
        if (originalValue === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = originalValue;
        }
      }
    },
  };
}
