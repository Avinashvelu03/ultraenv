// =============================================================================
// ultraenv — Deferred & Promise Utilities
// Promise helpers for async control flow.
// =============================================================================

// -----------------------------------------------------------------------------
// Deferred Pattern
// -----------------------------------------------------------------------------

/**
 * A deferred promise that can be resolved or rejected from the outside.
 * Useful for bridging callback-based APIs to promise-based ones.
 */
export interface Deferred<T> {
  /** The promise that resolves/rejects when `resolve` or `reject` is called */
  readonly promise: Promise<T>;
  /** Resolve the promise with a value */
  resolve(value: T): void;
  /** Reject the promise with a reason */
  reject(reason: Error): void;
  /** Whether the promise has been settled (resolved or rejected) */
  readonly settled: boolean;
}

/**
 * Create a new deferred promise.
 * @example
 * ```ts
 * const deferred = createDeferred<string>();
 * someCallback((result) => deferred.resolve(result));
 * const value = await deferred.promise;
 * ```
 */
export function createDeferred<T>(): Deferred<T> {
  let resolveFn!: (value: T) => void;
  let rejectFn!: (reason: Error) => void;
  let settled = false;

  const promise = new Promise<T>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  return {
    promise,
    resolve(value: T): void {
      if (settled) return;
      settled = true;
      resolveFn(value);
    },
    reject(reason: Error): void {
      if (settled) return;
      settled = true;
      rejectFn(reason);
    },
    get settled(): boolean {
      return settled;
    },
  };
}

// -----------------------------------------------------------------------------
// Sleep
// -----------------------------------------------------------------------------

/**
 * Return a promise that resolves after `ms` milliseconds.
 * @example await sleep(1000); // waits 1 second
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -----------------------------------------------------------------------------
// Retry
// -----------------------------------------------------------------------------

/**
 * Options for the retry utility.
 */
export interface RetryOptions {
  /** Maximum number of attempts (default: 3) */
  maxAttempts: number;
  /** Delay between attempts in milliseconds (default: 1000) */
  delay: number;
  /** Backoff multiplier applied to delay after each attempt (default: 2) */
  backoff?: number;
  /** Maximum delay cap in milliseconds (default: 30_000) */
  maxDelay?: number;
  /** Function to determine whether to retry based on the error (default: always retry) */
  shouldRetry?: (error: Error) => boolean;
  /** Called before each retry with the attempt number and error */
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

/**
 * Retry an async function with exponential backoff.
 *
 * @param fn - The async function to retry.
 * @param options - Retry configuration.
 * @returns The result of the function on the first successful attempt.
 * @throws The last error encountered after all retries are exhausted.
 *
 * @example
 * ```ts
 * const data = await retry(
 *   () => fetchWithTimeout(url),
 *   { maxAttempts: 5, delay: 500, backoff: 2 }
 * );
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 2,
    maxDelay = 30_000,
    shouldRetry = (_error: Error): boolean => true,
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;

      const isLastAttempt = attempt >= maxAttempts;
      if (isLastAttempt || !shouldRetry(err)) {
        throw err;
      }

      // Calculate delay with backoff
      const currentDelay = Math.min(
        delay * Math.pow(backoff, attempt - 1),
        maxDelay,
      );

      onRetry?.(attempt, err, currentDelay);
      await sleep(currentDelay);
    }
  }

  // This should be unreachable, but TypeScript needs it
  throw lastError ?? new Error('Retry exhausted without capturing an error');
}

// -----------------------------------------------------------------------------
// Timeout
// -----------------------------------------------------------------------------

/**
 * Create a promise that rejects after `ms` milliseconds.
 * Useful with Promise.race for implementing timeouts.
 *
 * @example
 * ```ts
 * const result = await Promise.race([
 *   fetchData(),
 *   createTimeoutError(5000, 'Request timed out'),
 * ]);
 * ```
 */
export function createTimeoutError(ms: number, message: string = `Timed out after ${ms}ms`): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(message));
    }, ms);
  });
}

// -----------------------------------------------------------------------------
// Debounce
// -----------------------------------------------------------------------------

/**
 * Create a debounced version of a function.
 * The function will only execute after `wait` ms of silence.
 *
 * @example
 * ```ts
 * const debouncedSave = debounce(() => save(), 300);
 * watcher.on('change', debouncedSave);
 * ```
 */
export function debounce<T extends (...args: never[]) => Promise<void> | void>(
  fn: T,
  wait: number,
): T & { cancel: () => void } {
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>): void => {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(() => {
      timerId = null;
      fn(...args);
    }, wait);
  };

  (debounced as T & { cancel: () => void }).cancel = (): void => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  return debounced as T & { cancel: () => void };
}
