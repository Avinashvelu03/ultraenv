import { defineEnv, t } from 'ultraenv';

// Import your schema
const env = defineEnv({
  NODE_ENV: t.enum(['development', 'test', 'production']).required(),
  DATABASE_URL: t.string().url().required(),
});

// Next.js config is typed!
const config = env;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use validated env vars in Next.js config
  env: {
    DATABASE_URL: config.DATABASE_URL,
    NODE_ENV: config.NODE_ENV,
  },

  // Enable React strict mode in development
  reactStrictMode: config.NODE_ENV === 'development',

  // Output configuration
  output: config.NODE_ENV === 'production' ? 'standalone' : undefined,
};

module.exports = nextConfig;
