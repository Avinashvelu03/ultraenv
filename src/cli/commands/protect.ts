// =============================================================================
// ultraenv — CLI Command: protect
// Verify .gitignore protection for .env files.
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { writeLine, writeError, writeJson } from '../ui/renderer.js';
import { green, red, bold, yellow } from '../ui/colors.js';
import { drawBox } from '../ui/box.js';
import { resolve, join } from 'node:path';
import { exists, readFile } from '../../utils/fs.js';
import { isGitRepository, isGitIgnored, getTrackedFiles } from '../../utils/git.js';

const PROTECTED_PATTERNS = [
  '.env',
  '.env.local',
  '.env.*.local',
  '.env.vault',
  '.env.keys',
];

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;
    const baseDir = resolve(cwd);

    if (ctx.outputFormat === 'json') {
      return await checkProtectionJson(baseDir);
    }

    writeLine(bold('🛡️  .gitignore Protection Check'));
    writeLine('');

    // Check if git repository
    const isGit = await isGitRepository(baseDir);
    if (!isGit) {
      writeLine(yellow('  ⚠ Not a git repository. Protection check is limited.'));
      writeLine('');
    }

    // Check .gitignore exists
    const gitignorePath = join(baseDir, '.gitignore');
    const gitignoreExists = await exists(gitignorePath);

    if (!gitignoreExists) {
      writeError(red('  ✗ No .gitignore file found!'));
      writeLine('');
      const box = drawBox([
        'Your project has no .gitignore file.',
        'Secrets in .env files could be committed to version control.',
        'Create a .gitignore with ultraenv entries:',
        '',
        '  ultraenv init',
      ], { title: 'DANGER', border: 'double' });
      writeLine(box);
      writeLine('');
      return 1;
    }

    writeLine(green('  ✓ .gitignore exists'));
    const gitignoreContent = await readFile(gitignorePath);

    // Check each protected pattern
    const issues: string[] = [];
    const protectedEntries: string[] = [];

    for (const pattern of PROTECTED_PATTERNS) {
      if (gitignoreContent.includes(pattern)) {
        protectedEntries.push(pattern);
      } else {
        issues.push(pattern);
      }
    }

    writeLine(green(`  ✓ ${protectedEntries.length}/${PROTECTED_PATTERNS.length} patterns protected`));

    // Check if .env files are actually ignored
    const envFiles = ['.env', '.env.local', '.env.production', '.env.development'];
    const notIgnored: string[] = [];

    for (const envFile of envFiles) {
      const envPath = join(baseDir, envFile);
      const fileExists = await exists(envPath);
      if (!fileExists) continue;

      const ignored = await isGitIgnored(envFile, baseDir);
      if (!ignored) {
        notIgnored.push(envFile);
      }
    }

    if (notIgnored.length > 0) {
      writeLine('');
      writeError(red(`  ✗ ${notIgnored.length} .env file(s) are NOT gitignored:`));
      for (const f of notIgnored) {
        writeError(red(`    - ${f}`));
      }
    }

    // Check tracked .env files
    if (isGit) {
      const trackedFiles = await getTrackedFiles(baseDir);
      const trackedEnvFiles = trackedFiles.filter(f =>
        f.startsWith('.env') && !f.endsWith('.example'),
      );

      if (trackedEnvFiles.length > 0) {
        writeLine('');
        writeError(red(bold(`  ⚠ ${trackedEnvFiles.length} .env file(s) are tracked by git:`)));
        for (const f of trackedEnvFiles) {
          writeError(red(`    - ${f}`));
        }
        writeLine('');
        const warnBox = drawBox([
          'Tracked .env files may contain secrets.',
          'Remove them from version control immediately:',
          '',
          '  git rm --cached .env*',
          '  git commit -m "Remove tracked .env files"',
        ], { title: 'WARNING', border: 'double' });
        writeLine(warnBox);
        writeLine('');
        return 1;
      }
    }

    if (issues.length > 0) {
      writeLine('');
      writeLine(yellow(`  Missing patterns:`));
      for (const p of issues) {
        writeLine(yellow(`    - ${p}`));
      }
      writeLine('');
    }

    if (notIgnored.length === 0 && issues.length === 0) {
      writeLine('');
      writeLine(green(bold('  ✅ All .env files are properly protected')));
    }

    writeLine('');
    return notIgnored.length > 0 ? 1 : 0;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    writeError(red(`  Protection check error: ${msg}`));
    return 1;
  }
}

async function checkProtectionJson(baseDir: string): Promise<number> {
  const gitignorePath = join(baseDir, '.gitignore');
  const gitignoreExists = await exists(gitignorePath);

  let content = '';
  let issues: string[] = [];

  if (gitignoreExists) {
    content = await readFile(gitignorePath);
  }

  for (const pattern of PROTECTED_PATTERNS) {
    if (!content.includes(pattern)) {
      issues.push(pattern);
    }
  }

  writeJson({
    protected: issues.length === 0,
    gitignoreExists,
    missingPatterns: issues,
  });

  return issues.length === 0 ? 0 : 1;
}
