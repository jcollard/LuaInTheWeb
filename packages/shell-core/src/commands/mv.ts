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
 * Result of moving a single source to a destination.
 */
interface MoveSingleResult {
  /** The final destination path */
  finalDest: string
  /** Whether the source was a directory */
  isDirectory: boolean
}

/**
 * Move a single source to a destination.
 * Returns information about the move for callback notification.
 */
function moveSingle(
  resolvedSource: string,
  resolvedDest: string,
  sourcePath: string,
  fs: IFileSystem
): MoveSingleResult {
  // Check if source is a directory
  if (fs.isDirectory(resolvedSource)) {
    // Copy directory recursively
    const copiedPaths = copyDirectoryRecursive(resolvedSource, resolvedDest, fs)
    // Delete source after successful copy
    deletePaths(copiedPaths, resolvedSource, fs)
    return { finalDest: resolvedDest, isDirectory: true }
  }

  // Source is a file
  const content = fs.readFile(resolvedSource)

  // Check if destination is a directory
  let finalDest = resolvedDest
  if (fs.exists(resolvedDest) && fs.isDirectory(resolvedDest)) {
    // Move into directory with same name
    const basename = getBasename(sourcePath)
    finalDest = joinPath(resolvedDest, basename)
  }

  // Write to destination
  fs.writeFile(finalDest, content)
  // Delete source
  fs.delete(resolvedSource)
  return { finalDest, isDirectory: false }
}

/**
 * mv command implementation.
 * Moves/renames files and directories.
 */
export const mv: Command = {
  name: 'mv',
  description: 'Move or rename files and directories',
  usage: 'mv <source>... <destination>',

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

    const currentDir = fs.getCurrentDirectory()

    // Handle multiple sources (Unix-style: mv source1 source2 ... destdir)
    if (args.length > 2) {
      const sources = args.slice(0, -1)
      const destPath = args[args.length - 1]
      const resolvedDest = resolvePath(currentDir, destPath)

      // Destination must exist and be a directory
      if (!fs.exists(resolvedDest)) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: `mv: target '${resolvedDest}': No such file or directory`,
        }
      }

      if (!fs.isDirectory(resolvedDest)) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: `mv: target '${destPath}' is not a directory`,
        }
      }

      try {
        // Collect move results for callback notification
        const moveResults: Array<{ source: string; dest: string; isDirectory: boolean }> = []

        for (const sourcePath of sources) {
          const resolvedSource = resolvePath(currentDir, sourcePath)

          if (!fs.exists(resolvedSource)) {
            return {
              exitCode: 1,
              stdout: '',
              stderr: `mv: cannot stat '${resolvedSource}': No such file or directory`,
            }
          }

          const basename = getBasename(sourcePath)
          const finalDest = joinPath(resolvedDest, basename)

          const result = moveSingle(resolvedSource, finalDest, sourcePath, fs)
          moveResults.push({ source: resolvedSource, dest: result.finalDest, isDirectory: result.isDirectory })
        }

        // Notify callback for all successful moves
        if (fs.onFileMove) {
          for (const move of moveResults) {
            fs.onFileMove(move.source, move.dest, move.isDirectory)
          }
        }

        return { exitCode: 0, stdout: '', stderr: '' }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { exitCode: 1, stdout: '', stderr: `mv: ${message}` }
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
        stderr: `mv: '${sourcePath}' and '${destPath}' are the same file`,
      }
    }

    // Check if source exists
    if (!fs.exists(resolvedSource)) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `mv: cannot stat '${resolvedSource}': No such file or directory`,
      }
    }

    try {
      const result = moveSingle(resolvedSource, resolvedDest, sourcePath, fs)
      // Notify callback for successful move
      if (fs.onFileMove) {
        fs.onFileMove(resolvedSource, result.finalDest, result.isDirectory)
      }
      return { exitCode: 0, stdout: '', stderr: '' }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { exitCode: 1, stdout: '', stderr: `mv: ${message}` }
    }
  },
}
