// =============================================================================
// ultraenv — CLI Command: envs create
// Create new environment.
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { writeLine, writeError } from '../ui/renderer.js';
import { green, red, cyan, bold, yellow } from '../ui/colors.js';
import { createEnvironment, listTemplates } from '../../environments/creator.js';

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;
    const name = args.positional[0];

    if (!name) {
      writeError(red('  Environment name required.'));
      writeError(yellow('  Usage: ultraenv envs create <name> [options]'));
      writeLine('');
      writeLine(cyan('  Available templates:'));
      for (const t of listTemplates()) {
        writeLine(`    ${cyan(t.name.padEnd(12))} ${t.description}`);
      }
      writeLine('');
      return 1;
    }

    const template = args.flags['--template'] as string | undefined;
    const copyFrom = args.flags['--copy'] as string | undefined;

    writeLine(bold(`📝 Creating environment "${name}"`));
    writeLine('');

    await createEnvironment(name, {
      fromTemplate: template,
      copyFrom: copyFrom,
      cwd,
    });

    writeLine(green(`  ✓ Created .env.${name}`));
    writeLine('');
    writeLine(cyan('  Next: Edit .env.' + name + ' with your environment variables'));
    writeLine('');

    return 0;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    writeError(red(`  Error: ${msg}`));
    return 1;
  }
}
