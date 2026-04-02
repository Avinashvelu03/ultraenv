// =============================================================================
// ultraenv — Secret Detection Patterns Database
// Comprehensive pattern database with 55+ patterns for detecting secrets,
// credentials, API keys, tokens, and other sensitive data in source code
// and configuration files.
// =============================================================================

import type { SecretPattern } from '../core/types.js';

// -----------------------------------------------------------------------------
// Pattern Database
// -----------------------------------------------------------------------------

/**
 * Complete database of secret detection patterns.
 *
 * Each pattern includes:
 * - A unique `id` for programmatic reference
 * - A human-readable `name`
 * - A compiled `RegExp` for matching
 * - A `confidence` score (0.0–1.0)
 * - A `severity` level (critical, high, medium)
 * - A `description` of what the pattern detects
 * - A `remediation` guide for fixing the issue
 * - A `category` for grouping related patterns
 */
export const SECRET_PATTERNS: readonly SecretPattern[] = [
  // =========================================================================
  // AWS
  // =========================================================================
  {
    id: 'aws-access-key-id',
    name: 'AWS Access Key ID',
    pattern: /(?:^|["'\s:=,`])(AKIA[0-9A-Z]{16})(?:["'\s,`]|$)/gm,
    confidence: 0.95,
    severity: 'critical',
    description: 'AWS IAM Access Key ID. Grants programmatic access to AWS resources.',
    remediation: 'Rotate the key immediately in the AWS IAM Console. Use environment variables or a secrets manager. Never commit access keys to source control.',
    category: 'aws',
  },
  {
    id: 'aws-secret-access-key',
    name: 'AWS Secret Access Key',
    pattern: /(?:^|["'\s:=,`])(aws(.{0,20})?(secret|Secret|SECRET)(.{0,20})?[=\s]\s*["']?)([A-Za-z0-9/+=]{40})(?:["'\s,`;]|$)/gm,
    confidence: 0.85,
    severity: 'critical',
    description: 'AWS Secret Access Key. The secret counterpart to an AWS Access Key ID.',
    remediation: 'Rotate the key immediately. Use AWS IAM to generate new credentials and store them in a secure vault.',
    category: 'aws',
  },
  {
    id: 'aws-session-token',
    name: 'AWS Session Token',
    pattern: /(?:^|["'\s:=,`])(AQo[A-Za-z0-9/+=]{150,}(?:%3D){0,2})(?:["'\s,`;]|$)/gm,
    confidence: 0.9,
    severity: 'critical',
    description: 'AWS temporary session token (STS). Grants short-lived AWS credentials.',
    remediation: 'Do not commit session tokens. They expire but should still be treated as sensitive. Use role-based access instead.',
    category: 'aws',
  },
  {
    id: 'aws-account-id',
    name: 'AWS Account ID',
    pattern: /(?:^|["'\s:=,(])(\d{12})(?:["'\s,)]|$)/gm,
    confidence: 0.3,
    severity: 'medium',
    description: 'Potential AWS Account ID (12-digit number). May indicate hardcoded AWS resource references.',
    remediation: 'Use environment variables or parameter store for account IDs. Avoid hardcoding account-specific identifiers.',
    category: 'aws',
  },

  // =========================================================================
  // GitHub
  // =========================================================================
  {
    id: 'github-personal-access-token',
    name: 'GitHub Personal Access Token',
    pattern: /(?:^|["'\s:=,`])(ghp_[A-Za-z0-9_]{36,})(?:["'\s,`;]|$)/gm,
    confidence: 0.95,
    severity: 'critical',
    description: 'GitHub Personal Access Token (classic). Grants access to GitHub APIs and repositories.',
    remediation: 'Revoke the token immediately at GitHub Settings > Developer settings > Personal access tokens. Use GitHub Secrets or a vault.',
    category: 'github',
  },
  {
    id: 'github-oauth-access-token',
    name: 'GitHub OAuth Access Token',
    pattern: /(?:^|["'\s:=,`])(gho_[A-Za-z0-9_]{36,})(?:["'\s,`;]|$)/gm,
    confidence: 0.95,
    severity: 'critical',
    description: 'GitHub OAuth Access Token. Used for OAuth-based GitHub authentication.',
    remediation: 'Revoke the OAuth application at GitHub Settings > Developer settings > OAuth Apps. Rotate the token.',
    category: 'github',
  },
  {
    id: 'github-app-token',
    name: 'GitHub App Token',
    pattern: /(?:^|["'\s:=,`])(ghs_[A-Za-z0-9_]{36,})(?:["'\s,`;]|$)/gm,
    confidence: 0.95,
    severity: 'critical',
    description: 'GitHub App Installation Token. Grants repository-scoped access via a GitHub App.',
    remediation: 'Revoke the app installation and generate a new token. Store tokens in a secure vault with short TTL.',
    category: 'github',
  },
  {
    id: 'github-refresh-token',
    name: 'GitHub Refresh Token',
    pattern: /(?:^|["'\s:=,`])(ghr_[A-Za-z0-9_]{36,})(?:["'\s,`;]|$)/gm,
    confidence: 0.95,
    severity: 'critical',
    description: 'GitHub Refresh Token. Used to obtain new user-to-server tokens.',
    remediation: 'Revoke the refresh token at GitHub Settings > Developer settings. Regenerate and store securely.',
    category: 'github',
  },
  {
    id: 'github-user-to-server-token',
    name: 'GitHub User-to-Server Token',
    pattern: /(?:^|["'\s:=,`])(ghu_[A-Za-z0-9_]{36,})(?:["'\s,`;]|$)/gm,
    confidence: 0.95,
    severity: 'critical',
    description: 'GitHub User-to-Server Token. Grants a user access to a GitHub App.',
    remediation: 'Revoke the token at GitHub Settings > Developer settings. Use GitHub Secrets for storage.',
    category: 'github',
  },
  {
    id: 'github-webhook-secret',
    name: 'GitHub Webhook Secret',
    pattern: /(?:^|["'\s:=,`])(ghw_[A-Za-z0-9_]{36,})(?:["'\s,`;]|$)/gm,
    confidence: 0.9,
    severity: 'high',
    description: 'GitHub Webhook Secret. Used to verify the authenticity of webhook payloads.',
    remediation: 'Regenerate the webhook secret in repository settings. Store in a secure vault. Never commit to source.',
    category: 'github',
  },

  // =========================================================================
  // Stripe
  // =========================================================================
  {
    id: 'stripe-secret-key',
    name: 'Stripe Secret Key',
    pattern: /(?:^|["'\s:=,`])(sk_live_[A-Za-z0-9]{24,})(?:["'\s,`;]|$)/gm,
    confidence: 0.95,
    severity: 'critical',
    description: 'Stripe Live Secret Key. Can process live payments and access customer data.',
    remediation: 'Roll the API key immediately in the Stripe Dashboard. Use environment variables and never commit to source.',
    category: 'stripe',
  },
  {
    id: 'stripe-publishable-key',
    name: 'Stripe Publishable Key',
    pattern: /(?:^|["'\s:=,`])(pk_live_[A-Za-z0-9]{24,})((?:["'\s,`;]|$))/gm,
    confidence: 0.7,
    severity: 'medium',
    description: 'Stripe Live Publishable Key. Designed to be public but should not be hardcoded.',
    remediation: 'Use environment variables for publishable keys to enable environment-specific configuration.',
    category: 'stripe',
  },
  {
    id: 'stripe-restricted-key',
    name: 'Stripe Restricted Key',
    pattern: /(?:^|["'\s:=,`])(rk_live_[A-Za-z0-9]{24,})(?:["'\s,`;]|$)/gm,
    confidence: 0.95,
    severity: 'critical',
    description: 'Stripe Restricted Key. Scoped API key with limited permissions for live mode.',
    remediation: 'Roll the restricted key in the Stripe Dashboard. Store in a vault with proper access controls.',
    category: 'stripe',
  },

  // =========================================================================
  // Slack
  // =========================================================================
  {
    id: 'slack-bot-token',
    name: 'Slack Bot Token',
    pattern: /(?:^|["'\s:=,`])(xoxb-[A-Za-z0-9-]{10,})(?:["'\s,`;]|$)/gm,
    confidence: 0.9,
    severity: 'critical',
    description: 'Slack Bot Token (xoxb-). Grants API access to Slack workspace.',
    remediation: 'Revoke the bot token at api.slack.com/apps. Rotate and store in a secrets manager.',
    category: 'slack',
  },
  {
    id: 'slack-user-token',
    name: 'Slack User Token',
    pattern: /(?:^|["'\s:=,`])(xoxp-[A-Za-z0-9-]{10,})(?:["'\s,`;]|$)/gm,
    confidence: 0.9,
    severity: 'critical',
    description: 'Slack User Token (xoxp-). Grants user-level Slack workspace access.',
    remediation: 'Revoke the user token immediately. Rotate and store in a secure vault.',
    category: 'slack',
  },
  {
    id: 'slack-app-token',
    name: 'Slack App-Level Token',
    pattern: /(?:^|["'\s:=,`])(xoxa-[A-Za-z0-9-]{10,})(?:["'\s,`;]|$)/gm,
    confidence: 0.9,
    severity: 'critical',
    description: 'Slack App-Level Token (xoxa-). Grants app-level Slack access.',
    remediation: 'Revoke the token in the Slack API app management dashboard. Rotate credentials.',
    category: 'slack',
  },
  {
    id: 'slack-webhook-url',
    name: 'Slack Webhook URL',
    pattern: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/g,
    confidence: 0.9,
    severity: 'high',
    description: 'Slack Incoming Webhook URL. Can be used to post messages to Slack channels.',
    remediation: 'Rotate the webhook URL in your Slack app configuration. Use environment variables.',
    category: 'slack',
  },

  // =========================================================================
  // Google
  // =========================================================================
  {
    id: 'google-api-key',
    name: 'Google API Key',
    pattern: /(?:^|["'\s:=,`])(AIza[0-9A-Za-z_-]{35})(?:["'\s,`;]|$)/gm,
    confidence: 0.85,
    severity: 'high',
    description: 'Google API Key. Grants access to Google Cloud Platform services.',
    remediation: 'Restrict the API key in Google Cloud Console > APIs & Services > Credentials. Set application restrictions and API restrictions.',
    category: 'google',
  },
  {
    id: 'google-oauth-client-id',
    name: 'Google OAuth Client ID',
    pattern: /(?:^|["'\s:=,`])(\d{4,}-[a-z0-9_]{32}\.apps\.googleusercontent\.com)(?:["'\s,`;]|$)/gm,
    confidence: 0.85,
    severity: 'medium',
    description: 'Google OAuth Client ID. Identifies the application for OAuth flows.',
    remediation: 'Restrict the OAuth client to specific domains in Google Cloud Console. Store in environment variables.',
    category: 'google',
  },
  {
    id: 'google-oauth-client-secret',
    name: 'Google OAuth Client Secret',
    pattern: /(?:^|["'\s:=,`]GOCSPX-[A-Za-z0-9_-]{28,})(?:["'\s,`;]|$)/gm,
    confidence: 0.9,
    severity: 'critical',
    description: 'Google OAuth Client Secret (new format). Used for OAuth authentication flows.',
    remediation: 'Reset the client secret in Google Cloud Console. Store in a secrets manager.',
    category: 'google',
  },
  {
    id: 'google-firebase-api-key',
    name: 'Google Firebase API Key',
    pattern: /(?:^|["'\s:=,`])(AAAA[A-Za-z0-9_-]{36,})(?:["'\s,`;]|$)/gm,
    confidence: 0.8,
    severity: 'high',
    description: 'Google Firebase Cloud Messaging API Key (Server Key / Legacy).',
    remediation: 'Migrate to Firebase Cloud Messaging v1 API. Use service account credentials instead of legacy API keys.',
    category: 'google',
  },
  {
    id: 'google-service-account-private-key',
    name: 'Google Service Account Private Key',
    pattern: /"private_key"\s*:\s*"(-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC )?PRIVATE KEY-----)"/gm,
    confidence: 0.95,
    severity: 'critical',
    description: 'Google Cloud Service Account private key embedded in JSON credentials.',
    remediation: 'Rotate the service account key in Google Cloud IAM. Use Workload Identity or ADC (Application Default Credentials) instead.',
    category: 'google',
  },

  // =========================================================================
  // Private Keys & Certificates
  // =========================================================================
  {
    id: 'rsa-private-key',
    name: 'RSA Private Key',
    pattern: /-----BEGIN RSA PRIVATE KEY-----[\s\S]*?-----END RSA PRIVATE KEY-----/gm,
    confidence: 0.99,
    severity: 'critical',
    description: 'RSA Private Key in PEM format. Used for TLS, SSH, or code signing.',
    remediation: 'Remove the private key from source code. Generate a new key pair and store the private key in a hardware security module or vault.',
    category: 'keys',
  },
  {
    id: 'ec-private-key',
    name: 'EC Private Key',
    pattern: /-----BEGIN EC PRIVATE KEY-----[\s\S]*?-----END EC PRIVATE KEY-----/gm,
    confidence: 0.99,
    severity: 'critical',
    description: 'Elliptic Curve Private Key in PEM format.',
    remediation: 'Remove from source code. Generate a new key pair and store the private key in a secure vault.',
    category: 'keys',
  },
  {
    id: 'dsa-private-key',
    name: 'DSA Private Key',
    pattern: /-----BEGIN DSA PRIVATE KEY-----[\s\S]*?-----END DSA PRIVATE KEY-----/gm,
    confidence: 0.99,
    severity: 'critical',
    description: 'DSA Private Key in PEM format.',
    remediation: 'Remove from source code. Generate a new key and store in a secure vault.',
    category: 'keys',
  },
  {
    id: 'openssh-private-key',
    name: 'OpenSSH Private Key',
    pattern: /-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]*?-----END OPENSSH PRIVATE KEY-----/gm,
    confidence: 0.99,
    severity: 'critical',
    description: 'OpenSSH Private Key. Grants SSH access to remote systems.',
    remediation: 'Remove from source code. Generate a new SSH key pair and store the private key securely.',
    category: 'keys',
  },
  {
    id: 'pgp-private-key',
    name: 'PGP Private Key',
    pattern: /-----BEGIN PGP PRIVATE KEY BLOCK-----[\s\S]*?-----END PGP PRIVATE KEY BLOCK-----/gm,
    confidence: 0.99,
    severity: 'critical',
    description: 'PGP Private Key Block. Used for encryption and signing.',
    remediation: 'Remove from source code. Revoke the key if necessary and generate a new one.',
    category: 'keys',
  },
  {
    id: 'encrypted-private-key',
    name: 'Encrypted Private Key',
    pattern: /-----BEGIN ENCRYPTED PRIVATE KEY-----[\s\S]*?-----END ENCRYPTED PRIVATE KEY-----/gm,
    confidence: 0.95,
    severity: 'critical',
    description: 'Encrypted Private Key in PEM format. Still sensitive even with encryption.',
    remediation: 'Remove from source code. Store in a dedicated secrets manager.',
    category: 'keys',
  },
  {
    id: 'pem-certificate',
    name: 'PEM Certificate',
    pattern: /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/gm,
    confidence: 0.85,
    severity: 'high',
    description: 'PEM-encoded X.509 Certificate. May contain sensitive organizational information.',
    remediation: 'Remove from source code. Store certificates in a certificate management system.',
    category: 'keys',
  },
  {
    id: 'pkcs8-private-key',
    name: 'PKCS#8 Private Key',
    pattern: /-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/gm,
    confidence: 0.99,
    severity: 'critical',
    description: 'PKCS#8 Private Key in PEM format (generic unencrypted private key).',
    remediation: 'Remove from source code. Store in a hardware security module or vault.',
    category: 'keys',
  },

  // =========================================================================
  // JWT Tokens
  // =========================================================================
  {
    id: 'jwt-token',
    name: 'JSON Web Token',
    pattern: /(?:^|["'\s:=,`])(eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})(?:["'\s,`;]|$)/gm,
    confidence: 0.75,
    severity: 'high',
    description: 'JSON Web Token (JWT). May contain sensitive claims and grant authentication.',
    remediation: 'Do not hardcode JWTs. Use secure token exchange mechanisms and short-lived tokens.',
    category: 'auth',
  },

  // =========================================================================
  // Database Connection Strings
  // =========================================================================
  {
    id: 'mongodb-connection-string',
    name: 'MongoDB Connection String',
    pattern: /mongodb(?:\+srv)?:\/\/[^\s"'`]+/g,
    confidence: 0.9,
    severity: 'critical',
    description: 'MongoDB connection URI containing credentials and connection details.',
    remediation: 'Store connection strings in a secrets manager. Use environment variables. Mask credentials in connection strings.',
    category: 'database',
  },
  {
    id: 'postgresql-connection-string',
    name: 'PostgreSQL Connection String',
    pattern: /postgres(?:ql)?:\/\/[^\s"'`]+@[^\s"'`]+/g,
    confidence: 0.9,
    severity: 'critical',
    description: 'PostgreSQL connection URI containing username and password.',
    remediation: 'Store connection strings in a secrets manager. Use IAM authentication when possible.',
    category: 'database',
  },
  {
    id: 'mysql-connection-string',
    name: 'MySQL Connection String',
    pattern: /mysql(?:\+ssl)?:\/\/[^\s"'`]+@[^\s"'`]+/g,
    confidence: 0.9,
    severity: 'critical',
    description: 'MySQL connection URI containing username and password.',
    remediation: 'Store connection strings in a secrets manager. Rotate database credentials regularly.',
    category: 'database',
  },
  {
    id: 'redis-connection-string',
    name: 'Redis Connection String',
    pattern: /redis(?:\+sentinel)?(?:\+ssl)?:\/\/[^\s"'`]+/g,
    confidence: 0.85,
    severity: 'critical',
    description: 'Redis connection URI with optional credentials.',
    remediation: 'Store connection strings in a secrets manager. Enable TLS and use ACLs for authentication.',
    category: 'database',
  },
  {
    id: 'couchdb-connection-string',
    name: 'CouchDB Connection String',
    pattern: /couchdb(?:s)?:\/\/[^\s"'`]+@[^\s"'`]+/g,
    confidence: 0.85,
    severity: 'critical',
    description: 'CouchDB connection URI containing credentials.',
    remediation: 'Store connection strings in a secrets manager. Use proxy authentication.',
    category: 'database',
  },

  // =========================================================================
  // SendGrid
  // =========================================================================
  {
    id: 'sendgrid-api-key',
    name: 'SendGrid API Key',
    pattern: /(?:^|["'\s:=,`])(SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43})(?:["'\s,`;]|$)/gm,
    confidence: 0.95,
    severity: 'critical',
    description: 'SendGrid API Key. Grants access to send emails and manage contacts.',
    remediation: 'Revoke the key in SendGrid Dashboard > Settings > API Keys. Store new key in a secrets manager.',
    category: 'email',
  },

  // =========================================================================
  // Twilio
  // =========================================================================
  {
    id: 'twilio-api-key-sid',
    name: 'Twilio API Key SID',
    pattern: /(?:^|["'\s:=,`])(SK[0-9a-fA-F]{32})(?:["'\s,`;]|$)/gm,
    confidence: 0.85,
    severity: 'critical',
    description: 'Twilio API Key SID. Used for authenticating Twilio API requests.',
    remediation: 'Rotate the API key in the Twilio Console. Store in a secrets manager.',
    category: 'telecom',
  },
  {
    id: 'twilio-auth-token',
    name: 'Twilio Auth Token',
    pattern: /(?:twilio|TWILIO).{0,30}(?:auth|AUTH).{0,10}(?:token|TOKEN)[\s]*[:=][\s]*["']?([A-Za-z0-9]{32})(?:["'\s,`;]|$)/gm,
    confidence: 0.85,
    severity: 'critical',
    description: 'Twilio Account Auth Token. Grants full access to the Twilio account.',
    remediation: 'Rotate the auth token in the Twilio Console. Never commit to source control.',
    category: 'telecom',
  },

  // =========================================================================
  // Azure
  // =========================================================================
  {
    id: 'azure-connection-string',
    name: 'Azure Connection String',
    pattern: /DefaultEndpointsProtocol=https?;AccountName=[A-Za-z0-9]+;AccountKey=[A-Za-z0-9+/=]+/g,
    confidence: 0.95,
    severity: 'critical',
    description: 'Azure Storage Account connection string containing the account key.',
    remediation: 'Use Azure Key Vault or Managed Identity instead of connection strings. Rotate the account key.',
    category: 'azure',
  },
  {
    id: 'azure-credential',
    name: 'Azure Credentials',
    pattern: /(?:^|["'\s:=,`])([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[A-Za-z0-9_-]{30,})(?:["'\s,`;]|$)/gm,
    confidence: 0.75,
    severity: 'critical',
    description: 'Potential Azure service principal credential or managed identity token.',
    remediation: 'Use Azure Key Vault for storing credentials. Rotate service principal secrets.',
    category: 'azure',
  },

  // =========================================================================
  // DigitalOcean
  // =========================================================================
  {
    id: 'digitalocean-token',
    name: 'DigitalOcean API Token',
    pattern: /(?:^|["'\s:=,`])(dop_v1_[A-Za-z0-9]{64,})(?:["'\s,`;]|$)/gm,
    confidence: 0.95,
    severity: 'critical',
    description: 'DigitalOcean API Token (v1). Grants full API access.',
    remediation: 'Revoke the token in the DigitalOcean Control Panel > API > Tokens. Store in a secrets manager.',
    category: 'cloud',
  },
  {
    id: 'digitalocean-pat',
    name: 'DigitalOcean Personal Access Token',
    pattern: /(?:^|["'\s:=,`])(dop_v1_[a-f0-9]{64})(?:["'\s,`;]|$)/gm,
    confidence: 0.9,
    severity: 'critical',
    description: 'DigitalOcean Personal Access Token.',
    remediation: 'Revoke the token in DigitalOcean settings and generate a new one. Store securely.',
    category: 'cloud',
  },

  // =========================================================================
  // Heroku
  // =========================================================================
  {
    id: 'heroku-api-key',
    name: 'Heroku API Key',
    pattern: /(?:^|["'\s:=,`])([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[a-f0-9]{16})(?:["'\s,`;]|$)/gm,
    confidence: 0.7,
    severity: 'high',
    description: 'Heroku API Key. Grants access to Heroku platform APIs.',
    remediation: 'Rotate the API key in Heroku Account Settings. Store in environment variables.',
    category: 'cloud',
  },

  // =========================================================================
  // NPM
  // =========================================================================
  {
    id: 'npm-token',
    name: 'NPM Access Token',
    pattern: /(?:^|["'\s:=,`])(npm_[A-Za-z0-9]{36,})(?:["'\s,`;]|$)/gm,
    confidence: 0.95,
    severity: 'critical',
    description: 'NPM Access Token. Can be used to publish packages to the npm registry.',
    remediation: 'Revoke the token at https://www.npmjs.com/settings/keys. Generate a new token with minimal scope.',
    category: 'package-manager',
  },

  // =========================================================================
  // Docker
  // =========================================================================
  {
    id: 'docker-hub-credentials',
    name: 'Docker Hub Credentials',
    pattern: /docker\.io\/[^\s"'`]+:[^\s"'`]+@[^\s"'`]+/g,
    confidence: 0.85,
    severity: 'high',
    description: 'Docker Hub credentials embedded in a registry URL.',
    remediation: 'Use docker login with credentials stored securely. Use Docker credential helpers.',
    category: 'container',
  },
  {
    id: 'docker-auth-token',
    name: 'Docker Registry Auth Token',
    pattern: /(?:^|["'\s:=,`])(eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,})(?:["'\s,`;]|$)/gm,
    confidence: 0.7,
    severity: 'high',
    description: 'Docker Registry Bearer Token (JWT format). Used for container registry authentication.',
    remediation: 'Do not store Docker auth tokens in source. Use docker credential store or CI secrets.',
    category: 'container',
  },

  // =========================================================================
  // Firebase
  // =========================================================================
  {
    id: 'firebase-config',
    name: 'Firebase Configuration',
    pattern: /firebase[A-Za-z]*\.json["'\s]*[:=]\s*["'][\s\S]*?"apiKey"\s*:\s*"[A-Za-z0-9_-]+"/gm,
    confidence: 0.8,
    severity: 'medium',
    description: 'Firebase configuration block containing API keys and project identifiers.',
    remediation: 'Use Firebase Admin SDK with service account credentials. Restrict API keys in Google Cloud Console.',
    category: 'google',
  },

  // =========================================================================
  // Shopify
  // =========================================================================
  {
    id: 'shopify-app-secret',
    name: 'Shopify App Secret',
    pattern: /(?:^|["'\s:=,`])(shpca_[A-Za-z0-9]{32,})(?:["'\s,`;]|$)/gm,
    confidence: 0.9,
    severity: 'critical',
    description: 'Shopify App Client Secret. Used for OAuth with Shopify apps.',
    remediation: 'Regenerate the app secret in the Shopify Partners Dashboard. Store in a vault.',
    category: 'e-commerce',
  },
  {
    id: 'shopify-access-token',
    name: 'Shopify Access Token',
    pattern: /(?:^|["'\s:=,`])(shpat_[A-Za-z0-9]{32,})(?:["'\s,`;]|$)/gm,
    confidence: 0.9,
    severity: 'critical',
    description: 'Shopify App Access Token. Grants API access to a Shopify store.',
    remediation: 'Revoke the access token in the Shopify Admin. Regenerate and store securely.',
    category: 'e-commerce',
  },

  // =========================================================================
  // Telegram
  // =========================================================================
  {
    id: 'telegram-bot-token',
    name: 'Telegram Bot Token',
    pattern: /(?:^|["'\s:=,`])(\d{8,10}:[A-Za-z0-9_-]{35})(?:["'\s,`;]|$)/gm,
    confidence: 0.85,
    severity: 'high',
    description: 'Telegram Bot API Token. Grants control over a Telegram bot.',
    remediation: 'Revoke the token by messaging @BotFather on Telegram. Generate a new token and store securely.',
    category: 'messaging',
  },

  // =========================================================================
  // Discord
  // =========================================================================
  {
    id: 'discord-bot-token',
    name: 'Discord Bot Token',
    pattern: /(?:^|["'\s:=,`])([MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27})(?:["'\s,`;]|$)/gm,
    confidence: 0.9,
    severity: 'critical',
    description: 'Discord Bot Token. Grants full bot access to Discord guilds and channels.',
    remediation: 'Reset the token in the Discord Developer Portal > Bot page. Store in environment variables.',
    category: 'messaging',
  },
  {
    id: 'discord-client-secret',
    name: 'Discord Client Secret',
    pattern: /(?:^|["'\s:=,`])([A-Za-z0-9_-]{32})(?:["'\s,`;]|$)/gm,
    confidence: 0.5,
    severity: 'high',
    description: 'Potential Discord OAuth2 Client Secret.',
    remediation: 'Reset the client secret in the Discord Developer Portal. Store in a vault.',
    category: 'messaging',
  },

  // =========================================================================
  // Mailgun
  // =========================================================================
  {
    id: 'mailgun-api-key',
    name: 'Mailgun API Key',
    pattern: /(?:^|["'\s:=,`])(key-[A-Za-z0-9]{32})(?:["'\s,`;]|$)/gm,
    confidence: 0.85,
    severity: 'critical',
    description: 'Mailgun API Key. Grants access to send emails via Mailgun.',
    remediation: 'Rotate the API key in the Mailgun Dashboard. Store in a secrets manager.',
    category: 'email',
  },

  // =========================================================================
  // Base64-Encoded Credentials
  // =========================================================================
  {
    id: 'base64-credentials',
    name: 'Base64-Encoded Credentials',
    pattern: /(?:^|["'\s:=,`])(Basic\s+[A-Za-z0-9+/]{20,}={0,2})(?:["'\s,`;]|$)/gm,
    confidence: 0.7,
    severity: 'high',
    description: 'Base64-encoded HTTP Basic Auth credentials (Basic base64(user:pass)).',
    remediation: 'Use OAuth2 or token-based authentication. Store credentials in a vault.',
    category: 'auth',
  },
  {
    id: 'base64-encoded-secret',
    name: 'Base64-Encoded Secret String',
    pattern: /(?:^|["'\s:=,`])(?:password|secret|token|credential|apikey)(?:["'\s]*)[:=](?:["'\s]*)([A-Za-z0-9+/]{40,}={0,2})(?:["'\s,`;]|$)/gim,
    confidence: 0.65,
    severity: 'high',
    description: 'A base64-encoded value assigned to a secret-related variable name.',
    remediation: 'Decode to verify, then store in a secrets manager. Use proper secret management.',
    category: 'auth',
  },

  // =========================================================================
  // Generic Variable Assignments
  // =========================================================================
  {
    id: 'generic-api-key-assignment',
    name: 'Generic API Key Assignment',
    pattern: /(?:^|["'\s])(?:API[_-]?KEY|api[_-]?key)\s*[:=]\s*["']([^\s"'`]{8,})["']/gm,
    confidence: 0.7,
    severity: 'high',
    description: 'Generic API_KEY variable assignment with a suspicious value.',
    remediation: 'Move API keys to a secrets manager or environment variables. Never hardcode in source.',
    category: 'generic',
  },
  {
    id: 'generic-token-assignment',
    name: 'Generic Token Assignment',
    pattern: /(?:^|["'\s])(?:TOKEN|token|Token)\s*[:=]\s*["']([^\s"'`]{8,})["']/gm,
    confidence: 0.6,
    severity: 'high',
    description: 'Generic TOKEN variable assignment with a suspicious value.',
    remediation: 'Move tokens to a secrets manager. Use secure token storage mechanisms.',
    category: 'generic',
  },
  {
    id: 'generic-secret-assignment',
    name: 'Generic Secret Assignment',
    pattern: /(?:^|["'\s])(?:SECRET|secret|Secret)[_-]?(?:KEY|key|Key)?\s*[:=]\s*["']([^\s"'`]{8,})["']/gm,
    confidence: 0.65,
    severity: 'high',
    description: 'Generic SECRET variable assignment with a suspicious value.',
    remediation: 'Move secrets to a vault. Use encrypted storage for sensitive configuration.',
    category: 'generic',
  },
  {
    id: 'generic-password-assignment',
    name: 'Generic Password Assignment',
    pattern: /(?:^|["'\s])(?:PASSWORD|passwd|password|Password)\s*[:=]\s*["']([^\s"'`]{4,})["']/gm,
    confidence: 0.75,
    severity: 'high',
    description: 'Generic PASSWORD variable assignment with a value.',
    remediation: 'Never hardcode passwords. Use a secrets manager or secure credential store.',
    category: 'generic',
  },

  // =========================================================================
  // .env File Patterns
  // =========================================================================
  {
    id: 'env-file-secret-pattern',
    name: '.env File Secret Pattern',
    pattern: /(?:^|[\r\n])([A-Z][A-Z0-9_]*(?:(?:PASSWORD|SECRET|TOKEN|KEY|CREDENTIAL|PRIVATE|AUTH)[A-Z0-9_]*)\s*=\s*[^\s][^\r\n]{7,})(?:[\r\n]|$)/gm,
    confidence: 0.7,
    severity: 'high',
    description: 'Environment variable with a secret-like name and a value in an .env file.',
    remediation: 'Use ultraenv vault encryption for sensitive .env values. Never commit .env files to source control.',
    category: 'env',
  },

  // =========================================================================
  // Hardcoded Passwords
  // =========================================================================
  {
    id: 'hardcoded-password-url',
    name: 'Hardcoded Password in URL',
    pattern: /(?:https?:\/\/)[^\s"'`]*:[^\s"'`]*@(?:[^\s"'`]+)/g,
    confidence: 0.8,
    severity: 'critical',
    description: 'URL containing embedded credentials (protocol://user:password@host).',
    remediation: 'Remove credentials from URLs. Use environment variables for authentication parameters.',
    category: 'generic',
  },
  {
    id: 'hardcoded-password-string',
    name: 'Hardcoded Password String',
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*["']([^"']{4,}?)["']/gim,
    confidence: 0.7,
    severity: 'high',
    description: 'Hardcoded password string in configuration or code.',
    remediation: 'Replace with references to a secrets manager. Never store plain-text passwords in code.',
    category: 'generic',
  },

  // =========================================================================
  // SSH
  // =========================================================================
  {
    id: 'ssh-private-key',
    name: 'SSH Private Key',
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gm,
    confidence: 0.99,
    severity: 'critical',
    description: 'SSH Private Key in any PEM format. Grants remote access to systems.',
    remediation: 'Remove from source immediately. Generate a new SSH key pair. Store private key in SSH agent or vault.',
    category: 'keys',
  },

  // =========================================================================
  // Cloudflare
  // =========================================================================
  {
    id: 'cloudflare-api-token',
    name: 'Cloudflare API Token',
    pattern: /(?:^|["'\s:=,`])(v1\.0-[A-Za-z0-9_-]{35,}-[A-Za-z0-9_-]{15,})(?:["'\s,`;]|$)/gm,
    confidence: 0.9,
    severity: 'critical',
    description: 'Cloudflare API Token. Grants access to Cloudflare services and zones.',
    remediation: 'Revoke the token in Cloudflare Dashboard > My Profile > API Tokens. Store securely.',
    category: 'cloud',
  },
  {
    id: 'cloudflare-global-api-key',
    name: 'Cloudflare Global API Key',
    pattern: /(?:^|["'\s:=,`])([A-Za-z0-9]{37})(?:["'\s,`;]|$)/gm,
    confidence: 0.4,
    severity: 'high',
    description: 'Potential Cloudflare Global API Key (24 hex + 13 chars).',
    remediation: 'Revoke the key in Cloudflare Dashboard. Use scoped API tokens instead of global keys.',
    category: 'cloud',
  },

  // =========================================================================
  // Auth0
  // =========================================================================
  {
    id: 'auth0-client-secret',
    name: 'Auth0 Client Secret',
    pattern: /(?:^|["'\s:=,`])([A-Za-z0-9_-]{40,})(?:["'\s,`;]|$)(?:\s*#.*auth0.*)/gm,
    confidence: 0.5,
    severity: 'high',
    description: 'Potential Auth0 Client Secret (long random string near Auth0 reference).',
    remediation: 'Rotate the client secret in Auth0 Dashboard > Applications. Store in a vault.',
    category: 'auth',
  },

  // =========================================================================
  // PagerDuty
  // =========================================================================
  {
    id: 'pagerduty-token',
    name: 'PagerDuty API Token',
    pattern: /(?:^|["'\s:=,`])(PD-[A-Za-z0-9]{20,})(?:["'\s,`;]|$)/gm,
    confidence: 0.85,
    severity: 'high',
    description: 'PagerDuty API Token / Events API Key.',
    remediation: 'Rotate the token in PagerDuty. Store in environment variables.',
    category: 'devops',
  },

  // =========================================================================
  // Datadog
  // =========================================================================
  {
    id: 'datadog-api-key',
    name: 'Datadog API Key',
    pattern: /(?:^|["'\s:=,`])(dd_[A-Za-z0-9]{32,})(?:["'\s,`;]|$)/gm,
    confidence: 0.85,
    severity: 'high',
    description: 'Datadog API Key. Grants access to monitoring and alerting APIs.',
    remediation: 'Rotate the API key in Datadog. Store in environment variables or a vault.',
    category: 'monitoring',
  },

  // =========================================================================
  // Generic High-Entropy Strings
  // =========================================================================
  {
    id: 'generic-high-entropy-string',
    name: 'Generic High-Entropy String',
    pattern: /(?:^|["'\s:=,`])([A-Za-z0-9+/=]{40,})(?:["'\s,`;]|$)/gm,
    confidence: 0.3,
    severity: 'medium',
    description: 'Long base64-like string that may be a secret, token, or encoded credential.',
    remediation: 'Review the value to determine if it is sensitive. Move to a secrets manager if confirmed.',
    category: 'generic',
  },
] as const;
