// =============================================================================
// ultraenv — CLI Command: envs list
// List all environments.
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { writeLine, writeError, writeJson } from '../ui/renderer.js';
import { red, cyan, bold, yellow } from '../ui/colors.js';
import { drawTable } from '../ui/table.js';
import { listEnvironments } from '../../environments/manager.js';

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;

    const environments = await listEnvironments(cwd);

    if (ctx.outputFormat === 'json') {
      writeJson({ environments });
      return 0;
    }

    writeLine(bold('📋 Environments'));
    writeLine('');

    const existing = environments.filter((e) => e.exists);

    if (existing.length === 0) {
      writeLine(yellow('  No environment files found.'));
      writeLine('  Create one with: ultraenv envs create <name>');
      writeLine('');
      return 0;
    }

    const headers = ['Name', 'File', 'Variables', 'Size', 'Modified'];
    const rows: string[][] = existing.map((env) => {
      const size =
        env.fileSize > 1024 ? `${(env.fileSize / 1024).toFixed(1)} KB` : `${env.fileSize} B`;
      const modified = env.lastModified ? env.lastModified.slice(0, 19).replace('T', ' ') : '-';
      return [env.name, env.fileName, String(env.variableCount), size, modified];
    });

    writeLine(drawTable(headers, rows, { maxWidth: 100 }));
    writeLine('');
    writeLine(cyan(`  ${existing.length} environment(s) found.`));
    writeLine('');

    return 0;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    writeError(red(`  Error: ${msg}`));
    return 1;
  }
}
