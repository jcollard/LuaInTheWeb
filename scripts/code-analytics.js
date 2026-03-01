#!/usr/bin/env node
/**
 * code-analytics.js - Unified code analytics report
 *
 * Combines duplication detection (jscpd), complexity analysis (ESLint),
 * and file size metrics into a single actionable report.
 *
 * Usage:
 *   node scripts/code-analytics.js              # Full report (console)
 *   node scripts/code-analytics.js --json       # JSON output
 *   node scripts/code-analytics.js --duplication # Duplication only
 *   node scripts/code-analytics.js --complexity  # Complexity only
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT_DIR = path.resolve(__dirname, '..')
const REPORTS_DIR = path.join(ROOT_DIR, 'reports')

// Source directories to analyze
const SOURCE_DIRS = [
  { name: 'shell-core', dir: 'packages/shell-core/src' },
  { name: 'canvas-runtime', dir: 'packages/canvas-runtime/src' },
  { name: 'ansi-shared', dir: 'packages/ansi-shared/src' },
  { name: 'lua-runtime', dir: 'packages/lua-runtime/src' },
  { name: 'export', dir: 'packages/export/src' },
  { name: 'lua-learning-website', dir: 'lua-learning-website/src' },
]

// Packages with ESLint configs for complexity analysis
const LINTABLE = [
  { name: 'lua-runtime', dir: 'packages/lua-runtime' },
  { name: 'lua-learning-website', dir: 'lua-learning-website' },
]

// Parse CLI args
const args = process.argv.slice(2)
const outputJSON = args.includes('--json')
const duplicationOnly = args.includes('--duplication')
const complexityOnly = args.includes('--complexity')
const runAll = !duplicationOnly && !complexityOnly

// ============================================================================
// File Walking Utilities
// ============================================================================

function walkDir(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.stryker-tmp') continue
      walkDir(fullPath, files)
    } else {
      files.push(fullPath)
    }
  }
  return files
}

function countLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  return content.split('\n').length
}

function isSourceFile(filePath) {
  return /\.(ts|tsx)$/.test(filePath) && !filePath.includes('.test.') && !filePath.includes('.generated.')
}

// ============================================================================
// File Size Analysis
// ============================================================================

function analyzeFileSizes() {
  const files = []

  for (const { name, dir } of SOURCE_DIRS) {
    const absDir = path.join(ROOT_DIR, dir)
    const allFiles = walkDir(absDir)

    for (const filePath of allFiles) {
      if (!isSourceFile(filePath)) continue
      const lines = countLines(filePath)
      const relativePath = path.relative(ROOT_DIR, filePath)
      files.push({ file: relativePath, lines, package: name })
    }
  }

  files.sort((a, b) => b.lines - a.lines)

  const totalFiles = files.length
  const totalLines = files.reduce((sum, f) => sum + f.lines, 0)

  // Per-package breakdown
  const byPackage = {}
  for (const f of files) {
    if (!byPackage[f.package]) byPackage[f.package] = { files: 0, lines: 0 }
    byPackage[f.package].files++
    byPackage[f.package].lines += f.lines
  }

  const largeFiles = files.filter(f => f.lines > 300)

  return { totalFiles, totalLines, byPackage, largeFiles, allFiles: files }
}

// ============================================================================
// Duplication Analysis (jscpd)
// ============================================================================

function analyzeDuplication() {
  fs.mkdirSync(path.join(REPORTS_DIR, 'duplication'), { recursive: true })

  const sourcePaths = SOURCE_DIRS
    .map(s => path.join(ROOT_DIR, s.dir))
    .filter(d => fs.existsSync(d))
    .join(' ')

  try {
    // Run jscpd using the .jscpd.json config at repo root for ignore patterns,
    // but override reporters and output for JSON capture
    const cmd = `npx jscpd ${sourcePaths} --config "${path.join(ROOT_DIR, '.jscpd.json')}" --reporters json --output "${path.join(REPORTS_DIR, 'duplication')}" 2>&1`
    execSync(cmd, { cwd: ROOT_DIR, timeout: 120000 })
  } catch (e) {
    // jscpd exits with non-zero when it finds duplicates above threshold - that's fine
  }

  // Parse the JSON report
  const jsonPath = path.join(REPORTS_DIR, 'duplication', 'jscpd-report.json')
  if (!fs.existsSync(jsonPath)) {
    return { totalDuplicatedLines: 0, totalDuplicatedPercentage: 0, clones: [], error: 'No jscpd report generated' }
  }

  const report = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
  const stats = report.statistics || {}
  const total = stats.total || {}

  const clones = (report.duplicates || []).map(d => ({
    lines: d.lines || 0,
    tokens: d.tokens || 0,
    firstFile: {
      file: path.relative(ROOT_DIR, d.firstFile?.name || ''),
      start: d.firstFile?.startLoc?.line || 0,
      end: d.firstFile?.endLoc?.line || 0,
    },
    secondFile: {
      file: path.relative(ROOT_DIR, d.secondFile?.name || ''),
      start: d.secondFile?.startLoc?.line || 0,
      end: d.secondFile?.endLoc?.line || 0,
    },
  }))

  clones.sort((a, b) => b.lines - a.lines)

  return {
    totalDuplicatedLines: total.duplicatedLines || 0,
    totalDuplicatedPercentage: total.percentage ? parseFloat(total.percentage.toFixed(2)) : 0,
    totalLines: total.lines || 0,
    clones,
  }
}

// ============================================================================
// Complexity Analysis (ESLint)
// ============================================================================

function analyzeComplexity() {
  const allWarnings = []

  for (const { name, dir } of LINTABLE) {
    const pkgDir = path.join(ROOT_DIR, dir)
    const eslintConfig = path.join(pkgDir, 'eslint.config.js')
    if (!fs.existsSync(eslintConfig)) continue

    try {
      // Run ESLint with complexity threshold of 1 to capture all function complexities
      // Use --rule to override the configured threshold
      const cmd = `npx eslint --format json --no-error-on-unmatched-pattern --rule '{"complexity": ["warn", 1]}' "${path.join(pkgDir, 'src')}/**/*.{ts,tsx}" --ignore-pattern "**/*.test.{ts,tsx}" 2>/dev/null`
      const output = execSync(cmd, { cwd: pkgDir, timeout: 120000, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })

      const results = JSON.parse(output)
      for (const fileResult of results) {
        const filePath = path.relative(ROOT_DIR, fileResult.filePath)
        for (const msg of fileResult.messages) {
          if (msg.ruleId === 'complexity') {
            // ESLint complexity message format: "Arrow function has a complexity of N." or
            // "Function 'name' has a complexity of N."
            const match = msg.message.match(/complexity of (\d+)/)
            const nameMatch = msg.message.match(/(?:Function|Method) '([^']+)'/)
            const complexity = match ? parseInt(match[1], 10) : 0
            const funcName = nameMatch ? nameMatch[1] : (msg.message.includes('Arrow function') ? '<arrow>' : '<anonymous>')

            allWarnings.push({
              file: filePath,
              line: msg.line,
              function: funcName,
              complexity,
              package: name,
            })
          }
        }
      }
    } catch (e) {
      // ESLint may exit non-zero on lint errors, try to parse stdout anyway
      if (e.stdout) {
        try {
          const results = JSON.parse(e.stdout)
          for (const fileResult of results) {
            const filePath = path.relative(ROOT_DIR, fileResult.filePath)
            for (const msg of fileResult.messages) {
              if (msg.ruleId === 'complexity') {
                const match = msg.message.match(/complexity of (\d+)/)
                const nameMatch = msg.message.match(/(?:Function|Method) '([^']+)'/)
                const complexity = match ? parseInt(match[1], 10) : 0
                const funcName = nameMatch ? nameMatch[1] : (msg.message.includes('Arrow function') ? '<arrow>' : '<anonymous>')

                allWarnings.push({
                  file: filePath,
                  line: msg.line,
                  function: funcName,
                  complexity,
                  package: name,
                })
              }
            }
          }
        } catch {
          // Could not parse ESLint output for this package
        }
      }
    }
  }

  allWarnings.sort((a, b) => b.complexity - a.complexity)

  // Per-file aggregation
  const byFile = {}
  for (const w of allWarnings) {
    if (!byFile[w.file]) byFile[w.file] = { file: w.file, totalComplexity: 0, functions: 0, maxComplexity: 0 }
    byFile[w.file].totalComplexity += w.complexity
    byFile[w.file].functions++
    byFile[w.file].maxComplexity = Math.max(byFile[w.file].maxComplexity, w.complexity)
  }

  const filesSorted = Object.values(byFile).sort((a, b) => b.totalComplexity - a.totalComplexity)

  return {
    totalFunctions: allWarnings.length,
    topFunctions: allWarnings.slice(0, 30),
    highComplexity: allWarnings.filter(w => w.complexity > 15),
    mediumComplexity: allWarnings.filter(w => w.complexity > 10 && w.complexity <= 15),
    byFile: filesSorted,
  }
}

// ============================================================================
// Console Report Formatting
// ============================================================================

function formatNumber(num) {
  return num.toLocaleString()
}

function createBar(percentage, width = 25) {
  const filled = Math.round((percentage / 100) * width)
  return '\u2588'.repeat(filled) + '\u2591'.repeat(width - filled)
}

function printHeader(title) {
  console.log('\n' + '='.repeat(65))
  console.log('  ' + title)
  console.log('='.repeat(65))
}

function printSection(title) {
  console.log('\n' + '-'.repeat(65))
  console.log('  ' + title)
  console.log('-'.repeat(65))
}

function printFileSizeReport(metrics) {
  printSection('FILE SIZE METRICS')

  console.log(`\n  Total source files:  ${formatNumber(metrics.totalFiles)}`)
  console.log(`  Total source lines:  ${formatNumber(metrics.totalLines)}`)

  console.log('\n  Per-package breakdown:')
  const pkgs = Object.entries(metrics.byPackage).sort((a, b) => b[1].lines - a[1].lines)
  for (const [name, data] of pkgs) {
    const pct = metrics.totalLines > 0 ? Math.round((data.lines / metrics.totalLines) * 100) : 0
    console.log(`    ${name.padEnd(25)} ${formatNumber(data.lines).padStart(7)} lines  ${formatNumber(data.files).padStart(4)} files  ${createBar(pct, 15)} ${pct}%`)
  }

  if (metrics.largeFiles.length > 0) {
    console.log(`\n  Large files (>300 lines): ${metrics.largeFiles.length}`)
    const top = metrics.largeFiles.slice(0, 15)
    for (let i = 0; i < top.length; i++) {
      const f = top[i]
      const severity = f.lines > 800 ? 'HIGH' : f.lines > 500 ? 'MED ' : 'LOW '
      console.log(`    ${String(i + 1).padStart(3)}. [${severity}] ${f.file}  (${formatNumber(f.lines)} lines)`)
    }
    if (metrics.largeFiles.length > 15) {
      console.log(`    ... and ${metrics.largeFiles.length - 15} more`)
    }
  }
}

function printDuplicationReport(duplication) {
  printSection('DUPLICATION ANALYSIS (jscpd)')

  console.log(`\n  Duplicated lines:      ${formatNumber(duplication.totalDuplicatedLines)} / ${formatNumber(duplication.totalLines || 0)}`)
  console.log(`  Duplication rate:      ${duplication.totalDuplicatedPercentage}%  ${createBar(duplication.totalDuplicatedPercentage, 20)}`)
  console.log(`  Duplicated blocks:     ${duplication.clones.length}`)

  if (duplication.clones.length > 0) {
    console.log('\n  Top duplicated blocks:')
    const top = duplication.clones.slice(0, 15)
    for (let i = 0; i < top.length; i++) {
      const c = top[i]
      console.log(`    ${String(i + 1).padStart(3)}. ${c.lines} lines  ${c.firstFile.file}:${c.firstFile.start}-${c.firstFile.end}`)
      console.log(`                     <-> ${c.secondFile.file}:${c.secondFile.start}-${c.secondFile.end}`)
    }
    if (duplication.clones.length > 15) {
      console.log(`    ... and ${duplication.clones.length - 15} more blocks`)
    }
  }
}

function printComplexityReport(complexity) {
  printSection('COMPLEXITY ANALYSIS (ESLint)')

  console.log(`\n  Total functions analyzed:    ${formatNumber(complexity.totalFunctions)}`)
  console.log(`  High complexity (>15):       ${complexity.highComplexity.length}`)
  console.log(`  Medium complexity (11-15):   ${complexity.mediumComplexity.length}`)

  if (complexity.highComplexity.length > 0) {
    console.log('\n  HIGH complexity functions (>15):')
    for (const w of complexity.highComplexity) {
      console.log(`    [${w.complexity.toString().padStart(2)}] ${w.file}:${w.line}  ${w.function}()`)
    }
  }

  if (complexity.topFunctions.length > 0) {
    console.log('\n  Top 20 most complex functions:')
    const top = complexity.topFunctions.slice(0, 20)
    for (let i = 0; i < top.length; i++) {
      const w = top[i]
      const marker = w.complexity > 15 ? ' !' : w.complexity > 10 ? ' *' : '  '
      console.log(`    ${String(i + 1).padStart(3)}.${marker} [${w.complexity.toString().padStart(2)}] ${w.file}:${w.line}  ${w.function}()`)
    }
  }

  if (complexity.byFile.length > 0) {
    console.log('\n  Most complex files (by total complexity):')
    const top = complexity.byFile.slice(0, 10)
    for (let i = 0; i < top.length; i++) {
      const f = top[i]
      console.log(`    ${String(i + 1).padStart(3)}. ${f.file}  total=${f.totalComplexity}  max=${f.maxComplexity}  functions=${f.functions}`)
    }
  }
}

function printRecommendations(metrics, duplication, complexity) {
  printSection('ACTIONABLE RECOMMENDATIONS')
  console.log()

  const recommendations = []

  if (complexity && complexity.highComplexity.length > 0) {
    recommendations.push({
      severity: 'HIGH',
      message: `${complexity.highComplexity.length} function(s) exceed complexity 15 -- consider extracting helpers or splitting logic`,
    })
  }

  if (duplication && duplication.totalDuplicatedPercentage > 5) {
    recommendations.push({
      severity: 'HIGH',
      message: `Duplication rate is ${duplication.totalDuplicatedPercentage}% (above 5% threshold) -- review top clones for extraction`,
    })
  } else if (duplication && duplication.clones.length > 0) {
    recommendations.push({
      severity: 'MED',
      message: `${duplication.clones.length} duplicated block(s) found at ${duplication.totalDuplicatedPercentage}% -- review top clones`,
    })
  }

  if (metrics) {
    const veryLarge = metrics.largeFiles.filter(f => f.lines > 800)
    if (veryLarge.length > 0) {
      recommendations.push({
        severity: 'MED',
        message: `${veryLarge.length} file(s) exceed 800 lines -- consider splitting into smaller modules`,
      })
    }
  }

  if (recommendations.length === 0) {
    console.log('  No critical issues found. Codebase looks healthy!')
  } else {
    for (const r of recommendations) {
      console.log(`  [${r.severity.padEnd(4)}] ${r.message}`)
    }
  }
  console.log()
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const timestamp = new Date().toISOString()
  let metrics = null
  let duplication = null
  let complexity = null

  if (!outputJSON) {
    printHeader(`CODE ANALYTICS REPORT  (${new Date().toLocaleDateString()})`)
  }

  // File size metrics (always run for context)
  if (runAll || complexityOnly) {
    metrics = analyzeFileSizes()
    if (!outputJSON && runAll) {
      printFileSizeReport(metrics)
    }
  }

  // Duplication analysis
  if (runAll || duplicationOnly) {
    if (!outputJSON) console.log('\n  Running duplication analysis...')
    duplication = analyzeDuplication()
    if (!outputJSON) {
      printDuplicationReport(duplication)
    }
  }

  // Complexity analysis
  if (runAll || complexityOnly) {
    if (!outputJSON) console.log('\n  Running complexity analysis...')
    complexity = analyzeComplexity()
    if (!outputJSON) {
      printComplexityReport(complexity)
    }
  }

  // Recommendations
  if (!outputJSON && runAll) {
    printRecommendations(metrics, duplication, complexity)
  }

  // JSON output
  if (outputJSON) {
    const report = { timestamp }
    if (metrics) report.fileMetrics = { totalFiles: metrics.totalFiles, totalLines: metrics.totalLines, byPackage: metrics.byPackage, largeFiles: metrics.largeFiles }
    if (duplication) report.duplication = duplication
    if (complexity) report.complexity = { totalFunctions: complexity.totalFunctions, highComplexity: complexity.highComplexity, mediumComplexity: complexity.mediumComplexity, topFunctions: complexity.topFunctions.slice(0, 30), byFile: complexity.byFile.slice(0, 20) }
    console.log(JSON.stringify(report, null, 2))
  }

  if (!outputJSON) {
    console.log('='.repeat(65) + '\n')
  }
}

main()
