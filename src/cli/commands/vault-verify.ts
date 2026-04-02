// =============================================================================
// ultraenv — CLI Command: vault verify
// Verify vault integrity.
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { writeLine, writeError, writeJson } from '../ui/renderer.js';
import { green, red, cyan, bold } from '../ui/colors.js';
import { resolve, join } from 'node:path';
import { exists, readFile } from '../../utils/fs.js';
import { readVaultFile } from '../../vault/vault-file.js';
import { parseKey } from '../../vault/key-manager.js';
import { computeIntegrity } from '../../vault/integrity.js';
import { getErrorMessage } from '../../core/errors.js';

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;
    const baseDir = resolve(cwd);
    const envName = (args.flags['--env'] as string) ?? 'production';
    const keyInput = args.flags['--key'] as string | undefined;

    writeLine(bold(`🔒 Verifying vault integrity for "${envName}"`));
    writeLine('');

    const vaultPath = join(baseDir, '.env.vault');
    if (!await exists(vaultPath)) {
      writeError(red('  .env.vault not found.'));
      return 1;
    }

    const vault = await readVaultFile(vaultPath);
    const entry = vault.get(envName.toLowerCase());

    if (!entry) {
      writeError(red(`  Environment "${envName}" not found in vault.`));
      return 1;
    }

    // Get key
    let rawKey: Buffer;
    if (keyInput) {
      rawKey = parseKey(keyInput);
    } else {
      const keysPath = join(baseDir, '.env.keys');
      if (!await exists(keysPath)) {
        writeError(red('  No key provided and .env.keys not found.'));
        return 1;
      }
      const keysContent = await readFile(keysPath);
      const { parseKeysFile } = await import('../../vault/key-manager.js');
      const keys = parseKeysFile(keysContent);
      const envKey = keys.get(envName.toLowerCase());
      if (!envKey) {
        writeError(red(`  No key for "${envName}"`));
        return 1;
      }
      rawKey = parseKey(envKey);
    }

    // Compute integrity
    const digest = computeIntegrity(entry.encrypted, rawKey);

    writeLine(cyan('  Integrity check:'));
    writeLine(`    Environment:    ${cyan(envName)}`);
    writeLine(`    Variables:       ${cyan(String(entry.varCount))}`);
    writeLine(`    Integrity hash: ${cyan(digest.slice(0, 16))}...`);
    writeLine(`    Last modified:  ${cyan(entry.lastModified)}`);
    writeLine('');

    if (ctx.outputFormat === 'json') {
      writeJson({
        valid: true,
        environment: envName,
        digest: digest.slice(0, 32),
        varCount: entry.varCount,
        lastModified: entry.lastModified,
      });
    } else {
      writeLine(green(bold('  ✅ Vault integrity verified successfully')));
    }

    writeLine('');
    return 0;
  } catch (error: unknown) {
    if (ctx.outputFormat === 'json') {
      writeJson({ valid: false, error: getErrorMessage(error) });
    } else {
      writeError(red(`  Vault verify error: ${getErrorMessage(error)}`));
    }
    return 1;
  }
}
