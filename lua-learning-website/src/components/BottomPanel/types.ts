import type { UseFileSystemReturn } from '../../hooks/useFileSystem'

/**
 * Props for the BottomPanel component
 */
export interface BottomPanelProps {
  /** File system for shell integration */
  fileSystem: UseFileSystemReturn
  /** Optional additional className */
  className?: string
}
