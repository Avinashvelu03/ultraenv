// =============================================================================
// ultraenv — Interactive Prompts
// Zero-dependency terminal prompts using node:readline.
// =============================================================================

import * as readline from 'node:readline';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface PromptOptions {
  /** Default value if the user enters nothing */
  default?: string;
  /** Whether the input is required (rejects empty strings) */
  required?: boolean;
  /** Custom validation function. Return error message string to reject, undefined to accept */
  validate?: (value: string) => string | undefined;
}

// -----------------------------------------------------------------------------
// Readline Interface Factory
// -----------------------------------------------------------------------------

function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Close the readline interface safely.
 */
function closeInterface(rl: readline.Interface): void {
  // Prevent the interface from interfering with future stdin reads
  rl.close();
}

// -----------------------------------------------------------------------------
// Prompt
// -----------------------------------------------------------------------------

/**
 * Prompt the user for text input.
 *
 * @param message - The prompt message to display
 * @param options - Prompt configuration options
 * @returns The user's input as a string
 *
 * @example
 * const name = await prompt('Project name:', { required: true });
 * const port = await prompt('Port:', { default: '3000' });
 */
export function prompt(message: string, options?: PromptOptions): Promise<string> {
  return new Promise<string>((resolve) => {
    const rl = createReadlineInterface();
    const suffix = options?.default !== undefined ? ` (${options.default})` : '';
    const requiredMark = options?.required ? ' *' : '';

    rl.question(`${message}${suffix}${requiredMark}: `, (answer) => {
      closeInterface(rl);

      const trimmed = answer.trim();

      // Check required
      if (options?.required && trimmed === '' && options.default === undefined) {
        // Try again
        prompt(message, options).then(resolve);
        return;
      }

      // Use default if empty
      const value = trimmed === '' && options?.default !== undefined ? options.default : trimmed;

      // Validate
      if (options?.validate !== undefined) {
        const error = options.validate(value);
        if (error !== undefined) {
          process.stderr.write(`  ${error}\n`);
          prompt(message, options).then(resolve);
          return;
        }
      }

      resolve(value);
    });
  });
}

// -----------------------------------------------------------------------------
// Confirm
// -----------------------------------------------------------------------------

/**
 * Ask a yes/no confirmation question.
 *
 * @param message - The question to display
 * @param defaultVal - Default value when user presses Enter (default: true)
 * @returns true for yes, false for no
 *
 * @example
 * if (await confirm('Overwrite existing file?', false)) {
 *   // ...
 * }
 */
export function confirm(message: string, defaultVal: boolean = true): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const rl = createReadlineInterface();
    const hint = defaultVal ? '(Y/n)' : '(y/N)';

    rl.question(`${message} ${hint}: `, (answer) => {
      closeInterface(rl);

      const trimmed = answer.trim().toLowerCase();

      if (trimmed === '') {
        resolve(defaultVal);
        return;
      }

      if (trimmed === 'y' || trimmed === 'yes') {
        resolve(true);
        return;
      }

      if (trimmed === 'n' || trimmed === 'no') {
        resolve(false);
        return;
      }

      // Invalid input — try again
      confirm(message, defaultVal).then(resolve);
    });
  });
}

// -----------------------------------------------------------------------------
// Select
// -----------------------------------------------------------------------------

/**
 * Present a list of choices and let the user pick one.
 *
 * @param message - The prompt message
 * @param choices - Array of choice strings
 * @returns The selected choice string
 *
 * @example
 * const framework = await select('Choose a framework:', ['nextjs', 'vite', 'express']);
 */
export function select(message: string, choices: string[]): Promise<string> {
  return new Promise<string>((resolve) => {
    const rl = createReadlineInterface();

    // Display choices
    process.stdout.write(`\n${message}\n`);
    for (let i = 0; i < choices.length; i++) {
      process.stdout.write(`  ${cyan(String(i + 1))}) ${choices[i]!}\n`);
    }
    process.stdout.write('\n');

    rl.question(`  Enter number (1-${choices.length}): `, (answer) => {
      closeInterface(rl);

      const trimmed = answer.trim();
      const num = parseInt(trimmed, 10);

      if (!Number.isNaN(num) && num >= 1 && num <= choices.length) {
        resolve(choices[num - 1]!);
        return;
      }

      // Check if they typed the choice directly
      const lower = trimmed.toLowerCase();
      const match = choices.find((c) => c.toLowerCase() === lower);
      if (match !== undefined) {
        resolve(match);
        return;
      }

      // Invalid — try again
      process.stderr.write(
        `  Invalid selection. Please enter a number between 1 and ${choices.length}.\n`,
      );
      select(message, choices).then(resolve);
    });
  });
}

// -----------------------------------------------------------------------------
// Password
// -----------------------------------------------------------------------------

/**
 * Prompt for a password (input is hidden).
 *
 * @param message - The prompt message
 * @returns The password string entered by the user
 *
 * @example
 * const key = await password('Enter encryption key:');
 */
export function password(message: string): Promise<string> {
  return new Promise<string>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Hide input by replacing each character with *
    process.stdout.write(`${message}: `);

    const stdin = process.stdin;

    if (!stdin.isTTY) {
      // Non-TTY fallback: just ask normally
      rl.question('', (answer) => {
        closeInterface(rl);
        resolve(answer.trim());
      });
      return;
    }

    // Disable echo
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    let input = '';

    const onData = (data: Buffer): void => {
      const str = data.toString('utf-8');

      for (const char of str) {
        if (char === '\n' || char === '\r') {
          // Enter pressed
          stdin.setRawMode(false);
          stdin.removeListener('data', onData);
          closeInterface(rl);
          process.stdout.write('\n');

          if (wasRaw !== true) {
            stdin.setRawMode(wasRaw);
          }

          resolve(input);
          return;
        } else if (char === '\x7f' || char === '\b') {
          // Backspace
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        } else if (char === '\x03') {
          // Ctrl+C
          stdin.setRawMode(false);
          stdin.removeListener('data', onData);
          closeInterface(rl);
          process.stdout.write('\n');
          process.exit(130);
        } else if (char.charCodeAt(0) >= 32) {
          // Printable character
          input += char;
          process.stdout.write('*');
        }
      }
    };

    stdin.on('data', onData);
  });
}

// -----------------------------------------------------------------------------
// Inline Color Helper
// -----------------------------------------------------------------------------

/** Simple cyan color for non-TTY contexts */
function cyan(text: string): string {
  return `\x1b[36m${text}\x1b[0m`;
}
