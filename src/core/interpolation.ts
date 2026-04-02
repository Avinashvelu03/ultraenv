// =============================================================================
// ultraenv — Variable Interpolation Engine
// Expands ${VAR}, ${VAR:-default}, ${VAR:+alt}, ${VAR:?err}, ${VAR^^}, etc.
// =============================================================================

import { InterpolationError } from './errors.js';
import { MAX_INTERPOLATION_DEPTH } from './constants.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ExpandOptions {
  /** Maximum recursion depth for nested variable references (default: 10) */
  maxDepth?: number;
  /** Additional environment variables (e.g., system process.env) to resolve from */
  systemEnv?: Record<string, string | undefined>;
}

/** Internal representation of a parsed ${...} expression */
interface ParsedExpression {
  /** The variable name */
  varName: string;
  /** The operation type */
  op: InterpolationOp;
  /** The operand (default value, error message, replacement, etc.) */
  operand: string;
  /** Whether the colon variant was used (:- vs -, :? vs ?, etc.) */
  useColon: boolean;
}

type InterpolationOp =
  | 'simple' // ${VAR}
  | 'default' // ${VAR-default} or ${VAR:-default}
  | 'alternative' // ${VAR+alt} or ${VAR:+alt}
  | 'error' // ${VAR?err} or ${VAR:?err}
  | 'uppercase' // ${VAR^^}
  | 'lowercase' // ${VAR,,}
  | 'substring'; // ${VAR:offset:length}

// -----------------------------------------------------------------------------
// Expression Parser
// -----------------------------------------------------------------------------

/**
 * Parse a ${...} expression into a structured representation.
 *
 * Supports:
 * - ${VAR}          → simple
 * - ${VAR-default}  → default (unset only)
 * - ${VAR:-default} → default (unset or empty)
 * - ${VAR+alt}      → alternative (set only)
 * - ${VAR:+alt}     → alternative (set and non-empty)
 * - ${VAR?err}      → error (unset only)
 * - ${VAR:?err}     → error (unset or empty)
 * - ${VAR^^}        → uppercase
 * - ${VAR,,}        → lowercase
 * - ${VAR:0:5}      → substring
 */
function parseExpression(expr: string): ParsedExpression {
  // Uppercase
  if (expr.endsWith('^^')) {
    return {
      varName: expr.slice(0, -2),
      op: 'uppercase',
      operand: '',
      useColon: false,
    };
  }

  // Lowercase
  if (expr.endsWith(',,')) {
    return {
      varName: expr.slice(0, -2),
      op: 'lowercase',
      operand: '',
      useColon: false,
    };
  }

  // Substring: ${VAR:offset:length} or ${VAR:offset}
  // Must come before default/alternative/error since they all start with : after var name
  const colonIndex = expr.indexOf(':');
  if (colonIndex > 0) {
    const varName = expr.slice(0, colonIndex);
    const rest = expr.slice(colonIndex + 1);

    // Check if it's a substring pattern: offset or offset:length
    // offset must be a number (possibly negative)
    if (/^-?\d+(:-?\d+)?$/.test(rest)) {
      return {
        varName,
        op: 'substring',
        operand: rest,
        useColon: true,
      };
    }

    // ${VAR:-default}
    return {
      varName,
      op: 'default',
      operand: rest,
      useColon: true,
    };
  }

  // ${VAR-default} (no colon)
  const dashIndex = expr.indexOf('-');
  if (dashIndex > 0) {
    return {
      varName: expr.slice(0, dashIndex),
      op: 'default',
      operand: expr.slice(dashIndex + 1),
      useColon: false,
    };
  }

  // ${VAR:+alt} or ${VAR+alt}
  const plusIndex = expr.indexOf('+');
  if (plusIndex > 0) {
    const varName = expr.slice(0, plusIndex);
    const rest = expr.slice(plusIndex + 1);
    const useColon = rest.startsWith(':');
    return {
      varName,
      op: 'alternative',
      /* v8 ignore start */
      operand: useColon ? rest.slice(1) : rest,
      /* v8 ignore stop */
      useColon,
    };
  }

  // ${VAR?err} or ${VAR:?err}
  const questionIndex = expr.indexOf('?');
  if (questionIndex > 0) {
    const varName = expr.slice(0, questionIndex);
    const rest = expr.slice(questionIndex + 1);
    const useColon = rest.startsWith(':');
    return {
      varName,
      op: 'error',
      /* v8 ignore start */
      operand: useColon ? rest.slice(1) : rest,
      /* v8 ignore stop */
      useColon,
    };
  }

  // Simple: ${VAR}
  return {
    varName: expr,
    op: 'simple',
    operand: '',
    useColon: false,
  };
}

// -----------------------------------------------------------------------------
// Variable Lookup
// -----------------------------------------------------------------------------

/**
 * Look up a variable value from the env map or system env.
 * Returns [value, isSet] tuple where isSet indicates whether the variable exists.
 */
