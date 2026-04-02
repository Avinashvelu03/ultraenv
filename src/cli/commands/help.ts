// =============================================================================
// ultraenv — CLI Command: help
// Show help for commands.
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { writeLine, writeError } from '../ui/renderer.js';
import { cyan, bold, dim } from '../ui/colors.js';
import { VERSION } from '../../core/constants.js';

const COMMANDS: Array<{ name: string; description: string; usage: string }> = [
  {
    name: 'init',
    description: 'Initialize ultraenv in a project',
    usage: 'ultraenv init [options]',
  },
  {
    name: 'validate',
    description: 'Validate environment against schema',
    usage: 'ultraenv validate [options]',
  },
  {
    name: 'typegen',
    description: 'Generate TypeScript types',
    usage: 'ultraenv typegen [options]',
  },
  { name: 'sync', description: 'Sync .env.example', usage: 'ultraenv sync [options]' },
  { name: 'scan', description: 'Scan for leaked secrets', usage: 'ultraenv scan [options]' },
  { name: 'debug', description: 'Show environment diagnostics', usage: 'ultraenv debug [options]' },
  {
    name: 'protect',
    description: 'Verify .gitignore protection',
    usage: 'ultraenv protect [options]',
  },
  {
    name: 'vault init',
    description: 'Initialize encrypted vault',
    usage: 'ultraenv vault init [options]',
  },
  {
    name: 'vault encrypt',
    description: 'Encrypt .env → vault',
    usage: 'ultraenv vault encrypt [options]',
  },
  {
    name: 'vault decrypt',
    description: 'Decrypt vault → .env',
    usage: 'ultraenv vault decrypt [options]',
  },
  {
    name: 'vault rekey',
    description: 'Rotate encryption keys',
    usage: 'ultraenv vault rekey [options]',
  },
  {
    name: 'vault status',
    description: 'Show vault status',
    usage: 'ultraenv vault status [options]',
  },
  {
    name: 'vault diff',
    description: 'Compare .env vs vault',
    usage: 'ultraenv vault diff [options]',
  },
  {
    name: 'vault verify',
    description: 'Verify vault integrity',
    usage: 'ultraenv vault verify [options]',
  },
  {
    name: 'envs list',
    description: 'List all environments',
    usage: 'ultraenv envs list [options]',
  },
  {
    name: 'envs compare',
    description: 'Compare two environments',
    usage: 'ultraenv envs compare <env1> <env2>',
  },
  {
    name: 'envs validate',
    description: 'Validate all environments',
    usage: 'ultraenv envs validate [options]',
  },
  {
    name: 'envs create',
    description: 'Create new environment',
    usage: 'ultraenv envs create <name> [options]',
  },
  {
    name: 'envs switch',
    description: 'Switch current environment',
    usage: 'ultraenv envs switch <name>',
  },
  {
    name: 'ci validate',
    description: 'CI validation mode',
    usage: 'ultraenv ci validate [options]',
  },
  {
    name: 'ci check-sync',
    description: 'CI sync check',
    usage: 'ultraenv ci check-sync [options]',
  },
  { name: 'ci scan', description: 'CI secret scan', usage: 'ultraenv ci scan [options]' },
  { name: 'ci setup', description: 'Generate CI config', usage: 'ultraenv ci setup [options]' },
  {
    name: 'install-hook',
    description: 'Install git pre-commit hook',
    usage: 'ultraenv install-hook [options]',
  },
  { name: 'doctor', description: 'Self-check installation', usage: 'ultraenv doctor [options]' },
  {
    name: 'completion',
    description: 'Generate shell completions',
    usage: 'ultraenv completion <shell>',
  },
  { name: 'version', description: 'Show version', usage: 'ultraenv version' },
];

export async function run(args: ParsedArgs, _ctx: CommandContext): Promise<number> {
  // Help for a specific command
  const topic = args.positional[0];

  if (topic) {
    const cmd = COMMANDS.find((c) => c.name === topic || c.name.startsWith(topic));
    if (cmd) {
      writeLine('');
      writeLine(bold(`  ${cmd.description}`));
      writeLine('');
      writeLine(`  Usage: ${cmd.usage}`);
      writeLine('');

      const optionsMap: Record<string, string[]> = {
        init: ['--force', '--cwd <path>'],
        validate: ['--env-dir <path>', '--quiet'],
        typegen: ['--format <type>', '--out <path>', '--interface <name>'],
        sync: ['--mode <mode>', '--file <path>', '--out <path>', '--watch'],
        scan: ['--scope <scope>', '--format <type>', '--include <glob>', '--exclude <glob>'],
        'vault init': ['--env <name>', '--force', '--key <key>'],
        'vault encrypt': ['--env <name>', '--key <key>'],
        'vault decrypt': ['--env <name>', '--key <key>'],
        'envs create': ['--template <name>', '--copy <name>'],
        'ci scan': ['--format <type>', '--git-history', '--fail-fast'],
      };

      const opts = optionsMap[cmd.name];
      if (opts) {
        writeLine('  Options:');
        for (const opt of opts) {
          writeLine(`    ${cyan(opt)}`);
        }
        writeLine('');
      }
      return 0;
    }

    writeError(`  Unknown command: ${topic}`);
    writeLine('');
    // Fall through to general help
  }

  // General help
  writeLine('');
  writeLine(bold('  ultraenv — The Ultimate Environment Variable Manager'));
  writeLine(`  ${dim(`v${VERSION}`)}`);
  writeLine('');
  writeLine('  USAGE:');
  writeLine('    ultraenv <command> [options] [arguments]');
  writeLine('');
  writeLine('  COMMANDS:');
  writeLine('');

  // Group commands
  const core = COMMANDS.filter(
    (c) => !c.name.startsWith('vault') && !c.name.startsWith('envs') && !c.name.startsWith('ci'),
  );
  const vault = COMMANDS.filter((c) => c.name.startsWith('vault'));
  const envs = COMMANDS.filter((c) => c.name.startsWith('envs'));
  const ci = COMMANDS.filter((c) => c.name.startsWith('ci'));

  const printGroup = (title: string, cmds: typeof COMMANDS): void => {
    writeLine(`  ${bold(title)}`);
    for (const cmd of cmds) {
      const paddedName = cmd.name.padEnd(20);
      writeLine(`    ${cyan(paddedName)} ${cmd.description}`);
    }
    writeLine('');
  };

  printGroup('Core:', core);
  printGroup('Vault:', vault);
  printGroup('Environments:', envs);
  printGroup('CI/CD:', ci);

  writeLine('  GLOBAL OPTIONS:');
  writeLine('');
  writeLine('    --help, -h          Show help for a command');
  writeLine('    --version           Show version');
  writeLine('    --no-color          Disable colored output');
  writeLine('    --verbose, -v       Verbose output');
  writeLine('    --quiet, -q         Suppress output');
  writeLine('    --strict            Strict mode');
  writeLine('    --debug             Debug logging');
  writeLine('    --cwd <path>        Working directory');
  writeLine('    --config <path>     Config file');
  writeLine('    --format <type>     Output: terminal|json|silent');
  writeLine('');

  return 0;
}
