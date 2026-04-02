// =============================================================================
// ultraenv — Scan Result Reporter
// Formats scan results for terminal output, JSON, and SARIF (GitHub Security).
// =============================================================================

import type { ScanResult, SecretPattern } from '../core/types.js';
import { maskValue } from '../utils/mask.js';

// -----------------------------------------------------------------------------
// Severity Display
// -----------------------------------------------------------------------------

type Severity = 'critical' | 'high' | 'medium' | 'low';

interface SeverityConfig {
  icon: string;
  color: string;
  terminalColor: string;
  label: string;
  sarifLevel: string;
}

const SEVERITY_CONFIG: Record<Severity, SeverityConfig> = {
  critical: {
    icon: '\u274C',  // ❌
    color: '#dc2626',
    terminalColor: '\x1b[31m',  // red
    label: 'CRITICAL',
    sarifLevel: 'error',
  },
  high: {
    icon: '\u26A0\uFE0F',  // ⚠️
    color: '#ea580c',
    terminalColor: '\x1b[33m',  // yellow
    label: 'HIGH',
    sarifLevel: 'error',
  },
  medium: {
    icon: '\u2139\uFE0F',  // ℹ️
    color: '#2563eb',
    terminalColor: '\x1b[36m',  // cyan
    label: 'MEDIUM',
    sarifLevel: 'warning',
  },
  low: {
    icon: '\u2022',  // •
    color: '#6b7280',
    terminalColor: '\x1b[90m',  // gray
    label: 'LOW',
    sarifLevel: 'note',
  },
};

/**
 * Get the severity level from a SecretPattern.
 * Maps the pattern's severity field, falling back to confidence-based heuristic.
 */
function getSeverity(pattern: SecretPattern): Severity {
  // If the pattern has an explicit severity field, use it
  const severity = (pattern as SecretPattern & { severity?: Severity }).severity;
  if (severity !== undefined && severity in SEVERITY_CONFIG) {
    return severity;
  }

  // Fall back to confidence-based heuristic
  if (pattern.confidence >= 0.9) return 'critical';
  if (pattern.confidence >= 0.7) return 'high';
  return 'medium';
}

/**
 * Get the severity icon for terminal display.
 *
 * @param severity - The severity level string.
 * @returns The emoji/icon character for the severity.
 */
export function getSeverityIcon(severity: string): string {
  const level = severity as Severity;
  return SEVERITY_CONFIG[level]?.icon ?? '\u2022';
}

/**
 * Get a masked preview of a secret value.
 * Shows the first 3 and last 4 characters, masking the rest.
 *
 * @param value - The secret value to preview.
 * @returns The masked preview string.
 */
export function getSecretPreview(value: string): string {
  return maskValue(value);
}

// -----------------------------------------------------------------------------
// Terminal Reporter
// -----------------------------------------------------------------------------

/**
 * ANSI color code reset.
 */
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

/**
 * Format a scan result as a rich terminal output.
 *
 * Displays:
 * - A header with scan summary
 * - A table of findings with severity, file, line, type, and masked value
 * - A footer with remediation hints
 */