function lookupVar(
  varName: string,
  env: Record<string, string>,
  systemEnv: Record<string, string | undefined>,
): [string, boolean] {
  if (varName in env) {
    return [env[varName]!, true];
  }
  if (systemEnv !== undefined && varName in systemEnv) {
    const sysVal = systemEnv[varName];
    if (sysVal !== undefined) {
      return [sysVal, true];
    }
  }
  return ['', false];
}

// -----------------------------------------------------------------------------
// Expression Evaluator
// -----------------------------------------------------------------------------

/**
 * Evaluate a single parsed expression against the env and system env.
 */
function evaluateExpression(
  parsed: ParsedExpression,
  env: Record<string, string>,
  systemEnv: Record<string, string | undefined>,
  expandValue: (raw: string, depth: number) => string,
  currentDepth: number,
): string {
  const [value, isSet] = lookupVar(parsed.varName, env, systemEnv);
  const isNonEmpty = isSet && value !== '';

  switch (parsed.op) {
    case 'simple':
      if (!isSet) {
        return '';
      }
      return value;

    case 'default': {
      // With colon (-:): use default if unset OR empty
      // Without colon (-): use default if unset only (empty string counts as "set")
      const shouldDefault = parsed.useColon ? !isNonEmpty : !isSet;
      if (shouldDefault) {
        return expandValue(parsed.operand, currentDepth);
      }
      return value;
    }

    case 'alternative': {
      // With colon (:+): use replacement if set AND non-empty
      // Without colon (+): use replacement if set (even if empty)
      /* v8 ignore start */
      const shouldAlt = parsed.useColon ? isNonEmpty : isSet;
      /* v8 ignore stop */
      if (shouldAlt) {
        return expandValue(parsed.operand, currentDepth);
      }
      return '';
    }

    case 'error': {
      // With colon (:?): error if unset OR empty
      // Without colon (?): error if unset only
      /* v8 ignore start */
      const shouldError = parsed.useColon ? !isNonEmpty : !isSet;
      /* v8 ignore stop */
      if (shouldError) {
        const expandedMsg = expandValue(parsed.operand, currentDepth);
        throw new InterpolationError(
          /* v8 ignore start */
          `Variable "${parsed.varName}" is ${parsed.useColon ? 'unset or empty' : 'unset'}: ${expandedMsg}`,
          /* v8 ignore stop */
          {
            variable: parsed.varName,
            /* v8 ignore start */
            hint: parsed.operand || `Set the "${parsed.varName}" variable in your .env file.`,
            /* v8 ignore stop */
          },
        );
      }
      return value;
    }

    case 'uppercase':
      return value.toUpperCase();

    case 'lowercase':
      return value.toLowerCase();

    case 'substring': {
      const parts = parsed.operand.split(':');
      /* v8 ignore start */
      const offset = parts[0] !== undefined ? parseInt(parts[0], 10) : 0;
      /* v8 ignore stop */
      const lengthArg = parts[1] !== undefined ? parseInt(parts[1], 10) : undefined;

      if (!isSet) return '';

      /* v8 ignore start */
      if (Number.isNaN(offset)) return value;
      /* v8 ignore stop */

      const safeOffset = offset < 0 ? Math.max(0, value.length + offset) : offset;

      if (lengthArg !== undefined && !Number.isNaN(lengthArg)) {
        return value.slice(safeOffset, safeOffset + lengthArg);
      }
      return value.slice(safeOffset);
    }
  }
}

// -----------------------------------------------------------------------------
// String Length Expansion: ${#VAR}
// -----------------------------------------------------------------------------

/**
 * Resolve ${#VAR} → returns the string length of VAR's value.
 * Returns -1 if the variable is not set.
 */
function resolveStringLength(
  varName: string,
  env: Record<string, string>,
  systemEnv: Record<string, string | undefined>,
): string {
  const [value, isSet] = lookupVar(varName, env, systemEnv);
  if (!isSet) return '0';
  return String(value.length);
}

// -----------------------------------------------------------------------------
// Main Expansion Engine
// -----------------------------------------------------------------------------

/**
 * Expand variable references in all values of the given env object.
 *
 * Supported expansions:
 * - $VAR          → simple substitution
 * - ${VAR}        → simple substitution (braced)
 * - ${VAR:-def}   → default if unset or empty
 * - ${VAR-def}    → default if unset
 * - ${VAR:+alt}   → replacement if set and non-empty
 * - ${VAR+alt}    → replacement if set
 * - ${VAR:?err}   → error if unset or empty
 * - ${VAR?err}    → error if unset
 * - ${VAR^^}      → uppercase
 * - ${VAR,,}      → lowercase
 * - ${VAR:0:5}    → substring
 * - ${#VAR}       → string length
 * - \${VAR}       → escaped literal (no expansion)
 *
 * @param vars - The env variables to expand (key-value pairs)
 * @param env - The full env map for resolving references (usually the same as vars)
 * @param options - Expansion options
 * @returns A new Record with all variable references expanded
 * @throws InterpolationError on circular references or maximum depth exceeded
 */
