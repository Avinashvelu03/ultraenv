// =============================================================================
// ultraenv — Scanner Orchestrator
// Main public API for the secret scanning system.
// Combines file scanning, git scanning, pattern matching, and entropy analysis.
// Deduplicates results and sorts by severity.
// =============================================================================

import type { ScanOptions, ScanResult, DetectedSecret, SecretPattern } from '../core/types.js';
import { scanFiles } from './file-scanner.js';
import { scanGitHistory, scanStagedFiles, scanDiff } from './git-scanner.js';
import { addCustomPattern, removeCustomPattern, resetPatterns, getRegisteredPatterns } from './patterns.js';
import { formatScanResult } from './reporter.js';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

/**
 * Configuration file name for ultraenv scan settings.
 */
const CONFIG_FILENAME = '.ultraenvrc.json';

/**
 * Structure of the .ultraenvrc.json configuration file (scan section).
 */
interface UltraenvScanConfig {
  scan?: {
    include?: string[];
    exclude?: string[];
    scanGitHistory?: boolean;
    maxFileSize?: number;
    failFast?: boolean;
  };
}

/**
 * Load configuration from .ultraenvrc.json if present.
 */
async function loadConfig(cwd: string): Promise<Partial<ScanOptions>> {
  const { join } = await import('node:path');
  const { existsSync, readFileSync } = await import('node:fs');
  const configPath = join(cwd, CONFIG_FILENAME);

  if (!existsSync(configPath)) return {};

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed: UltraenvScanConfig = JSON.parse(raw);
    return parsed.scan ?? {};
  } catch {
    return {};
  }
}

// -----------------------------------------------------------------------------
// Deduplication
// -----------------------------------------------------------------------------

/**
 * Create a deduplication key for a detected secret.
 * Two secrets with the same key are considered duplicates.
 */
function dedupeKey(secret: DetectedSecret): string {
  return `${secret.type}|${secret.file}|${secret.line}|${secret.column}`;
}

/**
 * Deduplicate detected secrets, keeping the one with higher confidence.
 */
function deduplicateSecrets(secrets: readonly DetectedSecret[]): DetectedSecret[] {
  const map = new Map<string, DetectedSecret>();

  for (const secret of secrets) {
    const key = dedupeKey(secret);
    const existing = map.get(key);

    if (existing === undefined || secret.confidence > existing.confidence) {
      map.set(key, secret);
    }
  }

  return [...map.values()];
}

// -----------------------------------------------------------------------------
// Severity Sorting
// -----------------------------------------------------------------------------

type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Extract the severity level from a SecretPattern.
 */
function getSeverityFromPattern(pattern: SecretPattern): SeverityLevel {
  const patternWithSeverity = pattern as SecretPattern & { severity?: SeverityLevel };
  if (patternWithSeverity.severity !== undefined && patternWithSeverity.severity in SEVERITY_ORDER) {
    return patternWithSeverity.severity;
  }
  if (pattern.confidence >= 0.9) return 'critical';
  if (pattern.confidence >= 0.7) return 'high';
  return 'medium';
}

/**
 * Sort detected secrets by severity (critical first), then by confidence.
 */
function sortBySeverity(secrets: DetectedSecret[]): DetectedSecret[] {
  return [...secrets].sort((a, b) => {
    const sevA = SEVERITY_ORDER[getSeverityFromPattern(a.pattern)];
    const sevB = SEVERITY_ORDER[getSeverityFromPattern(b.pattern)];

    if (sevA !== sevB) return sevA - sevB;
    return b.confidence - a.confidence;
  });
}

// -----------------------------------------------------------------------------
// Main Scan API
// -----------------------------------------------------------------------------

/**
 * Full scan options including git-specific options.
 */
export interface FullScanOptions extends Partial<ScanOptions> {
  /** Whether to scan staged files (for pre-commit hooks) */
  scanStaged?: boolean;
  /** Git ref to diff against (for diff scanning) */
  diffFrom?: string;
  /** Git ref to diff to (for diff scanning) */
  diffTo?: string;
  /** Number of git history commits to scan */
  gitDepth?: number;
  /** Scan all git history (overrides gitDepth) */
  gitAllHistory?: boolean;
  /** Output format for the report */
  outputFormat?: 'terminal' | 'json' | 'sarif';
  /** Working directory */
  cwd?: string;
  /** Paths to scan (files or directories) */
  paths?: string[];
}

