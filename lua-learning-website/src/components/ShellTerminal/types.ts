import type { UseFileSystemReturn } from '../../hooks/useFileSystem'

/**
 * Props for ShellTerminal component
 */
export interface ShellTerminalProps {
  /** Filesystem from useFileSystem hook */
  fileSystem: UseFileSystemReturn
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
