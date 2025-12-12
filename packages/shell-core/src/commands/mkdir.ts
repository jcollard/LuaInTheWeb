/**
 * mkdir command - create directory.
 */

import type { Command, CommandResult, IFileSystem } from '../types'
import { resolvePath } from '../pathUtils'

/**
 * Get all path segments leading to a path.
 * E.g., '/a/b/c' returns ['/a', '/a/b', '/a/b/c']
 */
function getPathSegments(path: string): string[] {
  const segments: string[] = []
  const parts = path.split('/').filter((p) => p !== '')

  let current = ''
  for (const part of parts) {
    current = current + '/' + part
    segments.push(current)
  }

  return segments
}

/**
 * Create directory and all parent directories as needed.
 */
function createWithParents(resolvedPath: string, fs: IFileSystem): void {
  const segments = getPathSegments(resolvedPath)

  for (const segment of segments) {
    // Skip if already exists as a directory
    if (fs.exists(segment) && fs.isDirectory(segment)) {
      continue
    }
    fs.createDirectory(segment)
  }
}

/**
 * mkdir command implementation.
 * Creates directories at the specified paths.
 * Supports -p flag to create parent directories.
 */
export const mkdir: Command = {
  name: 'mkdir',
  description: 'Create directories',
  usage: 'mkdir [-p] <directory>...',

  execute(args: string[], fs: IFileSystem): CommandResult {
    // Parse -p flag
    const createParents = args.includes('-p')
    const paths = args.filter((arg) => arg !== '-p')

    // Check for required argument
    if (paths.length === 0) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: 'mkdir: missing operand',
      }
    }

    const currentDir = fs.getCurrentDirectory()
    const errors: string[] = []

    // Create all directories, collecting errors
    for (const targetPath of paths) {
      const resolvedPath = resolvePath(currentDir, targetPath)

      try {
        if (createParents) {
          createWithParents(resolvedPath, fs)
        } else {
          fs.createDirectory(resolvedPath)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push(`mkdir: cannot create directory '${resolvedPath}': ${message}`)
      }
    }

    if (errors.length > 0) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: errors.join('\n'),
      }
    }

    return {
      exitCode: 0,
      stdout: '',
      stderr: '',
    }
  },
}
