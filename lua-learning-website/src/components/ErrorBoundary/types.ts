/**
 * Types for ErrorBoundary component and related hooks.
 */

import type { ReactNode, ErrorInfo } from 'react'
import type { ExportProgress } from '../../utils/dataExporter'

/**
 * Props for ErrorBoundary component.
 */
export interface ErrorBoundaryProps {
  children: ReactNode
  /** Optional fallback UI when not using default recovery dialog */
  fallback?: ReactNode
}

/**
 * State for ErrorBoundary component.
 */
export interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Return type for useErrorRecovery hook.
 */
export interface UseErrorRecoveryReturn {
  /** Whether error details are visible */
  showDetails: boolean
  /** Toggle error details visibility */
  toggleDetails: () => void
  /** Whether export is in progress */
  isExporting: boolean
  /** Export progress information */
  exportProgress: ExportProgress | null
  /** Reload the page */
  handleReload: () => void
  /** Export data as backup (does not clear cache) */
  handleExport: () => Promise<void>
  /** Clear cache and reload (does not export) */
  handleReset: () => Promise<void>
}

/**
 * Props for ErrorRecoveryDialog component.
 */
export interface ErrorRecoveryDialogProps {
  /** The error that occurred */
  error: Error
  /** Component stack trace */
  componentStack: string | null
  /** Called when user clicks reload */
  onReload: () => void
  /** Called when user wants to reset cache (without export) */
  onResetCache: () => void | Promise<void>
  /** Called to export data before reset (optional) */
  onExportData?: () => void | Promise<void>
}

/**
 * Props for ResetCacheDialog component.
 */
export interface ResetCacheDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Called when dialog should close */
  onClose: () => void
  /** Called with selected items to clear */
  onConfirm: (downloadFirst: boolean) => Promise<void>
  /** Whether export is in progress */
  isExporting: boolean
  /** Export progress */
  exportProgress: ExportProgress | null
}
