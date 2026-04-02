// =============================================================================
// ultraenv — Entropy-Based Secret Detection
// Detects high-entropy strings in file content that may represent secrets,
// tokens, or credentials not caught by specific pattern matching.
// =============================================================================

import type { DetectedSecret, SecretPattern } from '../core/types.js';
import { shannonEntropy } from '../utils/entropy.js';
import { maskValue } from '../utils/mask.js';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

export interface EntropyOptions {
  /** Minimum Shannon entropy threshold (default: 3.5) */
  threshold?: number;
  /** Minimum string length to consider (default: 20) */
  minLength?: number;
  /** Maximum string length to consider (default: 500) */
  maxLength?: number;
  /** Whether to include the high-entropy pattern in results (default: true) */
  includeDefaultPattern?: boolean;
}

const DEFAULT_ENTROPY_OPTIONS: Required<EntropyOptions> = {
  threshold: 3.5,
  minLength: 20,
  maxLength: 500,
  includeDefaultPattern: true,
};

// -----------------------------------------------------------------------------
// False Positive Filters
// -----------------------------------------------------------------------------

/**
 * UUID v4 pattern — high entropy but not a secret.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Git commit hash (7-40 hex chars) — not a secret.
 */
const COMMIT_HASH_PATTERN = /^[0-9a-f]{7,40}$/;

/**
 * Semantic version patterns — not secrets.
 */
const SEMVER_PATTERN = /^v?[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.]+)?(?:\+[a-zA-Z0-9.]+)?$/;

/**
 * Common non-secret high-entropy strings.
 */
const COMMON_WORDS: ReadonlySet<string> = new Set([
  'the',
  'quick',
  'brown',
  'jumps',
  'over',
  'lazy',
  'undefined',
  'null',
  'boolean',
  'string',
  'number',
  'object',
  'function',
  'prototype',
  'constructor',
  'return',
  'typeof',
  'instanceof',
]);

/**
 * Common file paths that tend to produce high-entropy strings.
 */
const PATH_PATTERN = /^(?:\/[a-zA-Z0-9_./-]+|[a-zA-Z]:\\[a-zA-Z0-9_.\\-]+)$/;

/**
 * URL pattern — URLs can have high entropy query strings but aren't necessarily secrets.
 */
const URL_PATTERN = /^https?:\/\/[a-zA-Z0-9._/-]+(?:\?[a-zA-Z0-9._/&=%-]+)?(?:#[a-zA-Z0-9._-]+)?$/;

/**
 * Check if a candidate string is a known false positive.
 *
 * @param candidate - The string to check.
 * @returns true if the string is likely a false positive (not a secret).
 */
function isFalsePositive(candidate: string): boolean {
  if (candidate.length === 0) return true;

  // Skip UUIDs
  if (UUID_PATTERN.test(candidate)) return true;

  // Skip git commit hashes
  if (COMMIT_HASH_PATTERN.test(candidate)) return true;

  // Skip semantic versions
  if (SEMVER_PATTERN.test(candidate)) return true;

  // Skip common English words
  if (COMMON_WORDS.has(candidate.toLowerCase())) return true;

  // Skip file paths
  if (PATH_PATTERN.test(candidate)) return true;

  // Skip pure URLs without credentials
  if (URL_PATTERN.test(candidate)) return true;

  // Skip strings that are mostly whitespace or common separators
  const nonAlphaNumeric = (candidate.match(/[^a-zA-Z0-9]/g) ?? []).length;
  if (nonAlphaNumeric / candidate.length > 0.8) return true;

  // Skip pure numeric strings
  if (/^\d+$/.test(candidate)) return true;

  // Skip strings that are just repeated characters
  if (/^(.)\1{10,}$/.test(candidate)) return true;

  return false;
}

// -----------------------------------------------------------------------------
// Secret Pattern for Entropy Detections
// -----------------------------------------------------------------------------

/**
 * The built-in SecretPattern used for entropy-based detections.
 */
export const ENTROPY_SECRET_PATTERN: SecretPattern = {
  id: 'entropy-high-entropy-string',
  name: 'High-Entropy String',
  pattern: /./, // Placeholder; actual detection is entropy-based
  confidence: 0.5,
  severity: 'medium',
  description:
    'String with high Shannon entropy that may be a secret or token not caught by specific patterns.',
  remediation:
    'Review this value to determine if it is sensitive. If confirmed as a secret, move to a vault or environment variable.',
  category: 'entropy',
};

// -----------------------------------------------------------------------------
// Candidate Extraction
// -----------------------------------------------------------------------------

/**
 * Extract candidate strings from a line of text that could be secrets.
 *
 * Splits on common delimiters and extracts quoted strings, assignments,
 * and standalone token-like strings.
 *
 * @param line - A single line of text.
 * @returns Array of candidate strings with their column offsets.
 */
function extractCandidates(line: string): Array<{ value: string; column: number }> {
  const candidates: Array<{ value: string; column: number }> = [];

  // Extract quoted strings (single, double, backtick)
  const quotePatterns = [
    { regex: /"([^"]+)"/g, offset: 0 },
    { regex: /'([^']+)'/g, offset: 0 },
    { regex: /`([^`]+)`/g, offset: 0 },
  ];

  for (const { regex } of quotePatterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      const captured = match[1];
      if (captured !== undefined) {
        candidates.push({ value: captured, column: match.index + 1 });
      }
    }
  }

  // Extract values from KEY=VALUE patterns
  const assignPattern = /(?:^|[;\s])([A-Z][A-Z0-9_]*)\s*[=:]\s*([^\s;'"`]+)/gi;
  let assignMatch: RegExpExecArray | null;
  while ((assignMatch = assignPattern.exec(line)) !== null) {
    const value = assignMatch[2];
    if (value !== undefined && value.length >= DEFAULT_ENTROPY_OPTIONS.minLength) {
      const valueStart = line.indexOf(value, assignMatch.index);
      candidates.push({ value, column: valueStart + 1 });
    }
  }

  // Extract token-like strings (base64url, hex strings)
  const tokenPattern = /([A-Za-z0-9+/=_-]{20,})/g;
  let tokenMatch: RegExpExecArray | null;
  while ((tokenMatch = tokenPattern.exec(line)) !== null) {
    const captured = tokenMatch[1];
    if (captured === undefined) continue;
    // Avoid duplicates with already-extracted candidates
    const tokenIndex = tokenMatch.index + 1;
    const existing = candidates.some((c) => c.value === captured && c.column === tokenIndex);
    if (!existing) {
      candidates.push({ value: captured, column: tokenMatch.index + 1 });
    }
  }

  return candidates;
}

