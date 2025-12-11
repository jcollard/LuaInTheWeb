/**
 * mv command - move/rename files and directories.
 */

import type { Command, CommandResult, IFileSystem } from '../types'
import { resolvePath, joinPath, getBasename } from '../pathUtils'

/**
 * Recursively copy a directory and its contents.
 * Returns list of paths copied for later deletion.
 */
function copyDirectoryRecursive(
  srcPath: string,
  destPath: string,
  fs: IFileSystem
): string[] {
  const copiedPaths: string[] = []

  // Create the destination directory
  fs.createDirectory(destPath)

  // List and copy contents
  const entries = fs.listDirectory(srcPath)
  for (const entry of entries) {
    const srcEntryPath = joinPath(srcPath, entry.name)
    const destEntryPath = joinPath(destPath, entry.name)

    if (entry.type === 'directory') {
      const subPaths = copyDirectoryRecursive(srcEntryPath, destEntryPath, fs)
      copiedPaths.push(...subPaths)
      copiedPaths.push(srcEntryPath) // Add directory after its contents
    } else {
      const content = fs.readFile(srcEntryPath)
      fs.writeFile(destEntryPath, content)
      copiedPaths.push(srcEntryPath)
    }
  }

  return copiedPaths
}

/**
 * Delete paths in order (files first, then directories from deepest to shallowest).
 */
function deletePaths(paths: string[], rootPath: string, fs: IFileSystem): void {
  // Delete in order (files and subdirs first, root last)
  for (const path of paths) {
    fs.delete(path)
  }
  // Delete the root directory
  fs.delete(rootPath)
}

/**
 * mv command implementation.
 * Moves/renames files and directories.
 */
export const mv: Command = {
  name: 'mv',
  description: 'Move or rename files and directories',
  usage: 'mv <source> <destination>',

  execute(args: string[], fs: IFileSystem): CommandResult {
    // Check for required arguments
    if (args.length === 0) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: 'mv: missing file operand',
      }
    }

    if (args.length === 1) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `mv: missing destination file operand after '${args[0]}'`,
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
        stderr: `mv: cannot stat '${resolvedSource}': No such file or directory`,
      }
    }

    try {
      // Check if source is a directory
      if (fs.isDirectory(resolvedSource)) {
        // Copy directory recursively
        const copiedPaths = copyDirectoryRecursive(resolvedSource, resolvedDest, fs)
        // Delete source after successful copy
        deletePaths(copiedPaths, resolvedSource, fs)
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
        // Move into directory with same name
        const basename = getBasename(resolvedSource)
        finalDest = joinPath(resolvedDest, basename)
      }

      // Write to destination
      fs.writeFile(finalDest, content)
      // Delete source
      fs.delete(resolvedSource)

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
        stderr: `mv: ${message}`,
      }
    }
  },
}
