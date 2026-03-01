#!/usr/bin/env node
/**
 * ci-local.js - Run the same checks as CI locally
 * Usage: node scripts/ci-local.js [--skip-e2e] [--scope pkg1,pkg2,...]
 *
 * This mirrors .github/workflows/e2e.yml for local validation before pushing.
 *
 * --scope: Only lint/test the specified packages (comma-separated).
 *          Build always runs for all packages to ensure correctness.
 *          E2E only runs if lua-learning-website is in scope.
 *          Valid packages: shell-core, canvas-runtime, ansi-shared, lua-runtime, export, lua-learning-website
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT_DIR = path.resolve(__dirname, '..')
const TMP_DIR = path.join(ROOT_DIR, 'tmp')
fs.mkdirSync(TMP_DIR, { recursive: true })
const skipE2E = process.argv.includes('--skip-e2e')

// Parse --scope flag
const scopeIndex = process.argv.indexOf('--scope')
const scopeArg = scopeIndex !== -1 ? process.argv[scopeIndex + 1] : null
const scopedPackages = scopeArg ? scopeArg.split(',').map(p => p.trim()) : null

// Package directory mapping
const PACKAGE_DIRS = {
  'shell-core': 'packages/shell-core',
  'canvas-runtime': 'packages/canvas-runtime',
  'ansi-shared': 'packages/ansi-shared',
  'lua-runtime': 'packages/lua-runtime',
  'export': 'packages/export',
  'lua-learning-website': 'lua-learning-website',
}

// Packages that have lint scripts
const LINTABLE = ['shell-core', 'canvas-runtime', 'ansi-shared', 'lua-runtime', 'export', 'lua-learning-website']

// All testable packages in dependency order
const TESTABLE = ['shell-core', 'canvas-runtime', 'ansi-shared', 'lua-runtime', 'lua-learning-website']

// Build order (always all, for correctness)
const BUILD_ORDER = ['shell-core', 'canvas-runtime', 'ansi-shared', 'lua-runtime', 'export', 'lua-learning-website']

function isInScope(pkg) {
  return !scopedPackages || scopedPackages.includes(pkg)
}

function pkgDir(pkg) {
  return path.join(ROOT_DIR, PACKAGE_DIRS[pkg])
}

function run(cmd, cwd = ROOT_DIR) {
  console.log(`  → ${cmd}`)
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, TMPDIR: TMP_DIR } })
}

function section(emoji, title) {
  console.log('')
  console.log(`${emoji} ${title}`)
  console.log('-'.repeat(title.length + 3))
}

try {
  const modeLabel = scopedPackages
    ? `scoped CI [${scopedPackages.join(', ')}]`
    : 'full CI'

  console.log('================================')
  console.log(`🔍 Running ${modeLabel} locally...`)
  console.log('================================')

  // Step 1: Lint packages (scoped)
  const lintTargets = LINTABLE.filter(isInScope)
  if (lintTargets.length > 0) {
    section('📝', 'Linting packages...')
    for (const pkg of lintTargets) {
      run('npm run lint', pkgDir(pkg))
    }
    console.log('✅ Lint passed')
  } else {
    console.log('')
    console.log('⏭️  No lintable packages in scope — skipping lint')
  }

  // Step 2: Build all packages (always full, in dependency order)
  section('🔨', 'Building packages...')
  for (const pkg of BUILD_ORDER) {
    run('npm run build', pkgDir(pkg))
  }
  console.log('✅ Build passed')

  // Step 3: Test packages (scoped)
  const testTargets = TESTABLE.filter(isInScope)
  if (testTargets.length > 0) {
    section('🧪', 'Running unit tests...')
    for (const pkg of testTargets) {
      run('npm run test', pkgDir(pkg))
    }
    console.log('✅ Unit tests passed')
  } else {
    console.log('')
    console.log('⏭️  No testable packages in scope — skipping tests')
  }

  // Step 4: E2E tests (only if lua-learning-website is in scope and not skipped)
  const runE2E = !skipE2E && isInScope('lua-learning-website')
  if (runE2E) {
    section('🎭', 'Running E2E tests...')
    run('npm run test:e2e', path.join(ROOT_DIR, 'lua-learning-website'))
    console.log('✅ E2E tests passed')
  } else {
    console.log('')
    if (skipE2E) {
      console.log('⏭️  Skipping E2E tests (--skip-e2e flag)')
    } else if (scopedPackages && !scopedPackages.includes('lua-learning-website')) {
      console.log('⏭️  Skipping E2E tests (lua-learning-website not in scope)')
    }
  }

  console.log('')
  console.log('================================')
  console.log(`✅ All ${modeLabel} checks passed!`)
  console.log('================================')
  process.exit(0)

} catch (error) {
  console.error('')
  console.error('❌ CI check failed!')
  process.exit(1)
}
