// =============================================================================
// ultraenv — Platform Detection Utilities
// OS, CI, and shell detection helpers.
// =============================================================================

import { platform, arch, tmpdir, homedir } from 'node:os';
import { env } from 'node:process';
import { join } from 'node:path';

// -----------------------------------------------------------------------------
// OS Detection
// -----------------------------------------------------------------------------

/**
 * Whether the current OS is Windows.
 */
export const isWindows: boolean = platform() === 'win32';

/**
 * Whether the current OS is macOS.
 */
export const isMac: boolean = platform() === 'darwin';

/**
 * Whether the current OS is Linux.
 */
export const isLinux: boolean = platform() === 'linux';

/**
 * The OS platform string (win32, darwin, linux, etc.).
 */
export const osPlatform: string = platform();

/**
 * The system architecture (x64, arm64, etc.).
 */
export const osArch: string = arch();

// -----------------------------------------------------------------------------
// CI Detection
// -----------------------------------------------------------------------------

/**
 * Well-known CI/CD environment variable names.
 */
const CI_ENV_VARS: readonly string[] = [
  'CI',
  'CONTINUOUS_INTEGRATION',
  'GITHUB_ACTIONS',
  'GITLAB_CI',
  'JENKINS_URL',
  'BUILDKITE',
  'CIRCLECI',
  'TRAVIS',
  'APPVEYOR',
  'TEAMCITY_VERSION',
  'DRONE',
  'HEROKU_TEST_RUN_ID',
  'VERCEL',
  'NETLIFY',
  'CF_PAGES',
  'CODEBUILD_BUILD_ID',
  'CODESANDBOX_SSE',
  'TURBO_CI',
  'NX_CLOUD_ACCESS_TOKEN',
] as const;

/**
 * Whether the current process is running in a CI/CD environment.
 */
export const isCI: boolean = CI_ENV_VARS.some(
  (key) => env[key] !== undefined && env[key] !== '' && env[key] !== '0' && env[key] !== 'false',
);

// -----------------------------------------------------------------------------
// Shell Detection
// -----------------------------------------------------------------------------

/**
 * Detect the current shell type.
 * Looks at SHELL env var on Unix, or ComSpec on Windows.
 */
export function getShellType(): string {
  if (isWindows) {
    return env.COMSPEC ?? 'cmd.exe';
  }
  return env.SHELL ?? '/bin/sh';
}

/**
 * Cached shell type.
 */
export const shellType: string = getShellType();

// -----------------------------------------------------------------------------
// Directory Paths
// -----------------------------------------------------------------------------

/**
 * The user's home directory.
 */
export const homeDir: string = homedir();

/**
 * The system temporary directory.
 */
export const tempDir: string = tmpdir();

/**
 * Get the default shell configuration directory for the current platform.
 */
export function getConfigDir(): string {
  if (isWindows) {
    return env.APPDATA ?? join(homeDir, 'AppData', 'Roaming');
  }
  const xdg = env.XDG_CONFIG_HOME;
  if (xdg !== undefined && xdg !== '') {
    return xdg;
  }
  return join(homeDir, '.config');
}

/**
 * Get the default data directory for the current platform.
 */
export function getDataDir(): string {
  if (isWindows) {
    return env.APPDATA ?? join(homeDir, 'AppData', 'Roaming');
  }
  if (isMac) {
    return join(homeDir, 'Library', 'Application Support');
  }
  const xdg = env.XDG_DATA_HOME;
  if (xdg !== undefined && xdg !== '') {
    return xdg;
  }
  return join(homeDir, '.local', 'share');
}

// -----------------------------------------------------------------------------
// Environment Variable Helpers
// -----------------------------------------------------------------------------

/**
 * Check if a specific environment variable is set (non-empty).
 */
export function hasEnv(key: string): boolean {
  return env[key] !== undefined && env[key] !== '';
}

/**
 * Get an environment variable with a fallback value.
 */
export function envWithDefault(key: string, defaultValue: string): string {
  return env[key] ?? defaultValue;
}

/**
 * Get a boolean environment variable.
 * Treats 'true', '1', 'yes' as true.
 */
export function envBool(key: string, defaultValue: boolean = false): boolean {
  const value = env[key]?.toLowerCase();
  if (value === undefined || value === '') return defaultValue;
  return ['true', '1', 'yes', 'on'].includes(value);
}
