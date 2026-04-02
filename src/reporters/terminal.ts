// =============================================================================
// ultraenv — Terminal Reporter
// Beautiful ANSI-formatted output for validation results, errors, and more.
// Uses Unicode box drawing for structured error display.
// =============================================================================

import type {
  ValidationResult,
  ValidationError as ValidationErrorType,
  ValidationWarning,
  ScanResult,
} from '../core/types.js';
import { UltraenvError } from '../core/errors.js';
import { drawTitledBox, drawBox, type BoxChars } from '../utils/box.js';

// -----------------------------------------------------------------------------
// ANSI Color Codes
// -----------------------------------------------------------------------------

const ANSI = {
  reset: '\x1B[0m',
  bold: '\x1B[1m',
  dim: '\x1B[2m',
  red: '\x1B[31m',
  green: '\x1B[32m',
  yellow: '\x1B[33m',
  blue: '\x1B[34m',
  magenta: '\x1B[35m',
  cyan: '\x1B[36m',
  white: '\x1B[37m',
  gray: '\x1B[90m',
  bgRed: '\x1B[41m',
  bgGreen: '\x1B[42m',
  bgYellow: '\x1B[43m',
} as const;

// -----------------------------------------------------------------------------
// Reporter Configuration
// -----------------------------------------------------------------------------

/** Options for the terminal reporter */
export interface TerminalReporterOptions {
  /** Whether to use colors (auto-detected if not specified) */
  color?: boolean;
  /** Box character style */
  boxStyle?: BoxChars;
  /** Maximum width of output lines (0 = no limit) */
  maxWidth?: number;
}

const DEFAULT_BOX: BoxChars = {
  topLeft: '╔',
  topRight: '╗',
  bottomLeft: '╚',
  bottomRight: '╝',
  horizontal: '═',
  vertical: '║',
  leftTee: '╠',
  rightTee: '╣',
};

// -----------------------------------------------------------------------------
// Terminal Reporter
// -----------------------------------------------------------------------------

/**
 * Report a validation result with rich formatting.
 *
 * - Green box for passing validations
 * - Red box for errors with field details table
 * - Yellow warnings section
 *
 * @param result - The validation result to report
 * @param options - Reporter options
 * @returns Formatted terminal string
 */
export function reportValidation(
  result: ValidationResult,
  options: TerminalReporterOptions = {},
): string {
  const { color = true, boxStyle = DEFAULT_BOX } = options;
  const c = color ? ANSI : noColorANSI();

  if (result.valid) {
    const lines: string[] = [];
    lines.push(`${c.green}${c.bold}  ✓${c.reset}  All ${Object.keys(result.validated).length} variables passed validation`);
    if (result.warnings.length > 0) {
      lines.push('');
      for (const warning of result.warnings) {
        lines.push(`${c.yellow}  ⚠${c.reset}  ${warning.field}: ${warning.message}`);
      }
    }
    return lines.join('\n');
  }

  // Build error details
  const errorLines: string[] = [];
  for (const error of result.errors) {
    const fieldDisplay = `${c.red}${c.bold}${error.field}${c.reset}`;
    const messageDisplay = error.message;
    const expectedDisplay = `${c.dim}expected: ${error.expected}${c.reset}`;
    const valueDisplay = error.value !== undefined && error.value !== ''
      ? `${c.dim}value: ${maskValue(error.value)}${c.reset}`
      : `${c.dim}value: (empty)${c.reset}`;
    const hintDisplay = error.hint !== undefined
      ? `${c.cyan}hint: ${error.hint}${c.reset}`
      : '';
    const sourceDisplay = error.source !== undefined
      ? `${c.gray}source: ${error.source}${error.source !== undefined && error.lineNumber !== undefined ? `:${error.lineNumber}` : ''}${c.reset}`
      : '';

    errorLines.push(`${fieldDisplay}  ${messageDisplay}`);
    errorLines.push(`  ${expectedDisplay}`);
    errorLines.push(`  ${valueDisplay}`);
    if (hintDisplay) errorLines.push(`  ${hintDisplay}`);
    if (sourceDisplay) errorLines.push(`  ${sourceDisplay}`);
  }

  const title = `${c.bgRed}${c.white}${c.bold} Validation Failed (${result.errors.length} error${result.errors.length === 1 ? '' : 's'}) ${c.reset}`;
  const box = drawTitledBox(title, errorLines, boxStyle);

  // Build output
  const output: string[] = [box];

  if (result.warnings.length > 0) {
    output.push('');
    const warningLines: string[] = [];
    for (const warning of result.warnings) {
      warningLines.push(`${c.yellow}⚠${c.reset} ${warning.field}: ${warning.message} ${c.dim}[${warning.code}]${c.reset}`);
    }
    output.push(warningLines.join('\n'));
  }

  if (result.unknown.length > 0) {
    output.push('');
    output.push(`${c.gray}?${c.reset}  Unknown variables: ${result.unknown.map((u) => `${c.dim}${u}${c.reset}`).join(', ')}`);
  }

  return output.join('\n');
}

