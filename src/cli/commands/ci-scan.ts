// =============================================================================
// ultraenv — CLI Command: ci scan
// CI secret scan (SARIF output).
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { scan, formatScanResult } from '../../scanner/index.js';
import { resolve } from 'node:path';

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;
  const baseDir = resolve(cwd);
  const outputFormat = (args.flags['--format'] as string) ?? 'sarif';

  try {
    const result = await scan({
      cwd: baseDir,
      paths: args.positional.length > 0 ? args.positional : undefined,
      scanGitHistory: (args.flags['--git-history'] as boolean) ?? false,
      failFast: (args.flags['--fail-fast'] as boolean) ?? true,
      outputFormat: outputFormat as 'terminal' | 'json' | 'sarif',
    });

    const formatted = formatScanResult(
      result,
      outputFormat as 'terminal' | 'json' | 'sarif',
    );

    process.stdout.write(formatted + '\n');

    return result.found ? 1 : 0;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);

    if (outputFormat === 'sarif' || outputFormat === 'json') {
      process.stdout.write(JSON.stringify({ error: msg }) + '\n');
    } else {
      process.stderr.write(`Error: ${msg}\n`);
    }

    return 1;
  }
}
