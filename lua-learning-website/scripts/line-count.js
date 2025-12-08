/**
 * Line Count Script - Granular code categorization for the project
 *
 * Categories:
 * - UI: components, pages, styles (module & global), entry
 * - Logic: hooks, types, context, exports
 * - Test: component-tests, hook-tests, setup
 *
 * Usage:
 *   node scripts/line-count.js          # Pretty console output
 *   node scripts/line-count.js --json   # JSON output
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Categorizes a file path into category and subcategory
 * @param {string} filePath - The file path relative to project root
 * @returns {{ category: string, subcategory: string } | null}
 */
export function categorizeFile(filePath) {
  // Only process files in src/
  if (!filePath.startsWith('src/')) {
    return null
  }

  // Only process .ts, .tsx, .css files
  if (!filePath.match(/\.(tsx?|css)$/)) {
    return null
  }

  // Test files
  if (filePath.includes('.test.')) {
    if (filePath.endsWith('.test.tsx')) {
      return { category: 'test', subcategory: 'component-tests' }
    }
    return { category: 'test', subcategory: 'hook-tests' }
  }

  // Test setup directory
  if (filePath.startsWith('src/test/')) {
    return { category: 'test', subcategory: 'setup' }
  }

  // CSS files
  if (filePath.endsWith('.module.css')) {
    return { category: 'ui', subcategory: 'styles-module' }
  }
  if (filePath.endsWith('.css')) {
    return { category: 'ui', subcategory: 'styles-global' }
  }

  // Entry point
  if (filePath === 'src/main.tsx') {
    return { category: 'ui', subcategory: 'entry' }
  }

  // Pages
  if (filePath.startsWith('src/pages/') && filePath.endsWith('.tsx')) {
    return { category: 'ui', subcategory: 'pages' }
  }

  // Index/barrel exports
  if (filePath.endsWith('/index.ts') || filePath === 'src/index.ts') {
    return { category: 'logic', subcategory: 'exports' }
  }

  // Types
  if (filePath.endsWith('/types.ts') || filePath.endsWith('types.ts')) {
    return { category: 'logic', subcategory: 'types' }
  }

  // Context files (IDEContext directory)
  if (filePath.includes('/IDEContext/')) {
    if (filePath.endsWith('.tsx')) {
      return { category: 'ui', subcategory: 'components' }
    }
    // context.ts and useIDE.ts are logic/context
    return { category: 'logic', subcategory: 'context' }
  }

  // Hooks (use*.ts pattern)
  const filename = filePath.split('/').pop()
  if (filename?.startsWith('use') && filePath.endsWith('.ts')) {
    return { category: 'logic', subcategory: 'hooks' }
  }

  // Hooks directory .ts files (non-use* pattern, like types)
  if (filePath.startsWith('src/hooks/') && filePath.endsWith('.ts')) {
    return { category: 'logic', subcategory: 'hooks' }
  }

  // React components (.tsx files)
  if (filePath.endsWith('.tsx')) {
    return { category: 'ui', subcategory: 'components' }
  }

  // Default for remaining .ts files
  if (filePath.endsWith('.ts')) {
    return { category: 'logic', subcategory: 'utilities' }
  }

  return null
}

/**
 * Aggregates categorized file results into summary statistics
 * @param {Array<{path: string, lines: number, category: string, subcategory: string}>} files
 * @returns {{ totals: object, subcategories: object, percentages: object }}
 */
export function aggregateResults(files) {
  const totals = { ui: 0, logic: 0, test: 0, total: 0 }
  const subcategories = { ui: {}, logic: {}, test: {} }

  for (const file of files) {
    const { category, subcategory, lines } = file

    // Update category total
    totals[category] = (totals[category] || 0) + lines
    totals.total += lines

    // Update subcategory
    if (!subcategories[category]) {
      subcategories[category] = {}
    }
    subcategories[category][subcategory] = (subcategories[category][subcategory] || 0) + lines
  }

  // Calculate percentages
  const percentages = {
    ui: totals.total > 0 ? Math.round((totals.ui / totals.total) * 100) : 0,
    logic: totals.total > 0 ? Math.round((totals.logic / totals.total) * 100) : 0,
    test: totals.total > 0 ? Math.round((totals.test / totals.total) * 100) : 0,
  }

  return { totals, subcategories, percentages }
}

// ============================================================================
// CLI Implementation (only runs when executed directly)
// ============================================================================

/**
 * Recursively walks a directory and returns all file paths
 * @param {string} dir - Directory to walk
 * @param {string[]} [files=[]] - Accumulator for file paths
 * @returns {string[]}
 */
function walkDir(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkDir(fullPath, files)
    } else {
      files.push(fullPath)
    }
  }
  return files
}

