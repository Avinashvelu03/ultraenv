// =============================================================================
// ultraenv — Unicode Box Drawing Utility
// Provides helpers for drawing Unicode boxes (╔═╗ format) in terminal output.
// =============================================================================

// -----------------------------------------------------------------------------
// Box Characters
// -----------------------------------------------------------------------------

/** Unicode box drawing characters set */
export interface BoxChars {
  /** Top-left corner */
  topLeft: string;
  /** Top-right corner */
  topRight: string;
  /** Bottom-left corner */
  bottomLeft: string;
  /** Bottom-right corner */
  bottomRight: string;
  /** Horizontal line */
  horizontal: string;
  /** Vertical line */
  vertical: string;
  /** Left tee (vertical meets horizontal) */
  leftTee: string;
  /** Right tee (vertical meets horizontal) */
  rightTee: string;
}

/** Default box characters using double-line drawing */
export const DOUBLE: BoxChars = {
  topLeft: '╔',
  topRight: '╗',
  bottomLeft: '╚',
  bottomRight: '╝',
  horizontal: '═',
  vertical: '║',
  leftTee: '╠',
  rightTee: '╣',
} as const;

/** Single-line box characters */
export const SINGLE: BoxChars = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
  leftTee: '├',
  rightTee: '┤',
} as const;

/** Rounded box characters */
export const ROUNDED: BoxChars = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
  leftTee: '├',
  rightTee: '┤',
} as const;

// -----------------------------------------------------------------------------
// Box Drawing Functions
// -----------------------------------------------------------------------------

/**
 * Draw a horizontal rule for a box.
 *
 * @param width - Total inner width (content area, not including borders)
 * @param chars - Box character set to use
 * @returns The horizontal rule string (top or bottom border)
 *
 * @example
 * hRule(40, DOUBLE) // "╔════════════════════════════════════════╗"
 */
export function hRule(width: number, chars: BoxChars = DOUBLE): string {
  return `${chars.topLeft}${chars.horizontal.repeat(width + 2)}${chars.topRight}`;
}

/**
 * Draw a bottom horizontal rule.
 *
 * @param width - Total inner width
 * @param chars - Box character set to use
 */
export function hRuleBottom(width: number, chars: BoxChars = DOUBLE): string {
  return `${chars.bottomLeft}${chars.horizontal.repeat(width + 2)}${chars.bottomRight}`;
}

/**
 * Draw a middle separator line (tee connectors).
 *
 * @param width - Total inner width
 * @param chars - Box character set to use
 */
export function hRuleMiddle(width: number, chars: BoxChars = DOUBLE): string {
  return `${chars.leftTee}${chars.horizontal.repeat(width + 2)}${chars.rightTee}`;
}

/**
 * Wrap a single line of text in a box border.
 *
 * @param text - The text to wrap
 * @param width - Total inner width (text will be padded to this width)
 * @param chars - Box character set to use
 * @returns The boxed line with vertical borders on each side
 */
export function boxLine(text: string, width: number, chars: BoxChars = DOUBLE): string {
  const padded = text.length <= width ? text.padEnd(width) : text.slice(0, width);
  return `${chars.vertical} ${padded} ${chars.vertical}`;
}

/**
 * Draw a complete box around multiple lines of text.
 *
 * @param lines - Lines of text to put inside the box
 * @param chars - Box character set to use
 * @param padding - Number of spaces padding inside each border
 * @returns The complete box as a multi-line string
 *
 * @example
 * drawBox(['Error: Missing API key', '  Hint: Set API_KEY in .env'])
 * // ╔═══════════════════════════════╗
 * // ║ Error: Missing API key        ║
 * // ║   Hint: Set API_KEY in .env   ║
 * // ╚═══════════════════════════════╝
 */
export function drawBox(
  lines: readonly string[],
  chars: BoxChars = DOUBLE,
  padding: number = 1,
): string {
  if (lines.length === 0) {
    return [hRule(0, chars), boxLine('', 0, chars), hRuleBottom(0, chars)].join('\n');
  }

  const padStr = ' '.repeat(padding);
  const innerWidth = Math.max(
    ...lines.map((line) => {
      const stripped = stripAnsi(line);
      return stripped.length + padding * 2;
    }),
    0,
  );

  const result: string[] = [];

  // Top border
  result.push(hRule(innerWidth, chars));

  // Content lines
  for (const line of lines) {
    const stripped = stripAnsi(line);
    const visibleLen = stripped.length;
    const totalPad = innerWidth - visibleLen - padding * 2;
    const rightPad = Math.max(0, totalPad);
    result.push(
      `${chars.vertical}${padStr}${line}${' '.repeat(rightPad)}${padStr}${chars.vertical}`,
    );
  }

  // Bottom border
  result.push(hRuleBottom(innerWidth, chars));

  return result.join('\n');
}

/**
 * Draw a box with a title in the top border.
 *
 * @param title - The title to display in the top border
 * @param lines - Lines of content inside the box
 * @param chars - Box character set to use
 * @returns The titled box as a multi-line string
 *
 * @example
 * drawTitledBox('Validation Errors', ['API_KEY: missing', 'PORT: not a number'])
 * // ╔═ Validation Errors ═══════════╗
 * // ║ API_KEY: missing              ║
 * // ║ PORT: not a number            ║
 * // ╚═══════════════════════════════╝
 */
export function drawTitledBox(
  title: string,
  lines: readonly string[],
  chars: BoxChars = DOUBLE,
): string {
  if (lines.length === 0) {
    return [hRuleTitled(title, 0, chars), boxLine('', 0, chars), hRuleBottom(0, chars)].join('\n');
  }

  const innerWidth = Math.max(...lines.map((line) => stripAnsi(line).length), title.length + 2, 0);

  const result: string[] = [];

  // Titled top border
  result.push(hRuleTitled(title, innerWidth, chars));

  // Content lines
  for (const line of lines) {
    const stripped = stripAnsi(line);
    const visibleLen = stripped.length;
    const rightPad = Math.max(0, innerWidth - visibleLen);
    result.push(`${chars.vertical} ${line}${' '.repeat(rightPad)} ${chars.vertical}`);
  }

  // Bottom border
  result.push(hRuleBottom(innerWidth, chars));

  return result.join('\n');
}

/**
 * Draw a horizontal rule with a title embedded in it.
 *
 * @param title - Title text
 * @param width - Total inner width (the line extends to this width)
 * @param chars - Box character set to use
 */
export function hRuleTitled(title: string, width: number, chars: BoxChars = DOUBLE): string {
  const paddedTitle = ` ${title} `;
  const totalWidth = width + 2;
  const remaining = Math.max(0, totalWidth - paddedTitle.length);
  const right =
    remaining % 2 === 0
      ? chars.horizontal.repeat(remaining)
      : chars.horizontal.repeat(remaining) + ' ';
  return `${chars.topLeft}${chars.horizontal}${paddedTitle}${right}${chars.topRight}`;
}

// -----------------------------------------------------------------------------
// ANSI Stripping (duplicated from format.ts to avoid circular deps in reporters)
// -----------------------------------------------------------------------------

/**
 * Remove ANSI escape codes from a string (for measuring visible width).
 */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
}
