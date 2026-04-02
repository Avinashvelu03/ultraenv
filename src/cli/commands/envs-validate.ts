// =============================================================================
// ultraenv — CLI Command: envs validate
// Validate all environments.
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { writeLine, writeError, writeJson } from '../ui/renderer.js';
import { green, red, bold, yellow } from '../ui/colors.js';
import { drawTable } from '../ui/table.js';
import { validateAllEnvironments } from '../../environments/manager.js';

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;

    writeLine(bold('✅ Validating all environments'));
    writeLine('');

    const schema = ctx.config.schema as Record<string, unknown> | undefined;
    if (!schema) {
      writeLine(yellow('  No schema defined in configuration. Basic validation only.'));
      writeLine('');
    }

    const results = await validateAllEnvironments(ctx.config.schema?.definitions ?? {}, cwd);

    if (ctx.outputFormat === 'json') {
      const jsonResults: Record<string, { valid: boolean; errors: string[]; warnings: string[] }> =
        {};
      for (const [name, result] of results) {
        jsonResults[name] = {
          valid: result.valid,
          errors: result.errors.map((e) => e.message),
          warnings: result.warnings.map((w) => w.message),
        };
      }
      writeJson({ environments: jsonResults });
      return [...results.values()].every((r) => r.valid) ? 0 : 1;
    }

    const headers = ['Environment', 'Status', 'Errors', 'Warnings'];
    const rows: string[][] = [];

    for (const [name, result] of results) {
      const status = result.valid ? green('✓ Pass') : red('✗ Fail');
      rows.push([name, status, String(result.errors.length), String(result.warnings.length)]);
    }

    writeLine(drawTable(headers, rows, { maxWidth: 80 }));
    writeLine('');

    // Show details for failures
    let hasErrors = false;
    for (const [name, result] of results) {
      if (!result.valid) {
        hasErrors = true;
        writeLine(red(`  ${name}:`));
        for (const err of result.errors) {
          writeLine(red(`    ✗ ${err.message}`));
          if (err.hint) {
            writeLine(yellow(`      Hint: ${err.hint}`));
          }
        }
        writeLine('');
      }

      if (result.warnings.length > 0) {
        for (const warn of result.warnings) {
          writeLine(yellow(`  ${name}: ⚠ ${warn.message}`));
        }
      }
    }

    if (!hasErrors) {
      writeLine(green(bold('  ✅ All environments passed validation')));
    }

    writeLine('');
    return hasErrors ? 1 : 0;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    writeError(red(`  Error: ${msg}`));
    return 1;
  }
}
