import type { ActivityPanelType } from '../IDEContext/types'
import type { FileExplorerProps } from '../FileExplorer'

/**
 * Props for the SidebarPanel component
 */
export interface SidebarPanelProps {
  /** Currently active panel type */
  activePanel: ActivityPanelType
  /** Optional additional className */
  className?: string
  /** Props for FileExplorer when explorer panel is active */
  explorerProps?: Omit<FileExplorerProps, 'className'>
}
