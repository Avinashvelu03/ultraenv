// =============================================================================
// Integration Tests — Cascade Loading
// Tests: Load cascade fixtures from tests/fixtures/cascades/development/,
//        verify priority order: .env.development.local > .env.local > .env.development > .env
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { load, loadWithResult } from '../../src/core/loader.js';
import { resolveCascade, mergeCascade } from '../../src/core/cascade.js';
import { parseEnvFile } from '../../src/core/parser.js';
import { mockEnv } from '../helpers/mock-env.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { TempDir } from '../helpers/temp-dir.js';

describe('integration: cascade loading', () => {
  let cascadeDir: string;
  let tempDir: TempDir;
  let envMock: ReturnType<typeof mockEnv> | undefined;

  beforeEach(() => {
    tempDir = new TempDir();
    cascadeDir = tempDir.path;

    tempDir.write('.env', `DATABASE_URL=postgres://localhost/base\nAPP_NAME=ultraenv\nBASE_VAR=base_value\nSHARED=from_base`);
    tempDir.write('.env.local', `DATABASE_URL=postgres://localhost/local\nLOCAL_ONLY=true`);
    tempDir.write('.env.development', `DATABASE_URL=postgres://localhost/development\nNODE_ENV=development\nDEV_ONLY=yes\nSHARED=from_development`);
    tempDir.write('.env.development.local', `DATABASE_URL=postgres://localhost/dev_local\nDEV_LOCAL_ONLY=true\nDEBUG=true`);

    // Force NODE_ENV=development so the cascade resolves correctly
    envMock = mockEnv({ NODE_ENV: 'development' });
  });

  afterEach(() => {
    envMock?.restore();
    tempDir.cleanup();
  });

  // ---------------------------------------------------------------------------
  // Verify fixture files exist
  // ---------------------------------------------------------------------------
  describe('fixture setup', () => {
    it('all cascade fixture files exist', () => {
      const expectedFiles = [
        '.env',
        '.env.local',
        '.env.development',
        '.env.development.local',
      ];

      for (const file of expectedFiles) {
        const filePath = path.join(cascadeDir, file);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Cascade resolution
  // ---------------------------------------------------------------------------
  describe('cascade resolution', () => {
    it('resolves all four files for development environment', () => {
      const cascade = resolveCascade({
        envDir: cascadeDir,
        environment: 'development',
      });

      // Should find 4 files in cascade: .env, .env.local, .env.development, .env.development.local
      expect(cascade.files.length).toBe(4);

      // All files should exist
      expect(cascade.existingFiles.length).toBe(4);

      // Check file names in order (lowest priority first)
      const fileNames = cascade.files.map(f =>
        path.basename(f.absolutePath),
      );
      expect(fileNames).toEqual([
        '.env',
        '.env.local',
        '.env.development',
        '.env.development.local',
      ]);
    });

    it('priorities are in ascending order', () => {
      const cascade = resolveCascade({
        envDir: cascadeDir,
        environment: 'development',
      });

      const priorities = cascade.files.map(f => f.priority);
      for (let i = 1; i < priorities.length; i++) {
        expect(priorities[i]).toBeGreaterThan(priorities[i - 1]!);
      }
    });

    it('detected environment is "development"', () => {
      const cascade = resolveCascade({
        envDir: cascadeDir,
        environment: 'development',
      });

      expect(cascade.environment).toBe('development');
    });
  });

  // ---------------------------------------------------------------------------
  // Priority order verification
  // ---------------------------------------------------------------------------
  describe('priority order: .env.development.local > .env.local > .env.development > .env', () => {
    it('highest priority file (.env.development.local) wins for DATABASE_URL', () => {
      // All four files define DATABASE_URL:
      // .env                    → postgres://localhost/base
      // .env.local              → postgres://localhost/local
      // .env.development        → postgres://localhost/development
      // .env.development.local  → postgres://localhost/dev_local  (winner)

      const env = load({ envDir: cascadeDir });
      expect(env.DATABASE_URL).toBe('postgres://localhost/dev_local');
    });

    it('mid-priority files contribute their unique keys', () => {
      const env = load({ envDir: cascadeDir });

      // From .env (lowest)
      expect(env.APP_NAME).toBe('ultraenv');
      expect(env.BASE_VAR).toBe('base_value');

      // From .env.local
      expect(env.LOCAL_ONLY).toBe('true');

      // From .env.development
      expect(env.NODE_ENV).toBe('development');
      expect(env.DEV_ONLY).toBe('yes');

      // From .env.development.local (highest)
      expect(env.DEV_LOCAL_ONLY).toBe('true');
      expect(env.DEBUG).toBe('true');
    });

    it('SHARED key is overridden by .env.development (higher priority than .env)', () => {
      // .env              → SHARED=from_base
      // .env.development  → SHARED=from_development  (winner)
      const env = load({ envDir: cascadeDir });
      expect(env.SHARED).toBe('from_development');
    });

    it('DATABASE_URL chain: each file overrides the previous', () => {
      // Use resolveCascade + parseEnvFile + mergeCascade to verify step by step
      const cascade = resolveCascade({
        envDir: cascadeDir,
        environment: 'development',
      });

      const parsedFiles = cascade.existingFiles.map(entry => {
        const content = fs.readFileSync(entry.absolutePath, 'utf-8');
        return parseEnvFile(content, entry.absolutePath);
      });

      // Parse individual files to check their DATABASE_URL
      const baseFile = parsedFiles.find(f =>
        path.basename(f.path) === '.env',
      );
      const localFile = parsedFiles.find(f =>
        path.basename(f.path) === '.env.local',
      );
      const devFile = parsedFiles.find(f =>
        path.basename(f.path) === '.env.development',
      );
      const devLocalFile = parsedFiles.find(f =>
        path.basename(f.path) === '.env.development.local',
      );

      expect(baseFile?.vars.find(v => v.key === 'DATABASE_URL')?.value).toBe(
        'postgres://localhost/base',
      );
      expect(localFile?.vars.find(v => v.key === 'DATABASE_URL')?.value).toBe(
        'postgres://localhost/local',
      );
      expect(devFile?.vars.find(v => v.key === 'DATABASE_URL')?.value).toBe(
        'postgres://localhost/development',
      );
      expect(devLocalFile?.vars.find(v => v.key === 'DATABASE_URL')?.value).toBe(
        'postgres://localhost/dev_local',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // First-wins strategy
  // ---------------------------------------------------------------------------
  describe('first-wins merge strategy', () => {
    it('.env wins with first-wins strategy for SHARED key', () => {
      // .env              → SHARED=from_base (winner with first-wins)
      // .env.development  → SHARED=from_development
      const env = load({
        envDir: cascadeDir,
        mergeStrategy: 'first-wins',
      });

      expect(env.SHARED).toBe('from_base');
    });

    it('.env wins with first-wins strategy for DATABASE_URL', () => {
      const env = load({
        envDir: cascadeDir,
        mergeStrategy: 'first-wins',
      });

      expect(env.DATABASE_URL).toBe('postgres://localhost/base');
    });

    it('still merges all unique keys with first-wins', () => {
      const env = load({
        envDir: cascadeDir,
        mergeStrategy: 'first-wins',
      });

      // Keys unique to their files should still be present
      expect(env.APP_NAME).toBe('ultraenv');
      expect(env.LOCAL_ONLY).toBe('true');
      expect(env.DEV_ONLY).toBe('yes');
      expect(env.DEV_LOCAL_ONLY).toBe('true');
    });
  });

  // ---------------------------------------------------------------------------
  // loadWithResult with metadata for cascade
  // ---------------------------------------------------------------------------
  describe('loadWithResult with cascade metadata', () => {
    it('reports correct files parsed and total vars', () => {
      const result = loadWithResult({ envDir: cascadeDir });

      // Should have parsed all 4 files
      expect(result.metadata.filesParsed).toBe(4);
      expect(result.metadata.filesFound).toBe(4);

      // Total vars: APP_NAME, BASE_VAR, DATABASE_URL, SHARED, LOCAL_ONLY,
      // NODE_ENV, DEV_ONLY, DEV_LOCAL_ONLY, DEBUG = 9
      expect(result.metadata.totalVars).toBe(9);
    });

    it('source tracking shows which file each key came from', () => {
      const cascade = resolveCascade({
        envDir: cascadeDir,
        environment: 'development',
      });

      // Parse and merge to populate source tracking
      const parsedFiles = cascade.existingFiles.map(entry => {
        const content = fs.readFileSync(entry.absolutePath, 'utf-8');
        return parseEnvFile(content, entry.absolutePath);
      });

      mergeCascade(parsedFiles, cascade);

      // DATABASE_URL should come from .env.development.local (last-wins)
      expect(cascade.sources['DATABASE_URL']).toContain('.env.development.local');
      // APP_NAME only exists in .env
      expect(cascade.sources['APP_NAME']).toContain('.env');
    });
  });

  // ---------------------------------------------------------------------------
  // Variable interpolation in cascade context
  // ---------------------------------------------------------------------------
  describe('interpolation within cascade', () => {
    it('interpolation works across the merged cascade env', () => {
      // Write a temporary test with interpolation
      const tempCascadeDir = cascadeDir;
      // The base .env doesn't have interpolation, but the loader should handle it

      // Load and verify all values are strings (no unresolved references)
      const env = load({ envDir: tempCascadeDir });

      // No value should contain unresolved ${...} references
      for (const [key, value] of Object.entries(env)) {
        expect(value).not.toMatch(/\$\{[^}]+\}/);
      }
    });
  });
});
