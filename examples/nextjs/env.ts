import { defineEnv, t } from 'ultraenv';

/**
 * Ultraenv configuration for Next.js
 *
 * Server-only variables use `.required()` without `expose()`
 * Public (client-accessible) variables use `.expose()`
 */

export const env = defineEnv({
  // ── Server-only variables ─────────────────────────────────────────────
  // These are only available on the server side

  DATABASE_URL: t.string().url().required(),
  DATABASE_POOL_SIZE: t.number().min(1).max(100).default(10),
  REDIS_URL: t.string().url().required().secret(),

  // ── Public variables (exposed to the client) ──────────────────────────
  // These are available in both server and client code via process.env

  NEXT_PUBLIC_APP_URL: t.string().url().default('http://localhost:3000').expose(),
  NEXT_PUBLIC_API_URL: t.string().url().default('http://localhost:3000/api').expose(),
  NEXT_PUBLIC_APP_NAME: t.string().default('My Next.js App').expose(),
  NEXT_PUBLIC_VERSION: t.string().default('0.1.0').expose(),

  // ── Shared variables ──────────────────────────────────────────────────
  // Available on both server and client (but not exposed to browser)

  NODE_ENV: t.enum(['development', 'test', 'production'] as const).required(),
  LOG_LEVEL: t.enum(['error', 'warn', 'info', 'debug'] as const).default('info'),

  // ── Feature flags ─────────────────────────────────────────────────────
  ENABLE_ANALYTICS: t.boolean().default(false).expose(),
  ENABLE_DARK_MODE: t.boolean().default(true).expose(),
  MAINTENANCE_MODE: t.boolean().default(false),

  // ── External services ─────────────────────────────────────────────────
  STRIPE_SECRET_KEY: t.string().startsWith('sk_').secret().optional(),
  STRIPE_WEBHOOK_SECRET: t.string().startsWith('whsec_').secret().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: t.string().startsWith('pk_').optional().expose(),

  // ── Rate limiting & security ──────────────────────────────────────────
  RATE_LIMIT_MAX: t.number().min(1).max(10000).default(100),
  SESSION_SECRET: t.string().min(32).required().secret(),
  CSRF_TOKEN_LIFETIME: t.string().duration().default('1h'),
});

// Type-safe accessor for server components
// Use this in API routes and server components
export function getServerEnv() {
  return env;
}

// Generate public env object for client components
// Use this in layout.tsx or page.tsx to pass env to client
export function getPublicEnv() {
  return {
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_URL: env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_NAME: env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_VERSION: env.NEXT_PUBLIC_VERSION,
    ENABLE_ANALYTICS: env.ENABLE_ANALYTICS,
    ENABLE_DARK_MODE: env.ENABLE_DARK_MODE,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  };
}
