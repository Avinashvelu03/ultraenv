// =============================================================================
// ultraenv — CLI Command: install-hook
// Install git pre-commit hook.
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { writeLine, writeError } from '../ui/renderer.js';
import { green, red, cyan, bold, yellow } from '../ui/colors.js';
import { resolve, join } from 'node:path';
import { exists, ensureDir, writeFile } from '../../utils/fs.js';
import { isGitRepository } from '../../utils/git.js';

const HOOK_SCRIPT = `#!/bin/sh
# ultraenv pre-commit hook
# Validates environment, checks sync, and scans for secrets

echo "Running ultraenv pre-commit checks..."

# Check if ultraenv is available
if ! command -v ultraenv >/dev/null 2>&1; then
  echo "Warning: ultraenv not found. Skipping pre-commit checks."
  echo "Install with: npm install -g ultraenv"
  exit 0
fi

# Validate environment
echo "  → Validating environment..."
ultraenv ci validate --format json --strict
if [ $? -ne 0 ]; then
  echo "✗ Environment validation failed"
  exit 1
fi

# Check sync
echo "  → Checking .env sync..."
ultraenv ci check-sync
if [ $? -ne 0 ]; then
  echo "⚠ .env.example is out of sync (non-blocking)"
fi

# Scan for secrets
echo "  → Scanning for secrets..."
ultraenv ci scan --format sarif --output .ultraenv-scan.sarif
if [ $? -ne 0 ]; then
  echo "✗ Secret scan detected potential secrets!"
  echo "  Review the findings and remove any committed secrets."
  exit 1
fi

echo "✓ All pre-commit checks passed"
exit 0
`;

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;
    const baseDir = resolve(cwd);

    // Check git repo
    const isGit = await isGitRepository(baseDir);
    if (!isGit) {
      writeError(red('  Not a git repository. Cannot install hooks.'));
      return 1;
    }

    // Get git hooks dir
    const { getGitRoot } = await import('../../utils/git.js');
    const gitRoot = await getGitRoot(baseDir);

    if (!gitRoot) {
      writeError(red('  Could not determine git root.'));
      return 1;
    }

    const hooksDir = join(gitRoot, '.git', 'hooks');
    const hookPath = join(hooksDir, 'pre-commit');

    if (await exists(hookPath) && !args.flags['--force']) {
      writeLine(yellow('  A pre-commit hook already exists.'));
      writeLine(yellow(`  Path: ${hookPath}`));
      writeLine(yellow('  Use --force to overwrite.'));
      return 0;
    }

    await ensureDir(hooksDir);
    await writeFile(hookPath, HOOK_SCRIPT);

    // Make executable
    const { chmodSync } = await import('node:fs');
    chmodSync(hookPath, 0o755);

    writeLine(green(bold('  ✅ Pre-commit hook installed!')));
    writeLine('');
    writeLine(cyan(`  Hook path: ${hookPath}`));
    writeLine('');
    writeLine(cyan('  The hook will run on every commit and:'));
    writeLine('    ✓ Validate environment variables');
    writeLine('    ✓ Check .env ↔ .env.example sync');
    writeLine('    ✓ Scan for leaked secrets');
    writeLine('');
    writeLine(yellow('  Bypass with: git commit --no-verify'));
    writeLine('');

    return 0;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    writeError(red(`  Error: ${msg}`));
    return 1;
  }
}
