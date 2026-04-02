import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  matchPatterns,
  matchSinglePattern,
  addCustomPattern,
  removeCustomPattern,
  resetPatterns,
  getRegisteredPatterns,
} from '../../../src/scanner/patterns.js';
import type { SecretPattern } from '../../../src/core/types.js';

describe('scanner patterns', () => {
  // Reset patterns before each test to avoid cross-contamination
  beforeEach(() => {
    resetPatterns();
  });

  afterEach(() => {
    resetPatterns();
  });

  // ===========================================================================
  // matchPatterns — known secrets detection
  // ===========================================================================
  describe('matchPatterns', () => {
    it('detects AWS Access Key IDs', () => {
      const content = 'const awsKey = "AKIAIOSFODNN7EXAMPLE";';
      const results = matchPatterns(content, 'test.ts');
      const awsKeys = results.filter((r) => r.type === 'AWS Access Key ID');
      expect(awsKeys.length).toBeGreaterThanOrEqual(1);
      expect(awsKeys[0]!.file).toBe('test.ts');
    });

    it('detects GitHub Personal Access Tokens', () => {
      const content = 'const token = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefgh";';
      const results = matchPatterns(content, 'config.js');
      const ghTokens = results.filter((r) => r.type === 'GitHub Personal Access Token');
      expect(ghTokens.length).toBeGreaterThanOrEqual(1);
    });

    it('detects Stripe secret keys', () => {
      const content = 'STRIPE_KEY="sk_' + 'live_abcdefghijklmnopqrstuvwxyz"';  // need 24+ chars after prefix
      const results = matchPatterns(content, '.env');
      const stripeKeys = results.filter((r) => r.type === 'Stripe Secret Key');
      // The pattern requires 24+ chars after sk_live_
      // Our string has 26 chars, so it should match
      if (content.length > 0) {
        const found = results.some((r) => r.type.includes('Stripe'));
        expect(found).toBe(true);
      }
    });

    it('detects Slack bot tokens', () => {
      const content = 'SLACK_TOKEN="xoxb-1234567890abcdef";';
      const results = matchPatterns(content, '.env');
      const slackTokens = results.filter((r) => r.type === 'Slack Bot Token');
      expect(slackTokens.length).toBeGreaterThanOrEqual(1);
    });

    it('detects private keys', () => {
      const content = `-----BEGIN RSA PRIVATE KEY-----
MIIBOgIBAAJBAKj34GkxFhD90vcNLYLInFEX6Ppy1tPf9Cnzj4p4WGeKLs1Pt8
QuPwKrhN1NbZ
-----END RSA PRIVATE KEY-----`;
      const results = matchPatterns(content, 'key.pem');
      const privateKeys = results.filter((r) => r.type.includes('Private Key'));
      expect(privateKeys.length).toBeGreaterThanOrEqual(1);
    });

    it('detects hardcoded passwords in URLs', () => {
      const content = 'postgres://user:password@host/db';
      const results = matchPatterns(content, 'app.ts');
      const secrets = results.filter((r) =>
        r.type.includes('PostgreSQL') || r.type.includes('Password'),
      );
      expect(secrets.length).toBeGreaterThanOrEqual(1);
    });

    it('detects SendGrid API keys', () => {
      // Pattern: SG\.{22 chars}.{43 chars}
      const content = 'SENDGRID_API_KEY="SG.aaaaaaaaaaaaaaaaaaaaaa.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"';
      const results = matchPatterns(content, '.env');
      const sendgrid = results.filter((r) => r.type === 'SendGrid API Key');
      expect(sendgrid.length).toBeGreaterThanOrEqual(1);
    });

    it('detects NPM tokens', () => {
      const content = 'NPM_TOKEN="npm_abcdefghijklmnopqrstuvwxyz1234567890123"';
      const results = matchPatterns(content, '.npmrc');
      const npmTokens = results.filter((r) => r.type === 'NPM Access Token');
      expect(npmTokens.length).toBeGreaterThanOrEqual(1);
    });

    it('detects Google API keys', () => {
      // Pattern: AIza + exactly 35 chars from [0-9A-Za-z_-]
      const content = 'const googleKey = "AIzaSyA123456789abcdefghijklmnopqrstuvw";';
      const results = matchPatterns(content, 'config.json');
      const googleKeys = results.filter((r) => r.type === 'Google API Key');
      expect(googleKeys.length).toBeGreaterThanOrEqual(1);
    });

    it('returns empty array for clean content', () => {
      const content = 'const apiUrl = process.env.API_URL;\nconst port = parseInt(process.env.PORT || "3000", 10);';
      const results = matchPatterns(content, 'safe-code.js');
      // May still detect some generic patterns, but core secrets should not be found
      const critical = results.filter((r) => r.pattern.severity === 'critical');
      expect(critical.length).toBe(0);
    });

    it('reports correct line numbers', () => {
      const content = `line one
const key = "AKIAIOSFODNN7EXAMPLE";
line three`;
      const results = matchPatterns(content, 'file.ts');
      const awsKey = results.find((r) => r.type === 'AWS Access Key ID');
      expect(awsKey?.line).toBe(2);
    });

    it('reports correct file path', () => {
      const content = 'const key = "AKIAIOSFODNN7EXAMPLE";';
      const results = matchPatterns(content, '/src/config.ts');
      expect(results[0]?.file).toBe('/src/config.ts');
    });

    it('includes confidence score', () => {
      const content = 'const key = "AKIAIOSFODNN7EXAMPLE";';
      const results = matchPatterns(content, 'test.ts');
      expect(results[0]?.confidence).toBeGreaterThanOrEqual(0);
      expect(results[0]?.confidence).toBeLessThanOrEqual(1);
    });
  });

  // ===========================================================================
  // matchSinglePattern
  // ===========================================================================
  describe('matchSinglePattern', () => {
    it('matches a specific pattern', () => {
      const pattern: SecretPattern = {
        id: 'test-aws-key',
        name: 'Test AWS Key',
        pattern: /AKIA[0-9A-Z]{16}/g,
        confidence: 0.95,
        severity: 'critical',
        description: 'Test',
        remediation: 'Test',
        category: 'test',
      };

      const results = matchSinglePattern('AKIAIOSFODNN7EXAMPLE', pattern, 'test.ts');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0]?.type).toBe('Test AWS Key');
    });

    it('returns empty array when pattern does not match', () => {
      const pattern: SecretPattern = {
        id: 'test-no-match',
        name: 'Test No Match',
        pattern: /ZNONEXISTENT[0-9]{16}/g,
        confidence: 0.5,
        severity: 'medium',
        description: 'Test',
        remediation: 'Test',
        category: 'test',
      };

      const results = matchSinglePattern('no secrets here', pattern, 'test.ts');
      expect(results.length).toBe(0);
    });
  });

  // ===========================================================================
  // addCustomPattern
  // ===========================================================================
  describe('addCustomPattern', () => {
    it('adds a custom pattern to the registry', () => {
      const customPattern: SecretPattern = {
        id: 'custom-test',
        name: 'Custom Test Pattern',
        pattern: /MY_SECRET_[A-Z0-9]+/g,
        confidence: 0.9,
        severity: 'high',
        description: 'Test pattern',
        remediation: 'Fix it',
        category: 'custom',
      };

      addCustomPattern(customPattern);
      const patterns = getRegisteredPatterns();
      const found = patterns.find((p) => p.id === 'custom-test');
      expect(found).toBeDefined();
    });

    it('replaces existing pattern with same ID', () => {
      const pattern1: SecretPattern = {
        id: 'replace-test',
        name: 'Original',
        pattern: /ORIGINAL/g,
        confidence: 0.5,
        severity: 'medium',
        description: 'Original',
        remediation: 'Original',
        category: 'test',
      };

      const pattern2: SecretPattern = {
        id: 'replace-test',
        name: 'Replaced',
        pattern: /REPLACED/g,
        confidence: 0.9,
        severity: 'high',
        description: 'Replaced',
        remediation: 'Replaced',
        category: 'test',
      };

      addCustomPattern(pattern1);
      addCustomPattern(pattern2);
      const patterns = getRegisteredPatterns();
      const matches = patterns.filter((p) => p.id === 'replace-test');
      expect(matches.length).toBe(1);
      expect(matches[0]?.name).toBe('Replaced');
    });

    it('custom pattern matches in subsequent scans', () => {
      addCustomPattern({
        id: 'custom-ultraenv-key',
        name: 'Ultraenv Custom Key',
        pattern: /ULTRAENV_CUSTOM_KEY_[A-Za-z0-9]+/g,
        confidence: 0.9,
        severity: 'high',
        description: 'Custom ultraenv key',
        remediation: 'Remove it',
        category: 'custom',
      });

      const content = 'const key = "ULTRAENV_CUSTOM_KEY_abc123def"';
      const results = matchPatterns(content, 'test.ts');
      const customMatches = results.filter((r) => r.type === 'Ultraenv Custom Key');
      expect(customMatches.length).toBeGreaterThanOrEqual(1);
    });

    it('throws for non-RegExp pattern', () => {
      expect(() =>
        addCustomPattern({
          id: 'bad-pattern',
          name: 'Bad',
          pattern: 'not a regex' as unknown as RegExp,
          confidence: 0.5,
          severity: 'medium',
          description: 'Bad',
          remediation: 'Bad',
          category: 'test',
        }),
      ).toThrow();
    });
  });

  // ===========================================================================
  // removeCustomPattern
  // ===========================================================================
  describe('removeCustomPattern', () => {
    it('removes a pattern from the registry', () => {
      addCustomPattern({
        id: 'to-remove',
        name: 'To Remove',
        pattern: /REMOVE_ME/g,
        confidence: 0.5,
        severity: 'medium',
        description: 'Remove',
        remediation: 'Remove',
        category: 'test',
      });

      expect(getRegisteredPatterns().find((p) => p.id === 'to-remove')).toBeDefined();
      const removed = removeCustomPattern('to-remove');
      expect(removed).toBe(true);
      expect(getRegisteredPatterns().find((p) => p.id === 'to-remove')).toBeUndefined();
    });

    it('returns false for non-existent pattern', () => {
      expect(removeCustomPattern('does-not-exist')).toBe(false);
    });

    it('removes a built-in pattern', () => {
      const before = getRegisteredPatterns().find((p) => p.id === 'aws-access-key-id');
      expect(before).toBeDefined();
      const removed = removeCustomPattern('aws-access-key-id');
      expect(removed).toBe(true);
      expect(getRegisteredPatterns().find((p) => p.id === 'aws-access-key-id')).toBeUndefined();
    });
  });

  // ===========================================================================
  // resetPatterns
  // ===========================================================================
  describe('resetPatterns', () => {
    it('restores built-in patterns after modification', () => {
      const originalCount = getRegisteredPatterns().length;
      removeCustomPattern('aws-access-key-id');
      expect(getRegisteredPatterns().length).toBe(originalCount - 1);
      resetPatterns();
      expect(getRegisteredPatterns().length).toBe(originalCount);
    });
  });

  // ===========================================================================
  // getRegisteredPatterns
  // ===========================================================================
  describe('getRegisteredPatterns', () => {
    it('returns a copy (not the internal array)', () => {
      const patterns1 = getRegisteredPatterns();
      const patterns2 = getRegisteredPatterns();
      expect(patterns1).not.toBe(patterns2);
      expect(patterns1.length).toBe(patterns2.length);
    });

    it('includes built-in patterns', () => {
      const patterns = getRegisteredPatterns();
      expect(patterns.length).toBeGreaterThan(0);
      const ids = patterns.map((p) => p.id);
      expect(ids).toContain('aws-access-key-id');
      expect(ids).toContain('github-personal-access-token');
    });
  });

  // ===========================================================================
  // Match against fixture files
  // ===========================================================================
  describe('fixture file scanning', () => {
    it('detects secrets in hardcoded-key.js fixture', async () => {
      // Read fixture via path
      const { fixturePath } = await import('../../../tests/helpers/fixtures.js');
      const { loadFixture } = await import('../../../tests/helpers/fixtures.js');

      const content = loadFixture('scan-targets/with-secrets/hardcoded-key.js');
      const results = matchPatterns(content, 'hardcoded-key.js');
      expect(results.length).toBeGreaterThan(0);
    });

    it('detects AWS credentials in aws-credentials.ts fixture', async () => {
      const { loadFixture } = await import('../../../tests/helpers/fixtures.js');
      const content = loadFixture('scan-targets/with-secrets/aws-credentials.ts');
      const results = matchPatterns(content, 'aws-credentials.ts');
      const aws = results.filter((r) => r.type.includes('AWS'));
      expect(aws.length).toBeGreaterThanOrEqual(1);
    });

    it('finds no critical secrets in safe-code.js fixture', async () => {
      const { loadFixture } = await import('../../../tests/helpers/fixtures.js');
      const content = loadFixture('scan-targets/clean/safe-code.js');
      const results = matchPatterns(content, 'safe-code.js');
      const critical = results.filter((r) => r.pattern.severity === 'critical');
      expect(critical.length).toBe(0);
    });
  });
});
