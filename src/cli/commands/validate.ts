// =============================================================================
// ultraenv — CLI Command: validate
// Validate environment against schema and show results.
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { loadWithResult } from '../../core/loader.js';
import { writeLine, writeError, writeJson } from '../ui/renderer.js';
import { green, red, yellow, cyan, bold } from '../ui/colors.js';
import { drawTable } from '../ui/table.js';
import { resolve } from 'node:path';

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;
    const envDir = resolve(cwd);

    const result = loadWithResult({
      envDir,
      expandVariables: ctx.config.expandVariables,
      overrideProcessEnv: false,
      mergeStrategy: ctx.config.mergeStrategy,
    });

    if (ctx.outputFormat === 'json') {
      writeJson({
        valid: true,
        metadata: result.metadata,
        variables: Object.keys(result.env).length,
        env: result.env,
      });
      return 0;
    }

    writeLine(bold('🔍 Environment Validation'));
    writeLine('');
    writeLine(cyan('  Files parsed: ') + `${result.metadata.filesParsed}`);
    writeLine(cyan('  Total variables: ') + `${result.metadata.totalVars}`);
    writeLine(cyan('  Load time: ') + `${result.metadata.loadTimeMs}ms`);
    writeLine(cyan('  Had overrides: ') + `${result.metadata.hadOverrides ? 'yes' : 'no'}`);
    writeLine('');

    if (result.metadata.totalVars === 0) {
      writeLine(yellow('  ⚠ No environment variables found.'));
      writeLine(yellow('  Create a .env file in your project directory.'));
      return 1;
    }

    // Show loaded files
    if (result.parsed.length > 0) {
      writeLine(bold('  Loaded files:'));
      for (const file of result.parsed) {
        const status = file.exists ? green('✓') : red('✗');
        const varCount = `${file.vars.length} var(s)`;
        writeLine(`    ${status} ${file.path} (${varCount})`);
      }
      writeLine('');
    }

    // Show variables table
    const vars = Object.entries(result.env);
    if (vars.length > 0 && !(args.flags['--quiet'] as boolean)) {
      const maxShow = 50;
      const shownVars = vars.slice(0, maxShow);

      const headers = ['Variable', 'Value', 'Source'];
      const rows: string[][] = shownVars.map(([key, value]) => {
        // Find source
        let source = 'unknown';
        for (const pf of result.parsed) {
          const found = pf.vars.find(v => v.key === key);
          if (found) {
            source = pf.path.replace(envDir + '/', '');
            break;
          }
        }
        const displayValue = value.length > 40 ? value.slice(0, 37) + '...' : value;
        return [key, displayValue, source];
      });

      writeLine(drawTable(headers, rows, { maxWidth: 100 }));

      if (vars.length > maxShow) {
        writeLine(yellow(`  ... and ${vars.length - maxShow} more variables`));
      }
    }

    writeLine('');
    writeLine(green(bold('  ✅ Environment validated successfully')));
    writeLine('');

    return 0;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    writeError(red(`  Validation error: ${msg}`));
    return 1;
  }
}