/**
 * Counts lines in a file
 * @param {string} filePath - Absolute path to file
 * @returns {number}
 */
function countLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  return content.split('\n').length
}

/**
 * Formats a number with thousands separators
 * @param {number} num
 * @returns {string}
 */
function formatNumber(num) {
  return num.toLocaleString()
}

/**
 * Creates a bar visualization
 * @param {number} percentage
 * @param {number} width
 * @returns {string}
 */
function createBar(percentage, width = 20) {
  const filled = Math.round((percentage / 100) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

/**
 * Prints formatted results to console
 * @param {{ totals: object, subcategories: object, percentages: object }} results
 * @param {Array<{path: string, lines: number, category: string, subcategory: string}>} files
 */
function printResults(results, files) {
  const { totals, subcategories, percentages } = results

  console.log('\n' + '='.repeat(60))
  console.log('  LINE COUNT REPORT')
  console.log('='.repeat(60))

  // Summary
  console.log('\n📊 SUMMARY\n')
  console.log(`  Total Lines: ${formatNumber(totals.total)}`)
  console.log('')

  const categories = [
    { name: 'UI', key: 'ui', emoji: '🎨' },
    { name: 'Logic', key: 'logic', emoji: '⚙️' },
    { name: 'Test', key: 'test', emoji: '🧪' },
  ]

  for (const cat of categories) {
    const lines = totals[cat.key]
    const pct = percentages[cat.key]
    console.log(`  ${cat.emoji} ${cat.name.padEnd(8)} ${formatNumber(lines).padStart(6)} lines  ${createBar(pct)} ${pct}%`)
  }

  // Detailed breakdown
  console.log('\n' + '-'.repeat(60))
  console.log('📋 DETAILED BREAKDOWN\n')

  for (const cat of categories) {
    const subs = subcategories[cat.key]
    if (Object.keys(subs).length === 0) continue

    console.log(`  ${cat.emoji} ${cat.name}:`)

    // Sort subcategories by line count descending
    const sortedSubs = Object.entries(subs).sort((a, b) => b[1] - a[1])

    for (const [subName, lines] of sortedSubs) {
      const subPct = totals.total > 0 ? Math.round((lines / totals.total) * 100) : 0
      console.log(`     ├─ ${subName.padEnd(18)} ${formatNumber(lines).padStart(6)} lines  (${subPct}%)`)
    }
    console.log('')
  }

  // File count by category
  console.log('-'.repeat(60))
  console.log('📁 FILE COUNTS\n')

  const fileCounts = { ui: 0, logic: 0, test: 0 }
  for (const file of files) {
    fileCounts[file.category]++
  }

  for (const cat of categories) {
    console.log(`  ${cat.emoji} ${cat.name.padEnd(8)} ${fileCounts[cat.key].toString().padStart(4)} files`)
  }
  console.log(`  📦 Total    ${files.length.toString().padStart(4)} files`)

  console.log('\n' + '='.repeat(60) + '\n')
}

/**
 * Prints results as JSON
 * @param {{ totals: object, subcategories: object, percentages: object }} results
 * @param {Array<{path: string, lines: number, category: string, subcategory: string}>} files
 */
function printJSON(results, files) {
  console.log(JSON.stringify({
    summary: results,
    files: files.map(f => ({
      path: f.path,
      lines: f.lines,
      category: f.category,
      subcategory: f.subcategory
    }))
  }, null, 2))
}

/**
 * Main entry point
 */
function main() {
  const args = process.argv.slice(2)
  const outputJSON = args.includes('--json')

  // Find project root (parent of scripts/)
  const projectRoot = path.resolve(__dirname, '..')
  const srcDir = path.join(projectRoot, 'src')

  if (!fs.existsSync(srcDir)) {
    console.error('Error: src/ directory not found')
    process.exit(1)
  }

  // Walk directory and collect files
  const allFiles = walkDir(srcDir)

  // Process each file
  const categorizedFiles = []

  for (const absolutePath of allFiles) {
    // Convert to relative path with forward slashes
    const relativePath = path.relative(projectRoot, absolutePath).replace(/\\/g, '/')

    const categorization = categorizeFile(relativePath)
    if (!categorization) continue

    const lines = countLines(absolutePath)
    categorizedFiles.push({
      path: relativePath,
      lines,
      category: categorization.category,
      subcategory: categorization.subcategory,
    })
  }

  // Aggregate results
  const results = aggregateResults(categorizedFiles)

  // Output
  if (outputJSON) {
    printJSON(results, categorizedFiles)
  } else {
    printResults(results, categorizedFiles)
  }
}

// Run if executed directly (not imported)
const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/line-count.js')
if (isMain) {
  main()
}
