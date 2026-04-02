import { defineEnv, t, createValidator } from 'ultraenv';

// ─────────────────────────────────────────────────────────────────────────────
// Custom Validators Example
// ─────────────────────────────────────────────────────────────────────────────
// This example shows how to create custom validators for domain-specific
// environment variable validation beyond the built-in types.
// ─────────────────────────────────────────────────────────────────────────────

// ── Custom: S3 Bucket Name ───────────────────────────────────────────────────
// Validates AWS S3 bucket naming rules:
// - 3-63 characters
// - Lowercase letters, numbers, hyphens, periods
// - Must start with letter or number
// - Must not look like an IP address

const s3BucketValidator = createValidator({
  name: 's3-bucket',
  validate(value: unknown) {
    if (typeof value !== 'string') {
      return { valid: false, error: 'Must be a string' };
    }
    const s3Pattern = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
    if (!s3Pattern.test(value)) {
      return {
        valid: false,
        error:
          'Invalid S3 bucket name. Must be 3-63 chars, lowercase alphanumeric, hyphens, and periods only. Must start/end with alphanumeric.',
      };
    }
    // Check it doesn't look like an IP address
    const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    if (ipPattern.test(value)) {
      return { valid: false, error: 'S3 bucket name cannot be formatted as an IP address' };
    }
    return { valid: true, value };
  },
});

// ── Custom: Docker Image Tag ─────────────────────────────────────────────────

const dockerImageValidator = createValidator({
  name: 'docker-image',
  validate(value: unknown) {
    if (typeof value !== 'string') {
      return { valid: false, error: 'Must be a string' };
    }
    // Supports: image, image:tag, image:tag@digest, registry/image:tag
    const dockerPattern = /^(?:[a-z0-9.-]+(?:\/[a-z0-9._-]+)*\/)?[a-z0-9._-]+(?::[a-zA-Z0-9._-]+)?(?:@[a-fA-F0-9]+(?::[a-fA-F0-9]+)?)?$/;
    if (!dockerPattern.test(value)) {
      return { valid: false, error: 'Invalid Docker image reference' };
    }
    return { valid: true, value };
  },
});

// ── Custom: Cron Expression ──────────────────────────────────────────────────
// (ultraenv has this built-in, but shown as a pattern for custom validators)

const cronValidator = createValidator({
  name: 'cron',
  validate(value: unknown) {
    if (typeof value !== 'string') {
      return { valid: false, error: 'Must be a string' };
    }
    const parts = value.trim().split(/\s+/);
    if (parts.length < 5 || parts.length > 7) {
      return { valid: false, error: 'Cron expression must have 5-7 fields' };
    }
    // Validate each field
    const patterns = [
      /^(?:\*|[0-9,\-/]+)$/,           // minute
      /^(?:\*|[0-9,\-/]+)$/,           // hour
      /^(?:\*|[0-9,\-/LW#?]+)$/,       // day of month
      /^(?:\*|[0-9,\-/A-Z]+)$/,        // month
      /^(?:\*|[0-9,\-/A-ZL#?]+)$/,     // day of week
      /^(?:\*|[0-9]+)$/,               // year (optional)
    ];
    for (let i = 0; i < Math.min(parts.length, patterns.length); i++) {
      if (!patterns[i].test(parts[i])) {
        return { valid: false, error: `Invalid cron field ${i + 1}: "${parts[i]}"` };
      }
    }
    return { valid: true, value };
  },
});

// ── Custom: Slack Webhook URL ────────────────────────────────────────────────

const slackWebhookValidator = createValidator({
  name: 'slack-webhook',
  validate(value: unknown) {
    if (typeof value !== 'string') {
      return { valid: false, error: 'Must be a string' };
    }
    if (!value.startsWith('https://hooks.slack.com/services/')) {
      return { valid: false, error: 'Must be a valid Slack webhook URL (https://hooks.slack.com/services/...)' };
    }
    return { valid: true, value };
  },
});

// ── Custom: Semantic Version Range ───────────────────────────────────────────

const semverRangeValidator = createValidator({
  name: 'semver-range',
  validate(value: unknown) {
    if (typeof value !== 'string') {
      return { valid: false, error: 'Must be a string' };
    }
    // Supports: exact (^1.2.3), range (>=1.0.0 <2.0.0), tilde (~1.2.3), etc.
    const semverPattern = /^[\^~>=<]*\s*\d+\.\d+\.\d+([-+].+)?(\s+\|\|\s+[\^~>=<]*\s*\d+\.\d+\.\d+([-+].+)?)?$/;
    if (!semverPattern.test(value.trim())) {
      return { valid: false, error: 'Must be a valid semver range (e.g., ^1.2.3, ~1.0.0, >=1.0.0 <2.0.0)' };
    }
    return { valid: true, value };
  },
});

// ── Use the custom validators in your schema ─────────────────────────────────

export const env = defineEnv({
  // Standard types
  NODE_ENV: t.enum(['development', 'staging', 'production'] as const).required(),
  PORT: t.number().port().default(3000),
  LOG_LEVEL: t.enum(['debug', 'info', 'warn', 'error'] as const).default('info'),

  // Custom validators
  S3_BUCKET: t.string().use(s3BucketValidator).required(),
  DOCKER_IMAGE: t.string().use(dockerImageValidator).required(),
  CRON_SCHEDULE: t.string().use(cronValidator).default('0 * * * *'),
  SLACK_WEBHOOK_URL: t.string().use(slackWebhookValidator).secret().optional(),
  MIN_NODE_VERSION: t.string().use(semverRangeValidator).default('>=18.0.0'),

  // Chained validators (built-in + custom)
  BACKUP_S3_BUCKET: t.string()
    .use(s3BucketValidator)
    .default('myapp-backups'),
});

// ── Output the validated environment ─────────────────────────────────────────

console.log('✅ Environment validated successfully!');
console.log('');
console.log('Configuration:');
console.log(`  NODE_ENV:          ${env.NODE_ENV}`);
console.log(`  PORT:              ${env.PORT}`);
console.log(`  LOG_LEVEL:         ${env.LOG_LEVEL}`);
console.log(`  S3_BUCKET:         ${env.S3_BUCKET}`);
console.log(`  DOCKER_IMAGE:      ${env.DOCKER_IMAGE}`);
console.log(`  CRON_SCHEDULE:     ${env.CRON_SCHEDULE}`);
console.log(`  SLACK_WEBHOOK_URL: ${env.SLACK_WEBHOOK_URL ? '***configured***' : '(not set)'}`);
console.log(`  MIN_NODE_VERSION:  ${env.MIN_NODE_VERSION}`);
console.log(`  BACKUP_S3_BUCKET:  ${env.BACKUP_S3_BUCKET}`);
