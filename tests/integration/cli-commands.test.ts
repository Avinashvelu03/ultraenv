// =============================================================================
// Integration Tests — CLI Commands
// Tests: parser parses args correctly, help command outputs help text.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { parseArgs, formatHelp, formatCommandHelp, parseBoolean, type CommandHelp } from '../../src/cli/parser.js';

describe('integration: CLI commands', () => {
  // ---------------------------------------------------------------------------
  // Parser parses args correctly
  // ---------------------------------------------------------------------------
  describe('parseArgs parses args correctly', () => {
    it('parses a simple command', () => {
      const result = parseArgs(['scan']);

      expect(result.command).toBe('scan');
      expect(result.positional).toEqual([]);
    });

    it('parses a nested command', () => {
      const result = parseArgs(['vault', 'init']);

      expect(result.command).toBe('vault.init');
    });

    it('parses a nested envs command', () => {
      const result = parseArgs(['envs', 'list']);

      expect(result.command).toBe('envs.list');
    });

    it('parses a nested ci command', () => {
      const result = parseArgs(['ci', 'validate']);

      expect(result.command).toBe('ci.validate');
    });

    it('parses boolean flags', () => {
      const result = parseArgs(['scan', '--verbose', '--quiet']);

      expect(result.command).toBe('scan');
      expect(result.flags['--verbose']).toBe(true);
      expect(result.flags['--quiet']).toBe(true);
    });

    it('parses --help flag as help command', () => {
      const result = parseArgs(['--help']);

      expect(result.command).toBe('help');
    });

    it('parses -h flag as help command', () => {
      const result = parseArgs(['-h']);

      expect(result.command).toBe('help');
    });

    it('parses --no-color as false', () => {
      const result = parseArgs(['--no-color', 'scan']);

      expect(result.flags['--color']).toBe(false);
      expect(result.command).toBe('scan');
    });

    it('parses option with value', () => {
      const result = parseArgs(['--config', './ultraenv.config.json', 'validate']);

      expect(result.flags['--config']).toBe('./ultraenv.config.json');
      expect(result.command).toBe('validate');
    });

    it('parses option with = syntax', () => {
      const result = parseArgs(['--format=json', 'scan']);

      expect(result.flags['--format']).toBe('json');
      expect(result.command).toBe('scan');
    });

    it('parses --cwd option with value', () => {
      const result = parseArgs(['--cwd', '/app', 'scan']);

      expect(result.flags['--cwd']).toBe('/app');
    });

    it('parses --env option with value', () => {
      const result = parseArgs(['--env', 'production', 'validate']);

      expect(result.flags['--env']).toBe('production');
    });

    it('collects positional arguments', () => {
      const result = parseArgs(['envs', 'compare', 'development', 'production']);

      expect(result.command).toBe('envs.compare');
      expect(result.positional).toEqual(['development', 'production']);
    });

    it('parses vault encrypt command', () => {
      const result = parseArgs(['vault', 'encrypt', '--env', 'production']);

      expect(result.command).toBe('vault.encrypt');
      expect(result.flags['--env']).toBe('production');
    });

    it('parses vault decrypt command', () => {
      const result = parseArgs(['vault', 'decrypt', '--env', 'development']);

      expect(result.command).toBe('vault.decrypt');
      expect(result.flags['--env']).toBe('development');
    });

    it('preserves raw args', () => {
      const args = ['scan', '--verbose', '--exclude', 'node_modules'];
      const result = parseArgs(args);

      expect(result.raw).toEqual(args);
    });

    it('handles combined short flags consuming next arg as value', () => {
      // -vf scan: 'v' is boolean, 'f' consumes 'scan' as its value
      // Since 'f' is a value-taking flag (ch === 'f'), it takes 'scan' as value
      const result = parseArgs(['-vf', 'scan']);

      expect(result.flags['-v']).toBe(true);
      // 'f' consumes 'scan' as its value, so 'scan' is NOT parsed as command
      expect(result.flags['-f']).toBe('scan');
      expect(result.command).toBe('help'); // no command recognized
    });

    it('handles short flags without a following arg', () => {
      // When -vf is the only arg, 'v' gets true and 'f' gets true
      const result = parseArgs(['-vf']);

      expect(result.flags['-v']).toBe(true);
      expect(result.flags['-f']).toBe(true);
    });

    it('defaults to help when no command given', () => {
      const result = parseArgs([]);

      expect(result.command).toBe('help');
    });

    it('parses init command', () => {
      const result = parseArgs(['init', '--force']);

      expect(result.command).toBe('init');
      expect(result.flags['--force']).toBe(true);
    });

    it('parses typegen command with --out option', () => {
      const result = parseArgs(['typegen', '--out', './env.d.ts']);

      expect(result.command).toBe('typegen');
      expect(result.flags['--out']).toBe('./env.d.ts');
    });

    it('parses install-hook command', () => {
      const result = parseArgs(['install-hook']);

      expect(result.command).toBe('install-hook');
    });

    it('parses doctor command', () => {
      const result = parseArgs(['doctor']);

      expect(result.command).toBe('doctor');
    });
  });

  // ---------------------------------------------------------------------------
  // parseBoolean
  // ---------------------------------------------------------------------------
  describe('parseBoolean', () => {
    it('parses truthy values', () => {
      expect(parseBoolean('true')).toBe(true);
      expect(parseBoolean('yes')).toBe(true);
      expect(parseBoolean('1')).toBe(true);
      expect(parseBoolean('on')).toBe(true);
    });

    it('parses falsy values', () => {
      expect(parseBoolean('false')).toBe(false);
      expect(parseBoolean('no')).toBe(false);
      expect(parseBoolean('0')).toBe(false);
      expect(parseBoolean('off')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(parseBoolean('TRUE')).toBe(true);
      expect(parseBoolean('True')).toBe(true);
      expect(parseBoolean('FALSE')).toBe(false);
      expect(parseBoolean('No')).toBe(false);
    });

    it('throws for invalid values', () => {
      expect(() => parseBoolean('maybe')).toThrow('Cannot parse "maybe" as boolean');
      expect(() => parseBoolean('')).toThrow('Cannot parse "" as boolean');
    });
  });

  // ---------------------------------------------------------------------------
  // Help command outputs help text
  // ---------------------------------------------------------------------------
  describe('formatHelp outputs help text', () => {
    it('produces help text with usage section', () => {
      const commands: readonly CommandHelp[] = [
        {
          name: 'scan',
          description: 'Scan for leaked secrets',
          usage: 'ultraenv scan [options]',
          options: [
            { flag: '--include', description: 'Include patterns' },
            { flag: '--exclude', description: 'Exclude patterns' },
          ],
        },
        {
          name: 'validate',
          description: 'Validate environment against schema',
          usage: 'ultraenv validate [options]',
          options: [],
        },
      ];

      const helpText = formatHelp(commands);

      expect(helpText).toContain('ultraenv');
      expect(helpText).toContain('USAGE:');
      expect(helpText).toContain('COMMANDS:');
      expect(helpText).toContain('scan');
      expect(helpText).toContain('validate');
      expect(helpText).toContain('Scan for leaked secrets');
      expect(helpText).toContain('Validate environment against schema');
      expect(helpText).toContain('GLOBAL OPTIONS:');
      expect(helpText).toContain('--help');
      expect(helpText).toContain('--version');
      expect(helpText).toContain('--no-color');
    });

    it('includes all global options', () => {
      const helpText = formatHelp([]);

      expect(helpText).toContain('--help, -h');
      expect(helpText).toContain('--version');
      expect(helpText).toContain('--no-color');
      expect(helpText).toContain('--verbose, -v');
      expect(helpText).toContain('--quiet, -q');
      expect(helpText).toContain('--strict');
      expect(helpText).toContain('--debug');
      expect(helpText).toContain('--cwd <path>');
      expect(helpText).toContain('--config <path>');
      expect(helpText).toContain('--format <type>');
    });
  });

  describe('formatCommandHelp', () => {
    it('formats help for a single command', () => {
      const cmd: CommandHelp = {
        name: 'vault.encrypt',
        description: 'Encrypt .env into vault',
        usage: 'ultraenv vault encrypt [options]',
        options: [
          { flag: '--env <name>', description: 'Environment name', default: 'development' },
          { flag: '--key <key>', description: 'Encryption key' },
        ],
        examples: [
          'ultraenv vault encrypt --env production',
          'ultraenv vault encrypt --env staging --key ./keys/prod',
        ],
      };

      const helpText = formatCommandHelp(cmd);

      expect(helpText).toContain('Encrypt .env into vault');
      expect(helpText).toContain('USAGE:');
      expect(helpText).toContain('ultraenv vault encrypt [options]');
      expect(helpText).toContain('OPTIONS:');
      expect(helpText).toContain('--env <name>');
      expect(helpText).toContain('Environment name');
      expect(helpText).toContain('default: development');
      expect(helpText).toContain('--key <key>');
      expect(helpText).toContain('Encryption key');
      expect(helpText).toContain('EXAMPLES:');
      expect(helpText).toContain('ultraenv vault encrypt --env production');
    });

    it('handles command with no options or examples', () => {
      const cmd: CommandHelp = {
        name: 'version',
        description: 'Show version',
        usage: 'ultraenv version',
        options: [],
      };

      const helpText = formatCommandHelp(cmd);

      expect(helpText).toContain('Show version');
      expect(helpText).toContain('ultraenv version');
      // Should not contain OPTIONS or EXAMPLES sections
      expect(helpText).not.toContain('OPTIONS:');
      expect(helpText).not.toContain('EXAMPLES:');
    });
  });
});