function formatTerminal(result: ScanResult): string {
  const lines: string[] = [];

  // Header
  const totalCount = result.secrets.length;
  const criticalCount = result.secrets.filter(
    (s) => getSeverity(s.pattern) === 'critical',
  ).length;
  const highCount = result.secrets.filter(
    (s) => getSeverity(s.pattern) === 'high',
  ).length;
  const mediumCount = result.secrets.filter(
    (s) => getSeverity(s.pattern) === 'medium',
  ).length;

  lines.push('');
  lines.push(`${BOLD}=== ultraenv Secret Scan Report ===${RESET}`);
  lines.push('');
  lines.push(`  Files scanned: ${result.filesScanned.length}`);
  lines.push(`  Files skipped: ${result.filesSkipped.length}`);
  lines.push(`  Scan time:      ${result.scanTimeMs.toFixed(0)}ms`);
  lines.push(`  Timestamp:      ${result.timestamp}`);
  lines.push('');

  if (totalCount === 0) {
    lines.push(`${BOLD}\u2705 No secrets detected.${RESET}`);
    lines.push('');
    return lines.join('\n');
  }

  // Summary counts
  const summaryParts: string[] = [];
  if (criticalCount > 0) {
    summaryParts.push(`${SEVERITY_CONFIG.critical.terminalColor}${BOLD}${criticalCount} critical${RESET}`);
  }
  if (highCount > 0) {
    summaryParts.push(`${SEVERITY_CONFIG.high.terminalColor}${BOLD}${highCount} high${RESET}`);
  }
  if (mediumCount > 0) {
    summaryParts.push(`${SEVERITY_CONFIG.medium.terminalColor}${mediumCount} medium${RESET}`);
  }

  lines.push(`${BOLD}Found ${totalCount} secret(s):${RESET} ${summaryParts.join(', ')}`);
  lines.push('');

  // Table header
  const colSev = ' SEV ';
  const colFile = ' FILE ';
  const colLine = 'LINE';
  const colType = ' TYPE ';
  const colValue = ' VALUE ';

  lines.push(
    `  ${DIM}${colSev}  ${colFile.padEnd(35)} ${colLine.padStart(4)}  ${colType.padEnd(28)} ${colValue}${RESET}`,
  );
  lines.push(`  ${DIM}${'─'.repeat(95)}${RESET}`);

  // Table rows
  for (const secret of result.secrets) {
    const severity = getSeverity(secret.pattern);
    const config = SEVERITY_CONFIG[severity];

    const sevStr = `${config.terminalColor}${config.label.padEnd(8)}${RESET}`;
    const fileStr = secret.file.length > 34
      ? '...' + secret.file.slice(-31)
      : secret.file.padEnd(35);
    const lineStr = String(secret.line).padStart(4);
    const typeStr = secret.type.length > 27
      ? secret.type.slice(0, 25) + '..'
      : secret.type.padEnd(28);
    const valueStr = secret.value.length > 25
      ? secret.value.slice(0, 23) + '..'
      : secret.value;

    lines.push(`  ${sevStr}  ${DIM}${fileStr}${RESET} ${lineStr}  ${typeStr} ${valueStr}`);
  }

  // Remediation hints
  lines.push('');
  lines.push(`${BOLD}Remediation:${RESET}`);

  // Deduplicate remediation messages
  const seenRemediations = new Set<string>();
  let remediationCount = 0;
  for (const secret of result.secrets) {
    if (seenRemediations.has(secret.pattern.remediation)) continue;
    if (remediationCount >= 5) {
      const remaining = result.secrets.length - remediationCount;
      lines.push(`  ${DIM}... and ${remaining} more finding(s)${RESET}`);
      break;
    }
    seenRemediations.add(secret.pattern.remediation);
    lines.push(`  ${DIM}\u2022 ${secret.pattern.remediation}${RESET}`);
    remediationCount++;
  }

  lines.push('');
  lines.push(`${BOLD}Scan again with: ultraenv scan${RESET}`);
  lines.push('');

  return lines.join('\n');
}

// -----------------------------------------------------------------------------
// JSON Reporter
// -----------------------------------------------------------------------------

/**
 * Format a scan result as a structured JSON string.
 */
function formatJson(result: ScanResult): string {
  const output = {
    found: result.found,
    summary: {
      total: result.secrets.length,
      critical: result.secrets.filter((s) => getSeverity(s.pattern) === 'critical').length,
      high: result.secrets.filter((s) => getSeverity(s.pattern) === 'high').length,
      medium: result.secrets.filter((s) => getSeverity(s.pattern) === 'medium').length,
    },
    filesScanned: result.filesScanned,
    filesSkipped: result.filesSkipped,
    scanTimeMs: Math.round(result.scanTimeMs),
    timestamp: result.timestamp,
    secrets: result.secrets.map((secret) => ({
      type: secret.type,
      value: secret.value,
      file: secret.file,
      line: secret.line,
      column: secret.column,
      severity: getSeverity(secret.pattern),
      confidence: Math.round(secret.confidence * 100) / 100,
      patternId: secret.pattern.id,
      patternName: secret.pattern.name,
      category: (secret.pattern as SecretPattern & { category?: string }).category ?? 'unknown',
      description: secret.pattern.description,
      remediation: secret.pattern.remediation,
      varName: secret.varName,
    })),
  };

  return JSON.stringify(output, null, 2);
}

