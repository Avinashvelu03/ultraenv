/**
 * Fixture loading utilities for ultraenv tests.
 *
 * Provides helpers to locate and read test fixture files from the
 * `tests/fixtures/` directory tree.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/** Root directory of the fixtures tree. */
const FIXTURES_ROOT = path.resolve(__dirname, '..', 'fixtures');

/**
 * Load a fixture file by name and return its contents as a UTF-8 string.
 *
 * The `name` is resolved relative to `tests/fixtures/`, so for example:
 * - `'env-files/basic.env'` → `tests/fixtures/env-files/basic.env`
 * - `'cascades/development/.env'` → `tests/fixtures/cascades/development/.env`
 *
 * @param name - Relative path within the fixtures directory
 * @returns The file content as a string
 * @throws Error if the fixture file does not exist
 */
export function loadFixture(name: string): string {
  const filePath = fixturePath(name);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fixture not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Get the absolute path to a fixture file without reading it.
 *
 * Useful when you need to pass a file path to an API that reads the file itself.
 *
 * @param name - Relative path within the fixtures directory
 * @returns Absolute path to the fixture file
 */
export function fixturePath(name: string): string {
  return path.resolve(FIXTURES_ROOT, name);
}
