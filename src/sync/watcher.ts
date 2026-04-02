// =============================================================================
// ultraenv — Sync Watcher
// Watches .env files for changes and automatically updates .env.example.
// Uses debouncing to avoid excessive updates during rapid edits.
// =============================================================================

import { watch, type FSWatcher as NativeFSWatcher } from 'node:fs';
import { existsSync } from 'node:fs';
import type { Watcher, WatcherEvent, WatcherCallback } from '../core/types.js';
import { generateExampleFile } from './generator.js';
import { needsUpdate } from './generator.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type WatchEventType = 'change' | 'error' | 'ready';

export interface CreateSyncWatcherOptions {
  /** Path to the .env file to watch */
  envPath: string;
  /** Path to the .env.example file to update */
  examplePath: string;
  /** Schema definition for type hints (if available) */
  schema?: import('../core/types.js').SchemaDefinition;
  /** Debounce interval in milliseconds (default: 300) */
  debounceMs?: number;
  /** Whether to include descriptions in the generated example */
  includeDescriptions?: boolean;
  /** Whether to include type annotations */
  includeTypes?: boolean;
  /** Whether to include default values */
  includeDefaults?: boolean;
  /** Callback invoked after a successful sync */
  onSync?: (result: SyncWatcherResult) => void;
}

export interface SyncWatcherResult {
  /** Whether the sync was successful */
  success: boolean;
  /** The env file that triggered the sync */
  envPath: string;
  /** The example file that was updated */
  examplePath: string;
  /** Error message if sync failed */
  error?: string;
  /** Timestamp of the sync */
  timestamp: string;
}

// -----------------------------------------------------------------------------
// SyncWatcher — Implementation
// -----------------------------------------------------------------------------

/**
 * File watcher that monitors a .env file and auto-updates .env.example
 * whenever changes are detected.
 *
 * Usage:
 * ```ts
 * const watcher = createSyncWatcher({
 *   envPath: '.env',
 *   examplePath: '.env.example',
 *   onSync: (result) => console.log(`Synced: ${result.success}`),
 * });
 * watcher.start();
 * // Later...
 * watcher.stop();
 * ```
 */
export class SyncWatcher implements Watcher {
  private nativeWatcher: NativeFSWatcher | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private callbacks: Map<WatchEventType, Set<WatcherCallback>> = new Map();
  private _active: boolean = false;
  private options: CreateSyncWatcherOptions;

  constructor(options: CreateSyncWatcherOptions) {
    this.options = options;
  }

