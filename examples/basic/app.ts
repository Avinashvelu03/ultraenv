import { env } from './env.schema.js';

console.log(`Server starting on port ${env.PORT} in ${env.NODE_ENV} mode`);
console.log(`Database URL: ${env.DATABASE_URL}`);
console.log(`Debug mode: ${env.DEBUG}`);
