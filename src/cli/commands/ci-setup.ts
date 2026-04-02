// =============================================================================
// ultraenv — CLI Command: ci setup
// Generate CI config files (GitHub Actions, GitLab CI).
// =============================================================================

import type { ParsedArgs } from '../parser.js';
import type { CommandContext } from './types.js';
import { writeLine, writeError } from '../ui/renderer.js';
import { green, red, cyan, bold, yellow } from '../ui/colors.js';
import { resolve, join } from 'node:path';
import { exists, ensureDir, writeFile } from '../../utils/fs.js';

const GITHUB_ACTIONS_TEMPLATE = `name: Ultraenv CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install ultraenv
        run: npm install -g ultraenv

      - name: Validate environment
        run: ultraenv ci validate --strict

      - name: Check .env sync
        run: ultraenv ci check-sync

      - name: Scan for secrets
        run: ultraenv ci scan --format sarif --output results.sarif
        continue-on-error: true

      - name: Upload SARIF results
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
        continue-on-error: true
`;

const GITLAB_CI_TEMPLATE = `stages:
  - validate
  - scan

variables:
  NODE_VERSION: "20"

.validate-env:
  stage: validate
  image: node:\${NODE_VERSION}
  before_script:
    - npm install -g ultraenv
  script:
    - ultraenv ci validate --strict
    - ultraenv ci check-sync

.scan-secrets:
  stage: scan
  image: node:\${NODE_VERSION}
  before_script:
    - npm install -g ultraenv
  script:
    - ultraenv ci scan --format json > scan-results.json
  artifacts:
    paths:
      - scan-results.json
    when: always
`;

export async function run(args: ParsedArgs, ctx: CommandContext): Promise<number> {
  try {
    const cwd = (args.flags['--cwd'] as string) ?? ctx.cwd;
    const baseDir = resolve(cwd);
    const platform = (args.flags['--platform'] as string) ?? 'github';

    writeLine(bold('🔧 Generating CI configuration'));
    writeLine('');

    if (platform === 'github') {
      const workflowsDir = join(baseDir, '.github', 'workflows');
      await ensureDir(workflowsDir);
      const workflowPath = join(workflowsDir, 'ultraenv.yml');

      if (await exists(workflowPath) && !args.flags['--force']) {
        writeLine(yellow(`  ${workflowPath} already exists. Use --force to overwrite.`));
        return 0;
      }

      await writeFile(workflowPath, GITHUB_ACTIONS_TEMPLATE);
      writeLine(green(`  ✓ Created ${workflowPath}`));
    } else if (platform === 'gitlab') {
      const gitlabPath = join(baseDir, '.gitlab-ci.yml');

      if (await exists(gitlabPath) && !args.flags['--force']) {
        writeLine(yellow(`  ${gitlabPath} already exists. Use --force to overwrite.`));
        return 0;
      }

      await writeFile(gitlabPath, GITLAB_CI_TEMPLATE);
      writeLine(green(`  ✓ Created ${gitlabPath}`));
    } else {
      writeError(red(`  Unknown platform: ${platform}`));
      writeError(yellow('  Supported: github, gitlab'));
      return 1;
    }

    writeLine('');
    writeLine(green(bold('  ✅ CI configuration generated!')));
    writeLine('');
    writeLine(cyan('  The CI pipeline will:'));
    writeLine('    1. Validate environment variables');
    writeLine('    2. Check .env ↔ .env.example sync');
    writeLine('    3. Scan for leaked secrets');
    writeLine('');

    return 0;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    writeError(red(`  Error: ${msg}`));
    return 1;
  }
}
