// =============================================================================
// ultraenv — Table Formatter
// Formats tabular data into aligned terminal-friendly output.
// =============================================================================

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface TableOptions {
  /** Maximum total width (including borders/padding). 0 = no limit */
  maxWidth: number;
  /** Padding on each side of cell content */
  padding: number;
  /** Column alignment: 'left' | 'center' | 'right' */
  align: 'left' | 'center' | 'right';
}

const DEFAULT_OPTIONS: TableOptions = {
  maxWidth: 0,
  padding: 1,
  align: 'left',
};

// -----------------------------------------------------------------------------
// Word Wrapping
// -----------------------------------------------------------------------------

/**
 * Wrap text to fit within a given width.
 * Preserves existing newlines within cells.
 */
function wrapText(text: string, width: number): string[] {
  const rawLines = text.split('\n');
  const wrappedLines: string[] = [];

  for (const rawLine of rawLines) {
    if (width <= 0 || rawLine.length <= width) {
      wrappedLines.push(rawLine);
      continue;
    }

    let remaining = rawLine;
    while (remaining.length > width) {
      // Find a good break point
      let breakAt = width;
      const spaceIdx = remaining.lastIndexOf(' ', width);
      if (spaceIdx > width * 0.4) {
        breakAt = spaceIdx;
      }
      wrappedLines.push(remaining.slice(0, breakAt));
      remaining = remaining.slice(breakAt).trimStart();
    }
    if (remaining.length > 0) {
      wrappedLines.push(remaining);
    }
  }

  return wrappedLines;
}

// -----------------------------------------------------------------------------
// Alignment
// -----------------------------------------------------------------------------

/**
 * Align text within a given width.
 */
function alignText(text: string, width: number, alignment: 'left' | 'center' | 'right'): string {
  const diff = width - text.length;
  if (diff <= 0) return text;

  switch (alignment) {
    case 'right':
      return ' '.repeat(diff) + text;
    case 'center': {
      const left = Math.floor(diff / 2);
      const right = diff - left;
      return ' '.repeat(left) + text + ' '.repeat(right);
    }
    case 'left':
    default:
      return text + ' '.repeat(diff);
  }
}

// -----------------------------------------------------------------------------
// Column Width Calculation
// -----------------------------------------------------------------------------

/**
 * Calculate the natural width of each column (longest cell content).
 */
function calculateColumnWidths(headers: string[], rows: readonly string[][]): number[] {
  const colCount = headers.length;
  const widths: number[] = [];

  for (let col = 0; col < colCount; col++) {
    let maxWidth = (headers[col] ?? '').length;

    for (const row of rows) {
      const cellText = row[col] ?? '';
      for (const line of cellText.split('\n')) {
        if (line.length > maxWidth) {
          maxWidth = line.length;
        }
      }
    }

    widths.push(maxWidth);
  }

  return widths;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Draw a formatted table from headers and rows.
 *
 * @param headers - Column header strings
 * @param rows - Array of rows, each an array of cell strings
 * @param options - Formatting options
 * @returns The complete table as a string ready for terminal output
 */
export function drawTable(
  headers: string[],
  rows: readonly string[][],
  options?: Partial<TableOptions>,
): string {
  const opts: TableOptions = { ...DEFAULT_OPTIONS, ...options };
  const paddingStr = ' '.repeat(opts.padding);

  // Calculate natural widths
  const naturalWidths = calculateColumnWidths(headers, rows);

  // Apply maxWidth constraint if set
  let colWidths = naturalWidths;
  if (opts.maxWidth > 0) {
    const totalPadding = (headers.length * 2 + (headers.length - 1)) * opts.padding;
    const separatorWidth = headers.length - 1 + 2; // separators + borders
    const availableWidth = opts.maxWidth - totalPadding - separatorWidth;

    if (availableWidth > 0) {
      const avgWidth = Math.floor(availableWidth / headers.length);
      colWidths = naturalWidths.map((w) => Math.min(w, Math.max(avgWidth, 4)));
    }
  }

  // Wrap all cell content to column widths
  const wrappedHeaders: string[][] = headers.map((h, i) => wrapText(h, colWidths[i] ?? 8));

  const wrappedRows: string[][][] = rows.map((row) =>
    row.map((cell, i) => wrapText(cell, colWidths[i] ?? 8)),
  );

  // Determine the max number of lines per row
  const maxHeaderLines = Math.max(...wrappedHeaders.map((lines) => lines.length));
  const maxRowLines =
    rows.length > 0
      ? Math.max(...wrappedRows.map((row) => Math.max(...row.map((cell) => cell.length))))
      : 1;
  const maxLines = Math.max(maxHeaderLines, maxRowLines);

  const lines: string[] = [];

  // Build separator
  const separatorParts = colWidths.map((w) => '─'.repeat(w + opts.padding * 2));
  const separator = `┌${separatorParts.join('┬')}┐`;

  // Header separator
  const headerSep = `├${separatorParts.join('┼')}┤`;

  // Bottom separator
  const bottomSep = `└${separatorParts.join('┴')}┘`;

  // Top border
  lines.push(separator);

  // Header rows
  for (let lineIdx = 0; lineIdx < maxLines; lineIdx++) {
    const parts: string[] = [];

    for (let col = 0; col < headers.length; col++) {
      const cellLines = wrappedHeaders[col] ?? [''];
      const cellText = cellLines[lineIdx] ?? '';
      const colWidth = colWidths[col] ?? 8;
      const aligned = alignText(cellText, colWidth, opts.align);
      parts.push(`${paddingStr}${aligned}${paddingStr}`);
    }

    lines.push(`│${parts.join('│')}│`);
  }

  // Header separator
  lines.push(headerSep);

  // Data rows
  for (const wrappedRow of wrappedRows) {
    for (let lineIdx = 0; lineIdx < maxLines; lineIdx++) {
      const parts: string[] = [];

      for (let col = 0; col < headers.length; col++) {
        const cellLines = wrappedRow[col] ?? [''];
        const cellText = cellLines[lineIdx] ?? '';
        const colWidth = colWidths[col] ?? 8;
        const aligned = alignText(cellText, colWidth, opts.align);
        parts.push(`${paddingStr}${aligned}${paddingStr}`);
      }

      lines.push(`│${parts.join('│')}│`);
    }
  }

  // Bottom border
  lines.push(bottomSep);

  return lines.join('\n');
}
