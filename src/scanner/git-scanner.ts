// =============================================================================
// ultraenv — Git History Scanner
// Scans git history, diffs, and staged files for secrets that may have been
// committed in the past or are about to be committed.
// =============================================================================

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ScanResult, DetectedSecret } from '../core/types.js';
import { matchPatterns } from './patterns.js';
import { detectHighEntropyStrings } from './entropy.js';
import { isGitRepository, getStagedFiles, isGitIgnored } from '../utils/git.js';

const execFileAsync = promisify(execFile);

// -----------------------------------------------------------------------------
// Internal Helpers
// -----------------------------------------------------------------------------

/**
 * Execute a git command and return stdout.
 */
async function gitExec(args: readonly string[], cwd?: string): Promise<string> {
  const { stdout } = await execFileAsync('git', [...args], {
    cwd: cwd ?? process.cwd(),
    maxBuffer: 50 * 1024 * 1024, // 50MB for history scanning
    encoding: 'utf-8',
    timeout: 60_000,
  });
  return stdout;
}

/**
 * Parse a git log -p output into commit blocks.
 * Each block starts with "commit <hash>" and contains the diff content.
 */
interface CommitBlock {
  hash: string;
  content: string;
}

function parseCommitBlocks(rawOutput: string): CommitBlock[] {
  const blocks: CommitBlock[] = [];
  const lines = rawOutput.split('\n');

  let currentHash = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    if (line.startsWith('commit ')) {
      if (currentHash !== '') {
        blocks.push({ hash: currentHash, content: currentContent.join('\n') });
      }
      currentHash = line.slice(7).trim().split(/\s+/)[0] ?? '';
      currentContent = [line];
    } else {
      currentContent.push(line);
    }
  }

  // Push the last block
  if (currentHash !== '') {
    blocks.push({ hash: currentHash, content: currentContent.join('\n') });
  }

  return blocks;
}

/**
 * Extract file paths from a diff patch header.
 * Returns a set of file paths mentioned in the diff.
 */
function extractDiffFiles(patchContent: string): Set<string> {
  const files = new Set<string>();
  const diffFilePattern = /^diff --git a\/(.+?) b\/(.+?)$/gm;

  let match: RegExpExecArray | null;
  while ((match = diffFilePattern.exec(patchContent)) !== null) {
    // Use the "b" side (new file name)
    files.add(match[2] ?? match[1] ?? '');
  }

  return files;
}

/**
 * Scan a text block (diff content, patch, etc.) for secrets.
 */
function scanContentBlock(
  content: string,
  filePath: string,
  commitHash?: string,
): DetectedSecret[] {
  const patternDetections = matchPatterns(content, filePath);
  const entropyDetections = detectHighEntropyStrings(content, filePath);

  const detections = [...patternDetections, ...entropyDetections];

  // If a commit hash is provided, annotate the file path
  if (commitHash !== undefined) {
    return detections.map((d) => ({
      ...d,
      file: `${d.file} (commit: ${commitHash.slice(0, 8)})`,
    }));
  }

  return detections;
}

// -----------------------------------------------------------------------------
// Staged Files Scanner
// -----------------------------------------------------------------------------

/**
 * Scan files staged for commit (in the git index) for secrets.
 *
 * Uses `git diff --cached` to get the staged content and scans it
 * for any detected secrets.
 *
 * @param cwd - Working directory (default: process.cwd()).
 * @returns Array of DetectedSecret objects found in staged files.
 */
export async function scanStagedFiles(cwd?: string): Promise<DetectedSecret[]> {
  const workingDir = cwd ?? process.cwd();

  // Verify we're in a git repo
  if (!(await isGitRepository(workingDir))) {
    return [];
  }

  const stagedFilesList = await getStagedFiles(workingDir);
  if (stagedFilesList.length === 0) {
    return [];
  }

  const allSecrets: DetectedSecret[] = [];

  for (const filePath of stagedFilesList) {
    // Skip gitignored files (shouldn't happen for staged, but be safe)
    if (await isGitIgnored(filePath, workingDir)) continue;

    try {
      // Get staged content for this file
      const stagedContent = await gitExec(['show', `:${filePath}`], workingDir);

      const secrets = scanContentBlock(stagedContent, filePath);
      allSecrets.push(...secrets);
    } catch {
      // File might have been deleted or renamed; skip
      continue;
    }
  }

  return allSecrets;
}

// -----------------------------------------------------------------------------
// Diff Scanner
// -----------------------------------------------------------------------------

/**
 * Scan a git diff between two refs (or between a ref and working tree) for secrets.
 *
 * @param from - The base commit ref.
 * @param to - The target commit ref. If omitted, compares to working tree.
 * @param cwd - Working directory.
 * @returns Array of DetectedSecret objects found in the diff.
 */
