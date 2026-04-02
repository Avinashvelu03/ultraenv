// =============================================================================
// ultraenv — CLI Command: ci validate
// CI validation mode (exit codes, JSON output).
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { loadWithResult } from '../../core/loader.js';
import { writeJson } from '../ui/renderer.js';

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const strict = args.flags['--strict'] as boolean | undefined;
    const envDir = (args.flags['--env-dir'] as string) ?? ctx.config.envDir;

    const result = loadWithResult({
      envDir,
      expandVariables: ctx.config.expandVariables,
      overrideProcessEnv: false,
      mergeStrategy: ctx.config.mergeStrategy,
    });

    const warnings: string[] = [];
    const errors: string[] = [];

    if (result.metadata.totalVars === 0) {
      errors.push('No environment variables loaded');
    }

    // Check for empty values (required vars shouldn't be empty)
    for (const [key, value] of Object.entries(result.env)) {
      if (value === '' && strict) {
        errors.push(`Empty value: ${key}`);
      } else if (value === '') {
        warnings.push(`Empty value: ${key}`);
      }
    }

    const valid = errors.length === 0;

    const output = {
      valid,
      errors,
      warnings,
      metadata: {
        totalVars: result.metadata.totalVars,
        filesParsed: result.metadata.filesParsed,
        loadTimeMs: result.metadata.loadTimeMs,
      },
      variables: Object.keys(result.env).length,
    };

    writeJson(output);
    return valid ? 0 : 1;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    writeJson({ valid: false, errors: [msg], warnings: [] });
    return 1;
  }
}
