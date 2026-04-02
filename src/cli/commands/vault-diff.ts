// =============================================================================
// ultraenv — CLI Command: vault diff
// Compare .env vs vault (encrypted data).
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { writeLine, writeError } from '../ui/renderer.js';
import { green, red, cyan, bold, yellow } from '../ui/colors.js';
import { resolve, join } from 'node:path';
import { exists, readFile } from '../../utils/fs.js';
import { parseEnvFile } from '../../core/parser.js';
import { readVaultFile } from '../../vault/vault-file.js';
import { isEncryptedValue } from '../../vault/encryption.js';
import { maskValue } from '../../utils/mask.js';

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;
    const baseDir = resolve(cwd);
    const envName = (args.flags['--env'] as string) ?? 'production';

    writeLine(bold(`📊 Comparing .env.${envName} vs vault`));
    writeLine('');

    // Read vault
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

    // Read .env file
    const envPath = join(baseDir, `.env.${envName}`);
    if (!await exists(envPath)) {
      writeError(red(`  .env.${envName} not found.`));
      return 1;
    }

    const envContent = await readFile(envPath);
    const parsed = parseEnvFile(envContent, envPath);

    // Parse vault content
    const vaultVars: Record<string, string> = {};
    for (const line of entry.encrypted.split('\n')) {
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx);
      const value = line.slice(eqIdx + 1);
      vaultVars[key] = value;
    }

    // Compare
    const envKeys = new Set(parsed.vars.map(v => v.key));
    const vaultKeys = new Set(Object.keys(vaultVars));

    const onlyInEnv: string[] = [];
    const onlyInVault: string[] = [];
    const different: string[] = [];
    const same: string[] = [];

    for (const key of envKeys) {
      if (!vaultKeys.has(key)) {
        onlyInEnv.push(key);
      }
    }

    for (const key of vaultKeys) {
      if (!envKeys.has(key)) {
        onlyInVault.push(key);
      }
    }

    for (const key of envKeys) {
      if (!vaultKeys.has(key)) continue;
      const envVal = parsed.vars.find(v => v.key === key)?.value ?? '';
      const vaultVal = vaultVars[key] ?? '';

      // Compare: if vault has encrypted value and env has plaintext,
      // we can't compare directly. Show as "different" if they're both plaintext and differ.
      if (!isEncryptedValue(vaultVal) && envVal !== vaultVal) {
        different.push(key);
      } else if (isEncryptedValue(vaultVal)) {
        same.push(key); // Assume same if encrypted
      } else {
        same.push(key);
      }
    }

    // Display results
    if (onlyInEnv.length > 0) {
      writeLine(yellow(`  Only in .env (${onlyInEnv.length}):`));
      for (const key of onlyInEnv) {
        const val = parsed.vars.find(v => v.key === key)?.value ?? '';
        writeLine(`    + ${key}=${maskValue(val)}`);
      }
      writeLine('');
    }

    if (onlyInVault.length > 0) {
      writeLine(yellow(`  Only in vault (${onlyInVault.length}):`));
      for (const key of onlyInVault) {
        writeLine(`    - ${key}`);
      }
      writeLine('');
    }

    if (different.length > 0) {
      writeLine(yellow(`  Different (${different.length}):`));
      for (const key of different) {
        writeLine(`    ~ ${key}`);
      }
      writeLine('');
    }

    if (onlyInEnv.length === 0 && onlyInVault.length === 0 && different.length === 0) {
      writeLine(green(`  ✓ .env.${envName} and vault are in sync (${same.length} variables)`));
    } else {
      writeLine(cyan(`  ${same.length} variable(s) matched.`));
      writeLine(yellow(`  Run "ultraenv vault encrypt --env ${envName}" to sync.`));
    }

    writeLine('');
    return 0;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    writeError(red(`  Vault diff error: ${msg}`));
    return 1;
  }
}
