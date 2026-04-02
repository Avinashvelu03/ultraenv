// =============================================================================
// ultraenv — CLI Command: vault init
// Initialize encrypted vault.
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { writeLine, writeError } from '../ui/renderer.js';
import { green, red, cyan, bold, yellow } from '../ui/colors.js';
import { resolve, join } from 'node:path';
import { exists } from '../../utils/fs.js';
import { confirm } from '../ui/prompt.js';
import { generateKeysFile, formatKey, parseKey } from '../../vault/key-manager.js';
import { writeFile } from '../../utils/fs.js';

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;
    const baseDir = resolve(cwd);
    const envName = (args.flags['--env'] as string) ?? 'production';

    writeLine(bold('🔐 Vault Initialization'));
    writeLine('');

    const vaultPath = join(baseDir, '.env.vault');
    const keysPath = join(baseDir, '.env.keys');

    // Check existing vault
    if (await exists(vaultPath)) {
      writeLine(yellow('  ⚠ Vault already exists.'));
      if (!args.flags['--force']) {
        const overwrite = await confirm('  Overwrite existing vault?', false);
        if (!overwrite) {
          writeLine(green('  Cancelled.'));
          return 0;
        }
      }
    }

    // Interactive key generation
    const key = args.flags['--key'] as string | undefined;
    let masterKeyFormatted: string;

    if (key) {
      masterKeyFormatted = key;
      try {
        parseKey(masterKeyFormatted);
      } catch {
        writeError(red('  Invalid key format. Key must start with "ultraenv_key_v1_"'));
        return 1;
      }
    } else {
      writeLine(cyan('  Generating encryption key...'));
      const { generateMasterKey } = await import('../../vault/key-manager.js');
      const rawKey = generateMasterKey();
      masterKeyFormatted = formatKey(rawKey);
    }

    // Create keys file
    writeLine(cyan('  Creating keys file...'));
    const keysContent = generateKeysFile([envName]);

    // Update the keys file with the actual key
    const envVarName = `ULTRAENV_KEY_${envName.toUpperCase()}`;
    const keysLines = keysContent.split('\n');
    const updatedKeysLines = keysLines.map((line) => {
      if (line.startsWith(`${envVarName}=`)) {
        return `${envVarName}="${masterKeyFormatted}"`;
      }
      return line;
    });

    await writeFile(keysPath, updatedKeysLines.join('\n'));
    writeLine(green(`  ✓ Keys written to ${keysPath}`));

    // Create empty vault file
    writeLine(cyan('  Creating vault file...'));
    const vaultHeader = [
      '# ultraenv encrypted vault — safe to commit',
      `# Generated: ${new Date().toISOString()}`,
      `# Environments: ${envName}`,
      '',
    ].join('\n');
    await writeFile(vaultPath, vaultHeader);
    writeLine(green(`  ✓ Vault created at ${vaultPath}`));

    writeLine('');
    writeLine(green(bold('  ✅ Vault initialized successfully!')));
    writeLine('');
    writeLine(yellow('  ⚠ IMPORTANT:'));
    writeLine(yellow(`    - Add ${keysPath} to .gitignore`));
    writeLine(yellow('    - Never commit your keys file'));
    writeLine(yellow('    - Store keys securely (e.g., CI secrets manager)'));
    writeLine('');
    writeLine(cyan('  Next steps:'));
    writeLine(`    ultraenv vault encrypt --env ${envName}`);
    writeLine('');

    return 0;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    writeError(red(`  Vault init error: ${msg}`));
    return 1;
  }
}
