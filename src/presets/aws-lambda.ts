// =============================================================================
// ultraenv — AWS Lambda Preset
// Schema definitions and conventions for AWS Lambda serverless functions.
// =============================================================================

import type { Preset, SchemaDefinition } from '../core/types.js';
import { EnvFileType } from '../core/types.js';

// -----------------------------------------------------------------------------
// Prefix Constants
// -----------------------------------------------------------------------------

/** Prefix for AWS environment variables */
export const AWS_PREFIX = 'AWS_';

/** All known AWS system-reserved variable names (set by Lambda runtime) */
export const AWS_SYSTEM_VARS: readonly string[] = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'AWS_REGION',
  'AWS_DEFAULT_REGION',
  'AWS_ACCOUNT_ID',
  'AWS_LAMBDA_FUNCTION_NAME',
  'AWS_LAMBDA_FUNCTION_VERSION',
  'AWS_LAMBDA_FUNCTION_MEMORY_SIZE',
  'AWS_LAMBDA_FUNCTION_TIMEOUT',
  'AWS_LAMBDA_LOG_GROUP_NAME',
  'AWS_LAMBDA_LOG_STREAM_NAME',
  'AWS_EXECUTION_ENV',
  'AWS_LAMBDA_RUNTIME_API',
  'AWS_LAMBDA_INITIALIZATION_TYPE',
] as const;

// -----------------------------------------------------------------------------
// Schema
// -----------------------------------------------------------------------------

/**
 * AWS Lambda environment variable schema.
 *
 * AWS Lambda provides several system environment variables automatically.
 * Custom env vars can be set via:
 * - Lambda console configuration
 * - AWS SAM template (Globals.Function.Environment.Variables)
 * - AWS CDK (lambda.Function.environment)
 * - Serverless Framework (provider.environment / functions.*.environment)
 * - .env files loaded by ultraenv
 */
export const awsLambdaSchema: SchemaDefinition = {
  // ── AWS System Variables (set by Lambda runtime) ──────────────────
  AWS_REGION: {
    type: 'string',
    optional: true,
    description: 'AWS region for the Lambda function (auto-set by Lambda)',
  },
  AWS_DEFAULT_REGION: {
    type: 'string',
    optional: true,
    description: 'Default AWS region (usually same as AWS_REGION)',
  },
  AWS_ACCESS_KEY_ID: {
    type: 'string',
    optional: true,
    description: 'AWS access key ID (auto-set by Lambda execution role)',
  },
  AWS_SECRET_ACCESS_KEY: {
    type: 'string',
    optional: true,
    description: 'AWS secret access key (auto-set by Lambda execution role)',
  },
  AWS_SESSION_TOKEN: {
    type: 'string',
    optional: true,
    description: 'AWS session token for temporary credentials',
  },

  // ── Lambda Runtime Info (read-only, set by runtime) ───────────────
  AWS_LAMBDA_FUNCTION_NAME: {
    type: 'string',
    optional: true,
    description: 'Lambda function name (set by runtime)',
  },
  AWS_LAMBDA_FUNCTION_VERSION: {
    type: 'string',
    optional: true,
    description: 'Lambda function version (set by runtime)',
  },
  AWS_LAMBDA_FUNCTION_MEMORY_SIZE: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'Allocated memory in MB (set by Lambda configuration)',
  },
  AWS_LAMBDA_FUNCTION_TIMEOUT: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'Function timeout in seconds (set by Lambda configuration)',
  },
  AWS_LAMBDA_LOG_GROUP_NAME: {
    type: 'string',
    optional: true,
    description: 'CloudWatch log group name (set by runtime)',
  },
  AWS_LAMBDA_LOG_STREAM_NAME: {
    type: 'string',
    optional: true,
    description: 'CloudWatch log stream name (set by runtime)',
  },

  // ── Custom Application Variables ──────────────────────────────────
  NODE_ENV: {
    type: 'enum',
    values: ['development', 'production', 'test'],
    description: 'Node.js environment mode',
    default: 'production',
  },
  APP_ENV: {
    type: 'string',
    optional: true,
    description: 'Application environment identifier (e.g., staging, prod)',
  },
  LOG_LEVEL: {
    type: 'enum',
    values: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
    optional: true,
    description: 'Application log level',
    default: 'info',
  },

  // ── Database (common patterns) ────────────────────────────────────
  DATABASE_URL: {
    type: 'string',
    optional: true,
    format: 'url',
    description: 'Database connection URL',
  },
  DB_HOST: {
    type: 'string',
    optional: true,
    description: 'Database host (within VPC)',
  },
  DB_PORT: {
    type: 'number',
    optional: true,
    positive: true,
    description: 'Database port',
  },
  DB_NAME: {
    type: 'string',
    optional: true,
    description: 'Database name',
  },
  DB_USER: {
    type: 'string',
    optional: true,
    description: 'Database user',
  },
  DB_PASSWORD: {
    type: 'string',
    optional: true,
    description: 'Database password',
  },

  // ── Common AWS Service Variables ──────────────────────────────────
  S3_BUCKET_NAME: {
    type: 'string',
    optional: true,
    description: 'Default S3 bucket name',
  },
  SQS_QUEUE_URL: {
    type: 'string',
    optional: true,
    format: 'url',
    description: 'Default SQS queue URL',
  },
  SNS_TOPIC_ARN: {
    type: 'string',
    optional: true,
    description: 'Default SNS topic ARN',
  },
  DYNAMODB_TABLE_NAME: {
    type: 'string',
    optional: true,
    description: 'Default DynamoDB table name',
  },
  KMS_KEY_ID: {
    type: 'string',
    optional: true,
    description: 'Default KMS key ID for encryption',
  },
  COGNITO_USER_POOL_ID: {
    type: 'string',
    optional: true,
    description: 'Cognito user pool ID',
  },
  COGNITO_CLIENT_ID: {
    type: 'string',
    optional: true,
    description: 'Cognito app client ID',
  },

  // ── Secrets Manager / SSM Integration ─────────────────────────────
  SECRETS_MANAGER_PREFIX: {
    type: 'string',
    optional: true,
    description: 'AWS Secrets Manager path prefix for this function',
  },
  SSM_PARAMETER_PREFIX: {
    type: 'string',
    optional: true,
    description: 'AWS SSM Parameter Store path prefix for this function',
  },

  // ── Feature Flags ─────────────────────────────────────────────────
  FEATURE_FLAGS: {
    type: 'json',
    optional: true,
    description: 'Feature flags configuration (JSON object)',
  },
  ENABLE_DEBUG_MODE: {
    type: 'boolean',
    optional: true,
    description: 'Enable verbose debug logging',
  },
};

