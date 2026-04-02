// =============================================================================
// ultraenv — Loading Spinner
// Zero-dependency terminal spinner using setInterval.
// Only renders when stdout is a TTY.
// =============================================================================

// -----------------------------------------------------------------------------
// Spinner Frames
// -----------------------------------------------------------------------------

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const;

const FRAME_INTERVAL_MS = 80;

// -----------------------------------------------------------------------------
// Spinner Class
// -----------------------------------------------------------------------------

export interface Spinner {
  /** Start the spinner animation */
  start(): void;
  /** Stop the spinner and show a final message */
  stop(finalMessage?: string): void;
  /** Stop the spinner with a success indicator */
  succeed(message?: string): void;
  /** Stop the spinner with a failure indicator */
  fail(message?: string): void;
}

// -----------------------------------------------------------------------------
// Factory
// -----------------------------------------------------------------------------

/**
 * Create a terminal spinner instance.
 *
 * @param message - The message to display next to the spinner
 * @returns A Spinner instance with start/stop/succeed/fail methods
 *
 * @example
 * const spinner = createSpinner('Loading environment...');
 * spinner.start();
 * await loadEnv();
 * spinner.succeed('Environment loaded');
 */
export function createSpinner(message: string = ''): Spinner {
  const isTTY = process.stdout.isTTY;

  let interval: ReturnType<typeof setInterval> | null = null;
  let frameIndex = 0;
  let currentMessage = message;
  let stopped = false;

  function render(): void {
    if (stopped) return;

    const frame = FRAMES[frameIndex % FRAMES.length]!;
    const line = `${frame} ${currentMessage}`;

    // Clear the current line and rewrite
    process.stdout.write(`\r\x1b[K${line}`);
    frameIndex++;
  }

  function start(): void {
    if (stopped) return;
    if (!isTTY) {
      // Non-TTY: just print the message once
      process.stdout.write(`${currentMessage}\n`);
      return;
    }

    // Hide cursor
    process.stdout.write('\x1b[?25l');

    frameIndex = 0;
    interval = setInterval(render, FRAME_INTERVAL_MS);
    render();
  }

  function stop(finalMessage?: string): void {
    if (stopped) return;
    stopped = true;

    if (interval !== null) {
      clearInterval(interval);
      interval = null;
    }

    if (!isTTY) return;

    // Clear the spinner line
    process.stdout.write('\r\x1b[K');

    // Show cursor again
    process.stdout.write('\x1b[?25h');

    if (finalMessage !== undefined) {
      process.stdout.write(`${finalMessage}\n`);
    }
  }

  function succeed(message?: string): void {
    const finalMsg = message ?? currentMessage;
    stop(`\x1b[32m✔\x1b[0m ${finalMsg}`);
  }

  function fail(message?: string): void {
    const finalMsg = message ?? currentMessage;
    stop(`\x1b[31m✖\x1b[0m ${finalMsg}`);
  }

  return {
    start,
    stop,
    succeed,
    fail,
  };
}
