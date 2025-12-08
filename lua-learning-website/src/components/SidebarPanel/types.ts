import type { ActivityPanelType } from '../IDEContext/types'

/**
 * Props for the SidebarPanel component
 */
export interface SidebarPanelProps {
  /** Currently active panel type */
  activePanel: ActivityPanelType
  /** Optional additional className */
  className?: string
}
