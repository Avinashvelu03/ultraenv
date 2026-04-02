// =============================================================================
// ultraenv — CLI Entry Point
// Routes parsed args to the correct command handler.
// =============================================================================

import type { ParsedArgs } from './parser.js';
import { parseArgs } from './parser.js';
import type { CommandContext, CommandRunner } from './commands/types.js';
import { initColorSupport } from './ui/colors.js';
import { configureRenderer } from './ui/renderer.js';
import { writeLine, writeError } from './ui/renderer.js';
import { showWelcome } from './ui/banner.js';
import { red, bold } from './ui/colors.js';
import { loadConfig, DEFAULT_CONFIG } from '../core/config.js';
import { VERSION } from '../core/constants.js';
import { UltraenvError } from '../core/errors.js';
import { resolve } from 'node:path';

// -----------------------------------------------------------------------------
// Command Registry
// -----------------------------------------------------------------------------

interface CommandEntry {
  runner: CommandRunner;
  description: string;
}

/**
 * Lazy command loader to avoid loading all commands at startup.
 * Commands are only imported when they're actually needed.
 */
const COMMAND_REGISTRY: Record<string, () => Promise<CommandEntry>> = {
  // Core commands
  init: () =>
    import('./commands/init.js').then((m) => ({
      runner: m.run,
      description: 'Initialize project',
    })),
  validate: () =>
    import('./commands/validate.js').then((m) => ({
      runner: m.run,
      description: 'Validate environment',
    })),
  typegen: () =>
    import('./commands/typegen.js').then((m) => ({
      runner: m.run,
      description: 'Generate TypeScript types',
    })),
  sync: () =>
    import('./commands/sync.js').then((m) => ({ runner: m.run, description: 'Sync .env.example' })),
  scan: () =>
    import('./commands/scan.js').then((m) => ({ runner: m.run, description: 'Scan for secrets' })),
  debug: () =>
    import('./commands/debug.js').then((m) => ({ runner: m.run, description: 'Show diagnostics' })),
  protect: () =>
    import('./commands/protect.js').then((m) => ({
      runner: m.run,
      description: 'Check .gitignore',
    })),

  // Vault subcommands
  'vault.init': () =>
    import('./commands/vault-init.js').then((m) => ({
      runner: m.run,
      description: 'Initialize vault',
    })),
  'vault.encrypt': () =>
    import('./commands/vault-encrypt.js').then((m) => ({
      runner: m.run,
      description: 'Encrypt to vault',
    })),
  'vault.decrypt': () =>
    import('./commands/vault-decrypt.js').then((m) => ({
      runner: m.run,
      description: 'Decrypt from vault',
    })),
  'vault.rekey': () =>
    import('./commands/vault-rekey.js').then((m) => ({
      runner: m.run,
      description: 'Rotate keys',
    })),
  'vault.status': () =>
    import('./commands/vault-status.js').then((m) => ({
      runner: m.run,
      description: 'Vault status',
    })),
  'vault.diff': () =>
    import('./commands/vault-diff.js').then((m) => ({
      runner: m.run,
      description: 'Compare vs vault',
    })),
  'vault.verify': () =>
    import('./commands/vault-verify.js').then((m) => ({
      runner: m.run,
      description: 'Verify integrity',
    })),

  // Environment subcommands
  'envs.list': () =>
    import('./commands/envs-list.js').then((m) => ({
      runner: m.run,
      description: 'List environments',
    })),
  'envs.compare': () =>
    import('./commands/envs-compare.js').then((m) => ({
      runner: m.run,
      description: 'Compare envs',
    })),
  'envs.validate': () =>
    import('./commands/envs-validate.js').then((m) => ({
      runner: m.run,
      description: 'Validate envs',
    })),
  'envs.create': () =>
    import('./commands/envs-create.js').then((m) => ({
      runner: m.run,
      description: 'Create environment',
    })),
  'envs.switch': () =>
    import('./commands/envs-switch.js').then((m) => ({
      runner: m.run,
      description: 'Switch environment',
    })),

  // CI subcommands
  'ci.validate': () =>
    import('./commands/ci-validate.js').then((m) => ({
      runner: m.run,
      description: 'CI validate',
    })),
  'ci.check-sync': () =>
    import('./commands/ci-check-sync.js').then((m) => ({
      runner: m.run,
      description: 'CI sync check',
    })),
  'ci.scan': () =>
    import('./commands/ci-scan.js').then((m) => ({ runner: m.run, description: 'CI scan' })),
  'ci.setup': () =>
    import('./commands/ci-setup.js').then((m) => ({ runner: m.run, description: 'CI setup' })),

  // Utility commands
  'install-hook': () =>
    import('./commands/install-hook.js').then((m) => ({
      runner: m.run,
      description: 'Install git hook',
    })),
  doctor: () =>
    import('./commands/doctor.js').then((m) => ({ runner: m.run, description: 'Self-check' })),
  completion: () =>
    import('./commands/completion.js').then((m) => ({
      runner: m.run,
      description: 'Shell completions',
    })),
  help: () =>
    import('./commands/help.js').then((m) => ({ runner: m.run, description: 'Show help' })),
};

