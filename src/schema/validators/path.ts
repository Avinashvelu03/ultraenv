// =============================================================================
// ultraenv — File Path Validator
// Validates file system paths with configurable constraints.
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

export interface PathValidatorOptions {
  /** Whether the path must be absolute (start with /) — default: false */
  absolute?: boolean;
  /** Whether the path must be relative — default: false */
  relative?: boolean;
  /** Whether to allow .. segments — default: false */
  allowParentTraversal?: boolean;
  /** Whether to allow home directory (~) — default: false */
  allowHomeDir?: boolean;
  /** Maximum path depth (number of segments) — default: unlimited */
  maxDepth?: number;
  /** File extension restriction (e.g., ['.json', '.yaml']) */
  extensions?: readonly string[];
}

function parseAndValidatePath(raw: string, opts: PathValidatorOptions): ParseResult<string> {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return { success: false, error: 'Path must not be empty' };
  }

  if (opts.absolute === true && !trimmed.startsWith('/')) {
    return { success: false, error: 'Path must be absolute (start with "/")' };
  }

  if (opts.relative === true && trimmed.startsWith('/')) {
    return { success: false, error: 'Path must be relative (not start with "/")' };
  }

  if (opts.allowHomeDir !== true && trimmed.includes('~')) {
    return { success: false, error: 'Path must not contain "~" (home directory)' };
  }

  if (opts.allowParentTraversal !== true) {
    // Check for .. segments
    const segments = trimmed.replace(/^\//, '').split('/');
    for (const segment of segments) {
      if (segment === '..') {
        return { success: false, error: 'Path must not contain ".." (parent directory traversal)' };
      }
    }
  }

  if (opts.maxDepth !== undefined) {
    const segments = trimmed
      .replace(/^\//, '')
      .split('/')
      .filter((s) => s.length > 0);
    if (segments.length > opts.maxDepth) {
      return {
        success: false,
        error: `Path depth must be at most ${opts.maxDepth}, got ${segments.length}`,
      };
    }
  }

  if (opts.extensions !== undefined && opts.extensions.length > 0) {
    const validExts = opts.extensions.map((e) => e.toLowerCase());
    const lastDot = trimmed.lastIndexOf('.');
    const ext = lastDot >= 0 ? trimmed.slice(lastDot).toLowerCase() : '';
    if (!validExts.includes(ext)) {
      return {
        success: false,
        error: `Path extension must be one of: ${validExts.join(', ')}. Got "${ext || '(none)'}"`,
      };
    }
  }

  return { success: true, value: trimmed };
}

/** Create a file path schema builder */
export function createPathSchema(opts?: PathValidatorOptions): SchemaBuilder<string> {
  const options = opts ?? {};
  const parser = (raw: string): ParseResult<string> => parseAndValidatePath(raw, options);
  return new SchemaBuilder<string>(parser, 'path');
}
