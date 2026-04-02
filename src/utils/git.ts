// =============================================================================
// ultraenv — Git Interaction Utilities
// Thin wrappers around git CLI for repository introspection.
// =============================================================================

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// -----------------------------------------------------------------------------
// Internal Helpers
// -----------------------------------------------------------------------------

/**
 * Execute a git command and return trimmed stdout.
 * Returns empty string if git is not available or command fails.
 */
async function git(args: readonly string[], cwd?: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', [...args], {
      cwd: cwd ?? process.cwd(),
      maxBuffer: 10 * 1024 * 1024, // 10MB
      encoding: 'utf-8',
      timeout: 30_000,
    });
    return stdout.trim();
  } catch {
    return '';
  }
}

/**
 * Execute a git command and return a boolean success indicator.
 */
async function gitSuccess(args: readonly string[], cwd?: string): Promise<boolean> {
  try {
    await execFileAsync('git', [...args], {
      cwd: cwd ?? process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
      timeout: 30_000,
    });
    return true;
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// Repository Detection
// -----------------------------------------------------------------------------

/**
 * Check if the current (or specified) directory is inside a git repository.
 */
export async function isGitRepository(cwd?: string): Promise<boolean> {
  return gitSuccess(['rev-parse', '--is-inside-work-tree'], cwd);
}

/**
 * Get the root directory of the current git repository.
 * @returns Absolute path to the repo root, or null if not in a repo.
 */
export async function getGitRoot(cwd?: string): Promise<string | null> {
  const result = await git(['rev-parse', '--show-toplevel'], cwd);
  return result !== '' ? result : null;
}

// -----------------------------------------------------------------------------
// File Queries
// -----------------------------------------------------------------------------

/**
 * Get the list of staged files (files in the git index).
 * @returns Array of file paths relative to the repo root.
 */
export async function getStagedFiles(cwd?: string): Promise<string[]> {
  const result = await git(['diff', '--cached', '--name-only', '--diff-filter=ACMR'], cwd);
  if (result === '') return [];
  return result.split('\n').filter((f) => f.length > 0);
}

/**
 * Get the list of changed files between two commits, or between a commit and the working tree.
 *
 * @param from - The base commit ref.
 * @param to - The target commit ref. If omitted, compares to working tree.
 * @param cwd - Working directory.
 * @returns Array of file paths relative to the repo root.
 */
export async function getDiffFiles(from: string, to?: string, cwd?: string): Promise<string[]> {
  const args = ['diff', '--name-only', from];
  if (to !== undefined) {
    args.push(to);
  }
  const result = await git(args, cwd);
  if (result === '') return [];
  return result.split('\n').filter((f) => f.length > 0);
}

/**
 * Check if a file or directory is ignored by .gitignore.
 * @param path - Path relative to the repo root (or absolute).
 * @param cwd - Working directory.
 */
export async function isGitIgnored(path: string, cwd?: string): Promise<boolean> {
  // git check-ignore exits with 0 if the path is ignored
  return gitSuccess(['check-ignore', '--quiet', path], cwd);
}

// -----------------------------------------------------------------------------
// Commit Info
// -----------------------------------------------------------------------------

/**
 * Get the current commit hash (abbreviated).
 * @returns Commit hash string, or null if not in a repo.
 */
export async function getCommitHash(cwd?: string): Promise<string | null> {
  const result = await git(['rev-parse', '--short', 'HEAD'], cwd);
  return result !== '' ? result : null;
}

/**
 * Get the full (unabbreviated) commit hash.
 */
export async function getFullCommitHash(cwd?: string): Promise<string | null> {
  const result = await git(['rev-parse', 'HEAD'], cwd);
  return result !== '' ? result : null;
}

// -----------------------------------------------------------------------------
// Git Config
// -----------------------------------------------------------------------------

/**
 * Get a git config value.
 * @param key - The config key (e.g., 'user.email', 'remote.origin.url').
 * @param cwd - Working directory.
 * @returns The config value, or null if not set.
 */
export async function getConfig(key: string, cwd?: string): Promise<string | null> {
  const result = await git(['config', '--get', key], cwd);
  return result !== '' ? result : null;
}

/**
 * Get all git config values matching a pattern (get all values for a key).
 */
export async function getConfigAll(key: string, cwd?: string): Promise<string[]> {
  const result = await git(['config', '--get-all', key], cwd);
  if (result === '') return [];
  return result.split('\n').filter((v) => v.length > 0);
}

/**
 * Get the current branch name.
 * @returns Branch name, or null if detached HEAD or not in a repo.
 */
export async function getCurrentBranch(cwd?: string): Promise<string | null> {
  const result = await git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
  if (result === '' || result === 'HEAD') return null;
  return result;
}

/**
 * Get the remote URL for a given remote name.
 * @param remote - Remote name (default: 'origin').
 */
export async function getRemoteUrl(
  remote: string = 'origin',
  cwd?: string,
): Promise<string | null> {
  return getConfig(`remote.${remote}.url`, cwd);
}

/**
 * Check if there are any uncommitted changes (dirty working tree).
 */
export async function isDirty(cwd?: string): Promise<boolean> {
  const result = await git(['status', '--porcelain'], cwd);
  return result !== '';
}

/**
 * Get the list of all tracked files in the repository.
 */
export async function getTrackedFiles(cwd?: string): Promise<string[]> {
  const result = await git(['ls-files'], cwd);
  if (result === '') return [];
  return result.split('\n').filter((f) => f.length > 0);
}
