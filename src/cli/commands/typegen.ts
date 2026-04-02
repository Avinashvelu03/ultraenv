// =============================================================================
// ultraenv — CLI Command: typegen
// Generate TypeScript types from schema.
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import type { SchemaDefinition } from '../../core/types.js';
import { loadWithResult } from '../../core/loader.js';
import { writeLine, writeError } from '../ui/renderer.js';
import { green, red, cyan, bold, yellow } from '../ui/colors.js';
import { resolve } from 'node:path';

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;
    const envDir = resolve(cwd);

    // Parse format: declaration | module | json-schema
    const format = ((args.flags['--format'] as string) ?? 'declaration') as
      | 'declaration'
      | 'module'
      | 'json-schema';

    // Output path
    const outFlag = args.flags['--out'] as string | undefined;
    const defaultOutPaths: Record<string, string> = {
      declaration: 'src/env.d.ts',
      module: 'src/env.ts',
      'json-schema': 'env.schema.json',
    };
    const outputPath = outFlag
      ? resolve(cwd, outFlag)
      : resolve(cwd, defaultOutPaths[format] ?? 'src/env.d.ts');

    // Interface name
    const interfaceName = (args.flags['--interface'] as string) ?? 'Env';

    // Load environment
    const result = loadWithResult({ envDir, overrideProcessEnv: false });

    writeLine(bold(`📝 Generating ${format} types...`));
    writeLine('');

    // Resolve schema from config
    const schema: SchemaDefinition | undefined = ctx.config.schema?.definitions;

    let content = '';

    if (format === 'declaration') {
      const { generateDeclarationContent } = await import('../../typegen/declaration.js');
      content = generateDeclarationContent(result.env, schema, {
        interfaceName,
        jsdoc: true,
        indent: 4,
      });
    } else if (format === 'module') {
      const { generateModuleContent } = await import('../../typegen/module.js');
      if (!schema) {
        writeError(yellow('  Warning: No schema defined. Generating empty module.'));
        writeError(yellow('  Add a schema to your .ultraenvrc.json for typed output.'));
      }
      content = generateModuleContent(schema ?? {}, { interfaceName, jsdoc: true, indent: 2 });
    } else if (format === 'json-schema') {
      const { generateJsonSchemaContent } = await import('../../typegen/json-schema.js');
      content = generateJsonSchemaContent(schema ?? {}, { includeDescriptions: true, indent: 2 });
    }

    // Write output
    const { writeFile, ensureDir } = await import('../../utils/fs.js');
    await ensureDir(resolve(outputPath, '..'));
    await writeFile(outputPath, content);

    writeLine(green(`  ✓ Generated ${format} types`));
    writeLine(cyan(`  Output: ${outputPath}`));
    writeLine(cyan(`  Variables: ${Object.keys(result.env).length}`));
    writeLine('');

    return 0;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    writeError(red(`  Type generation error: ${msg}`));
    return 1;
  }
}