// -----------------------------------------------------------------------------
// SARIF Reporter
// -----------------------------------------------------------------------------

/**
 * SARIF rule definition for a secret pattern.
 */
interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  helpUri: string;
  properties: {
    'security-severity': string;
    tags: string[];
  };
  defaultConfiguration: {
    level: string;
  };
}

/**
 * SARIF result for a detected secret.
 */
interface SarifResult {
  ruleId: string;
  level: string;
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region: {
        startLine: number;
        startColumn: number;
      };
    };
  }>;
  properties: {
    confidence: number;
    category: string;
  };
}

/**
 * Format a scan result as a SARIF (Static Analysis Results Interchange Format) document.
 * Compatible with GitHub Security tab and other SARIF consumers.
 */
function formatSarif(result: ScanResult): string {
  // Deduplicate patterns into rules
  const ruleMap = new Map<string, SarifRule>();

  for (const secret of result.secrets) {
    if (!ruleMap.has(secret.pattern.id)) {
      const severity = getSeverity(secret.pattern);
      const severityScore = severity === 'critical' ? '9.0' : severity === 'high' ? '7.0' : '4.0';
      const category = (secret.pattern as SecretPattern & { category?: string }).category ?? 'unknown';

      ruleMap.set(secret.pattern.id, {
        id: secret.pattern.id,
        name: secret.pattern.name,
        shortDescription: { text: secret.pattern.description },
        fullDescription: { text: `${secret.pattern.description}\n\n${secret.pattern.remediation}` },
        helpUri: 'https://docs.github.com/en/code-security/secret-scanning',
        properties: {
          'security-severity': severityScore,
          tags: ['security', 'secret', category],
        },
        defaultConfiguration: {
          level: SEVERITY_CONFIG[severity].sarifLevel,
        },
      });
    }
  }

  // Build results
  const sarifResults: SarifResult[] = result.secrets.map((secret) => ({
    ruleId: secret.pattern.id,
    level: SEVERITY_CONFIG[getSeverity(secret.pattern)].sarifLevel,
    message: {
      text: `Potential ${secret.type} detected (confidence: ${Math.round(secret.confidence * 100)}%). ${secret.pattern.description}`,
    },
    locations: [
      {
        physicalLocation: {
          artifactLocation: {
            uri: secret.file,
          },
          region: {
            startLine: secret.line,
            startColumn: secret.column,
          },
        },
      },
    ],
    properties: {
      confidence: Math.round(secret.confidence * 100) / 100,
      category: (secret.pattern as SecretPattern & { category?: string }).category ?? 'unknown',
    },
  }));

  // Build SARIF document
  const sarifDocument = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'ultraenv',
            version: '1.0.0',
            informationUri: 'https://github.com/Avinashvelu03/ultraenv',
            rules: [...ruleMap.values()],
          },
        },
        results: sarifResults,
      },
    ],
  };

  return JSON.stringify(sarifDocument, null, 2);
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Supported output formats.
 */
type OutputFormat = 'terminal' | 'json' | 'sarif';

/**
 * Format a scan result in the specified output format.
 *
 * @param result - The scan result to format.
 * @param format - The output format ('terminal', 'json', or 'sarif').
 * @returns A formatted string representation of the scan result.
 */
export function formatScanResult(result: ScanResult, format: OutputFormat): string {
  switch (format) {
    case 'terminal':
      return formatTerminal(result);
    case 'json':
      return formatJson(result);
    case 'sarif':
      return formatSarif(result);
    default: {
      const _exhaustive: never = format;
      throw new Error(`Unknown format: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Export the getSeverity helper for external use.
 */
export { getSeverity };
