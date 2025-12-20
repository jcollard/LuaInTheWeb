import type { UseShellFileSystem, ShellCanvasCallbacks } from '../../hooks/useShell'
import type { ShellTerminalHandle } from '../ShellTerminal'

// Re-export for convenience
export type { ShellTerminalHandle }

/**
 * Props for the BottomPanel component
 */
export interface BottomPanelProps {
  /** File system for shell integration - either IFileSystem or UseFileSystemReturn */
  fileSystem: UseShellFileSystem
  /** Optional additional className */
  className?: string
  /** Callback when shell command modifies filesystem (for refreshing file tree) */
  onFileSystemChange?: () => void
  /** Canvas callbacks for canvas.start()/stop() support */
  canvasCallbacks?: ShellCanvasCallbacks
  /** Callback when a file/directory is moved/renamed via mv command (for updating tabs) */
  onFileMove?: (oldPath: string, newPath: string, isDirectory: boolean) => void
  /** Callback when the 'open' command requests to open a file in the editor */
  onRequestOpenFile?: (filePath: string) => void
  /** When true, the panel is visible and the shell terminal should receive focus when becoming visible */
  visible?: boolean
}
