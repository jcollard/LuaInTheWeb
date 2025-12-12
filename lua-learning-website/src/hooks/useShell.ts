import { useState, useCallback, useMemo } from 'react'
import {
  CommandRegistry,
  createFileSystemAdapter,
  registerBuiltinCommands,
  parseCommand,
  getPathCompletions,
  type IFileSystem,
  type ExternalFileSystem,
  type CommandResult,
  type FileEntry,
} from '@lua-learning/shell-core'
import type { UseFileSystemReturn } from './useFileSystem'

/**
 * Extended command result that includes the current working directory
 */
export interface ShellCommandResult extends CommandResult {
  /** Current working directory after command execution */
  cwd: string
}

/**
 * Shell hook return type
 */
export interface UseShellReturn {
  /** Execute a command string, returns result with current cwd */
  executeCommand: (input: string) => ShellCommandResult
  /** Current working directory */
  cwd: string
  /** Command history */
  history: string[]
  /** Clear history */
  clearHistory: () => void
  /** Available command names for tab completion */
  commandNames: string[]
  /** Get path completions for tab completion */
  getPathCompletionsForTab: (partialPath: string) => FileEntry[]
}

/**
 * Adapts useFileSystem hook to ExternalFileSystem interface for shell-core
 */
function createExternalFileSystemAdapter(fs: UseFileSystemReturn): ExternalFileSystem {
  return {
    exists: (path: string): boolean => fs.exists(path),
    readFile: (path: string): string | null => fs.readFile(path),
    writeFile: (path: string, content: string): void => fs.writeFile(path, content),
    createFile: (path: string, content?: string): void => fs.createFile(path, content),
    createFolder: (path: string): void => fs.createFolder(path),
    deleteFile: (path: string): void => fs.deleteFile(path),
    deleteFolder: (path: string): void => fs.deleteFolder(path),
    listDirectory: (path: string): string[] => fs.listDirectory(path),
    isDirectory: (path: string): boolean => fs.isDirectory(path),
  }
}

/**
 * Hook that provides shell functionality using shell-core package.
 * Connects to the editor's filesystem via useFileSystem.
 *
 * @param fileSystem - The filesystem from useFileSystem hook
 * @returns Shell interface with command execution
 */
export function useShell(fileSystem: UseFileSystemReturn): UseShellReturn {
  const [history, setHistory] = useState<string[]>([])
  const [cwd, setCwd] = useState('/')

  // Create the filesystem adapter - memoized to avoid recreating on every render
  const shellFileSystem: IFileSystem = useMemo(() => {
    const external = createExternalFileSystemAdapter(fileSystem)
    return createFileSystemAdapter(external, cwd)
  }, [fileSystem, cwd])

  // Create command registry with builtin commands - memoized
  const registry = useMemo(() => {
    const reg = new CommandRegistry()
    registerBuiltinCommands(reg)
    return reg
  }, [])

  const executeCommand = useCallback(
    (input: string): ShellCommandResult => {
      const trimmed = input.trim()
      if (!trimmed) {
        return { exitCode: 0, stdout: '', stderr: '', cwd }
      }

      // Add to history
      setHistory((prev) => [...prev, trimmed])

      // Parse the command
      const parsed = parseCommand(trimmed)
      if (!parsed) {
        return { exitCode: 1, stdout: '', stderr: `Invalid command: ${trimmed}`, cwd }
      }

      // Execute the command
      const result = registry.execute(parsed.command, parsed.args, shellFileSystem)

      // Get the new cwd after command execution
      const newCwd = shellFileSystem.getCurrentDirectory()
      if (newCwd !== cwd) {
        setCwd(newCwd)
      }

      // Return result with the current cwd so caller can update immediately
      return { ...result, cwd: newCwd }
    },
    [registry, shellFileSystem, cwd]
  )

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  // Get command names for tab completion
  const commandNames = useMemo(() => registry.names(), [registry])

  // Get path completions wrapper for tab completion
  const getPathCompletionsForTab = useCallback(
    (partialPath: string): FileEntry[] => {
      return getPathCompletions(partialPath, shellFileSystem)
    },
    [shellFileSystem]
  )

  return {
    executeCommand,
    cwd,
    history,
    clearHistory,
    commandNames,
    getPathCompletionsForTab,
  }
}
