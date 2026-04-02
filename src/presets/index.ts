// =============================================================================
// ultraenv — Preset Registry
// Central registry for all built-in and custom presets.
// =============================================================================

import type { Preset } from '../core/types.js';

// Import all built-in presets
import { nextjsPreset } from './nextjs.js';
import { vitePreset } from './vite.js';
import { nuxtPreset } from './nuxt.js';
import { remixPreset } from './remix.js';
import { sveltekitPreset } from './sveltekit.js';
import { expressPreset } from './express.js';
import { fastifyPreset } from './fastify.js';
import { dockerPreset } from './docker.js';
import { awsLambdaPreset } from './aws-lambda.js';

// -----------------------------------------------------------------------------
// Preset Registry
// -----------------------------------------------------------------------------

/** Internal storage for all registered presets */
const presets: Record<string, Preset> = {};

// -----------------------------------------------------------------------------
// Registration
// -----------------------------------------------------------------------------

/**
 * Register a preset by name.
 *
 * If a preset with the same name already exists, it will be replaced
 * with a warning logged to stderr.
 *
 * @param name - Unique identifier for the preset (e.g., 'nextjs', 'vite')
 * @param preset - The preset definition
 *
 * @example
 * ```typescript
 * import { registerPreset } from 'ultraenv/presets';
 * registerPreset('my-framework', { id: 'my-framework', ... });
 * ```
 */
export function registerPreset(name: string, preset: Preset): void {
  if (presets[name] !== undefined) {
    process.stderr.write(
      `[ultraenv] Warning: overwriting existing preset "${name}"\n`,
    );
  }
  presets[name] = preset;
}

/**
 * Retrieve a preset by name.
 *
 * @param name - The preset identifier
 * @returns The preset definition, or undefined if not found
 *
 * @example
 * ```typescript
 * import { getPreset } from 'ultraenv/presets';
 * const nextjs = getPreset('nextjs');
 * console.log(nextjs?.schema);
 * ```
 */
export function getPreset(name: string): Preset | undefined {
  return presets[name];
}

/**
 * List all registered preset names.
 *
 * @returns Array of preset identifier strings
 *
 * @example
 * ```typescript
 * import { listPresets } from 'ultraenv/presets';
 * console.log(listPresets());
 * // ['nextjs', 'vite', 'nuxt', 'remix', 'sveltekit', 'express', 'fastify', 'docker', 'aws-lambda']
 * ```
 */
export function listPresets(): string[] {
  return Object.keys(presets);
}

/**
 * Check if a preset is registered.
 *
 * @param name - The preset identifier
 * @returns Whether the preset exists in the registry
 */
export function hasPreset(name: string): boolean {
  return name in presets;
}

/**
 * Remove a preset from the registry.
 *
 * @param name - The preset identifier to remove
 * @returns Whether the preset was found and removed
 */
export function unregisterPreset(name: string): boolean {
  if (name in presets) {
    delete presets[name];
    return true;
  }
  return false;
}

/**
 * Get presets filtered by tag.
 *
 * @param tag - Tag to filter by (e.g., 'framework', 'backend', 'serverless')
 * @returns Array of presets matching the given tag
 */
export function getPresetsByTag(tag: string): Preset[] {
  return Object.values(presets).filter(
    (preset) => preset.tags.includes(tag),
  );
}

/**
 * Get all registered presets as a readonly record.
 *
 * @returns Readonly record of preset name → preset definition
 */
export function getAllPresets(): Readonly<Record<string, Preset>> {
  return { ...presets };
}

// -----------------------------------------------------------------------------
// Auto-Register Built-in Presets
// -----------------------------------------------------------------------------

const BUILT_IN_PRESETS: readonly [string, Preset][] = [
  ['nextjs', nextjsPreset],
  ['vite', vitePreset],
  ['nuxt', nuxtPreset],
  ['remix', remixPreset],
  ['sveltekit', sveltekitPreset],
  ['express', expressPreset],
  ['fastify', fastifyPreset],
  ['docker', dockerPreset],
  ['aws-lambda', awsLambdaPreset],
] as const;

for (const [name, preset] of BUILT_IN_PRESETS) {
  registerPreset(name, preset);
}

// -----------------------------------------------------------------------------
// Re-exports
// -----------------------------------------------------------------------------

export {
  nextjsPreset,
  vitePreset,
  nuxtPreset,
  remixPreset,
  sveltekitPreset,
  expressPreset,
  fastifyPreset,
  dockerPreset,
  awsLambdaPreset,
};

// Re-export preset-specific helpers
export {
  isNextPublicVar,
  isServerOnlyVar,
  detectClientLeakCandidates,
} from './nextjs.js';

export {
  isVitePublicVar,
  detectViteClientLeakCandidates,
} from './vite.js';

export {
  classifyNuxtVar,
  isNuxtPublicVar,
  isNitroVar,
  detectNuxtClientLeakCandidates,
} from './nuxt.js';

export {
  isSveltekitPublicVar,
  detectSveltekitClientLeakCandidates,
} from './sveltekit.js';

export {
  isDockerArg,
  isDockerEnv,
} from './docker.js';

export {
  isAwsSystemVar,
  isAwsVar,
  getLambdaContext,
} from './aws-lambda.js';