// -----------------------------------------------------------------------------
// Version handler (inline, no module needed)
// -----------------------------------------------------------------------------

function handleVersion(): number {
  writeLine(`ultraenv v${VERSION}`);
  return 0;
}

// -----------------------------------------------------------------------------
// Resolve configuration
// -----------------------------------------------------------------------------

function resolveConfig(args: ParsedArgs): {
  config: typeof DEFAULT_CONFIG;
  cwd: string;
  outputFormat: 'terminal' | 'json' | 'silent';
  debug: boolean;
  quiet: boolean;
} {
  const configPath = args.flags['--config'] as string | undefined;
  const cwd = resolve((args.flags['--cwd'] as string) ?? process.cwd());
  const config = loadConfig(configPath);

  // Apply CLI flags to config
  const outputFormat =
    (args.flags['--format'] as 'terminal' | 'json' | 'silent' | undefined) ?? config.outputFormat;
  const debug = (args.flags['--debug'] as boolean) ?? config.debug ?? false;
  const quiet =
    (args.flags['--quiet'] as boolean) ?? (args.flags['-q'] as boolean) ?? config.silent ?? false;

  return { config, cwd, outputFormat, debug, quiet };
}

// -----------------------------------------------------------------------------
// Main Entry Point
// -----------------------------------------------------------------------------

/**
 * Run the ultraenv CLI.
 *
 * @param argv - The raw argv array (process.argv.slice(2))
 * @returns The exit code (0 = success, non-zero = failure)
 */
export async function run(argv: string[]): Promise<number> {
  const args = parseArgs(argv);

  // Handle --version early
  if (
    (args.flags['--version'] as boolean) ||
    (args.flags['-v'] as string) === '--version' ||
    args.command === 'version'
  ) {
    return handleVersion();
  }

  // Handle bare --help or no command
  if (
    (args.flags['--help'] as boolean) ||
    (args.flags['-h'] as boolean) ||
    args.command === 'help'
  ) {
    const config = resolveConfig(args);
    configureRenderer({
      quiet: config.quiet,
      debug: config.debug,
      format: config.outputFormat,
    });

    if (args.positional.length > 0) {
      // Help for a specific command
      const helpCmd = COMMAND_REGISTRY['help'];
      if (helpCmd) {
        const entry = await helpCmd();
        return entry.runner(args, {
          config: config.config,
          cwd: config.cwd,
          colorEnabled: true,
          debug: config.debug,
          quiet: config.quiet,
          outputFormat: config.outputFormat,
        });
      }
      return 1;
    }

    const helpCmd = COMMAND_REGISTRY['help'];
    if (helpCmd) {
      const entry = await helpCmd();
      return entry.runner(args, {
        config: config.config,
        cwd: config.cwd,
        colorEnabled: true,
        debug: config.debug,
        quiet: config.quiet,
        outputFormat: config.outputFormat,
      });
    }
    return 1;
  }

  // Resolve config
  const { config, cwd, outputFormat, debug, quiet } = resolveConfig(args);

  // Initialize color support
  const noColor = args.flags['--no-color'] as boolean;
  initColorSupport(noColor);

  // Configure renderer
  configureRenderer({
    quiet,
    debug,
    format: outputFormat,
  });

  // Build command context
  const ctx: CommandContext = {
    config,
    cwd,
    colorEnabled: !noColor,
    debug,
    quiet,
    outputFormat,
  };

  // Show banner for non-quiet, non-JSON terminal mode
  if (!quiet && outputFormat === 'terminal') {
    // Only show banner for top-level commands, not subcommands
    if (!args.command.includes('.') && args.command !== 'completion') {
      writeLine(showWelcome());
    }
  }

  // Find the command handler
  const commandLoader = COMMAND_REGISTRY[args.command];

  if (!commandLoader) {
    writeError(red(bold(`  Unknown command: ${args.command}`)));
    writeLine('');
    writeError('  Run "ultraenv help" to see available commands.');
    writeLine('');
    return 1;
  }

  try {
    const entry = await commandLoader();
    const exitCode = await entry.runner(args, ctx);
    return exitCode;
  } catch (error: unknown) {
    // Handle ultraenv errors with structured output
    if (error instanceof UltraenvError) {
      if (outputFormat === 'json') {
        writeError(
          JSON.stringify(
            {
              error: true,
              code: error.code,
              message: error.message,
              hint: error.hint,
            },
            null,
            2,
          ),
        );
      } else {
        writeError('');
        writeError(red(bold(`  [${error.code}] ${error.message}`)));
        if (error.hint) {
          writeError('');
          writeError(`  Hint: ${error.hint}`);
        }
        writeError('');
      }
      return 1;
    }

    // Handle unknown errors
    if (outputFormat === 'json') {
      writeError(
        JSON.stringify(
          {
            error: true,
            message: error instanceof Error ? error.message : String(error),
          },
          null,
          2,
        ),
      );
    } else {
      writeError('');
      writeError(red(bold('  Unexpected error:')));
      writeError(red(`  ${error instanceof Error ? error.message : String(error)}`));
      if (debug && error instanceof Error && error.stack) {
        writeError('');
        writeError(error.stack);
      }
      writeError('');
    }
    return 1;
  }
}
