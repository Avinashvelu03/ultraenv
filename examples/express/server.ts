import 'ultraenv/register';
import express from 'express';
import { createEnvMiddleware, createHealthMiddleware } from 'ultraenv/middleware';
import { defineEnv, t } from 'ultraenv';

// ── 1. Define your environment schema ──────────────────────────────────
const env = defineEnv({
  // Server
  PORT: t.number().port().default(3000),
  HOST: t.string().hostname().default('0.0.0.0'),
  NODE_ENV: t.enum(['development', 'staging', 'production'] as const).default('development'),

  // Database
  DATABASE_URL: t.string().url().required().secret(),
  DATABASE_POOL_SIZE: t.number().min(1).max(100).default(10),

  // Redis
  REDIS_URL: t.string().url().required().secret(),
  REDIS_TTL: t.number().min(60).default(3600),

  // Auth
  JWT_SECRET: t.string().min(32).required().secret(),
  JWT_EXPIRES_IN: t.string().default('24h'),

  // Logging
  LOG_LEVEL: t.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const).default('info'),
  LOG_FORMAT: t.enum(['json', 'pretty', 'text'] as const).default('json'),

  // CORS
  CORS_ORIGINS: t.array(t.string().url()).default(['http://localhost:3000']),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: t.number().default(15_000),
  RATE_LIMIT_MAX: t.number().default(100),
});

// ── 2. Create Express app ──────────────────────────────────────────────
const app = express();

// ── 3. Attach ultraenv middleware ──────────────────────────────────────

// Health check endpoint (GET /health)
app.use('/health', createHealthMiddleware(env));

// Env validation middleware (blocks requests if env is invalid)
app.use(createEnvMiddleware(env, {
  // Validate on every request in development, once in production
  validateOnEveryRequest: env.NODE_ENV === 'development',
  // Mask secrets in error messages
  maskSecrets: true,
  // Custom endpoint to view env status
  statusEndpoint: '/env-status',
}));

// ── 4. Application routes ──────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({
    message: 'Hello from ultraenv + Express!',
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.get('/config', (_req, res) => {
  // Only expose non-secret config values
  res.json({
    nodeEnv: env.NODE_ENV,
    logLevel: env.LOG_LEVEL,
    logFormat: env.LOG_FORMAT,
    databasePoolSize: env.DATABASE_POOL_SIZE,
    redisTtl: env.REDIS_TTL,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    rateLimitWindow: env.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: env.RATE_LIMIT_MAX,
  });
});

app.get('/debug/env', (_req, res) => {
  // In production, this would be behind auth
  res.json({
    raw: process.env,
    parsed: env,
    schema: Object.keys(env),
  });
});

// ── 5. Start server ────────────────────────────────────────────────────
app.listen(env.PORT, env.HOST, () => {
  console.log(`🚀 Server running at http://${env.HOST}:${env.PORT}`);
  console.log(`📊 Health check: http://${env.HOST}:${env.PORT}/health`);
  console.log(`🔧 Env status:   http://${env.HOST}:${env.PORT}/env-status`);
  console.log(`📋 Config:       http://${env.HOST}:${env.PORT}/config`);
  console.log(`🌍 Environment:  ${env.NODE_ENV}`);
});
