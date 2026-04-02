// =============================================================================
// ultraenv — CLI Command: ci check-sync
// CI sync check.
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { writeJson } from '../ui/renderer.js';
import { resolve, join } from 'node:path';
import { exists } from '../../utils/fs.js';
import { compareSync } from '../../sync/comparator.js';

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;
    const baseDir = resolve(cwd);
    const envPath = (args.flags['--file'] as string) ?? join(baseDir, '.env');
    const examplePath = (args.flags['--example'] as string) ?? join(baseDir, '.env.example');

    const envExists = await exists(envPath);
    const exampleExists = await exists(examplePath);

    if (!envExists) {
      writeJson({ inSync: false, error: '.env not found' });
      return 1;
    }

    if (!exampleExists) {
      writeJson({ inSync: false, error: '.env.example not found' });
      return 1;
    }

    const diff = await compareSync(envPath, examplePath);

    writeJson({
      inSync: diff.inSync,
      missing: diff.missing,
      extra: diff.extra,
      different: diff.different,
      same: diff.same,
    });

    return diff.inSync ? 0 : 1;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    writeJson({ inSync: false, error: msg });
    return 1;
  }
}