/**
 * Perform a comprehensive secret scan.
 *
 * Combines:
 * 1. File scanning (pattern matching + entropy analysis)
 * 2. Git history scanning (if enabled)
 * 3. Staged file scanning (if enabled)
 * 4. Diff scanning (if refs provided)
 *
 * Results are deduplicated and sorted by severity.
 *
 * @param options - Scan configuration options.
 * @returns A ScanResult with all detected secrets and metadata.
 *
 * @example
 * // Scan current directory
 * const result = await scan();
 * console.log(formatScanResult(result, 'terminal'));
 *
 * // Scan with options
 * const result = await scan({
 *   include: ['src/', 'config/'],
 *   exclude: ['src/*.test.ts'],
 *   scanGitHistory: true,
 * });
 */
export async function scan(options?: FullScanOptions): Promise<ScanResult> {
  const startTime = performance.now();

  const cwd = options?.cwd ?? process.cwd();
  const paths = options?.paths ?? ['.'];

  // Load config from .ultraenvrc.json
  const fileConfig = await loadConfig(cwd);

  // Merge options: defaults < file config < explicit options
  const mergedOptions: Required<ScanOptions> = {
    include: options?.include ?? fileConfig.include ?? ['**'],
    exclude: options?.exclude ?? fileConfig.exclude ?? [],
    scanGitHistory: options?.scanGitHistory ?? fileConfig.scanGitHistory ?? false,
    maxFileSize: options?.maxFileSize ?? fileConfig.maxFileSize ?? 1024 * 1024,
    customPatterns: options?.customPatterns ?? [],
    includeDefaults: options?.includeDefaults ?? true,
    failFast: options?.failFast ?? false,
  };

  // Register custom patterns
  for (const customPattern of mergedOptions.customPatterns) {
    addCustomPattern(customPattern);
  }

  const allSecrets: DetectedSecret[] = [];
  const allFilesScanned: string[] = [];
  const allFilesSkipped: string[] = [];

  // 1. File scanning
  const fileResult = await scanFiles(paths, mergedOptions);
  allSecrets.push(...fileResult.secrets);
  allFilesScanned.push(...fileResult.filesScanned);
  allFilesSkipped.push(...fileResult.filesSkipped);

  // 2. Git history scanning
  if (mergedOptions.scanGitHistory) {
    const { isGitRepository } = await import('../utils/git.js');
    if (await isGitRepository(cwd)) {
      const gitResult = await scanGitHistory({
        depth: options?.gitDepth,
        allHistory: options?.gitAllHistory,
        cwd,
      });
      allSecrets.push(...gitResult.secrets);
      allFilesScanned.push(...gitResult.filesScanned);
    }
  }

  // 3. Staged file scanning
  if (options?.scanStaged) {
    const { isGitRepository } = await import('../utils/git.js');
    if (await isGitRepository(cwd)) {
      const stagedSecrets = await scanStagedFiles(cwd);
      allSecrets.push(...stagedSecrets);
    }
  }

  // 4. Diff scanning
  if (options?.diffFrom !== undefined) {
    const diffSecrets = await scanDiff(options.diffFrom, options?.diffTo, cwd);
    allSecrets.push(...diffSecrets);
  }

  // Deduplicate
  const dedupedSecrets = deduplicateSecrets(allSecrets);

  // Sort by severity
  const sortedSecrets = sortBySeverity(dedupedSecrets);

  const scanTimeMs = performance.now() - startTime;

  return {
    found: sortedSecrets.length > 0,
    secrets: sortedSecrets,
    filesScanned: [...new Set(allFilesScanned)],
    filesSkipped: [...new Set(allFilesSkipped)],
    scanTimeMs,
    timestamp: new Date().toISOString(),
  };
}

// -----------------------------------------------------------------------------
// Public API Exports
// -----------------------------------------------------------------------------

export {
  scanFiles,
  scanGitHistory,
  scanStagedFiles,
  scanDiff,
  addCustomPattern,
  removeCustomPattern,
  resetPatterns,
  getRegisteredPatterns,
  formatScanResult,
};

export type {
  DetectedSecret,
  ScanResult,
  ScanOptions,
  SecretPattern,
};
