import { defineEnv, t } from 'ultraenv';

export const env = defineEnv({
  DATABASE_URL: t.string().url().required(),
  PORT: t.number().port().default(3000),
  DEBUG: t.boolean().default(false),
  NODE_ENV: t.enum(['development', 'staging', 'production'] as const).required(),
});