// -----------------------------------------------------------------------------
// Loading Order
// -----------------------------------------------------------------------------

export const AWS_LAMBDA_FILES: readonly EnvFileType[] = [
  EnvFileType.Env,
  EnvFileType.EnvLocal,
  EnvFileType.EnvProduction,
  EnvFileType.EnvProductionLocal,
] as const;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Check if a variable is an AWS system variable (set by Lambda runtime).
 */
export function isAwsSystemVar(name: string): boolean {
  return (AWS_SYSTEM_VARS as readonly string[]).includes(name.toUpperCase());
}

/**
 * Check if a variable is an AWS-prefixed variable.
 */
export function isAwsVar(name: string): boolean {
  return name.toUpperCase().startsWith(AWS_PREFIX);
}

/**
 * Get the current Lambda function info from environment.
 * Returns null if not running in Lambda.
 */
export function getLambdaContext(): {
  functionName: string;
  functionVersion: string;
  memorySize: number;
  region: string;
  logGroupName: string;
  logStreamName: string;
} | null {
  const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME;
  if (!functionName) return null;

  return {
    functionName,
    functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION ?? '$LATEST',
    memorySize: parseInt(process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE ?? '128', 10),
    region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
    logGroupName: process.env.AWS_LAMBDA_LOG_GROUP_NAME ?? '',
    logStreamName: process.env.AWS_LAMBDA_LOG_STREAM_NAME ?? '',
  };
}

// -----------------------------------------------------------------------------
// Preset Export
// -----------------------------------------------------------------------------

export const awsLambdaPreset: Preset = {
  id: 'aws-lambda',
  name: 'AWS Lambda',
  description: 'Configuration preset for AWS Lambda with AWS system variable awareness',
  schema: awsLambdaSchema,
  files: AWS_LAMBDA_FILES,
  tags: ['serverless', 'aws', 'cloud', 'infrastructure'],
};
