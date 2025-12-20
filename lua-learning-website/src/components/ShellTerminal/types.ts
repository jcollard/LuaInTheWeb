import type { UseShellFileSystem, ShellCanvasCallbacks } from '../../hooks/useShell'

/**
 * Props for ShellTerminal component
 */
export interface ShellTerminalProps {
  /** Filesystem - either IFileSystem (e.g., CompositeFileSystem) or UseFileSystemReturn */
  fileSystem: UseShellFileSystem
  /** When true, hides the header for embedded context */
  embedded?: boolean
  /** Optional class name */
  className?: string
  /** Callback when shell command modifies filesystem (for refreshing file tree) */
  onFileSystemChange?: () => void
  /** Canvas callbacks for canvas.start()/stop() support */
  canvasCallbacks?: ShellCanvasCallbacks
  /** Callback when a file/directory is moved/renamed via mv command (for updating tabs) */
  onFileMove?: (oldPath: string, newPath: string, isDirectory: boolean) => void
  /** Callback when the 'open' command requests to open a file in the editor */
  onRequestOpenFile?: (filePath: string) => void
  /** When true, the terminal is visible and should receive focus when becoming visible */
  visible?: boolean
}

/**
 * Shell output line type
 */
export interface ShellOutputLine {
  id: string
  type: 'command' | 'output' | 'error'
  text: string
}

/**
 * Imperative handle for ShellTerminal component.
 * Allows parent components to execute commands in the shell.
 */
export interface ShellTerminalHandle {
  /** Execute a command in the shell as if the user typed it */
  executeCommand: (command: string) => void
}
