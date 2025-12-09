import type { RecentFile } from '../../hooks/useRecentFiles'

/**
 * Props for the WelcomeScreen component
 */
export interface WelcomeScreenProps {
  /** Called when user clicks New File */
  onCreateFile: () => void
  /** Called when user clicks a recent file */
  onOpenFile: (path: string) => void
  /** Called when user clicks Open REPL */
  onOpenRepl: () => void
  /** Called when user clicks Clear Recent Files */
  onClearRecentFiles: () => void
  /** List of recent files */
  recentFiles: RecentFile[]
  /** Optional additional className */
  className?: string
}
