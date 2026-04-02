// =============================================================================
// ultraenv — Box Drawing Utilities
// Unicode box drawing for error boxes, info panels, and banners.
// =============================================================================

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface BoxOptions {
  /** Optional title displayed in the top border */
  title?: string;
  /** Border style: 'single', 'double', or 'rounded' (default: 'single') */
  border?: 'single' | 'double' | 'rounded';
  /** Internal padding (left and right) in spaces (default: 1) */
  padding?: number;
  /** Fixed width. 0 = auto-fit to content (default: 0) */
  width?: number;
  /** Title alignment: 'left', 'center', or 'right' (default: 'left') */
  titleAlign?: 'left' | 'center' | 'right';
}

const DEFAULT_BOX_OPTIONS: Required<BoxOptions> = {
  title: '',
  border: 'single',
  padding: 1,
  width: 0,
  titleAlign: 'left',
};

// -----------------------------------------------------------------------------
// Border Characters
// -----------------------------------------------------------------------------

interface BorderChars {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
  titleLeft: string;
  titleRight: string;
  titleHorizontal: string;
}

const BORDERS: Record<'single' | 'double' | 'rounded', BorderChars> = {
  single: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    titleLeft: '├',
    titleRight: '┤',
    titleHorizontal: '─',
  },
  double: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
    titleLeft: '╠',
    titleRight: '╣',
    titleHorizontal: '═',
  },
  rounded: {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│',
    titleLeft: '├',
    titleRight: '┤',
    titleHorizontal: '─',
  },
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Calculate the visible width of a string (no ANSI codes) */
function visibleWidth(text: string): number {
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').length;
}

/** Pad a string to a given visible width, accounting for ANSI codes */
function padVisible(text: string, width: number): string {
  const visible = visibleWidth(text);
  const diff = width - visible;
  if (diff <= 0) return text;
  return text + ' '.repeat(diff);
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Draw a box around lines of text.
 *
 * @param lines - Array of text lines to box
 * @param options - Box formatting options
 * @returns The complete box as a string
 *
 * @example
 * const box = drawBox(['Error: File not found', 'Check the path and try again'], {
 *   title: 'ERROR',
 *   border: 'double',
 * });
 * console.log(box);
 */
export function drawBox(
  lines: readonly string[],
  options?: Partial<BoxOptions>,
): string {
  const opts: Required<BoxOptions> = { ...DEFAULT_BOX_OPTIONS, ...options };
  const chars = BORDERS[opts.border];

  // Calculate the content width
  let contentWidth = 0;
  for (const line of lines) {
    const w = visibleWidth(line);
    if (w > contentWidth) contentWidth = w;
  }

  const innerWidth = contentWidth + opts.padding * 2;

  // Use fixed width if specified
  const boxInnerWidth = opts.width > 0 ? opts.width - 2 : innerWidth;
  const boxContentWidth = boxInnerWidth - opts.padding * 2;

  // Adjust content width
  if (boxContentWidth < contentWidth) {
    // Content is wider than the box — truncate (but this shouldn't happen with auto-width)
    contentWidth = boxContentWidth;
  }

  const finalInnerWidth = contentWidth + opts.padding * 2;

  const result: string[] = [];

  // Top border
  if (opts.title && opts.title.length > 0) {
    const titleDisplay = ` ${opts.title} `;
    const titleVisible = visibleWidth(titleDisplay);
    const leftWidth = Math.max(2, Math.floor((finalInnerWidth - titleVisible) / 2));

    let titleLine: string;
    if (opts.titleAlign === 'center') {
      const left = chars.titleHorizontal.repeat(leftWidth);
      const right = chars.titleHorizontal.repeat(finalInnerWidth - titleVisible - leftWidth);
      titleLine = `${chars.topLeft}${left}${titleDisplay}${right}${chars.topRight}`;
    } else if (opts.titleAlign === 'right') {
      const right = chars.titleHorizontal.repeat(2);
      const left = chars.titleHorizontal.repeat(finalInnerWidth - titleVisible - 2);
      titleLine = `${chars.topLeft}${left}${titleDisplay}${right}${chars.topRight}`;
    } else {
      const right = chars.titleHorizontal.repeat(Math.max(2, finalInnerWidth - titleVisible));
      titleLine = `${chars.topLeft}${titleDisplay}${right}${chars.topRight}`;
    }
    result.push(titleLine);
  } else {
    result.push(`${chars.topLeft}${chars.horizontal.repeat(finalInnerWidth)}${chars.topRight}`);
  }

  // Content lines
  for (const line of lines) {
    const paddedLine = padVisible(line, boxContentWidth);
    const paddingStr = ' '.repeat(opts.padding);
    result.push(`${chars.vertical}${paddingStr}${paddedLine}${paddingStr}${chars.vertical}`);
  }

  // Bottom border
  result.push(`${chars.bottomLeft}${chars.horizontal.repeat(finalInnerWidth)}${chars.bottomRight}`);

  return result.join('\n');
}
