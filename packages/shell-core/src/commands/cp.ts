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
 */
function copySingle(
  resolvedSource: string,
  resolvedDest: string,
  sourcePath: string,
  fs: IFileSystem
): CommandResult | null {
  // Check if source is a directory
  if (fs.isDirectory(resolvedSource)) {
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
 */
export const cp: Command = {
  name: 'cp',
  description: 'Copy files and directories',
  usage: 'cp <source>... <destination>',

  execute(args: string[], fs: IFileSystem): CommandResult {
    // Check for required arguments
    if (args.length === 0) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: 'cp: missing file operand',
      }
    }

    if (args.length === 1) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `cp: missing destination file operand after '${args[0]}'`,
      }
    }

    const currentDir = fs.getCurrentDirectory()

    // Handle multiple sources (Unix-style: cp source1 source2 ... destdir)
    if (args.length > 2) {
      const sources = args.slice(0, -1)
      const destPath = args[args.length - 1]
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

          copySingle(resolvedSource, finalDest, sourcePath, fs)
        }

        return { exitCode: 0, stdout: '', stderr: '' }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { exitCode: 1, stdout: '', stderr: `cp: ${message}` }
      }
    }

    // Standard two-argument case
    const sourcePath = args[0]
    const destPath = args[1]
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
      copySingle(resolvedSource, resolvedDest, sourcePath, fs)
      return { exitCode: 0, stdout: '', stderr: '' }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { exitCode: 1, stdout: '', stderr: `cp: ${message}` }
    }
  },
}
