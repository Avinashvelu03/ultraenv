// =============================================================================
// ultraenv — CLI Command: scan
// Scan for leaked secrets in files, git history, staged files, diff.
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { writeLine, writeError } from '../ui/renderer.js';
import { red, bold } from '../ui/colors.js';
import { resolve } from 'node:path';
import { scan, formatScanResult } from '../../scanner/index.js';

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;
    const baseDir = resolve(cwd);

    // Scan scope: files | git-history | staged | diff | all
    const scope = (args.flags['--scope'] as string) ?? 'files';

    // Output format: terminal | json | sarif
    const outputFormat =
      (args.flags['--format'] as string) ?? (ctx.outputFormat === 'json' ? 'json' : 'terminal');

    // Include/exclude patterns
    const include = args.flags['--include'] as string | undefined;
    const exclude = args.flags['--exclude'] as string | undefined;

    // Build scan options
    const scanOptions = {
      cwd: baseDir,
      paths: args.positional.length > 0 ? args.positional : undefined,
      include: include ? [include] : undefined,
      exclude: exclude ? [exclude] : undefined,
      scanGitHistory: scope === 'git-history' || scope === 'all',
      scanStaged: scope === 'staged',
      diffFrom: scope === 'diff' ? ((args.flags['--from'] as string) ?? 'HEAD') : undefined,
      diffTo: scope === 'diff' ? (args.flags['--to'] as string) : undefined,
      failFast: (args.flags['--fail-fast'] as boolean) ?? false,
      outputFormat: outputFormat as 'terminal' | 'json' | 'sarif',
    };

    writeLine(bold('🔐 Scanning for secrets...'));
    writeLine('');

    const result = await scan(scanOptions);

    // Output
    const formatted = formatScanResult(result, outputFormat as 'terminal' | 'json' | 'sarif');
    process.stdout.write(formatted + '\n');

    if (result.found) {
      writeLine('');
      writeError(red(bold(`  Found ${result.secrets.length} potential secret(s)!`)));
      writeLine('');
      return 1;
    }

    return 0;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    writeError(red(`  Scan error: ${msg}`));
    return 1;
  }
}
