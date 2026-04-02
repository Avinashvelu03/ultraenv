// =============================================================================
// ultraenv — CLI Command: doctor
// Self-check installation.
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { writeLine, writeError, writeJson } from '../ui/renderer.js';
import { green, red, cyan, bold, yellow } from '../ui/colors.js';
import { drawTable } from '../ui/table.js';
import { resolve, join } from 'node:path';
import { exists } from '../../utils/fs.js';
import { isGitRepository } from '../../utils/git.js';

interface CheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;
    const baseDir = resolve(cwd);

    writeLine(bold('🏥 ultraenv Doctor'));
    writeLine('');
    writeLine(cyan('  Running self-checks...'));
    writeLine('');

    const checks: CheckResult[] = [];

    // 1. Node.js version
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.slice(1), 10);
    checks.push({
      name: 'Node.js version',
      status: major >= 18 ? 'pass' : 'warn',
      message: nodeVersion + (major >= 18 ? '' : ' (recommended: >= 18)'),
    });

    // 2. Platform
    checks.push({
      name: 'Platform',
      status: 'pass',
      message: `${process.platform} ${process.arch}`,
    });

    // 3. Git repository
    const isGit = await isGitRepository(baseDir);
    checks.push({
      name: 'Git repository',
      status: isGit ? 'pass' : 'warn',
      message: isGit ? 'Detected' : 'Not a git repository',
    });

    // 4. .env file
    const envExists = await exists(join(baseDir, '.env'));
    checks.push({
      name: '.env file',
      status: envExists ? 'pass' : 'warn',
      message: envExists ? 'Found' : 'Not found',
    });

    // 5. .gitignore
    const gitignoreExists = await exists(join(baseDir, '.gitignore'));
    checks.push({
      name: '.gitignore',
      status: gitignoreExists ? 'pass' : 'warn',
      message: gitignoreExists ? 'Found' : 'Not found',
    });

    // 6. .env.vault
    const vaultExists = await exists(join(baseDir, '.env.vault'));
    checks.push({
      name: '.env.vault',
      status: vaultExists ? 'pass' : 'warn',
      message: vaultExists ? 'Found' : 'Not initialized',
    });

    // 7. .env.keys
    const keysExists = await exists(join(baseDir, '.env.keys'));
    if (vaultExists) {
      checks.push({
        name: '.env.keys',
        status: keysExists ? 'pass' : 'fail',
        message: keysExists ? 'Found' : 'Missing (vault needs keys)',
      });
    }

    // 8. .env.example
    const exampleExists = await exists(join(baseDir, '.env.example'));
    checks.push({
      name: '.env.example',
      status: exampleExists ? 'pass' : 'warn',
      message: exampleExists ? 'Found' : 'Not found',
    });

    // 9. ultraenv config
    const { findConfig } = await import('../../core/config.js');
    const configPath = findConfig(baseDir);
    checks.push({
      name: 'Configuration',
      status: configPath ? 'pass' : 'warn',
      message: configPath ?? 'Not found (using defaults)',
    });

    // 10. TypeScript support
    const tsconfigExists = await exists(join(baseDir, 'tsconfig.json'));
    checks.push({
      name: 'TypeScript',
      status: tsconfigExists ? 'pass' : 'warn',
      message: tsconfigExists ? 'tsconfig.json found' : 'Not a TypeScript project',
    });

    // Display results
    const headers = ['Check', 'Status', 'Details'];
    const rows: string[][] = checks.map((check) => {
      const statusIcon =
        check.status === 'pass' ? green('✓') : check.status === 'warn' ? yellow('⚠') : red('✗');
      return [check.name, statusIcon, check.message];
    });

    writeLine(drawTable(headers, rows, { maxWidth: 90 }));
    writeLine('');

    // Summary
    const passed = checks.filter((c) => c.status === 'pass').length;
    const warnings = checks.filter((c) => c.status === 'warn').length;
    const failed = checks.filter((c) => c.status === 'fail').length;

    if (ctx.outputFormat === 'json') {
      writeJson({ checks, summary: { passed, warnings, failed, total: checks.length } });
      return failed > 0 ? 1 : 0;
    }

    writeLine(
      cyan(`  ${passed}/${checks.length} passed, ${warnings} warning(s), ${failed} failure(s)`),
    );
    writeLine('');

    if (failed > 0) {
      writeLine(red(bold('  Some checks failed. Fix the issues above.')));
      return 1;
    }

    writeLine(green(bold('  ✅ ultraenv is healthy!')));
    writeLine('');

    return 0;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    writeError(red(`  Doctor error: ${msg}`));
    return 1;
  }
}
