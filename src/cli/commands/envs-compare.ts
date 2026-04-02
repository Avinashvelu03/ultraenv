// =============================================================================
// ultraenv — CLI Command: envs compare
// Compare two environments.
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { writeLine, writeError } from '../ui/renderer.js';
import { red, bold, yellow } from '../ui/colors.js';
import { compareEnvironments, formatComparison } from '../../environments/comparator.js';

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;

    const env1 = args.positional[0] ?? (args.flags['--source'] as string);
    const env2 = args.positional[1] ?? (args.flags['--target'] as string);

    if (!env1 || !env2) {
      writeError(red('  Two environment names required.'));
      writeError(yellow('  Usage: ultraenv envs compare <env1> <env2>'));
      return 1;
    }

    writeLine(bold(`📊 Comparing environments: ${env1} vs ${env2}`));
    writeLine('');

    const comparison = await compareEnvironments(env1, env2, cwd);

    writeLine(formatComparison(comparison));
    writeLine('');

    if (comparison.warnings.length > 0) {
      writeLine(yellow(`  ⚠ ${comparison.warnings.length} warning(s) detected.`));
      writeLine('');
      return 1;
    }

    return 0;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    writeError(red(`  Error: ${msg}`));
    return 1;
  }
}
