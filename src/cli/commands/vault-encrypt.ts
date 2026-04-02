// =============================================================================
// ultraenv — CLI Command: vault encrypt
// Encrypt .env files → .env.vault
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { writeLine, writeError } from '../ui/renderer.js';
import { green, red, cyan, bold, yellow } from '../ui/colors.js';
import { resolve, join } from 'node:path';
import { exists, readFile } from '../../utils/fs.js';
import { parseEnvFile } from '../../core/parser.js';
import { encryptValue, isEncryptedValue } from '../../vault/encryption.js';
import { parseKey } from '../../vault/key-manager.js';
import {
  readVaultFile,
  writeVaultFile,
  type VaultEntry,
} from '../../vault/vault-file.js';
import { getErrorMessage } from '../../core/errors.js';

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;
    const baseDir = resolve(cwd);
    const envName = (args.flags['--env'] as string) ?? 'production';
    const keyInput = args.flags['--key'] as string | undefined;

    writeLine(bold(`🔐 Encrypting "${envName}" environment → vault`));
    writeLine('');

    // Source .env file
    const envFilePath = join(baseDir, `.env.${envName}`);
    if (!await exists(envFilePath)) {
      writeError(red(`  .env.${envName} not found.`));
      return 1;
    }

    // Read key
    let rawKey: Buffer;
    if (keyInput) {
      rawKey = parseKey(keyInput);
    } else {
      // Try to read from .env.keys
      const keysPath = join(baseDir, '.env.keys');
      if (!await exists(keysPath)) {
        writeError(red('  No encryption key provided and .env.keys not found.'));
        writeError(yellow('  Run "ultraenv vault init" first.'));
        return 1;
      }

      const keysContent = await readFile(keysPath);
      const { parseKeysFile } = await import('../../vault/key-manager.js');
      const keys = parseKeysFile(keysContent);
      const envKey = keys.get(envName.toLowerCase());

      if (!envKey) {
        writeError(red(`  No key found for environment "${envName}" in .env.keys`));
        return 1;
      }

      rawKey = parseKey(envKey);
    }

    // Parse the .env file
    const envContent = await readFile(envFilePath);
    const parsed = parseEnvFile(envContent, envFilePath);

    // Encrypt each variable
    writeLine(cyan('  Encrypting variables...'));
    const encryptedLines: string[] = [];

    for (const envVar of parsed.vars) {
      if (isEncryptedValue(envVar.value)) {
        encryptedLines.push(`${envVar.key}=${envVar.value}`);
        continue;
      }

      const encrypted = encryptValue(envVar.value, rawKey);
      encryptedLines.push(`${envVar.key}=${encrypted}`);
    }

    // Build vault entry
    const vaultPath = join(baseDir, '.env.vault');
    let existingVault = new Map<string, VaultEntry>();

    if (await exists(vaultPath)) {
      existingVault = await readVaultFile(vaultPath);
    }

    const entry: VaultEntry = {
      name: envName,
      varCount: parsed.vars.length,
      lastModified: new Date().toISOString(),
      keyIds: ['v1'],
      encrypted: encryptedLines.join('\n'),
    };

    existingVault.set(envName.toLowerCase(), entry);
    await writeVaultFile(vaultPath, existingVault);

    writeLine(green(`  ✓ Encrypted ${parsed.vars.length} variables`));
    writeLine(green(`  ✓ Vault updated: ${vaultPath}`));
    writeLine('');

    writeLine(green(bold('  ✅ Encryption complete!')));
    writeLine('');
    writeLine(yellow('  Reminder: The original .env file is unchanged.'));
    writeLine(yellow('  Consider adding encrypted files to .gitignore.'));
    writeLine('');

    return 0;
  } catch (error: unknown) {
    writeError(red(`  Encrypt error: ${getErrorMessage(error)}`));
    return 1;
  }
}
