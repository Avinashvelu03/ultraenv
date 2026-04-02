// =============================================================================
// ultraenv — CLI Command: vault rekey
// Rotate encryption keys.
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { writeLine, writeError } from '../ui/renderer.js';
import { green, red, cyan, bold, yellow } from '../ui/colors.js';
import { resolve, join } from 'node:path';
import { exists, readFile } from '../../utils/fs.js';
import { parseKey, generateMasterKey, formatKey, maskKey } from '../../vault/key-manager.js';
import { readVaultFile, writeVaultFile } from '../../vault/vault-file.js';
import { decryptValue, encryptValue, isEncryptedValue } from '../../vault/encryption.js';
import { getErrorMessage } from '../../core/errors.js';

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;
    const baseDir = resolve(cwd);
    const envName = (args.flags['--env'] as string) ?? 'production';
    const oldKeyInput = args.flags['--old-key'] as string | undefined;
    const newKeyInput = args.flags['--new-key'] as string | undefined;

    writeLine(bold(`🔑 Rotating encryption key for "${envName}"`));
    writeLine('');

    // Parse keys
    let oldKey: Buffer;
    let newKey: Buffer;

    if (oldKeyInput && newKeyInput) {
      oldKey = parseKey(oldKeyInput);
      newKey = parseKey(newKeyInput);
    } else {
      // Read from .env.keys
      const keysPath = join(baseDir, '.env.keys');
      if (!(await exists(keysPath))) {
        writeError(red('  .env.keys not found.'));
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

      oldKey = parseKey(envKey);
      newKey = generateMasterKey();
    }

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
      return 1;
    }

    // Re-encrypt
    writeLine(cyan('  Re-encrypting with new key...'));
    const lines = entry.encrypted.split('\n');
    const reencryptedLines: string[] = [];

    for (const line of lines) {
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) {
        reencryptedLines.push(line);
        continue;
      }

      const key = line.slice(0, eqIdx);
      const value = line.slice(eqIdx + 1);

      if (isEncryptedValue(value)) {
        // Decrypt with old key, encrypt with new key
        const decrypted = decryptValue(value, oldKey);
        const reencrypted = encryptValue(decrypted, newKey);
        reencryptedLines.push(`${key}=${reencrypted}`);
      } else {
        reencryptedLines.push(line);
      }
    }

    // Update vault
    entry.encrypted = reencryptedLines.join('\n');
    entry.lastModified = new Date().toISOString();
    entry.keyIds = ['v1'];

    vault.set(envName.toLowerCase(), entry);
    await writeVaultFile(vaultPath, vault);

    // Update keys file
    if (!newKeyInput) {
      const keysPath = join(baseDir, '.env.keys');
      const keysContent = await readFile(keysPath);
      const envVarName = `ULTRAENV_KEY_${envName.toUpperCase()}`;
      const newFormatted = formatKey(newKey);

      const updatedLines = keysContent.split('\n').map((line) => {
        if (line.startsWith(`${envVarName}=`)) {
          return `${envVarName}="${newFormatted}"`;
        }
        return line;
      });

      const { writeFile } = await import('../../utils/fs.js');
      await writeFile(keysPath, updatedLines.join('\n'));
      writeLine(yellow(`  ⚠ New key written to ${keysPath}`));
      writeLine(yellow(`    New key: ${maskKey(newFormatted)}`));
    }

    writeLine(green(`  ✓ Key rotated for ${entry.varCount} variables`));
    writeLine('');

    writeLine(green(bold('  ✅ Key rotation complete!')));
    writeLine('');

    return 0;
  } catch (error: unknown) {
    writeError(red(`  Rekey error: ${getErrorMessage(error)}`));
    return 1;
  }
}
