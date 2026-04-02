// =============================================================================
// ultraenv — CLI Command: vault status
// Show vault status.
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { writeLine, writeError, writeJson } from '../ui/renderer.js';
import { green, red, bold, yellow } from '../ui/colors.js';
import { drawTable } from '../ui/table.js';
import { resolve, join } from 'node:path';
import { exists } from '../../utils/fs.js';
import { readVaultFile } from '../../vault/vault-file.js';

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;
    const baseDir = resolve(cwd);

    const vaultPath = join(baseDir, '.env.vault');
    const keysPath = join(baseDir, '.env.keys');

    const vaultExists = await exists(vaultPath);
    const keysExists = await exists(keysPath);

    if (ctx.outputFormat === 'json') {
      const environments: Record<string, { vars: number; modified: string; keyIds: string[] }> = {};

      if (vaultExists) {
        const vault = await readVaultFile(vaultPath);
        for (const [name, entry] of vault) {
          environments[name] = {
            vars: entry.varCount,
            modified: entry.lastModified,
            keyIds: [...entry.keyIds],
          };
        }
      }

      writeJson({
        vaultExists,
        keysExists,
        encrypted: vaultExists,
        environments,
      });
      return 0;
    }

    writeLine(bold('🔐 Vault Status'));
    writeLine('');
    writeLine(`  Vault file:   ${vaultExists ? green('exists') : red('not found')} (${vaultPath})`);
    writeLine(`  Keys file:    ${keysExists ? green('exists') : red('not found')} (${keysPath})`);
    writeLine('');

    if (!vaultExists) {
      writeLine(yellow('  No vault initialized. Run "ultraenv vault init" to create one.'));
      writeLine('');
      return 0;
    }

    const vault = await readVaultFile(vaultPath);

    if (vault.size === 0) {
      writeLine(yellow('  Vault is empty. No environments encrypted yet.'));
      writeLine('');
      return 0;
    }

    // Show environments table
    const headers = ['Environment', 'Variables', 'Key IDs', 'Last Modified'];
    const rows: string[][] = [];

    for (const [name, entry] of vault) {
      rows.push([
        name,
        String(entry.varCount),
        entry.keyIds.join(', '),
        entry.lastModified.slice(0, 19).replace('T', ' '),
      ]);
    }

    writeLine(drawTable(headers, rows, { maxWidth: 100 }));
    writeLine('');

    return 0;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    writeError(red(`  Vault status error: ${msg}`));
    return 1;
  }
}
