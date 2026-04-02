// =============================================================================
// ultraenv — CLI Command Types
// Shared types and context for CLI commands.
// =============================================================================

import type { UltraenvConfig } from '../../core/types.js';
import type { ParsedArgs } from '../parser.js';

// -----------------------------------------------------------------------------
// Command Context
// -----------------------------------------------------------------------------

/**
 * Context passed to every CLI command.
 * Contains configuration, working directory, and formatting helpers.
 */
export interface CommandContext {
  /** Resolved ultraenv configuration */
  config: UltraenvConfig;
  /** Current working directory */
  cwd: string;
  /** Whether color output is enabled */
  colorEnabled: boolean;
  /** Whether debug mode is active */
  debug: boolean;
  /** Whether quiet mode is active */
  quiet: boolean;
  /** Output format */
  outputFormat: 'terminal' | 'json' | 'silent';
}

// -----------------------------------------------------------------------------
// Command Runner
// -----------------------------------------------------------------------------

/**
 * A CLI command function.
 * Takes parsed args and context, returns an exit code (0 = success).
 */
export type CommandRunner = (args: ParsedArgs, context: CommandContext) => Promise<number>;

// -----------------------------------------------------------------------------
// Command Registration
// -----------------------------------------------------------------------------

export interface CommandDefinition {
  /** The command name (e.g., 'vault.init') */
  name: string;
  /** Short description */
  description: string;
  /** The command runner function */
  run: CommandRunner;
  /** Usage pattern */
  usage: string;
  /** Available options */
  options: Array<{
    flag: string;
    description: string;
    default?: string;
  }>;
  /** Examples */
  examples?: string[];
}
