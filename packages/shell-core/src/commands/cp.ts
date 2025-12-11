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
 * cp command implementation.
 * Copies files and directories.
 */
export const cp: Command = {
  name: 'cp',
  description: 'Copy files and directories',
  usage: 'cp <source> <destination>',

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

    const sourcePath = args[0]
    const destPath = args[1]
    const currentDir = fs.getCurrentDirectory()
    const resolvedSource = resolvePath(currentDir, sourcePath)
    const resolvedDest = resolvePath(currentDir, destPath)

    // Check if source exists
    if (!fs.exists(resolvedSource)) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `cp: cannot stat '${resolvedSource}': No such file or directory`,
      }
    }

    try {
      // Check if source is a directory
      if (fs.isDirectory(resolvedSource)) {
        copyDirectory(resolvedSource, resolvedDest, fs)
        return {
          exitCode: 0,
          stdout: '',
          stderr: '',
        }
      }

      // Source is a file
      const content = fs.readFile(resolvedSource)

      // Check if destination is a directory
      let finalDest = resolvedDest
      if (fs.exists(resolvedDest) && fs.isDirectory(resolvedDest)) {
        // Copy into directory with same name
        const basename = getBasename(resolvedSource)
        finalDest = joinPath(resolvedDest, basename)
      }

      fs.writeFile(finalDest, content)

      return {
        exitCode: 0,
        stdout: '',
        stderr: '',
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        exitCode: 1,
        stdout: '',
        stderr: `cp: ${message}`,
      }
    }
  },
}
