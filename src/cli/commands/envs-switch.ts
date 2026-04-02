// =============================================================================
// ultraenv — CLI Command: envs switch
// Switch current environment.
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { writeLine, writeError } from '../ui/renderer.js';
import { green, red, cyan, bold, yellow } from '../ui/colors.js';
import { switchEnvironment, getActiveEnvironment } from '../../environments/manager.js';

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;

    // Show current if no name given
    const name = args.positional[0];

    if (!name) {
      const current = await getActiveEnvironment(cwd);
      writeLine(cyan(`  Current environment: ${bold(current)}`));
      writeLine('');
      return 0;
    }

    // Show what we're switching from
    const previous = await getActiveEnvironment(cwd);
    if (previous !== 'base') {
      writeLine(cyan(`  Switching from "${previous}" to "${name}"...`));
    } else {
      writeLine(cyan(`  Switching to "${name}"...`));
    }

    await switchEnvironment(name, cwd);

    writeLine(green(bold(`  ✅ Switched to "${name}"`)));
    writeLine(yellow('  .env.local has been updated with the environment variables.'));
    writeLine('');

    return 0;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    writeError(red(`  Error: ${msg}`));
    return 1;
  }
}
