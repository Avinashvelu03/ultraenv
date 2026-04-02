// =============================================================================
// ultraenv — CLI Command: completion
// Generate shell completions (bash, zsh, fish).
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { writeLine, writeError } from '../ui/renderer.js';

const BASH_COMPLETION = `# ultraenv bash completion
_ultraenv_completions() {
    local cur prev words cword
    _init_completion || return

    local commands="init validate typegen sync scan debug protect vault envs ci install-hook doctor completion help version"
    local vault_cmds="init encrypt decrypt rekey status diff verify"
    local envs_cmds="list compare validate create switch"
    local ci_cmds="validate check-sync scan setup"

    if [[ \${cword} -eq 1 ]]; then
        COMPREPLY=(\$(compgen -W "\${commands}" -- "\${cur}"))
        return
    fi

    if [[ "\${prev}" == "vault" ]]; then
        COMPREPLY=(\$(compgen -W "\${vault_cmds}" -- "\${cur}"))
        return
    fi

    if [[ "\${prev}" == "envs" ]]; then
        COMPREPLY=(\$(compgen -W "\${envs_cmds}" -- "\${cur}"))
        return
    fi

    if [[ "\${prev}" == "ci" ]]; then
        COMPREPLY=(\$(compgen -W "\${ci_cmds}" -- "\${cur}"))
        return
    fi

    # Complete flags
    local flags="--help -h --version -v --no-color --verbose --quiet -q --strict --debug --cwd --config --format"
    COMPREPLY=(\$(compgen -W "\${flags}" -- "\${cur}"))
}

complete -F _ultraenv_completions ultraenv
`;

const ZSH_COMPLETION = `#compdef ultraenv

_ultraenv() {
    local -a commands
    commands=(
        'init:Initialize ultraenv project'
        'validate:Validate environment'
        'typegen:Generate TypeScript types'
        'sync:Sync .env.example'
        'scan:Scan for secrets'
        'debug:Show diagnostics'
        'protect:Check .gitignore protection'
        'vault:Vault operations'
        'envs:Environment management'
        'ci:CI/CD operations'
        'install-hook:Install git hook'
        'doctor:Self-check'
        'completion:Shell completions'
        'help:Show help'
        'version:Show version'
    )

    local -a vault_cmds
    vault_cmds=(init encrypt decrypt rekey status diff verify)

    local -a envs_cmds
    envs_cmds=(list compare validate create switch)

    local -a ci_cmds
    ci_cmds=(validate check-sync scan setup)

    local -a flags
    flags=(--help -h --version --no-color --verbose --quiet --strict --debug --cwd --config --format)

    if (( CURRENT == 2 )); then
        _describe 'command' commands
        return
    fi

    case $words[2] in
        vault)
            if (( CURRENT == 3 )); then
                _describe 'vault command' vault_cmds
            fi
            ;;
        envs)
            if (( CURRENT == 3 )); then
                _describe 'envs command' envs_cmds
            fi
            ;;
        ci)
            if (( CURRENT == 3 )); then
                _describe 'ci command' ci_cmds
            fi
            ;;
        *)
            _describe 'flags' flags
            ;;
    esac
}

_ultraenv "$@"
`;

const FISH_COMPLETION = `# ultraenv fish shell completion

# Disable file completions
complete -c ultraenv -f

# Main commands
complete -c ultraenv -n '__fish_is_first_arg' -a init validate typegen sync scan debug protect vault envs ci install-hook doctor completion help version

# Vault subcommands
complete -c ultraenv -n '__fish_seen_subcommand_from vault' -a init encrypt decrypt rekey status diff verify

# Envs subcommands
complete -c ultraenv -n '__fish_seen_subcommand_from envs' -a list compare validate create switch

# CI subcommands
complete -c ultraenv -n '__fish_seen_subcommand_from ci' -a validate check-sync scan setup

# Global flags
complete -c ultraenv -l help -s h -d 'Show help'
complete -c ultraenv -l version -d 'Show version'
complete -c ultraenv -l no-color -d 'Disable colors'
complete -c ultraenv -l verbose -s v -d 'Verbose output'
complete -c ultraenv -l quiet -s q -d 'Quiet output'
complete -c ultraenv -l strict -d 'Strict mode'
complete -c ultraenv -l debug -d 'Debug output'
complete -c ultraenv -l cwd -d 'Working directory'
complete -c ultraenv -l config -d 'Config file path'
complete -c ultraenv -l format -d 'Output format'
`;

export async function run(args: ParsedArgs, _ctx: CommandContext): Promise<number> {
  const shell = (args.flags['--shell'] as string) ?? args.positional[0];

  if (!shell || shell === 'help') {
    writeLine('  Usage: ultraenv completion <shell>');
    writeLine('');
    writeLine('  Available shells: bash, zsh, fish');
    writeLine('');
    writeLine('  Install:');
    writeLine('    eval "$(ultraenv completion bash)"');
    writeLine('    eval "$(ultraenv completion zsh)"');
    writeLine('    ultraenv completion fish | source');
    writeLine('');
    return 0;
  }

  switch (shell) {
    case 'bash':
      process.stdout.write(BASH_COMPLETION);
      return 0;
    case 'zsh':
      process.stdout.write(ZSH_COMPLETION);
      return 0;
    case 'fish':
      process.stdout.write(FISH_COMPLETION);
      return 0;
    default:
      writeError(`  Unsupported shell: ${shell}`);
      writeError('  Supported: bash, zsh, fish');
      return 1;
  }
}