export async function scanDiff(
  from: string,
  to?: string,
  cwd?: string,
): Promise<DetectedSecret[]> {
  const workingDir = cwd ?? process.cwd();

  if (!(await isGitRepository(workingDir))) {
    return [];
  }

  const args = ['diff', from];
  if (to !== undefined) {
    args.push(to);
  }

  let diffContent: string;
  try {
    diffContent = await gitExec(args, workingDir);
  } catch {
    return [];
  }

  if (diffContent.trim() === '') {
    return [];
  }

  const allSecrets: DetectedSecret[] = [];
  const diffFiles = extractDiffFiles(diffContent);

  for (const filePath of diffFiles) {
    // Extract just the diff hunk for this file
    const fileDiffRegex = new RegExp(
      `diff --git a/${escapeRegex(filePath)} b/${escapeRegex(filePath)}[\\s\\S]*?(?=diff --git |$)`,
      'g',
    );

    let fileMatch: RegExpExecArray | null;
    while ((fileMatch = fileDiffRegex.exec(diffContent)) !== null) {
      const patchContent = fileMatch[0];
      const secrets = scanContentBlock(patchContent, filePath, from);
      allSecrets.push(...secrets);
    }
  }

  return allSecrets;
}

// -----------------------------------------------------------------------------
// Git History Scanner
// -----------------------------------------------------------------------------

/**
 * Git history scanning options.
 */
export interface GitScanOptions {
  /** Starting commit (default: HEAD~100) */
  from?: string;
  /** Ending commit (default: HEAD) */
  to?: string;
  /** Working directory (default: process.cwd()) */
  cwd?: string;
  /** Number of commits to scan (default: 100) */
  depth?: number;
  /** Whether to scan all history (overrides depth) */
  allHistory?: boolean;
}

/**
 * Scan git commit history for secrets.
 *
 * Uses `git log -p` to get patch content for each commit and scans
 * for secrets. Reports each finding with the associated commit hash.
 *
 * @param options - Git scanning options.
 * @returns A ScanResult with secrets found in git history.
 */
export async function scanGitHistory(options?: GitScanOptions): Promise<ScanResult> {
  const startTime = performance.now();

  const workingDir = options?.cwd ?? process.cwd();

  if (!(await isGitRepository(workingDir))) {
    return {
      found: false,
      secrets: [],
      filesScanned: [],
      filesSkipped: [],
      scanTimeMs: performance.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  const toRef = options?.to ?? 'HEAD';
  const depth = options?.allHistory ? undefined : (options?.depth ?? 100);
  const fromRef = options?.from ?? (depth !== undefined ? `HEAD~${depth}` : undefined);

  // Build git log command
  const logArgs = ['log', '-p', '--format=commit %H'];

  if (fromRef !== undefined) {
    logArgs.push(`${fromRef}..${toRef}`);
  } else if (depth !== undefined) {
    logArgs.push(`-${depth}`, toRef);
  } else {
    logArgs.push('--all');
  }

  let logOutput: string;
  try {
    logOutput = await gitExec(logArgs, workingDir);
  } catch {
    return {
      found: false,
      secrets: [],
      filesScanned: [],
      filesSkipped: [],
      scanTimeMs: performance.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  if (logOutput.trim() === '') {
    return {
      found: false,
      secrets: [],
      filesScanned: [],
      filesSkipped: [],
      scanTimeMs: performance.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  // Parse commit blocks
  const commitBlocks = parseCommitBlocks(logOutput);
  const allSecrets: DetectedSecret[] = [];
  const filesScanned: Set<string> = new Set<string>();

  for (const block of commitBlocks) {
    if (block.content.trim() === '') continue;

    const commitFiles = extractDiffFiles(block.content);

    for (const filePath of commitFiles) {
      filesScanned.add(filePath);

      // Extract diff hunk for this file
      const fileDiffRegex = new RegExp(
        `diff --git a/${escapeRegex(filePath)} b/${escapeRegex(filePath)}[\\s\\S]*?(?=diff --git |$)`,
        'g',
      );

      let fileMatch: RegExpExecArray | null;
      while ((fileMatch = fileDiffRegex.exec(block.content)) !== null) {
        const patchContent = fileMatch[0];
        const secrets = scanContentBlock(patchContent, filePath, block.hash);
        allSecrets.push(...secrets);
      }
    }
  }

  return {
    found: allSecrets.length > 0,
    secrets: allSecrets,
    filesScanned: [...filesScanned],
    filesSkipped: [],
    scanTimeMs: performance.now() - startTime,
    timestamp: new Date().toISOString(),
  };
}

// -----------------------------------------------------------------------------
// Utility
// -----------------------------------------------------------------------------

/**
 * Escape special regex characters in a string for use in a RegExp.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
