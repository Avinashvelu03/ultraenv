// =============================================================================
// ultraenv — CLI Command: debug
// Show full environment diagnostics.
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { loadWithResult } from '../../core/loader.js';
import { findConfig } from '../../core/config.js';
import { writeLine, writeError } from '../ui/renderer.js';
import { green, red, cyan, bold, yellow, dim } from '../ui/colors.js';
import { drawTable } from '../ui/table.js';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { isGitRepository } from '../../utils/git.js';
import { VERSION } from '../../core/constants.js';

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;
    const baseDir = resolve(cwd);

    writeLine(bold('🔧 ultraenv Diagnostics'));
    writeLine('');

    // System info
    writeLine(bold('  System Information:'));
    writeLine(`    ultraenv version: ${cyan(VERSION)}`);
    writeLine(`    Node.js:          ${cyan(process.version)}`);
    writeLine(`    Platform:         ${cyan(process.platform)} ${process.arch}`);
    writeLine(`    CWD:              ${cyan(baseDir)}`);
    writeLine(`    TTY:              ${cyan(String(process.stdout.isTTY))}`);
    writeLine('');

    // Git info
    writeLine(bold('  Git Status:'));
    const isGit = await isGitRepository(baseDir);
    writeLine(`    Repository:      ${isGit ? green('Yes') : yellow('No')}`);

    if (isGit) {
      const { getCurrentBranch, isDirty, getCommitHash } = await import('../../utils/git.js');
      const branch = await getCurrentBranch(baseDir);
      const dirty = await isDirty(baseDir);
      const commit = await getCommitHash(baseDir);
      writeLine(`    Branch:          ${cyan(branch ?? 'detached')}`);
      writeLine(`    Dirty:           ${dirty ? yellow('Yes') : green('No')}`);
      writeLine(`    Commit:          ${cyan(commit ?? 'unknown')}`);
    }
    writeLine('');

    // Config info
    writeLine(bold('  Configuration:'));
    const configPath = findConfig(baseDir);
    if (configPath !== null) {
      writeLine(`    Config file:     ${cyan(configPath)}`);
    } else {
      writeLine(`    Config file:     ${yellow('Not found (using defaults)')}`);
    }
    writeLine(`    envDir:          ${cyan(ctx.config.envDir)}`);
    writeLine(`    mergeStrategy:   ${cyan(ctx.config.mergeStrategy)}`);
    writeLine(`    expandVars:      ${cyan(String(ctx.config.expandVariables))}`);
    writeLine(`    outputFormat:    ${cyan(ctx.config.outputFormat)}`);
    writeLine(`    debug:           ${cyan(String(ctx.config.debug))}`);
    writeLine('');

    // Environment files
    writeLine(bold('  Environment Files:'));
    const envFiles = [
      '.env', '.env.local', '.env.development', '.env.production',
      '.env.staging', '.env.test', '.env.ci',
    ];

    const fileHeaders = ['File', 'Exists', 'Size', 'Modified'];
    const fileRows: string[][] = [];

    for (const file of envFiles) {
      const filePath = resolve(baseDir, ctx.config.envDir, file);
      const exists = existsSync(filePath);

      if (exists) {
        const stat = await import('node:fs/promises').then(m => m.stat(filePath));
        const size = `${(stat.size / 1024).toFixed(1)} KB`;
        const modified = stat.mtime.toISOString().slice(0, 19).replace('T', ' ');
        fileRows.push([file, green('Yes'), size, modified]);
      } else {
        fileRows.push([file, dim('No'), '-', '-']);
      }
    }

    writeLine(drawTable(fileHeaders, fileRows, { maxWidth: 100 }));
    writeLine('');

    // Load test
    writeLine(bold('  Load Test:'));
    const startTime = Date.now();
    try {
      const result = loadWithResult({
        envDir: baseDir,
        expandVariables: ctx.config.expandVariables,
        overrideProcessEnv: false,
      });
      const loadTime = Date.now() - startTime;

      writeLine(`    Status:          ${green('Success')}`);
      writeLine(`    Variables:       ${cyan(String(result.metadata.totalVars))}`);
      writeLine(`    Files parsed:    ${cyan(String(result.metadata.filesParsed))}`);
      writeLine(`    Load time:       ${cyan(`${loadTime}ms`)}`);
    } catch (err: unknown) {
      const loadTime = Date.now() - startTime;
      writeLine(`    Status:          ${red('Failed')}`);
      writeLine(`    Load time:       ${cyan(`${loadTime}ms`)}`);
      writeLine(`    Error:           ${red(err instanceof Error ? err.message : String(err))}`);
    }

    writeLine('');
    writeLine(green(bold('  Diagnostics complete.')));
    writeLine('');

    return 0;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    writeError(red(`  Diagnostics error: ${msg}`));
    return 1;
  }
}
