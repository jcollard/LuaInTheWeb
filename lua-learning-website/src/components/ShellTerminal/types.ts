import type { UseShellFileSystem } from '../../hooks/useShell'

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
}

/**
 * Shell output line type
 */
export interface ShellOutputLine {
  id: string
  type: 'command' | 'output' | 'error'
  text: string
}
