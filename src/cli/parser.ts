// =============================================================================
// ultraenv — Custom Argument Parser
// Zero-dependency CLI argument parser.
// =============================================================================

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ParsedArgs {
  /** The resolved command (e.g., 'vault.init', 'scan', 'validate') */
  command: string;
  /** Flags and options: { '--help': true, '--config': './path' } */
  flags: Record<string, boolean | string>;
  /** Positional arguments (everything that's not a flag/option/command) */
  positional: string[];
  /** The raw argv array (without node/executable) */
  raw: string[];
}

// -----------------------------------------------------------------------------
// Known Subcommands (hierarchical)
// -----------------------------------------------------------------------------

const KNOWN_COMMANDS = new Set<string>([
  'init',
  'validate',
  'typegen',
  'sync',
  'scan',
  'debug',
  'protect',
  'vault',
  'envs',
  'ci',
  'install-hook',
  'doctor',
  'completion',
  'help',
  'version',
]);

const VAULT_SUBCOMMANDS = new Set<string>([
  'init',
  'encrypt',
  'decrypt',
  'rekey',
  'status',
  'diff',
  'verify',
]);

const ENVS_SUBCOMMANDS = new Set<string>([
  'list',
  'compare',
  'validate',
  'create',
  'switch',
]);

const CI_SUBCOMMANDS = new Set<string>([
  'validate',
  'check-sync',
  'scan',
  'setup',
]);

// -----------------------------------------------------------------------------
// Options that take values
// -----------------------------------------------------------------------------

const OPTIONS_WITH_VALUES = new Set<string>([
  '--config',
  '--format',
  '--output',
  '--cwd',
  '--env',
  '--schema',
  '--out',
  '--source',
  '--target',
  '--shell',
  '--file',
  '--exclude',
  '--include',
]);

// -----------------------------------------------------------------------------
// Parsing
// -----------------------------------------------------------------------------

/**
 * Parse command-line arguments into a structured ParsedArgs object.
 *
 * Handles:
 * - Flags (--help, -h, --no-color)
 * - Options with values (--config <path>)
 * - Combined short flags (-vf for -v -f)
 * - Subcommand detection (vault init → 'vault.init')
 * - Boolean conversion (--no-color → false)
 *
 * @param args - The argv array (typically process.argv.slice(2))
 * @returns A fully parsed ParsedArgs object
 */
export function parseArgs(args: string[]): ParsedArgs {
  const flags: Record<string, boolean | string> = {};
  const positional: string[] = [];
  const commandParts: string[] = [];

  let i = 0;

  while (i < args.length) {
    const arg = args[i]!;

    // Skip empty args
    if (arg === '') {
      i++;
      continue;
    }

    // Handle --no-* flags
    if (arg.startsWith('--no-')) {
      const flagName = arg.slice(5);
      flags[`--${flagName}`] = false;
      i++;
      continue;
    }

    // Handle long options (--option or --option=value)
    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');

      if (eqIndex !== -1) {
        // --option=value
        const key = arg.slice(0, eqIndex);
        const value = arg.slice(eqIndex + 1);
        flags[key] = value;
        i++;
        continue;
      }

      // Check if next arg is the value for this option
      if (OPTIONS_WITH_VALUES.has(arg) && i + 1 < args.length) {
        const nextArg = args[i + 1]!;
        if (!nextArg.startsWith('-')) {
          flags[arg] = nextArg;
          i += 2;
          continue;
        }
      }

      // It's a boolean flag
      flags[arg] = true;
      i++;
      continue;
    }

    // Handle short options (-f, -vf)
    if (arg.startsWith('-') && arg.length > 1) {
      const shortFlags = arg.slice(1);

      for (let j = 0; j < shortFlags.length; j++) {
        const ch = shortFlags[j]!;
        const shortKey = `-${ch}`;

        // Handle -v=value
        if (j === shortFlags.length - 1) {
          // Last char could have a value
          const valuePart = shortFlags.slice(j + 1);
          if (valuePart.length > 0) {
            flags[shortKey] = valuePart;
            break;
          }
        }

        // Check if it takes a value
        if (
          (ch === 'c' || ch === 'f' || ch === 'o') &&
          i + 1 < args.length &&
          j === shortFlags.length - 1
        ) {
          const nextArg = args[i + 1]!;
          if (!nextArg.startsWith('-')) {
            flags[shortKey] = nextArg;
            i++;
            break;
          }
        }

        flags[shortKey] = true;
      }

      i++;
      continue;
    }

    // It's a positional argument — check if it's a known command
    if (commandParts.length === 0 && KNOWN_COMMANDS.has(arg)) {
      commandParts.push(arg);
      i++;

      // Check for subcommands
      if (arg === 'vault' && i < args.length && VAULT_SUBCOMMANDS.has(args[i]!)) {
        commandParts.push(args[i]!);
        i++;
      } else if (arg === 'envs' && i < args.length && ENVS_SUBCOMMANDS.has(args[i]!)) {
        commandParts.push(args[i]!);
        i++;
      } else if (arg === 'ci' && i < args.length && CI_SUBCOMMANDS.has(args[i]!)) {
        commandParts.push(args[i]!);
        i++;
      }

      continue;
    }

    // Regular positional argument
    positional.push(arg);
    i++;
  }

  // Resolve command string
  const command = commandParts.length > 0
    ? commandParts.join('.')
    : (flags['--help'] || flags['-h']) ? 'help'
    : (flags['--version'] || flags['-v'] as string === '--version' ? 'version' : 'help');

  return {
    command,
    flags,
    positional,
    raw: args,
  };
}

