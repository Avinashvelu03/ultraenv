// =============================================================================
// ultraenv — File Watcher
// Watches .env files for changes and triggers reload callbacks.
// Uses node:fs.watch for native file system events with configurable debouncing.
// =============================================================================

import { watch, type FSWatcher as NativeFSWatcher } from 'node:fs';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import type { Watcher, WatcherEvent, WatcherCallback, WatchOptions } from './types.js';
import { resolveCascade, type CascadeOptions, type ResolvedCascadeResult } from './cascade.js';
import { FileSystemError } from './errors.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type WatchEventType = 'change' | 'error' | 'ready';

interface WatcherState {
  /** Native fs.watch watchers keyed by file path */
  nativeWatchers: Map<string, NativeFSWatcher>;
  /** Debounce timers keyed by file path */
  debounceTimers: Map<string, ReturnType<typeof setTimeout>>;
  /** Callback registry keyed by event type */
  callbacks: Map<WatchEventType, Set<WatcherCallback>>;
  /** Whether the watcher is currently active */
  active: boolean;
  /** The resolved cascade used for determining which files to watch */
  cascadeResult: ResolvedCascadeResult | null;
  /** The watch options used */
  watchOptions: WatchOptions;
  /** The cascade options used */
  cascadeOptions: CascadeOptions;
}

// -----------------------------------------------------------------------------
// Default Watch Options
// -----------------------------------------------------------------------------

const DEFAULT_WATCH_OPTIONS: WatchOptions = {
  files: ['.env', '.env.local', '.env.development', '.env.production', '.env.staging'],
  recursive: false,
  debounceMs: 100,
  initial: false,
  pollIntervalMs: 0,
  ignore: [],
};

// -----------------------------------------------------------------------------
// EnvFileWatcher — Implementation of the Watcher interface
// -----------------------------------------------------------------------------

/**
 * File watcher for .env files with debouncing and event callbacks.
 *
 * Usage:
 * ```ts
 * const watcher = createWatcher({ envDir: './config' });
 * watcher.on('change', (event) => console.log(`Changed: ${event.path}`));
 * watcher.on('error', (event) => console.error(`Error: ${event.path}`));
 * watcher.start();
 * // Later...
 * watcher.stop();
 * ```
 */
export class EnvFileWatcher implements Watcher {
  private state: WatcherState;

  constructor(options?: { watchOptions?: WatchOptions; cascadeOptions?: CascadeOptions }) {
    this.state = {
      nativeWatchers: new Map(),
      debounceTimers: new Map(),
      callbacks: new Map(),
      active: false,
      cascadeResult: null,
      watchOptions: { ...DEFAULT_WATCH_OPTIONS, ...options?.watchOptions },
      cascadeOptions: options?.cascadeOptions ?? {},
    };
  }

