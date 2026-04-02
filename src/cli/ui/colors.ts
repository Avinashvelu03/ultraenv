// =============================================================================
// ultraenv — ANSI Color Utilities
// Zero-dependency terminal color support using escape codes.
// =============================================================================

// -----------------------------------------------------------------------------
// ANSI Escape Codes
// -----------------------------------------------------------------------------

const ESC = '\x1b[';

const CODES = {
  reset: `${ESC}0m`,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  underline: `${ESC}4m`,
  red: `${ESC}31m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  blue: `${ESC}34m`,
  magenta: `${ESC}35m`,
  cyan: `${ESC}36m`,
  white: `${ESC}37m`,
  gray: `${ESC}90m`,
} as const;

// -----------------------------------------------------------------------------
// Color Functions
// -----------------------------------------------------------------------------

/** Apply bold formatting to text */
export const bold = (text: string): string =>
  colorEnabled ? `${CODES.bold}${text}${CODES.reset}` : text;

/** Apply dim formatting to text */
export const dim = (text: string): string =>
  colorEnabled ? `${CODES.dim}${text}${CODES.reset}` : text;

/** Apply underline formatting to text */
export const underline = (text: string): string =>
  colorEnabled ? `${CODES.underline}${text}${CODES.reset}` : text;

/** Apply red color to text */
export const red = (text: string): string =>
  colorEnabled ? `${CODES.red}${text}${CODES.reset}` : text;

/** Apply green color to text */
export const green = (text: string): string =>
  colorEnabled ? `${CODES.green}${text}${CODES.reset}` : text;

/** Apply yellow color to text */
export const yellow = (text: string): string =>
  colorEnabled ? `${CODES.yellow}${text}${CODES.reset}` : text;

/** Apply blue color to text */
export const blue = (text: string): string =>
  colorEnabled ? `${CODES.blue}${text}${CODES.reset}` : text;

/** Apply magenta color to text */
export const magenta = (text: string): string =>
  colorEnabled ? `${CODES.magenta}${text}${CODES.reset}` : text;

/** Apply cyan color to text */
export const cyan = (text: string): string =>
  colorEnabled ? `${CODES.cyan}${text}${CODES.reset}` : text;

/** Apply white color to text */
export const white = (text: string): string =>
  colorEnabled ? `${CODES.white}${text}${CODES.reset}` : text;

/** Apply gray color to text */
export const gray = (text: string): string =>
  colorEnabled ? `${CODES.gray}${text}${CODES.reset}` : text;

// -----------------------------------------------------------------------------
// Styled Helpers
// -----------------------------------------------------------------------------

/** Format an error message with red bold styling */
export const styled = {
  error: (text: string): string => red(bold(text)),
  success: (text: string): string => green(bold(text)),
  warning: (text: string): string => yellow(bold(text)),
  info: (text: string): string => blue(text),
  title: (text: string): string => cyan(bold(text)),
  muted: (text: string): string => gray(text),
  highlight: (text: string): string => bold(text),
} as const;

// -----------------------------------------------------------------------------
// Color Enablement
// -----------------------------------------------------------------------------

/**
 * Whether color output is enabled.
 * Controlled by --no-color flag, NO_COLOR env var, and TTY detection.
 */
let colorEnabled = true;

/**
 * Set the color enabled state.
 * Called by the CLI parser when --no-color is detected.
 */
export function setColorEnabled(enabled: boolean): void {
  colorEnabled = enabled;
}

/**
 * Get the current color enabled state.
 */
export function isColorEnabled(): boolean {
  return colorEnabled;
}

/**
 * Check whether color output should be supported.
 * Respects NO_COLOR env var and whether stdout is a TTY.
 */
export function supportsColor(): boolean {
  // NO_COLOR spec: https://no-color.org/
  if (process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== '') {
    return false;
  }

  // Check if stdout is a TTY
  if (process.stdout !== undefined && !process.stdout.isTTY) {
    return false;
  }

  return true;
}

/**
 * Initialize color support based on environment.
 * Call this once at CLI startup before using color functions.
 */
export function initColorSupport(noColorFlag: boolean = false): void {
  if (noColorFlag || !supportsColor()) {
    colorEnabled = false;
  } else {
    colorEnabled = true;
  }
}

// -----------------------------------------------------------------------------
// ANSI Stripping
// -----------------------------------------------------------------------------

/** Regex that matches all ANSI escape sequences */
const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]/g;

/**
 * Strip all ANSI escape codes from a string.
 * Useful for logging, length calculations, and non-terminal output.
 */
export function noColor(text: string): string {
  return text.replace(ANSI_REGEX, '');
}

/**
 * Calculate the visible (non-ANSI) length of a string.
 */
export function visibleLength(text: string): number {
  return noColor(text).length;
}
