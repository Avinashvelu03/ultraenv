// =============================================================================
// ultraenv — CLI Command: sync
// Sync .env.example (generate, check, interactive, watch modes).
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { writeLine, writeError, writeJson } from '../ui/renderer.js';
import { green, red, cyan, bold, yellow } from '../ui/colors.js';
import { drawBox } from '../ui/box.js';
import { resolve, join } from 'node:path';
import { exists } from '../../utils/fs.js';
import { watch, type FSWatcher } from 'node:fs';

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;
    const baseDir = resolve(cwd);

    const envPath = (args.flags['--file'] as string) ?? join(baseDir, '.env');
    const examplePath = (args.flags['--out'] as string) ?? join(baseDir, '.env.example');

    // Mode: generate | check | interactive | watch
    const mode = (args.flags['--mode'] as string) ?? 'check';

    if (mode === 'check') {
      return await checkSync(envPath, examplePath, ctx);
    }

    if (mode === 'generate') {
      return await generateSync(envPath, examplePath);
    }

    if (mode === 'interactive') {
      return await interactiveSync(envPath, examplePath);
    }

    if (mode === 'watch') {
      return await watchSync(envPath, examplePath);
    }

    writeError(red(`  Unknown sync mode: ${mode}`));
    writeError(yellow('  Available modes: generate, check, interactive, watch'));
    return 1;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    writeError(red(`  Sync error: ${msg}`));
    return 1;
  }
}

async function checkSync(envPath: string, examplePath: string, ctx: CommandContext): Promise<number> {
  const envExists = await exists(envPath);
  const exampleExists = await exists(examplePath);

  if (!envExists) {
    if (ctx.outputFormat === 'json') {
      writeJson({ inSync: false, error: '.env file not found' });
    } else {
      writeError(yellow('  ⚠ .env file not found. Run "ultraenv sync --mode generate" to create .env.example.'));
    }
    return 1;
  }

  if (!exampleExists) {
    if (ctx.outputFormat === 'json') {
      writeJson({ inSync: false, error: '.env.example not found' });
    } else {
      writeError(yellow('  ⚠ .env.example not found. Run "ultraenv sync --mode generate" to create it.'));
    }
    return 1;
  }

  const { compareSync, formatSyncDiff } = await import('../../sync/comparator.js');
  const diff = await compareSync(envPath, examplePath);

  if (ctx.outputFormat === 'json') {
    writeJson({
      inSync: diff.inSync,
      missing: diff.missing,
      extra: diff.extra,
      different: diff.different,
      same: diff.same,
    });
    return diff.inSync ? 0 : 1;
  }

  writeLine(bold('🔄 .env Sync Check'));
  writeLine('');
  writeLine(formatSyncDiff(diff));
  writeLine('');

  if (!diff.inSync) {
    const box = drawBox([
      'Your .env is out of sync with .env.example.',
      'Run "ultraenv sync --mode generate" to update .env.example',
      'or "ultraenv sync --mode interactive" to review changes.',
    ], { title: 'ACTION NEEDED', border: 'rounded' });
    writeLine(box);
    writeLine('');
    return 1;
  }

  writeLine(green(bold('  ✅ .env is in sync with .env.example')));
  writeLine('');
  return 0;
}

async function generateSync(envPath: string, examplePath: string): Promise<number> {
  const envExists = await exists(envPath);

  if (!envExists) {
    writeError(yellow('  ⚠ .env file not found. Create a .env file first.'));
    return 1;
  }

  const { generateExampleFile } = await import('../../sync/generator.js');
  await generateExampleFile(envPath, examplePath, {
    includeDescriptions: true,
    includeTypes: true,
    includeDefaults: true,
  });

  writeLine(bold('📝 Generating .env.example...'));
  writeLine('');
  writeLine(green(`  ✓ Generated ${examplePath}`));
  writeLine('');

  return 0;
}

async function interactiveSync(envPath: string, examplePath: string): Promise<number> {
  const { compareSync } = await import('../../sync/comparator.js');

  const envExists = await exists(envPath);
  if (!envExists) {
    writeError(yellow('  ⚠ .env file not found.'));
    return 1;
  }

  const diff = await compareSync(envPath, examplePath);

  if (diff.inSync) {
    writeLine(green('  ✓ Already in sync.'));
    return 0;
  }

  // Show differences
  writeLine(bold('📋 Differences found:'));
  writeLine('');

  if (diff.missing.length > 0) {
    writeLine(yellow('  Missing in .env:'));
    for (const key of diff.missing) {
      writeLine(`    - ${key}`);
    }
    writeLine('');
  }

  if (diff.extra.length > 0) {
    writeLine(yellow('  Extra in .env (not in .env.example):'));
    for (const key of diff.extra) {
      writeLine(`    + ${key}`);
    }
    writeLine('');
  }

  // Auto-generate
  const { generateExampleFile } = await import('../../sync/generator.js');
  await generateExampleFile(envPath, examplePath);
  writeLine(green(`  ✓ Updated ${examplePath}`));
  writeLine('');

  return 0;
}

async function watchSync(envPath: string, examplePath: string): Promise<number> {
  const { generateExampleFile } = await import('../../sync/generator.js');

  writeLine(bold('👁️  Watching for .env changes...'));
  writeLine(cyan('  Press Ctrl+C to stop.'));
  writeLine('');

  // Generate initial
  await generateExampleFile(envPath, examplePath);
  writeLine(green(`  ✓ Generated ${examplePath}`));

  return new Promise<number>((resolvePromise) => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let watcher: FSWatcher | null = null;

    watcher = watch(envPath, (eventType: string) => {
      if (eventType !== 'change') return;

      if (debounceTimer !== null) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        try {
          await generateExampleFile(envPath, examplePath);
          writeLine(green(`  ✓ Updated ${examplePath} (${new Date().toLocaleTimeString()})`));
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          writeError(red(`  ✗ Failed to update: ${msg}`));
        }
      }, 200);
    });

    process.on('SIGINT', () => {
      if (watcher !== null) watcher.close();
      writeLine('');
      writeLine(cyan('  Watcher stopped.'));
      resolvePromise(0);
    });
  });
}
