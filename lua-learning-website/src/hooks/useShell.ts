import { useState, useCallback, useMemo, useEffect } from 'react'
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
  type IProcess,
  type ShellContext,
} from '@lua-learning/shell-core'
import { LuaCommand } from '@lua-learning/lua-runtime'
import type { UseFileSystemReturn } from './useFileSystem'

/**
 * Extended command result that includes the current working directory
 */
export interface ShellCommandResult extends CommandResult {
  /** Current working directory after command execution */
  cwd: string
}

/**
 * Result of executing a command that may return a process
 */
export interface ExecuteCommandWithContextResult {
  /** The process if the command returns one */
  process?: IProcess
  /** Command result for non-process commands */
  result?: ShellCommandResult
  /** Current working directory after command */
  cwd: string
}

/**
 * Shell hook return type
 */
export interface UseShellReturn {
  /** Execute a command string, returns result with current cwd */
  executeCommand: (input: string) => ShellCommandResult
  /** Execute a command that may return an IProcess */
  executeCommandWithContext: (input: string, outputHandler: (text: string) => void, errorHandler: (text: string) => void) => ExecuteCommandWithContextResult
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
 * Input type for useShell - accepts either IFileSystem directly or UseFileSystemReturn
 */
export type UseShellFileSystem = IFileSystem | UseFileSystemReturn

/**
 * Canvas callbacks for shell-to-UI communication
 */
export interface ShellCanvasCallbacks {
  /** Request a canvas tab to be opened, returns the canvas element when ready */
  onRequestCanvasTab: (canvasId: string) => Promise<HTMLCanvasElement>
  /** Request a canvas tab to be closed */
  onCloseCanvasTab: (canvasId: string) => void
}

/**
 * Options for useShell hook
 */
export interface UseShellOptions {
  /** Canvas callbacks for canvas.start()/stop() integration */
  canvasCallbacks?: ShellCanvasCallbacks
  /** Callback invoked when a file or directory is moved/renamed via mv command */
  onFileMove?: (oldPath: string, newPath: string, isDirectory: boolean) => void
  /** Callback invoked when the 'open' command requests to open a file in the editor */
  onRequestOpenFile?: (filePath: string) => void
}

/**
 * Type guard to check if the input is an IFileSystem (has setCurrentDirectory).
 * UseFileSystemReturn doesn't have this method.
 */
function isIFileSystem(fs: UseShellFileSystem): fs is IFileSystem {
  return 'setCurrentDirectory' in fs && typeof fs.setCurrentDirectory === 'function'
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
 * Helper to flush pending filesystem operations if supported.
 * FileSystemAccessAPIFileSystem uses write-behind caching and requires flush().
 */
function flushIfSupported(fs: IFileSystem): void {
  const flushable = fs as IFileSystem & { flush?: () => Promise<void> }
  if (typeof flushable.flush === 'function') {
    // Fire and forget - flush happens async
    flushable.flush()
  }
}

/**
 * Hook that provides shell functionality using shell-core package.
 * Accepts either an IFileSystem directly (e.g., CompositeFileSystem from useWorkspaceManager)
 * or a UseFileSystemReturn from the useFileSystem hook.
 *
 * @param fileSystem - Either IFileSystem or UseFileSystemReturn
 * @param options - Optional configuration including canvas callbacks
 * @returns Shell interface with command execution
 */
export function useShell(fileSystem: UseShellFileSystem, options?: UseShellOptions): UseShellReturn {
  const [history, setHistory] = useState<string[]>([])
  // Initialize cwd from IFileSystem's current directory if available, otherwise start at root
  const [cwd, setCwd] = useState(() => {
    if (isIFileSystem(fileSystem)) {
      return fileSystem.getCurrentDirectory()
    }
    return '/'
  })

  // Create the filesystem - either use IFileSystem directly or adapt UseFileSystemReturn
  const shellFileSystem: IFileSystem = useMemo(() => {
    if (isIFileSystem(fileSystem)) {
      // Already an IFileSystem (e.g., CompositeFileSystem) - use directly
      // Initialize cwd from the filesystem's current directory
      return fileSystem
    } else {
      // Need to adapt UseFileSystemReturn to IFileSystem
      const external = createExternalFileSystemAdapter(fileSystem)
      return createFileSystemAdapter(external, cwd)
    }
  }, [fileSystem, cwd])

  // Wire up the onFileMove callback to the filesystem
  // This allows external code (like IDEContext) to be notified when files are moved
  useEffect(() => {
    if (options?.onFileMove) {
      shellFileSystem.onFileMove = options.onFileMove
    } else {
      shellFileSystem.onFileMove = undefined
    }
    // Cleanup on unmount or when callback changes
    return () => {
      shellFileSystem.onFileMove = undefined
    }
  }, [shellFileSystem, options?.onFileMove])

  // Create command registry with builtin commands and LuaCommand - memoized
  const registry = useMemo(() => {
    const reg = new CommandRegistry()
    registerBuiltinCommands(reg)
    // Register Lua command for REPL and script execution
    reg.registerICommand(new LuaCommand())
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

      // Flush any pending filesystem operations (for local folder workspaces)
      flushIfSupported(shellFileSystem)

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

  // Execute command that may return an IProcess
  const executeCommandWithContext = useCallback(
    (
      input: string,
      outputHandler: (text: string) => void,
      errorHandler: (text: string) => void
    ): ExecuteCommandWithContextResult => {
      const trimmed = input.trim()
      if (!trimmed) {
        return { cwd }
      }

      // Add to history
      setHistory((prev) => [...prev, trimmed])

      // Parse the command
      const parsed = parseCommand(trimmed)
      if (!parsed) {
        errorHandler(`Invalid command: ${trimmed}`)
        return { cwd }
      }

      // Create shell context
      const context: ShellContext = {
        cwd: shellFileSystem.getCurrentDirectory(),
        filesystem: shellFileSystem,
        output: outputHandler,
        error: errorHandler,
        // Canvas callbacks for canvas.start()/stop() support
        onRequestCanvasTab: options?.canvasCallbacks?.onRequestCanvasTab,
        onCloseCanvasTab: options?.canvasCallbacks?.onCloseCanvasTab,
        // Editor integration callback for 'open' command
        onRequestOpenFile: options?.onRequestOpenFile,
      }

      // Execute the command using the new interface
      const processOrVoid = registry.executeWithContext(parsed.command, parsed.args, context)

      // Flush any pending filesystem operations (for local folder workspaces)
      flushIfSupported(shellFileSystem)

      // Get the new cwd after command execution
      const newCwd = shellFileSystem.getCurrentDirectory()
      if (newCwd !== cwd) {
        setCwd(newCwd)
      }

      // If a process was returned, return it
      if (processOrVoid) {
        return { process: processOrVoid, cwd: newCwd }
      }

      // Otherwise, return just the cwd
      return { cwd: newCwd }
    },
    [registry, shellFileSystem, cwd, options]
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
    executeCommandWithContext,
    cwd,
    history,
    clearHistory,
    commandNames,
    getPathCompletionsForTab,
  }
}
