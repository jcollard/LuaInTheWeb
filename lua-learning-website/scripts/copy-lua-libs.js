#!/usr/bin/env node
/**
 * Copy Lua library files from the lua-runtime package to public/libs.
 *
 * This ensures public/libs contains the canonical Lua library documentation
 * without requiring manual synchronization.
 */

import { copyFileSync, readdirSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SOURCE_DIR = join(__dirname, '..', '..', 'packages', 'lua-runtime', 'src', 'lua')
const DEST_DIR = join(__dirname, '..', 'public', 'libs')

// Ensure destination directory exists
if (!existsSync(DEST_DIR)) {
  mkdirSync(DEST_DIR, { recursive: true })
}

// Find all .lua files in the source directory
const luaFiles = readdirSync(SOURCE_DIR).filter((f) => f.endsWith('.lua'))

if (luaFiles.length === 0) {
  console.log('No .lua files found in', SOURCE_DIR)
  process.exit(0)
}

console.log(`Copying ${luaFiles.length} Lua library files to public/libs...`)

for (const file of luaFiles) {
  const srcPath = join(SOURCE_DIR, file)
  const destPath = join(DEST_DIR, file)
  copyFileSync(srcPath, destPath)
  console.log(`  Copied: ${file}`)
}

console.log('Done!')