// -----------------------------------------------------------------------------
// Entropy Scanning
// -----------------------------------------------------------------------------

/**
 * Scan a single line for high-entropy strings.
 *
 * Extracts candidate strings from the line, computes Shannon entropy,
 * filters false positives, and returns detections above the threshold.
 *
 * @param line - The line of text to scan.
 * @param lineNumber - The 1-based line number.
 * @param filePath - The file path being scanned.
 * @param options - Entropy detection options.
 * @returns Array of DetectedSecret objects for high-entropy strings found.
 */
export function scanLineForEntropy(
  line: string,
  lineNumber: number,
  filePath: string,
  options?: EntropyOptions,
): DetectedSecret[] {
  const opts = { ...DEFAULT_ENTROPY_OPTIONS, ...options };
  const detections: DetectedSecret[] = [];

  if (line.trim().length === 0) return detections;

  const candidates = extractCandidates(line);

  for (const candidate of candidates) {
    const { value, column } = candidate;

    // Length check
    if (value.length < opts.minLength || value.length > opts.maxLength) continue;

    // Skip known false positives
    if (isFalsePositive(value)) continue;

    // Compute Shannon entropy
    const entropy = shannonEntropy(value);

    if (entropy >= opts.threshold) {
      // Adjust confidence based on how far above the threshold we are
      const excessEntropy = entropy - opts.threshold;
      const confidence = Math.min(0.9, 0.4 + excessEntropy * 0.15);

      detections.push({
        type: ENTROPY_SECRET_PATTERN.name,
        value: maskValue(value),
        file: filePath,
        line: lineNumber,
        column,
        pattern: ENTROPY_SECRET_PATTERN,
        confidence,
      });
    }
  }

  return detections;
}

/**
 * Detect high-entropy strings in file content.
 *
 * Processes the content line by line, extracts candidate strings,
 * computes Shannon entropy, and returns detections above the threshold.
 *
 * @param content - The full text content to scan.
 * @param filePath - The file path being scanned.
 * @param options - Entropy detection options.
 * @returns Array of DetectedSecret objects for high-entropy strings found.
 */
export function detectHighEntropyStrings(
  content: string,
  filePath: string,
  options?: EntropyOptions,
): DetectedSecret[] {
  const lines = content.split('\n');
  const allDetections: DetectedSecret[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i];
    if (line === undefined) continue;
    const detections = scanLineForEntropy(line, lineNumber, filePath, options);
    allDetections.push(...detections);
  }

  return allDetections;
}
