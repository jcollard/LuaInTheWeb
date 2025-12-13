import type { UseShellFileSystem } from '../../hooks/useShell'

/**
 * Props for the BottomPanel component
 */
export interface BottomPanelProps {
  /** File system for shell integration - either IFileSystem or UseFileSystemReturn */
  fileSystem: UseShellFileSystem
  /** Optional additional className */
  className?: string
}
