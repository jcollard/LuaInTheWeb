/**
 * cp command - copy files and directories.
 */

import type { Command, CommandResult, IFileSystem } from '../types'
import { resolvePath, joinPath, getBasename } from '../pathUtils'

/**
 * Recursively copy a directory and its contents.
 */
function copyDirectory(srcPath: string, destPath: string, fs: IFileSystem): void {
  // Create the destination directory
  fs.createDirectory(destPath)

  // List and copy contents
  const entries = fs.listDirectory(srcPath)
  for (const entry of entries) {
    const srcEntryPath = joinPath(srcPath, entry.name)
    const destEntryPath = joinPath(destPath, entry.name)

    if (entry.type === 'directory') {
      copyDirectory(srcEntryPath, destEntryPath, fs)
    } else {
      const content = fs.readFile(srcEntryPath)
      fs.writeFile(destEntryPath, content)
    }
  }
}

/**
 * Copy a single source to a destination.
 * Returns error result if directory without recursive flag, null on success.
 */
function copySingle(
  resolvedSource: string,
  resolvedDest: string,
  sourcePath: string,
  fs: IFileSystem,
  recursive: boolean
): CommandResult | null {
  // Check if source is a directory
  if (fs.isDirectory(resolvedSource)) {
    if (!recursive) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `cp: -r not specified; omitting directory '${sourcePath}'`,
      }
    }
    copyDirectory(resolvedSource, resolvedDest, fs)
    return null // success, continue
  }

  // Source is a file
  const content = fs.readFile(resolvedSource)

  // Check if destination is a directory
  let finalDest = resolvedDest
  if (fs.exists(resolvedDest) && fs.isDirectory(resolvedDest)) {
    // Copy into directory with same name
    const basename = getBasename(sourcePath)
    finalDest = joinPath(resolvedDest, basename)
  }

  fs.writeFile(finalDest, content)
  return null // success
}

/**
 * cp command implementation.
 * Copies files and directories.
 * Requires -r flag for copying directories (like bash).
 */
export const cp: Command = {
  name: 'cp',
  description: 'Copy files and directories',
  usage: 'cp [-r] <source>... <destination>',

  execute(args: string[], fs: IFileSystem): CommandResult {
    // Parse -r flag
    const recursive = args.includes('-r')
    const paths = args.filter((arg) => arg !== '-r')

    // Check for required arguments
    if (paths.length === 0) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: 'cp: missing file operand',
      }
    }

    if (paths.length === 1) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `cp: missing destination file operand after '${paths[0]}'`,
      }
    }

    const currentDir = fs.getCurrentDirectory()

    // Handle multiple sources (Unix-style: cp source1 source2 ... destdir)
    if (paths.length > 2) {
      const sources = paths.slice(0, -1)
      const destPath = paths[paths.length - 1]
      const resolvedDest = resolvePath(currentDir, destPath)

      // Destination must exist and be a directory
      if (!fs.exists(resolvedDest)) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: `cp: target '${resolvedDest}': No such file or directory`,
        }
      }

      if (!fs.isDirectory(resolvedDest)) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: `cp: target '${destPath}' is not a directory`,
        }
      }

      try {
        for (const sourcePath of sources) {
          const resolvedSource = resolvePath(currentDir, sourcePath)

          if (!fs.exists(resolvedSource)) {
            return {
              exitCode: 1,
              stdout: '',
              stderr: `cp: cannot stat '${resolvedSource}': No such file or directory`,
            }
          }

          const basename = getBasename(sourcePath)
          const finalDest = joinPath(resolvedDest, basename)

          const error = copySingle(resolvedSource, finalDest, sourcePath, fs, recursive)
          if (error) return error
        }

        return { exitCode: 0, stdout: '', stderr: '' }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { exitCode: 1, stdout: '', stderr: `cp: ${message}` }
      }
    }

    // Standard two-argument case
    const sourcePath = paths[0]
    const destPath = paths[1]
    const resolvedSource = resolvePath(currentDir, sourcePath)
    const resolvedDest = resolvePath(currentDir, destPath)

    // Check if source and destination are the same
    if (resolvedSource === resolvedDest) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `cp: '${sourcePath}' and '${destPath}' are the same file`,
      }
    }

    // Check if source exists
    if (!fs.exists(resolvedSource)) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `cp: cannot stat '${resolvedSource}': No such file or directory`,
      }
    }

    try {
      const error = copySingle(resolvedSource, resolvedDest, sourcePath, fs, recursive)
      if (error) return error
      return { exitCode: 0, stdout: '', stderr: '' }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { exitCode: 1, stdout: '', stderr: `cp: ${message}` }
    }
  },
}