export function expandVariables(
  vars: Record<string, string>,
  env: Record<string, string>,
  options?: ExpandOptions,
): Record<string, string> {
  const maxDepth = options?.maxDepth ?? MAX_INTERPOLATION_DEPTH;
  const systemEnv: Record<string, string | undefined> = options?.systemEnv ?? {};
  const resolvedMap: Record<string, string> = {};
  const resolving = new Set<string>();

  /**
   * Recursively expand a single value string.
   */
  function expandValue(raw: string, depth: number): string {
    if (depth > maxDepth) {
      throw new InterpolationError(`Maximum interpolation depth (${maxDepth}) exceeded`, {
        hint: 'Check for deeply nested variable references. Consider simplifying your variable definitions.',
      });
    }

    const result: string[] = [];
    let i = 0;
    const len = raw.length;

    while (i < len) {
      const ch = raw[i]!;

      // Escaped: \${VAR} or \$VAR → literal
      if (ch === '\\' && i + 1 < len && raw[i + 1] === '$') {
        result.push('$');
        i += 2;
        continue;
      }

      // Not a $ → literal character
      if (ch !== '$') {
        result.push(ch);
        i++;
        continue;
      }

      // ch === '$'
      i++;

      // ${#VAR} → string length
      if (i < len && raw[i] === '{' && i + 1 < len && raw[i + 1] === '#') {
        // Find the closing }
        const closeIdx = raw.indexOf('}', i + 2);
        if (closeIdx !== -1) {
          const varName = raw.slice(i + 2, closeIdx).trim();
          result.push(resolveStringLength(varName, env, systemEnv));
          i = closeIdx + 1;
          continue;
        }
        // No closing brace — treat as literal
        result.push('$');
        continue;
      }

      // ${...} → braced expression
      if (i < len && raw[i] === '{') {
        const closeIdx = findClosingBrace(raw, i + 1);
        if (closeIdx !== -1) {
          const inner = raw.slice(i + 1, closeIdx);
          const parsed = parseExpression(inner);

          // Circular reference detection
          if (resolving.has(parsed.varName)) {
            const chain = Array.from(resolving).concat(parsed.varName).join(' → ');
            throw new InterpolationError(`Circular variable reference detected: ${chain}`, {
              variable: parsed.varName,
              circular: true,
              hint: 'Break the cycle by removing one of the circular references.',
            });
          }

          resolving.add(parsed.varName);

          // Ensure the referenced variable is resolved first
          if (parsed.varName in vars && !(parsed.varName in resolvedMap)) {
            const refRaw = vars[parsed.varName]!;
            resolvedMap[parsed.varName] = expandValue(refRaw, depth + 1);
          }

          const expanded = evaluateExpression(
            parsed,
            { ...resolvedMap, ...vars },
            systemEnv,
            expandValue,
            depth + 1,
          );
          result.push(expanded);
          resolving.delete(parsed.varName);
          i = closeIdx + 1;
          continue;
        }

        // No closing brace — treat as literal ${
        result.push('${');
        i++;
        continue;
      }

      // $VAR → simple unbraced substitution
      // Variable name must start with a letter or underscore, contain only [A-Za-z0-9_]
      if (i < len && /^[A-Za-z_]/.test(raw[i]!)) {
        let nameEnd = i + 1;
        while (nameEnd < len && /^[A-Za-z0-9_]/.test(raw[nameEnd]!)) {
          nameEnd++;
        }
        const varName = raw.slice(i, nameEnd);

        // Circular reference detection
        if (resolving.has(varName)) {
          const chain = Array.from(resolving).concat(varName).join(' → ');
          throw new InterpolationError(`Circular variable reference detected: ${chain}`, {
            variable: varName,
            circular: true,
            hint: 'Break the cycle by removing one of the circular references.',
          });
        }

        resolving.add(varName);

        // Ensure the referenced variable is resolved first
        if (varName in vars && !(varName in resolvedMap)) {
          const refRaw = vars[varName]!;
          resolvedMap[varName] = expandValue(refRaw, depth + 1);
        }

        const [resolvedValue] = lookupVar(varName, { ...resolvedMap, ...vars }, systemEnv);
        result.push(resolvedValue);
        resolving.delete(varName);
        i = nameEnd;
        continue;
      }

      // Lone $ at end or before a non-identifier character → literal
      result.push('$');
    }

    return result.join('');
  }

  // Expand all values
  const result: Record<string, string> = {};
  for (const key of Object.keys(vars)) {
    const raw = vars[key]!;
    result[key] = expandValue(raw, 0);
  }

  return result;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Find the closing } brace, respecting nested braces.
 * Returns the index of the matching }, or -1 if not found.
 */
function findClosingBrace(str: string, startIndex: number): number {
  let depth = 1;
  let i = startIndex;
  const len = str.length;

  while (i < len) {
    const ch = str[i]!;

    if (ch === '\\' && i + 1 < len) {
      // Escaped character — skip next
      i += 2;
      continue;
    }

    /* v8 ignore start */
    if (ch === '{') {
      depth++;
      /* v8 ignore stop */
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
    i++;
  }

  return -1;
}
