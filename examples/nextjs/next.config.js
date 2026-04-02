import { defineEnv, t } from 'ultraenv';
import type { InferEnv } from 'ultraenv';

// Import your schema
const env = defineEnv({
  NODE_ENV: t.enum(['development', 'test', 'production'] as const).required(),
  DATABASE_URL: t.string().url().required(),
});

// Next.js config is typed!
const config: InferEnv<typeof env> = env;

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

  // Headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Environment',
            value: config.NODE_ENV,
          },
        ],
      },
    ];
  },

  // Redirects based on environment
  async redirects() {
    if (config.NODE_ENV === 'production') {
      return [
        {
          source: '/admin',
          destination: '/admin/login',
          permanent: false,
        },
      ];
    }
    return [];
  },

  // Webpack configuration
  webpack(config, { dev }) {
    // Only use source maps in development
    config.devtool = dev ? 'eval-cheap-module-source-map' : false;
    return config;
  },
};

export default nextConfig;