// -----------------------------------------------------------------------------
// Boolean Parsing
// -----------------------------------------------------------------------------

/**
 * Parse a string value into a boolean.
 *
 * Supports: true/false, yes/no, 1/0, on/off (case-insensitive)
 *
 * @param value - The string to parse
 * @returns The parsed boolean
 * @throws Error if the value cannot be parsed as a boolean
 */
export function parseBoolean(value: string): boolean {
  const lower = value.toLowerCase().trim();

  if (['true', 'yes', '1', 'on'].includes(lower)) return true;
  if (['false', 'no', '0', 'off'].includes(lower)) return false;

  throw new Error(
    `Cannot parse "${value}" as boolean. Use: true/false, yes/no, 1/0, on/off`,
  );
}

// -----------------------------------------------------------------------------
// Help Formatting
// -----------------------------------------------------------------------------

export interface CommandHelp {
  /** Command name (e.g., 'vault.init') */
  name: string;
  /** Short description */
  description: string;
  /** Usage pattern (e.g., 'ultraenv vault init [options]') */
  usage: string;
  /** Available flags/options */
  options: Array<{
    flag: string;
    description: string;
    default?: string;
  }>;
  /** Examples */
  examples?: string[];
}

/**
 * Format help text for a list of commands.
 *
 * @param commands - Array of command help definitions
 * @returns The formatted help string
 */
export function formatHelp(commands: readonly CommandHelp[]): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('  ultraenv — The Ultimate Environment Variable Manager');
  lines.push('');
  lines.push('  USAGE:');
  lines.push('    ultraenv <command> [options] [arguments]');
  lines.push('');
  lines.push('  COMMANDS:');
  lines.push('');

  // Calculate column widths
  let nameWidth = 0;
  for (const cmd of commands) {
    if (cmd.name.length > nameWidth) {
      nameWidth = cmd.name.length;
    }
  }

  for (const cmd of commands) {
    const paddedName = cmd.name.padEnd(nameWidth + 4);
    lines.push(`    ${paddedName}${cmd.description}`);
  }

  lines.push('');
  lines.push('  GLOBAL OPTIONS:');
  lines.push('');
  lines.push('    --help, -h          Show help');
  lines.push('    --version           Show version');
  lines.push('    --no-color          Disable colored output');
  lines.push('    --verbose, -v       Enable verbose output');
  lines.push('    --quiet, -q         Suppress all output');
  lines.push('    --strict            Enable strict mode');
  lines.push('    --debug             Enable debug logging');
  lines.push('    --cwd <path>        Set working directory');
  lines.push('    --config <path>     Set config file path');
  lines.push('    --format <type>     Output format: terminal|json|silent');
  lines.push('');
  lines.push('  Run "ultraenv help <command>" for details on a specific command.');
  lines.push('');

  return lines.join('\n');
}

/**
 * Format help for a single command.
 */
export function formatCommandHelp(cmd: CommandHelp): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`  ${cmd.description}`);
  lines.push('');
  lines.push(`  USAGE:`);
  lines.push(`    ${cmd.usage}`);
  lines.push('');

  if (cmd.options.length > 0) {
    lines.push('  OPTIONS:');
    lines.push('');

    let flagWidth = 0;
    for (const opt of cmd.options) {
      if (opt.flag.length > flagWidth) {
        flagWidth = opt.flag.length;
      }
    }

    for (const opt of cmd.options) {
      const paddedFlag = opt.flag.padEnd(flagWidth + 4);
      let line = `    ${paddedFlag}${opt.description}`;
      if (opt.default !== undefined) {
        line += ` (default: ${opt.default})`;
      }
      lines.push(line);
    }
    lines.push('');
  }

  if (cmd.examples && cmd.examples.length > 0) {
    lines.push('  EXAMPLES:');
    lines.push('');
    for (const example of cmd.examples) {
      lines.push(`    ${example}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
