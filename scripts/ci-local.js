#!/usr/bin/env node
/**
 * ci-local.js - Run the same checks as CI locally
 * Usage: node scripts/ci-local.js [--skip-e2e]
 *
 * This mirrors .github/workflows/e2e.yml for local validation before pushing.
 */

const { execSync } = require('child_process')
const path = require('path')

const ROOT_DIR = path.resolve(__dirname, '..')
const skipE2E = process.argv.includes('--skip-e2e')

function run(cmd, cwd = ROOT_DIR) {
  console.log(`  → ${cmd}`)
  execSync(cmd, { cwd, stdio: 'inherit' })
}

function runWithRetry(cmd, cwd = ROOT_DIR, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  → ${cmd}${attempt > 1 ? ` (attempt ${attempt}/${maxRetries})` : ''}`)
      execSync(cmd, { cwd, stdio: 'inherit' })
      return // Success
    } catch (error) {
      if (attempt < maxRetries) {
        console.log(`  ⚠️  Attempt ${attempt} failed, retrying...`)
      } else {
        throw error // All retries exhausted
      }
    }
  }
}

function section(emoji, title) {
  console.log('')
  console.log(`${emoji} ${title}`)
  console.log('-'.repeat(title.length + 3))
}

try {
  console.log('================================')
  console.log('🔍 Running CI checks locally...')
  console.log('================================')

  // Step 1: Lint all packages
  section('📝', 'Linting packages...')
  run('npm run lint', path.join(ROOT_DIR, 'packages/lua-runtime'))
  run('npm run lint', path.join(ROOT_DIR, 'lua-learning-website'))
  console.log('✅ Lint passed')

  // Step 2: Build all packages (in dependency order)
  // Order: shell-core → canvas-runtime → ansi-shared → lua-runtime → export → lua-learning-website
  section('🔨', 'Building packages...')
  run('npm run build', path.join(ROOT_DIR, 'packages/shell-core'))
  run('npm run build', path.join(ROOT_DIR, 'packages/canvas-runtime'))
  run('npm run build', path.join(ROOT_DIR, 'packages/ansi-shared'))
  run('npm run build', path.join(ROOT_DIR, 'packages/lua-runtime'))
  run('npm run build', path.join(ROOT_DIR, 'packages/export'))
  run('npm run build', path.join(ROOT_DIR, 'lua-learning-website'))
  console.log('✅ Build passed')

  // Step 3: Test all packages
  section('🧪', 'Running unit tests...')
  run('npm run test', path.join(ROOT_DIR, 'packages/shell-core'))
  run('npm run test', path.join(ROOT_DIR, 'packages/canvas-runtime'))
  run('npm run test', path.join(ROOT_DIR, 'packages/ansi-shared'))
  run('npm run test', path.join(ROOT_DIR, 'packages/lua-runtime'))
  run('npm run test', path.join(ROOT_DIR, 'lua-learning-website'))
  console.log('✅ Unit tests passed')

  // Step 4: E2E tests (optional, with retry for flaky tests)
  if (!skipE2E) {
    section('🎭', 'Running E2E tests (with retry)...')
    runWithRetry('npm run test:e2e', path.join(ROOT_DIR, 'lua-learning-website'), 3)
    console.log('✅ E2E tests passed')
  } else {
    console.log('')
    console.log('⏭️  Skipping E2E tests (--skip-e2e flag)')
  }

  console.log('')
  console.log('================================')
  console.log('✅ All CI checks passed!')
  console.log('================================')
  process.exit(0)

} catch (error) {
  console.error('')
  console.error('❌ CI check failed!')
  process.exit(1)
}