/**
 * Report an UltraenvError with structured formatting.
 *
 * @param error - The error to report
 * @param options - Reporter options
 * @returns Formatted terminal string
 */
export function reportError(
  error: UltraenvError,
  options: TerminalReporterOptions = {},
): string {
  const { color = true, boxStyle = DEFAULT_BOX } = options;
  const c = color ? ANSI : noColorANSI();

  const code = error.code ?? 'ULTRAENV_ERROR';
  const lines: string[] = [
    `${c.red}${c.bold}Error [${code}]${c.reset}`,
    `  ${error.message}`,
  ];

  if (error.hint !== undefined) {
    lines.push('');
    lines.push(`${c.cyan}  💡 ${error.hint}${c.reset}`);
  }

  const title = `${c.bgRed}${c.white}${c.bold} ${code} ${c.reset}`;
  return drawTitledBox(title, lines, boxStyle);
}

/**
 * Report a success message with a green checkmark.
 *
 * @param message - The success message
 * @param options - Reporter options
 * @returns Formatted terminal string
 */
export function reportSuccess(
  message: string,
  options: TerminalReporterOptions = {},
): string {
  const { color = true } = options;
  const c = color ? ANSI : noColorANSI();
  return `${c.green}${c.bold}  ✓${c.reset}  ${message}`;
}

/**
 * Report a warning with yellow formatting.
 *
 * @param warning - The validation warning to report
 * @param options - Reporter options
 * @returns Formatted terminal string
 */
export function reportWarning(
  warning: ValidationWarning,
  options: TerminalReporterOptions = {},
): string {
  const { color = true } = options;
  const c = color ? ANSI : noColorANSI();

  const parts: string[] = [
    `${c.yellow}  ⚠${c.reset}  ${c.bold}${warning.field}${c.reset}: ${warning.message}`,
  ];

  if (warning.value !== undefined && warning.value !== '') {
    parts.push(`${c.dim}  value: ${maskValue(warning.value)}${c.reset}`);
  }

  if (warning.code !== undefined) {
    parts.push(`${c.dim}  code: ${warning.code}${c.reset}`);
  }

  return parts.join('\n');
}

/**
 * Report an informational message.
 *
 * @param message - The info message
 * @param options - Reporter options
 * @returns Formatted terminal string
 */
export function reportInfo(
  message: string,
  options: TerminalReporterOptions = {},
): string {
  const { color = true } = options;
  const c = color ? ANSI : noColorANSI();
  return `${c.blue}  ℹ${c.reset}  ${message}`;
}

/**
 * Report a scan result with severity-colored table.
 *
 * @param result - The scan result to report
 * @param options - Reporter options
 * @returns Formatted terminal string
 */
