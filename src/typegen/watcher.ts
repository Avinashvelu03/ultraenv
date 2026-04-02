// =============================================================================
// ultraenv — Typegen Watcher
// Watches schema and env files for changes, regenerates type declarations
// and modules on change.
// =============================================================================

import { watch, type FSWatcher as NativeFSWatcher } from 'node:fs';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Watcher, WatcherEvent, WatcherCallback } from '../core/types.js';
import type { SchemaDefinition } from '../core/types.js';
import { generateDeclaration } from './declaration.js';
import { generateModule } from './module.js';
import { generateJsonSchema } from './json-schema.js';
import { readFile } from '../utils/fs.js';
import { parseEnvFile } from '../core/parser.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type WatchEventType = 'change' | 'error' | 'ready';

export type TypegenFormat = 'declaration' | 'module' | 'json-schema' | 'all';

export interface CreateTypegenWatcherOptions {
  /** Path to the schema file (watched for changes) */
  schemaPath?: string;
  /** Path to the .env file (watched for changes) */
  envPath?: string;
  /** Output path for the generated type file(s) */
  outputPath: string;
  /** The schema definition (used when schemaPath is not provided) */
  schema?: SchemaDefinition;
  /** Which formats to generate (default: 'declaration') */
  format?: TypegenFormat;
  /** Debounce interval in milliseconds (default: 300) */
  debounceMs?: number;
  /** Callback invoked after generation */
  onGenerate?: (result: TypegenResult) => void;
}

export interface TypegenResult {
  /** Whether generation was successful */
  success: boolean;
  /** The format that was generated */
  format: TypegenFormat;
  /** Output path(s) written */
  outputPaths: readonly string[];
  /** Error message if generation failed */
  error?: string;
  /** Timestamp */
  timestamp: string;
}

// -----------------------------------------------------------------------------
// TypegenWatcher — Implementation
// -----------------------------------------------------------------------------

/**
 * File watcher that monitors schema and env files, regenerating type
 * declarations whenever changes are detected.
 *
 * Usage:
 * ```ts
 * const watcher = createTypegenWatcher({
 *   envPath: '.env',
 *   outputPath: 'src/env.d.ts',
 *   schema: mySchema,
 *   onGenerate: (result) => console.log('Types regenerated'),
 * });
 * watcher.start();
 * ```
 */
export class TypegenWatcher implements Watcher {
  private nativeWatchers: Map<string, NativeFSWatcher> = new Map();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private callbacks: Map<WatchEventType, Set<WatcherCallback>> = new Map();
  private _active: boolean = false;
  private options: CreateTypegenWatcherOptions;

  constructor(options: CreateTypegenWatcherOptions) {
    this.options = options;
  }

  /**
   * Start watching the configured files.
   */
  start(): void {
    if (this._active) return;

    this._active = true;

    // Watch schema file if provided
    if (this.options.schemaPath !== undefined) {
      this.watchFile(this.options.schemaPath);
    }

    // Watch env file if provided
    if (this.options.envPath !== undefined) {
      this.watchFile(this.options.envPath);
    }

    // Watch the output directory for external deletions
    const outputDir = dirname(resolve(this.options.outputPath));
    this.watchDirectory(outputDir);

    // Emit ready event
    this.emitChange('');
  }

