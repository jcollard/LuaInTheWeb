#!/usr/bin/env node

/**
 * Scoped mutation testing script
 *
 * Usage: node scripts/mutation-scope.js "src/components/MyComponent/**"
 *
 * This script runs Stryker with the provided scope pattern while maintaining
 * the standard exclusions for test files, CSS, etc.
 */

import { spawn } from 'child_process';

const EXCLUSIONS = [
  '!src/**/*.test.ts',
  '!src/**/*.test.tsx',
  '!src/**/*.spec.ts',
  '!src/**/*.spec.tsx',
  '!src/**/__tests__/**',
  '!src/**/*.css',
  '!src/**/*.d.ts',
];

const scopePattern = process.argv[2];

if (!scopePattern) {
  console.error('Usage: node scripts/mutation-scope.js "src/components/MyComponent/**"');
  console.error('Example: npm run test:mutation:scope "src/hooks/useFileSystem.*"');
  process.exit(1);
}

// Build the mutate patterns as comma-separated string: scope + exclusions
const mutatePatterns = [scopePattern, ...EXCLUSIONS].join(',');

// Construct the stryker command
const args = ['stryker', 'run', '--mutate', mutatePatterns];

console.log(`Running scoped mutation test on: ${scopePattern}`);
console.log(`With exclusions: ${EXCLUSIONS.join(', ')}\n`);

const child = spawn('npx', args, {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