  /**
   * Start watching all .env files in the cascade.
   * If `initial` is true in WatchOptions, emits a 'ready' event immediately.
   */
  start(): void {
    if (this.state.active) return;

    this.state.active = true;

    // Resolve the cascade to find all files to watch
    this.state.cascadeResult = resolveCascade(this.state.cascadeOptions);

    const filesToWatch = this.state.cascadeResult.existingFiles;

    // Watch the env directory for new file additions
    this.watchDirectory(this.state.cascadeResult.envDir);

    // Watch each existing file individually
    for (const entry of filesToWatch) {
      this.watchFile(entry.absolutePath);
    }

    // Emit ready event
    if (this.state.watchOptions.initial) {
      this.emitEvent({
        type: 'change',
        path: '',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Stop watching all files and clean up resources.
   */
  stop(): void {
    if (!this.state.active) return;

    this.state.active = false;

    // Close all native watchers
    for (const [, nativeWatcher] of this.state.nativeWatchers) {
      try {
        nativeWatcher.close();
      } catch {
        // Ignore close errors
      }
    }
    this.state.nativeWatchers.clear();

    // Clear all debounce timers
    for (const [, timer] of this.state.debounceTimers) {
      clearTimeout(timer);
    }
    this.state.debounceTimers.clear();
  }

  /**
   * Whether the watcher is currently active.
   */
  get active(): boolean {
    return this.state.active;
  }

  /**
   * Register a callback for a specific event type.
   *
   * @param event - The event type: 'change', 'error', or 'ready'
   * @param callback - The callback to invoke when the event occurs
   * @returns This watcher instance (for chaining)
   */
  on(event: WatchEventType, callback: WatcherCallback): Watcher {
    if (!this.state.callbacks.has(event)) {
      this.state.callbacks.set(event, new Set());
    }
    this.state.callbacks.get(event)!.add(callback);
    return this;
  }

  /**
   * Remove a previously registered callback.
   *
   * @param event - The event type
   * @param callback - The callback to remove
   * @returns This watcher instance (for chaining)
   */
  off(event: WatchEventType, callback: WatcherCallback): Watcher {
    const callbacks = this.state.callbacks.get(event);
    if (callbacks !== undefined) {
      callbacks.delete(callback);
    }
    return this;
  }

  /**
   * Stop watching and release all resources (alias for stop()).
   */
  close(): void {
    this.stop();
  }

  // -------------------------------------------------------------------------
  // Private Methods
  // -------------------------------------------------------------------------

  /**
   * Watch a specific file for changes.
   */
  private watchFile(filePath: string): void {
    if (!existsSync(filePath)) return;
    if (this.state.nativeWatchers.has(filePath)) return;

    // Check ignore patterns
    if (this.shouldIgnore(filePath)) return;

    try {
      const nativeWatcher = watch(filePath, {
        persistent: true,
      }, (eventType, filename) => {
        this.handleFileEvent(eventType, filePath, filename);
      });

      nativeWatcher.on('error', () => {
        // Emit a change event so consumers know to re-read the file
        this.emitChangeEvent(filePath);

        // Re-watch the file after error (it may have been deleted temporarily)
        this.state.nativeWatchers.delete(filePath);
        setTimeout(() => {
          if (this.state.active && existsSync(filePath)) {
            this.watchFile(filePath);
          }
        }, 1000);
      });

      this.state.nativeWatchers.set(filePath, nativeWatcher);
    } catch (error: unknown) {
      throw new FileSystemError(`Failed to watch file "${filePath}"`, {
        path: filePath,
        operation: 'watch',
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  /**
   * Watch a directory for file additions/removals.
   */
  private watchDirectory(dirPath: string): void {
    const dirWatchKey = `__dir__:${dirPath}`;
    if (this.state.nativeWatchers.has(dirWatchKey)) return;

    try {
      const nativeWatcher = watch(dirPath, {
        persistent: true,
      }, (eventType, filename) => {
        if (filename === null) return;

        const fullPath = resolve(join(dirPath, filename));

        // Check if this is an .env file we should watch
        if (isEnvFileName(filename) && !this.shouldIgnore(fullPath)) {
          if (eventType === 'rename') {
            if (existsSync(fullPath) && !this.state.nativeWatchers.has(fullPath)) {
              // New file appeared — start watching it
              this.watchFile(fullPath);
              this.debouncedEmit(fullPath, 'add');
            } else if (!existsSync(fullPath) && this.state.nativeWatchers.has(fullPath)) {
              // File was deleted — stop watching
              const watcher = this.state.nativeWatchers.get(fullPath);
              if (watcher !== undefined) {
                watcher.close();
                this.state.nativeWatchers.delete(fullPath);
              }
              this.debouncedEmit(fullPath, 'unlink');
            }
          }
        }
      });

      nativeWatcher.on('error', () => {
        // Directory watch error — silently retry later
        this.state.nativeWatchers.delete(dirWatchKey);
        setTimeout(() => {
          if (this.state.active) {
            this.watchDirectory(dirPath);
          }
        }, 5000);
      });

      this.state.nativeWatchers.set(dirWatchKey, nativeWatcher);
    } catch {
      // Ignore directory watch errors — file watchers are the primary mechanism
    }
  }

  /**
   * Handle a file system event from a file watcher.
   */
  private handleFileEvent(
    eventType: string,
    filePath: string,
    _filename: string | Buffer | null,
  ): void {
    if (eventType === 'change' || eventType === 'rename') {
      if (existsSync(filePath)) {
        this.debouncedEmit(filePath, 'change');
      } else {
        this.debouncedEmit(filePath, 'unlink');
      }
    }
  }

  /**
   * Emit a change event after debouncing.
   */
  private debouncedEmit(filePath: string, type: WatcherEvent['type']): void {
    const debounceMs = this.state.watchOptions.debounceMs;

    // Clear existing timer for this file
    const existingTimer = this.state.debounceTimers.get(filePath);
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.state.debounceTimers.delete(filePath);
      this.emitEvent({
        type,
        path: filePath,
        timestamp: Date.now(),
      });
    }, debounceMs);

    this.state.debounceTimers.set(filePath, timer);
  }

  /**
   * Emit a change event (used by error recovery).
   */
  private emitChangeEvent(filePath: string): void {
    this.debouncedEmit(filePath, 'change');
  }

  /**
   * Emit an event to all registered change callbacks.
   */
  private emitEvent(event: WatcherEvent): void {
    // 'change' events trigger 'change' callbacks
    const changeCallbacks = this.state.callbacks.get('change');
    if (changeCallbacks !== undefined) {
      for (const cb of changeCallbacks) {
        try {
          cb(event);
        } catch {
          // Callback errors are swallowed to prevent watcher crashes
        }
      }
    }

    // Also trigger 'error' callbacks for unlink events (file disappeared)
    if (event.type === 'unlink') {
      const errorCallbacks = this.state.callbacks.get('error');
      if (errorCallbacks !== undefined) {
        for (const cb of errorCallbacks) {
          try {
            cb(event);
          } catch {
            // Callback errors are swallowed
          }
        }
      }
    }
  }

  /**
   * Check if a file path should be ignored based on ignore patterns.
   */
  private shouldIgnore(filePath: string): boolean {
    const patterns = this.state.watchOptions.ignore;
    const fileName = filePath.split('/').pop() ?? filePath;

    for (const pattern of patterns) {
      if (pattern === fileName) return true;
      if (pattern.startsWith('*') && fileName.endsWith(pattern.slice(1))) return true;
      if (pattern.endsWith('*') && fileName.startsWith(pattern.slice(0, -1))) return true;
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        if (regex.test(fileName)) return true;
      }
    }

    return false;
  }
}

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

/**
 * Create a new EnvFileWatcher instance.
 *
 * @param options - Optional watch and cascade configuration
 * @returns A new Watcher instance
 */
export function createWatcher(options?: {
  watchOptions?: WatchOptions;
  cascadeOptions?: CascadeOptions;
}): Watcher {
  return new EnvFileWatcher(options);
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Check if a file name looks like an .env file.
 */
function isEnvFileName(name: string): boolean {
  if (typeof name !== 'string') return false;
  return name === '.env' || name.startsWith('.env.');
}