  /**
   * Stop watching and release all resources.
   */
  stop(): void {
    if (!this._active) return;

    this._active = false;

    for (const [, nativeWatcher] of this.nativeWatchers) {
      try {
        nativeWatcher.close();
      } catch {
        // Ignore close errors
      }
    }
    this.nativeWatchers.clear();

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
   * Watch a specific file for changes.
   */
  private watchFile(filePath: string): void {
    if (!existsSync(filePath)) return;

    try {
      const nativeWatcher = watch(filePath, { persistent: true }, () => {
        this.debouncedGenerate();
      });

      nativeWatcher.on('error', () => {
        // Re-establish watch after error
        this.nativeWatchers.delete(filePath);
        setTimeout(() => {
          if (this._active && existsSync(filePath)) {
            this.watchFile(filePath);
          }
        }, 1000);
      });

      this.nativeWatchers.set(filePath, nativeWatcher);
    } catch {
      // Ignore watch errors
    }
  }

  /**
   * Watch a directory for changes.
   */
  private watchDirectory(dirPath: string): void {
    const dirKey = `__dir__:${dirPath}`;
    if (this.nativeWatchers.has(dirKey)) return;

    try {
      const nativeWatcher = watch(dirPath, { persistent: true }, () => {
        this.debouncedGenerate();
      });

      nativeWatcher.on('error', () => {
        this.nativeWatchers.delete(dirKey);
        setTimeout(() => {
          if (this._active) {
            this.watchDirectory(dirPath);
          }
        }, 5000);
      });

      this.nativeWatchers.set(dirKey, nativeWatcher);
    } catch {
      // Ignore watch errors
    }
  }

  /**
   * Debounce generation to avoid excessive rewrites.
   */
  private debouncedGenerate(): void {
    const debounceMs = this.options.debounceMs ?? 300;

    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.performGenerate();
    }, debounceMs);
  }

  /**
   * Perform the actual type generation.
   */
  private async performGenerate(): Promise<void> {
    const format = this.options.format ?? 'declaration';
    const result: TypegenResult = {
      success: false,
      format,
      outputPaths: [],
      timestamp: new Date().toISOString(),
    };

    try {
      // Load env vars if env path is provided
      let vars: Record<string, string> = {};
      if (this.options.envPath !== undefined && existsSync(this.options.envPath)) {
        const envContent = await readFile(this.options.envPath);
        const parsed = parseEnvFile(envContent, this.options.envPath);
        for (const envVar of parsed.vars) {
          vars[envVar.key] = envVar.value;
        }
      }

      // Determine output paths
      const outputPath = this.options.outputPath;
      const outputPaths: string[] = [];

      if (format === 'declaration' || format === 'all') {
        const declPath = format === 'all'
          ? outputPath.replace(/\.\w+$/, '.d.ts') || 'ultraenv.d.ts'
          : outputPath;
        await generateDeclaration(vars, this.options.schema, declPath);
        outputPaths.push(declPath);
      }

      if (format === 'module' || format === 'all') {
        const modulePath = format === 'all'
          ? outputPath.replace(/\.\w+$/, '.env.ts') || 'ultraenv.env.ts'
          : outputPath;
        if (this.options.schema !== undefined) {
          await generateModule(this.options.schema, modulePath);
        }
        outputPaths.push(modulePath);
      }

      if (format === 'json-schema' || format === 'all') {
        const jsonPath = format === 'all'
          ? outputPath.replace(/\.\w+$/, '.schema.json') || 'ultraenv.schema.json'
          : outputPath;
        if (this.options.schema !== undefined) {
          await generateJsonSchema(this.options.schema, jsonPath);
        }
        outputPaths.push(jsonPath);
      }

      result.success = true;
      result.outputPaths = outputPaths;

      this.emitChange(outputPaths[0] ?? outputPath);
    } catch (error: unknown) {
      result.error = error instanceof Error ? error.message : String(error);
      this.emitError(error instanceof Error ? error : new Error(String(error)));
    }

    if (this.options.onGenerate !== undefined) {
      this.options.onGenerate(result);
    }
  }

  /**
   * Emit a change event to all registered callbacks.
   */
  private emitChange(filePath: string): void {
    const event: WatcherEvent = {
      type: 'change',
      path: filePath,
      timestamp: Date.now(),
    };

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

    const readyCallbacks = this.callbacks.get('ready');
    if (readyCallbacks !== undefined) {
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
    const event: WatcherEvent = {
      type: 'change',
      path: '',
      timestamp: Date.now(),
    };

    const errorCallbacks = this.callbacks.get('error');
    if (errorCallbacks !== undefined) {
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
 * Create a new TypegenWatcher that monitors schema and env files,
 * regenerating type declarations whenever changes are detected.
 *
 * @param options - Configuration for the watcher
 * @returns A Watcher instance
 *
 * @example
 * ```ts
 * import { createTypegenWatcher } from 'ultraenv/typegen';
 *
 * const watcher = createTypegenWatcher({
 *   envPath: '.env',
 *   outputPath: 'src/env.d.ts',
 *   schema: mySchema,
 *   format: 'all',
 *   onGenerate: (result) => {
 *     if (result.success) {
 *       console.log(`Generated: ${result.outputPaths.join(', ')}`);
 *     }
 *   },
 * });
 *
 * watcher.start();
 * process.on('SIGINT', () => watcher.stop());
 * ```
 */
export function createTypegenWatcher(options: CreateTypegenWatcherOptions): Watcher {
  return new TypegenWatcher(options);
}
