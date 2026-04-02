// =============================================================================
// ultraenv — Formatting Utilities
// String formatting, masking, and display helpers.
// =============================================================================

// -----------------------------------------------------------------------------
// Masking
// -----------------------------------------------------------------------------

/**
 * Mask a secret value, showing only the first `visibleChars` and last 4 characters.
 * @example maskSecret('sk-abc12345def67890') → 'sk-a************7890'
 * @example maskSecret('short') → '****'
 */
export function maskSecret(value: string, visibleChars: number = 4): string {
  if (value.length === 0) return '';
  if (value.length <= visibleChars + 4) {
    return '*'.repeat(value.length);
  }
  const prefix = value.slice(0, visibleChars);
  const suffix = value.slice(-4);
  const masked = '*'.repeat(Math.max(4, value.length - visibleChars - 4));
  return `${prefix}${masked}${suffix}`;
}

// -----------------------------------------------------------------------------
// Truncation
// -----------------------------------------------------------------------------

/**
 * Truncate a string to `maxLength`, appending `suffix` if truncated.
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) return str;
  if (maxLength <= suffix.length) return suffix.slice(0, maxLength);
  return str.slice(0, maxLength - suffix.length) + suffix;
}

// -----------------------------------------------------------------------------
// Padding
// -----------------------------------------------------------------------------

/**
 * Pad a string on the right with spaces to reach `length`.
 */
export function padRight(str: string, length: number, char: string = ' '): string {
  if (str.length >= length) return str;
  return str + char.repeat(length - str.length);
}

/**
 * Pad a string on the left with spaces to reach `length`.
 */
export function padLeft(str: string, length: number, char: string = ' '): string {
  if (str.length >= length) return str;
  return char.repeat(length - str.length) + str;
}

// -----------------------------------------------------------------------------
// Indentation
// -----------------------------------------------------------------------------

/**
 * Indent every line of a multi-line string by `spaces` spaces.
 */
export function indent(str: string, spaces: number): string {
  const prefix = ' '.repeat(spaces);
  return str
    .split('\n')
    .map((line) => (line.trim() === '' ? '' : prefix + line))
    .join('\n');
}

// -----------------------------------------------------------------------------
// Byte Formatting
// -----------------------------------------------------------------------------

/**
 * Format a byte count as a human-readable string.
 * @example formatBytes(1024) → '1 KB'
 * @example formatBytes(1536000) → '1.46 MB'
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return `-${formatBytes(Math.abs(bytes))}`;

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);

  // Use 0 decimal places for bytes and kilobytes, 2 for larger
  const decimals = exponent <= 1 ? 0 : 2;
  return `${value.toFixed(decimals)} ${units[exponent]}`;
}

// -----------------------------------------------------------------------------
// Duration Formatting
// -----------------------------------------------------------------------------

/**
 * Format a duration in milliseconds as a human-readable string.
 * @example formatDuration(1500) → '1.5s'
 * @example formatDuration(350) → '350ms'
 */
export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) {
    const minutes = Math.floor(ms / 60_000);
    const seconds = Math.round((ms % 60_000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.round((ms % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}

// -----------------------------------------------------------------------------
// Timestamp
// -----------------------------------------------------------------------------

/**
 * Format a Date (or ISO string) as an ISO 8601 timestamp.
 */
export function formatTimestamp(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

// -----------------------------------------------------------------------------
// List Formatting
// -----------------------------------------------------------------------------

/**
 * Format an array of strings as a readable list.
 * @example formatList(['a', 'b', 'c']) → 'a, b, and c'
 * @example formatList(['a', 'b']) → 'a and b'
 * @example formatList(['a']) → 'a'
 */
export function formatList(items: readonly string[], conjunction: string = 'and'): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]!} ${conjunction} ${items[1]!}`;
  const allButLast = items.slice(0, -1).join(', ');
  const last = items[items.length - 1]!;
  return `${allButLast}, ${conjunction} ${last}`;
}

// -----------------------------------------------------------------------------
// Pluralization
// -----------------------------------------------------------------------------

/**
 * Pluralize a word based on a count.
 * @example pluralize(1, 'file') → '1 file'
 * @example pluralize(5, 'file') → '5 files'
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  const word = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${count} ${word}`;
}

// -----------------------------------------------------------------------------
// Humanize
// -----------------------------------------------------------------------------

/**
 * Convert a camelCase or snake_case string to "Title Case".
 * @example humanize('camelCase') → 'Camel Case'
 * @example humanize('snake_case') → 'Snake Case'
 * @example humanize('kebab-case') → 'Kebab Case'
 * @example humanize('ALREADY_UPPER') → 'Already Upper'
 */
export function humanize(str: string): string {
  return (
    str
      // Insert space before uppercase letters in camelCase
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // Handle consecutive uppercase followed by lowercase (e.g., "XMLParser" → "XML Parser")
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      // Replace separators with spaces
      .replace(/[-_./\\]/g, ' ')
      // Collapse multiple spaces
      .replace(/\s+/g, ' ')
      // Trim
      .trim()
      // Title case: uppercase first letter of each word
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

// -----------------------------------------------------------------------------
// HTML Escaping
// -----------------------------------------------------------------------------

/**
 * Escape HTML special characters to prevent XSS.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// -----------------------------------------------------------------------------
// ANSI Stripping
// -----------------------------------------------------------------------------

/**
 * Remove ANSI escape codes from a string.
 */
export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
}

// -----------------------------------------------------------------------------
// Table Alignment Helper
// -----------------------------------------------------------------------------

/**
 * Align rows of a text table by padding columns.
 * @param rows - 2D array of strings (each inner array is a row).
 * @returns Formatted table string.
 */
export function alignTable(rows: readonly (readonly string[])[]): string {
  if (rows.length === 0) return '';

  // Determine column count from the longest row
  const colCount = Math.max(...rows.map((row) => row.length));

  // Calculate max width for each column
  const colWidths: number[] = [];
  for (let col = 0; col < colCount; col++) {
    const maxW = Math.max(...rows.map((row) => (col < row.length ? row[col]!.length : 0)));
    colWidths.push(maxW);
  }

  return rows
    .map((row) => row.map((cell, col) => padRight(cell, colWidths[col] ?? 0)).join('  '))
    .join('\n');
}
