/**
 * Wrapper component that provides hooks functionality to class component.
 *
 * This is a separate file to comply with react-refresh rules.
 */

import React from 'react'
import { ErrorRecoveryDialog } from './ErrorRecoveryDialog'

interface ErrorRecoveryDialogWrapperProps {
  error: Error
  componentStack: string | null
}

/**
 * Wrapper component that provides hooks functionality to class component.
 */
export function ErrorRecoveryDialogWrapper({
  error,
  componentStack,
}: ErrorRecoveryDialogWrapperProps) {
  // Import handlers inline to avoid circular dependency issues
  const { handleReload, handleExportData, handleResetCache } = React.useMemo(() => ({
    handleReload: () => window.location.reload(),

    handleExportData: async () => {
      // Dynamic import to avoid loading these modules until needed
      const { exportAllData, triggerDownload } = await import('../../utils/dataExporter')

      try {
        const blob = await exportAllData()
        const date = new Date().toISOString().split('T')[0]
        triggerDownload(`backup-${date}.zip`, blob)
      } catch (e) {
        console.error('Failed to export data:', e)
      }
    },

    handleResetCache: async () => {
      const { clearAllCache } = await import('../../utils/cacheManager')

      try {
        await clearAllCache()
      } catch (e) {
        console.error('Failed to clear cache:', e)
      }

      window.location.reload()
    },
  }), [])

  return (
    <ErrorRecoveryDialog
      error={error}
      componentStack={componentStack}
      onReload={handleReload}
      onExportData={handleExportData}
      onResetCache={handleResetCache}
    />
  )
}
