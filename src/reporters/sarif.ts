// =============================================================================
// ultraenv — SARIF Reporter
// Generates SARIF (Static Analysis Results Interchange Format) output
// compatible with GitHub Code Scanning / CodeQL.
// =============================================================================

import type { ScanResult } from '../core/types.js';

// -----------------------------------------------------------------------------
// SARIF Types
// -----------------------------------------------------------------------------

/** SARIF severity level mapping */
type SarifLevel = 'error' | 'warning' | 'note';

/** SARIF rule object */
interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  helpUri?: string;
  properties: {
    'security-severity': string;
    tags: string[];
  };
}

/** SARIF physical location */
interface SarifPhysicalLocation {
  artifactLocation: { uri: string };
  region: {
    startLine: number;
    startColumn: number;
  };
}

/** SARIF location */
interface SarifLocation {
  physicalLocation: SarifPhysicalLocation;
  message: { text: string };
}

/** SARIF result */
interface SarifResult {
  ruleId: string;
  ruleIndex: number;
  level: SarifLevel;
  message: { text: string };
  locations: SarifLocation[];
  properties?: Record<string, unknown>;
}

/** SARIF run object */
interface SarifRun {
  tool: {
    driver: {
      name: string;
      version: string;
      informationUri: string;
      rules: SarifRule[];
    };
  };
  results: SarifResult[];
  invocations: Array<{
    executionSuccessful: boolean;
    startTimeUtc: string;
    endTimeUtc: string;
  }>;
}

/** Complete SARIF document */
interface SarifDocument {
  $schema: string;
  version: string;
  runs: SarifRun[];
}

// -----------------------------------------------------------------------------
// Severity Mapping
// -----------------------------------------------------------------------------

/** Map ultraenv severity to SARIF level and security-severity score */
function mapSeverity(severity: 'critical' | 'high' | 'medium'): {
  level: SarifLevel;
  securitySeverity: string;
} {
  switch (severity) {
    case 'critical':
      return { level: 'error', securitySeverity: '9.0' };
    case 'high':
      return { level: 'error', securitySeverity: '7.0' };
    case 'medium':
      return { level: 'warning', securitySeverity: '5.0' };
  }
}

// -----------------------------------------------------------------------------
// SARIF Reporter
// -----------------------------------------------------------------------------

/**
 * Report a scan result as a SARIF JSON string.
 *
 * Generates a valid SARIF v2.1.0 document compatible with:
 * - GitHub Code Scanning
 * - GitHub CodeQL action
 * - Azure DevOps
 * - VS Code SARIF Viewer
 *
 * @param result - The scan result to report
 * @param options - Reporter options
 * @returns SARIF JSON string
 *
 * @example
 * ```typescript
 * import { reportScanResult } from 'ultraenv/reporters/sarif';
 * import { writeFileSync } from 'fs';
 *
 * const sarif = reportScanResult(scanResult);
 * writeFileSync('results.sarif', sarif);
 * ```
 */
export function reportScanResult(
  result: ScanResult,
  options: {
    /** Tool version to report (default: '1.0.0') */
    toolVersion?: string;
    /** Custom rules to add to the SARIF output */
    additionalRules?: readonly SarifRule[];
  } = {},
): string {
  const { toolVersion = '1.0.0' } = options;

  // Collect unique rules from scan results
  const ruleMap = new Map<string, SarifRule>();
  const rules: SarifRule[] = [];

  for (const secret of result.secrets) {
    const pattern = secret.pattern;
    if (ruleMap.has(pattern.id)) continue;

    const { securitySeverity } = mapSeverity(pattern.severity);
    const rule: SarifRule = {
      id: pattern.id,
      name: pattern.name,
      shortDescription: { text: pattern.name },
      fullDescription: { text: pattern.description },
      helpUri: `https://github.com/ultraenv/ultraenv/blob/main/docs/rules/${pattern.id}.md`,
      properties: {
        'security-severity': securitySeverity,
        tags: [`security`, `secret`, pattern.category],
      },
    };

    ruleMap.set(pattern.id, rule);
    rules.push(rule);
  }

  // Add additional rules
  if (options.additionalRules !== undefined) {
    for (const rule of options.additionalRules) {
      if (!ruleMap.has(rule.id)) {
        ruleMap.set(rule.id, rule);
        rules.push(rule);
      }
    }
  }

  // Build results
  const sarifResults: SarifResult[] = [];

  for (const secret of result.secrets) {
    const pattern = secret.pattern;
    const ruleIndex = rules.findIndex((r) => r.id === pattern.id);
    if (ruleIndex === -1) continue;

    const { level } = mapSeverity(pattern.severity);

    const sarifResult: SarifResult = {
      ruleId: pattern.id,
      ruleIndex: ruleIndex,
      level,
      message: {
        text: `Potential secret detected: ${pattern.name}. ${pattern.description}`,
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
          message: {
            text: pattern.remediation,
          },
        },
      ],
      properties: {
        confidence: secret.confidence,
        category: pattern.category,
      },
    };

    sarifResults.push(sarifResult);
  }

  // Build SARIF document
  const document: SarifDocument = {
    $schema:
      'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'ultraenv',
            version: toolVersion,
            informationUri: 'https://github.com/ultraenv/ultraenv',
            rules,
          },
        },
        results: sarifResults,
        invocations: [
          {
            executionSuccessful: true,
            startTimeUtc: result.timestamp,
            endTimeUtc: new Date().toISOString(),
          },
        ],
      },
    ],
  };

  return JSON.stringify(document, null, 2);
}

/**
 * Create a minimal SARIF document with a single result.
 * Useful for programmatic SARIF generation.
 *
 * @param params - Parameters for the single result
 * @returns SARIF JSON string
 */
export function createSingleResultSarif(params: {
  ruleId: string;
  ruleName: string;
  ruleDescription: string;
  file: string;
  line: number;
  column: number;
  message: string;
  severity: 'critical' | 'high' | 'medium';
  category?: string;
}): string {
  const { securitySeverity } = mapSeverity(params.severity);
  const { level } = mapSeverity(params.severity);

  const rule: SarifRule = {
    id: params.ruleId,
    name: params.ruleName,
    shortDescription: { text: params.ruleName },
    fullDescription: { text: params.ruleDescription },
    properties: {
      'security-severity': securitySeverity,
      tags: ['security', 'secret', params.category ?? 'general'],
    },
  };

  const result: SarifResult = {
    ruleId: params.ruleId,
    ruleIndex: 0,
    level,
    message: { text: params.message },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: params.file },
          region: {
            startLine: params.line,
            startColumn: params.column,
          },
        },
        message: { text: params.ruleDescription },
      },
    ],
  };

  const document: SarifDocument = {
    $schema:
      'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'ultraenv',
            version: '1.0.0',
            informationUri: 'https://github.com/ultraenv/ultraenv',
            rules: [rule],
          },
        },
        results: [result],
        invocations: [
          {
            executionSuccessful: true,
            startTimeUtc: new Date().toISOString(),
            endTimeUtc: new Date().toISOString(),
          },
        ],
      },
    ],
  };

  return JSON.stringify(document, null, 2);
}