export function reportScanResult(
  result: ScanResult,
  options: TerminalReporterOptions = {},
): string {
  const { color = true, boxStyle = DEFAULT_BOX } = options;
  const c = color ? ANSI : noColorANSI();

  if (!result.found) {
    return `${c.green}${c.bold}  ✓${c.reset}  No secrets detected. Scanned ${result.filesScanned.length} file(s) in ${result.scanTimeMs}ms.`;
  }

  const output: string[] = [];

  // Summary box
  const summaryLines: string[] = [
    `${c.red}${c.bold}${result.secrets.length} secret(s) detected${c.reset} across ${result.secrets.length > 0 ? new Set(result.secrets.map((s) => s.file)).size : 0} file(s)`,
    `Scanned: ${result.filesScanned.length} files | Skipped: ${result.filesSkipped.length} | Time: ${result.scanTimeMs}ms`,
  ];

  const summaryTitle = `${c.bgRed}${c.white}${c.bold} Secret Scan Results ${c.reset}`;
  output.push(drawTitledBox(summaryTitle, summaryLines, boxStyle));
  output.push('');

  // Secrets table
  // Header
  const header = [
    `${c.bold}Severity${c.reset}`,
    `${c.bold}Type${c.reset}`,
    `${c.bold}File${c.reset}`,
    `${c.bold}Line${c.reset}`,
    `${c.bold}Value${c.reset}`,
  ];

  const rows = [header];
  for (const secret of result.secrets) {
    const severityColor = secret.pattern.severity === 'critical'
      ? c.red
      : secret.pattern.severity === 'high'
        ? c.yellow
        : c.dim;
    const severityIcon = secret.pattern.severity === 'critical'
      ? '✗'
      : secret.pattern.severity === 'high'
        ? '!'
        : '?';

    const lastSlash = secret.file.lastIndexOf('/');
    const lastBackslash = secret.file.lastIndexOf('\\');
    const lastSep = Math.max(lastSlash, lastBackslash);
    const fileName = lastSep >= 0 ? secret.file.slice(lastSep + 1) : secret.file;

    rows.push([
      `${severityColor}${severityIcon} ${secret.pattern.severity}${c.reset}`,
      secret.pattern.name,
      `${c.cyan}${fileName}${c.reset}`,
      `${c.dim}:${secret.line}:${secret.column}${c.reset}`,
      `${c.dim}${maskValue(secret.value, 6, 4)}${c.reset}`,
    ]);
  }

  // Build the table
  const table = formatTable(rows);
  output.push(table);

  return output.join('\n');
}

/**
 * Report a validation error in a boxed format.
 *
 * @param error - The validation error entry
 * @param options - Reporter options
 * @returns Formatted terminal string with box drawing
 */
export function reportValidationError(
  error: ValidationErrorType,
  options: TerminalReporterOptions = {},
): string {
  const { color = true, boxStyle = DEFAULT_BOX } = options;
  const c = color ? ANSI : noColorANSI();

  const lines: string[] = [
    `${c.red}${c.bold}${error.field}${c.reset}`,
    `${error.message}`,
    `${c.dim}Expected: ${error.expected}${c.reset}`,
    `${c.dim}Value: ${maskValue(error.value)}${c.reset}`,
  ];

  if (error.hint) {
    lines.push('');
    lines.push(`${c.cyan}💡 ${error.hint}${c.reset}`);
  }

  return drawBox(lines, boxStyle);
}

// -----------------------------------------------------------------------------
// Table Formatting
// -----------------------------------------------------------------------------

/**
 * Format rows of strings as an aligned table.
 * Handles ANSI escape codes when calculating column widths.
 */
function formatTable(rows: readonly (readonly string[])[]): string {
  if (rows.length === 0) return '';

  // Calculate visible width of a string (stripping ANSI codes)
  function visibleWidth(s: string): number {
    return s.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '').length;
  }

  // Determine column count and widths
  const colCount = Math.max(...rows.map((row) => row.length));
  const colWidths: number[] = [];

  for (let col = 0; col < colCount; col++) {
    let maxW = 0;
    for (const row of rows) {
      if (col < row.length) {
        const w = visibleWidth(row[col]!);
        if (w > maxW) maxW = w;
      }
    }
    colWidths.push(maxW);
  }

  return rows
    .map((row) =>
      row
        .map((cell, col) => {
          const w = visibleWidth(cell);
          const padding = Math.max(0, (colWidths[col] ?? 0) - w);
          return cell + ' '.repeat(padding);
        })
        .join('  '),
    )
    .join('\n');
}

// -----------------------------------------------------------------------------
// Value Masking
// -----------------------------------------------------------------------------

/**
 * Mask a secret value for display.
 * Shows first N chars and last 4 chars, masking the rest.
 */
function maskValue(value: string, visibleStart: number = 4, visibleEnd: number = 4): string {
  if (value.length <= visibleStart + visibleEnd) {
    return '*'.repeat(value.length);
  }
  const start = value.slice(0, visibleStart);
  const end = value.slice(-visibleEnd);
  const masked = '*'.repeat(Math.max(4, value.length - visibleStart - visibleEnd));
  return `${start}${masked}${end}`;
}

// -----------------------------------------------------------------------------
// No-Color Helper
// -----------------------------------------------------------------------------

/**
 * Returns an ANSI object where all color codes are empty strings.
 */
function noColorANSI(): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [key, _value] of Object.entries(ANSI)) {
    obj[key] = '';
  }
  return obj;
}
