// =============================================================================
// ultraenv — Terminal Output Renderer
// Handles formatted output respecting --no-color, --quiet, --format flags.
// =============================================================================

import type { OutputFormat } from '../../core/types.js';

// -----------------------------------------------------------------------------
// State
// -----------------------------------------------------------------------------

/** Whether quiet mode is active (suppress all non-error output) */
let quietMode = false;

/** Whether debug output is enabled */
let debugMode = false;

/** Current output format */
let currentFormat: OutputFormat = 'terminal';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

/**
 * Configure the renderer.
 * Called by the CLI entry point after parsing global flags.
 */
export function configureRenderer(options: {
  quiet?: boolean;
  debug?: boolean;
  format?: OutputFormat;
}): void {
  if (options.quiet !== undefined) {
    quietMode = options.quiet;
  }
  if (options.debug !== undefined) {
    debugMode = options.debug;
  }
  if (options.format !== undefined) {
    currentFormat = options.format;
  }
}

/**
 * Get the current quiet mode state.
 */
export function isQuiet(): boolean {
  return quietMode;
}

/**
 * Get the current debug mode state.
 */
export function isDebug(): boolean {
  return debugMode;
}

/**
 * Get the current output format.
 */
export function getFormat(): OutputFormat {
  return currentFormat;
}

// -----------------------------------------------------------------------------
// Output Functions
// -----------------------------------------------------------------------------

/**
 * Render output to stdout.
 * Respects --quiet and --format flags.
 *
 * @param output - The string to output
 * @param format - Override the output format for this specific call
 */
export function render(output: string, format?: OutputFormat): void {
  const fmt = format ?? currentFormat;

  if (fmt === 'silent') return;
  if (quietMode) return;

  if (fmt === 'json') {
    // JSON format: only output if it looks like valid JSON
    process.stdout.write(output + '\n');
  } else {
    process.stdout.write(output + '\n');
  }
}

/**
 * Write a single line to stdout.
 * Respects --quiet mode.
 */
export function writeLine(message: string): void {
  if (quietMode || currentFormat === 'silent') return;
  process.stdout.write(message + '\n');
}

/**
 * Write a line to stderr (bypasses --quiet for errors).
 */
export function writeError(message: string): void {
  process.stderr.write(message + '\n');
}

/**
 * Write debug output (only shown when --debug is active).
 */
export function writeDebug(message: string): void {
  if (!debugMode) return;
  if (quietMode || currentFormat === 'silent') return;
  process.stderr.write(`[debug] ${message}\n`);
}

/**
 * Write JSON output to stdout.
 * Wraps in a clean JSON structure.
 */
export function writeJson(data: Record<string, unknown>): void {
  if (quietMode || currentFormat === 'silent') return;
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

/**
 * Clear the terminal screen.
 */
export function clearScreen(): void {
  process.stdout.write('\x1b[2J\x1b[H');
}

/**
 * Write a horizontal rule/separator line.
 */
export function writeSeparator(char: string = '─', width: number = 60): void {
  if (quietMode || currentFormat === 'silent') return;
  process.stdout.write(char.repeat(width) + '\n');
}

/**
 * Write a blank line (if not in silent/quiet mode).
 */
export function writeBlank(): void {
  if (quietMode || currentFormat === 'silent') return;
  process.stdout.write('\n');
}
