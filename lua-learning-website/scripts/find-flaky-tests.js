#!/usr/bin/env node
/**
 * Script to identify flaky E2E tests by running them multiple times.
 *
 * Usage: node scripts/find-flaky-tests.js [iterations]
 * Default: 10 iterations
 */

import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const iterations = parseInt(process.argv[2]) || 10
const failures = new Map() // testName -> [{ iteration, error }]
let totalRuns = 0
let totalPassed = 0

console.log(`\n🔍 Finding flaky tests with ${iterations} iterations...\n`)

async function runTests(iteration) {
  return new Promise((resolve) => {
    const startTime = Date.now()

    // Use JSON reporter for structured output
    const proc = spawn('npx', ['playwright', 'test', '--reporter=json'], {
      cwd: path.resolve(__dirname, '..'),
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''
    proc.stdout.on('data', (data) => { stdout += data.toString() })
    proc.stderr.on('data', () => {}) // Ignore stderr

    proc.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)
      totalRuns++

      if (code === 0) {
        totalPassed++
        console.log(`  ✅ Run ${iteration}/${iterations} (${duration}s): All passed`)
        resolve()
        return
      }

      // Parse failures
      let failedTests = []
      try {
        const result = JSON.parse(stdout)
        failedTests = extractFailures(result, iteration)
      } catch {
        console.log(`  ⚠️  Run ${iteration}/${iterations} (${duration}s): Failed (couldn't parse details)`)
        resolve()
        return
      }

      if (failedTests.length > 0) {
        console.log(`  ❌ Run ${iteration}/${iterations} (${duration}s): ${failedTests.length} failed`)
        for (const test of failedTests) {
          console.log(`     - ${test}`)
        }
      }

      resolve()
    })
  })
}

function extractFailures(result, iteration) {
  const failed = []

  function processSpec(spec, parentTitle) {
    const fullTitle = parentTitle ? `${parentTitle} › ${spec.title}` : spec.title

    for (const test of spec.tests || []) {
      if (test.status === 'unexpected' || test.status === 'failed') {
        failed.push(fullTitle)

        if (!failures.has(fullTitle)) {
          failures.set(fullTitle, [])
        }
        failures.get(fullTitle).push(iteration)
      }
    }
  }

  function processSuite(suite, parentTitle = '') {
    const fullTitle = parentTitle ? `${parentTitle} › ${suite.title}` : suite.title

    for (const spec of suite.specs || []) {
      processSpec(spec, fullTitle)
    }

    for (const nested of suite.suites || []) {
      processSuite(nested, fullTitle)
    }
  }

  for (const suite of result.suites || []) {
    processSuite(suite)
  }

  return failed
}

async function main() {
  const startTime = Date.now()

  // Run tests sequentially to avoid resource contention
  for (let i = 1; i <= iterations; i++) {
    await runTests(i)
  }

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1)

  // Report results
  console.log('\n' + '='.repeat(70))
  console.log('📊 FLAKY TEST REPORT')
  console.log('='.repeat(70))
  console.log(`Total iterations: ${iterations}`)
  console.log(`Total time: ${totalTime} minutes`)
  console.log(`Runs passed: ${totalPassed}/${totalRuns}`)

  if (failures.size === 0) {
    console.log('\n✅ No flaky tests found! All tests passed consistently.')
    console.log('='.repeat(70))
    process.exit(0)
    return
  }

  console.log(`\n⚠️  Found ${failures.size} flaky test(s):\n`)

  // Sort by failure count (most flaky first)
  const sorted = [...failures.entries()].sort((a, b) => b[1].length - a[1].length)

  for (const [testName, failedIterations] of sorted) {
    const failRate = ((failedIterations.length / iterations) * 100).toFixed(0)
    console.log(`  📛 ${testName}`)
    console.log(`     Failure rate: ${failedIterations.length}/${iterations} (${failRate}%)`)
    console.log(`     Failed on runs: ${failedIterations.join(', ')}`)
    console.log()
  }

  console.log('='.repeat(70))
  process.exit(1)
}

main().catch(console.error)
