// =============================================================================
// ultraenv — CLI Command: vault decrypt
// Decrypt .env.vault → .env files
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { writeLine, writeError } from '../ui/renderer.js';
import { green, red, cyan, bold, yellow } from '../ui/colors.js';
import { resolve, join } from 'node:path';
import { exists, readFile } from '../../utils/fs.js';
import { parseKey } from '../../vault/key-manager.js';
import { decryptValue, isEncryptedValue } from '../../vault/encryption.js';
import { readVaultFile } from '../../vault/vault-file.js';
import { getErrorMessage } from '../../core/errors.js';

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;
    const baseDir = resolve(cwd);
    const envName = (args.flags['--env'] as string) ?? 'production';
    const keyInput = args.flags['--key'] as string | undefined;

    writeLine(bold(`🔓 Decrypting vault → "${envName}" environment`));
    writeLine('');

    // Read vault
    const vaultPath = join(baseDir, '.env.vault');
    if (!(await exists(vaultPath))) {
      writeError(red('  .env.vault not found.'));
      return 1;
    }

    const vault = await readVaultFile(vaultPath);
    const entry = vault.get(envName.toLowerCase());

    if (!entry) {
      writeError(red(`  Environment "${envName}" not found in vault.`));
      writeError(yellow(`  Available: ${[...vault.keys()].join(', ') || 'none'}`));
      return 1;
    }

    // Read key
    let rawKey: Buffer;
    if (keyInput) {
      rawKey = parseKey(keyInput);
    } else {
      const keysPath = join(baseDir, '.env.keys');
      if (!(await exists(keysPath))) {
        writeError(red('  No encryption key provided and .env.keys not found.'));
        return 1;
      }

      const keysContent = await readFile(keysPath);
      const { parseKeysFile } = await import('../../vault/key-manager.js');
      const keys = parseKeysFile(keysContent);
      const envKey = keys.get(envName.toLowerCase());

      if (!envKey) {
        writeError(red(`  No key found for environment "${envName}"`));
        return 1;
      }

      rawKey = parseKey(envKey);
    }

    // Decrypt variables
    writeLine(cyan('  Decrypting variables...'));
    const decryptedLines: string[] = [];
    const encryptedContent = entry.encrypted;

    for (const line of encryptedContent.split('\n')) {
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) {
        decryptedLines.push(line);
        continue;
      }

      const key = line.slice(0, eqIdx);
      const value = line.slice(eqIdx + 1);

      if (isEncryptedValue(value)) {
        try {
          const decrypted = decryptValue(value, rawKey);
          decryptedLines.push(`${key}=${decrypted}`);
        } catch {
          writeError(yellow(`  ⚠ Failed to decrypt "${key}" (wrong key?)`));
          decryptedLines.push(`${key}=<DECRYPTION_FAILED>`);
        }
      } else {
        decryptedLines.push(line);
      }
    }

    // Write output
    const outputPath = join(baseDir, `.env.${envName}`);
    const { writeFile } = await import('../../utils/fs.js');
    await writeFile(outputPath, decryptedLines.join('\n'));

    writeLine(green(`  ✓ Decrypted to ${outputPath}`));
    writeLine(green(`  ✓ Variables: ${entry.varCount}`));
    writeLine('');

    writeLine(green(bold('  ✅ Decryption complete!')));
    writeLine('');

    return 0;
  } catch (error: unknown) {
    writeError(red(`  Decrypt error: ${getErrorMessage(error)}`));
    return 1;
  }
}
