// =============================================================================
// ultraenv — Pattern Matching Engine
// Matches content against SecretPattern objects, extracting line numbers,
// column positions, and masked previews for each detected secret.
// =============================================================================

import type { SecretPattern, DetectedSecret } from '../core/types.js';
import { SECRET_PATTERNS } from '../data/secret-patterns.js';
import { maskValue } from '../utils/mask.js';

// -----------------------------------------------------------------------------
// Pattern Registry
// -----------------------------------------------------------------------------

/**
 * Mutable pattern registry. Initialized with all built-in patterns.
 * Custom patterns can be added at runtime.
 */
const patternRegistry: SecretPattern[] = [...SECRET_PATTERNS];

// -----------------------------------------------------------------------------
// Line/Column Utilities
// -----------------------------------------------------------------------------

/**
 * Convert a character offset in a string to a 1-based line number.
 */
function offsetToLine(content: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < content.length; i++) {
    if (content[i] === '\n') {
      line++;
    }
  }
  return line;
}

/**
 * Convert a character offset in a string to a 1-based column number.
 */
function offsetToColumn(content: string, offset: number): number {
  let lastNewline = -1;
  for (let i = offset - 1; i >= 0; i--) {
    if (content[i] === '\n') {
      lastNewline = i;
      break;
    }
  }
  return offset - lastNewline;
}

/**
 * Extract the variable name from the line if this is an assignment pattern.
 * Looks for patterns like KEY=value or export KEY=value.
 */
function extractVarName(line: string, matchedValue: string): string | undefined {
  // Match patterns like: KEY=value, KEY = value, export KEY=value
  const varMatch = /^(?:export\s+)?([A-Z][A-Z0-9_]*)\s*[=:]\s*/i.exec(line);
  if (varMatch) {
    const varName = varMatch[1];
    // Verify the matched value appears after the assignment
    const assignEnd = varMatch[0].length;
    if (line.indexOf(matchedValue, assignEnd) !== -1) {
      return varName;
    }
  }
  return undefined;
}

/**
 * Get the line of text at a given character offset.
 */
function getLineAtOffset(content: string, offset: number): string {
  const start = content.lastIndexOf('\n', offset - 1) + 1;
  const end = content.indexOf('\n', offset);
  return content.slice(start, end === -1 ? undefined : end);
}

// -----------------------------------------------------------------------------
// Pattern Matching
// -----------------------------------------------------------------------------

/**
 * Match a single pattern against content.
 *
 * Resets the regex lastIndex for safety, iterates over all matches,
 * and computes line/column positions for each detection.
 *
 * @param content - The text content to scan.
 * @param pattern - The SecretPattern to match against.
 * @param filePath - Path to the file being scanned.
 * @returns Array of DetectedSecret objects for each match.
 */
export function matchSinglePattern(
  content: string,
  pattern: SecretPattern,
  filePath: string,
): DetectedSecret[] {
  const results: DetectedSecret[] = [];

  // Clone the regex to reset lastIndex and avoid shared state issues
  const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
  regex.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const fullMatch = match[0] ?? '';
    const matchStart = match.index;

    // Some patterns use capture groups; extract the innermost group if available
    let secretValue = fullMatch;

    // Find the last non-empty capture group (the actual secret)
    for (let g = match.length - 1; g >= 1; g--) {
      const groupValue = match[g];
      if (groupValue !== undefined && groupValue !== '') {
        secretValue = groupValue;
        // Adjust start position to the capture group
        const groupStart = fullMatch.indexOf(groupValue);
        if (groupStart !== -1) {
          // We'll compute line/column from the full match offset + group offset
          break;
        }
      }
    }

    const line = offsetToLine(content, matchStart);
    const column = offsetToColumn(content, matchStart);
    const lineText = getLineAtOffset(content, matchStart);
    const varName = extractVarName(lineText, secretValue);

    results.push({
      type: pattern.name,
      value: maskValue(secretValue),
      file: filePath,
      line,
      column,
      pattern,
      confidence: pattern.confidence,
      varName,
    });

    // Prevent infinite loops on zero-width matches
    if (fullMatch.length === 0) {
      regex.lastIndex++;
    }
  }

  return results;
}

/**
 * Match all registered patterns against the given content.
 *
 * Iterates over every pattern in the registry and collects all detections.
 *
 * @param content - The text content to scan.
 * @param filePath - Path to the file being scanned.
 * @returns Array of DetectedSecret objects for all pattern matches.
 */
export function matchPatterns(content: string, filePath: string): DetectedSecret[] {
  const allDetections: DetectedSecret[] = [];

  for (const pattern of patternRegistry) {
    const detections = matchSinglePattern(content, pattern, filePath);
    allDetections.push(...detections);
  }

  return allDetections;
}

/**
 * Match only the built-in (default) patterns, ignoring any custom additions.
 *
 * @param content - The text content to scan.
 * @param filePath - Path to the file being scanned.
 * @returns Array of DetectedSecret objects.
 */
export function matchDefaultPatterns(content: string, filePath: string): DetectedSecret[] {
  const detections: DetectedSecret[] = [];

  for (const pattern of SECRET_PATTERNS) {
    detections.push(...matchSinglePattern(content, pattern, filePath));
  }

  return detections;
}

/**
 * Get all currently registered patterns (built-in + custom).
 *
 * @returns A copy of the current pattern registry.
 */
export function getRegisteredPatterns(): readonly SecretPattern[] {
  return [...patternRegistry];
}

// -----------------------------------------------------------------------------
// Custom Pattern Management
// -----------------------------------------------------------------------------

/**
 * Add a custom secret detection pattern to the registry.
 *
 * If a pattern with the same ID already exists, it will be replaced.
 *
 * @param pattern - The SecretPattern to add.
 * @throws {Error} If the pattern has an invalid regex.
 */
export function addCustomPattern(pattern: SecretPattern): void {
  // Validate the regex compiles correctly
  if (!(pattern.pattern instanceof RegExp)) {
    throw new Error(`Pattern "${pattern.id}" must have a valid RegExp instance.`);
  }

  // Test that the regex doesn't throw (e.g., catastrophic backtracking)
  try {
    pattern.pattern.lastIndex = 0;
    pattern.pattern.test('');
    pattern.pattern.lastIndex = 0;
  } catch (err) {
    throw new Error(`Pattern "${pattern.id}" has an invalid regex: ${(err as Error).message}`);
  }

  // Replace if exists, otherwise add
  const existingIndex = patternRegistry.findIndex((p) => p.id === pattern.id);
  if (existingIndex !== -1) {
    patternRegistry[existingIndex] = pattern;
  } else {
    patternRegistry.push(pattern);
  }
}

/**
 * Remove a custom (or built-in) pattern from the registry by ID.
 *
 * @param id - The unique pattern identifier to remove.
 * @returns true if a pattern was removed, false if not found.
 */
export function removeCustomPattern(id: string): boolean {
  const index = patternRegistry.findIndex((p) => p.id === id);
  if (index !== -1) {
    patternRegistry.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Remove all custom patterns, restoring the registry to built-in patterns only.
 */
export function resetPatterns(): void {
  patternRegistry.length = 0;
  patternRegistry.push(...SECRET_PATTERNS);
}
