import type { ActivityPanelType } from '../IDEContext/types'

/**
 * Props for the ActivityBar component
 */
export interface ActivityBarProps {
  /** Currently active panel */
  activeItem: ActivityPanelType
  /** Callback when an item is clicked */
  onItemClick: (item: ActivityPanelType) => void
  /** Optional additional className */
  className?: string
}