  /**
   * Start watching the .env file for changes.
   */
  start(): void {
    if (this._active) return;

    const envPath = this.options.envPath;

    if (!existsSync(envPath)) {
      this.emitError(new Error(`File not found: "${envPath}"`));
      return;
    }

    this._active = true;

    try {
      this.nativeWatcher = watch(envPath, { persistent: true }, (_eventType, _filename) => {
        this.debouncedSync();
      });

      this.nativeWatcher.on('error', (error: Error) => {
        this.emitError(error);
        // Re-establish watch after error
        this.nativeWatcher = null;
        setTimeout(() => {
          if (this._active && existsSync(envPath)) {
            this.start();
          }
        }, 1000);
      });

      // Emit ready event
      this.emitEvent({
        type: 'change',
        path: envPath,
        timestamp: Date.now(),
      });
    } catch (error: unknown) {
      this._active = false;
      this.emitError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Stop watching and release all resources.
   */
  stop(): void {
    if (!this._active) return;

    this._active = false;

    if (this.nativeWatcher !== null) {
      try {
        this.nativeWatcher.close();
      } catch {
        // Ignore close errors
      }
      this.nativeWatcher = null;
    }

    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Whether the watcher is currently active.
   */
  get active(): boolean {
    return this._active;
  }

  /**
   * Register a callback for a specific event type.
   */
  on(event: WatchEventType, callback: WatcherCallback): Watcher {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, new Set());
    }
    this.callbacks.get(event)!.add(callback);
    return this;
  }

  /**
   * Remove a previously registered callback.
   */
  off(event: WatchEventType, callback: WatcherCallback): Watcher {
    const cbs = this.callbacks.get(event);
    if (cbs !== undefined) {
      cbs.delete(callback);
    }
    return this;
  }

  // -------------------------------------------------------------------------
  // Private Methods
  // -------------------------------------------------------------------------

  /**
   * Debounce sync operations to avoid excessive file writes.
   */
  private debouncedSync(): void {
    const debounceMs = this.options.debounceMs ?? 300;

    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.performSync();
    }, debounceMs);
  }

  /**
   * Perform the actual sync: regenerate .env.example if needed.
   */
  private async performSync(): Promise<void> {
    const result: SyncWatcherResult = {
      success: false,
      envPath: this.options.envPath,
      examplePath: this.options.examplePath,
      timestamp: new Date().toISOString(),
    };

    try {
      // Check if update is actually needed
      const needs = await needsUpdate(this.options.envPath, this.options.examplePath, {
        schemaPath: undefined,
        includeDescriptions: this.options.includeDescriptions,
        includeTypes: this.options.includeTypes,
        includeDefaults: this.options.includeDefaults,
      });

      if (!needs) {
        result.success = true;
        if (this.options.onSync !== undefined) {
          this.options.onSync(result);
        }
        return;
      }

      // Perform the sync
      await generateExampleFile(this.options.envPath, this.options.examplePath, {
        schemaPath: undefined,
        includeDescriptions: this.options.includeDescriptions,
        includeTypes: this.options.includeTypes,
        includeDefaults: this.options.includeDefaults,
      });

      result.success = true;

      this.emitEvent({
        type: 'change',
        path: this.options.examplePath,
        timestamp: Date.now(),
      });
    } catch (error: unknown) {
      result.error = error instanceof Error ? error.message : String(error);
      this.emitError(error instanceof Error ? error : new Error(String(error)));
    }

    if (this.options.onSync !== undefined) {
      this.options.onSync(result);
    }
  }

  /**
   * Emit a change event to all registered change callbacks.
   */
  private emitEvent(event: WatcherEvent): void {
    const changeCallbacks = this.callbacks.get('change');
    if (changeCallbacks !== undefined) {
      for (const cb of changeCallbacks) {
        try {
          cb(event);
        } catch {
          // Swallow callback errors
        }
      }
    }

    // Also emit 'ready' for the initial event
    const readyCallbacks = this.callbacks.get('ready');
    if (readyCallbacks !== undefined && event.type === 'change') {
      for (const cb of readyCallbacks) {
        try {
          cb(event);
        } catch {
          // Swallow callback errors
        }
      }
    }
  }

  /**
   * Emit an error event.
   */
  private emitError(_error: Error): void {
    const errorCallbacks = this.callbacks.get('error');
    if (errorCallbacks !== undefined) {
      const event: WatcherEvent = {
        type: 'change',
        path: this.options.envPath,
        timestamp: Date.now(),
      };
      for (const cb of errorCallbacks) {
        try {
          cb(event);
        } catch {
          // Swallow callback errors
        }
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

/**
 * Create a new SyncWatcher that monitors a .env file and auto-updates .env.example.
 *
 * @param options - Configuration for the watcher
 * @returns A Watcher instance
 *
 * @example
 * ```ts
 * import { createSyncWatcher } from 'ultraenv/sync';
 *
 * const watcher = createSyncWatcher({
 *   envPath: '.env',
 *   examplePath: '.env.example',
 *   onSync: (result) => {
 *     if (result.success) {
 *       console.log('.env.example updated');
 *     }
 *   },
 * });
 *
 * watcher.start();
 * process.on('SIGINT', () => watcher.stop());
 * ```
 */
export function createSyncWatcher(options: CreateSyncWatcherOptions): Watcher {
  return new SyncWatcher(options);
}
