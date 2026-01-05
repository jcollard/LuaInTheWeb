/**
 * Hook for error recovery functionality.
 *
 * Provides state and handlers for the error recovery dialog,
 * including export and cache reset functionality.
 */

import { useState, useCallback } from 'react'
import { exportAllData, triggerDownload } from '../../utils/dataExporter'
import type { ExportProgress } from '../../utils/dataExporter'
import { clearAllCache } from '../../utils/cacheManager'
import type { UseErrorRecoveryReturn } from './types'

/**
 * Generate a backup filename with current date.
 */
function generateBackupFilename(): string {
  const date = new Date().toISOString().split('T')[0]
  return `backup-${date}.zip`
}

/**
 * Hook for error recovery functionality.
 *
 * @returns Recovery state and handlers
 */
export function useErrorRecovery(): UseErrorRecoveryReturn {
  const [showDetails, setShowDetails] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)

  const toggleDetails = useCallback(() => {
    setShowDetails((prev) => !prev)
  }, [])

  const handleReload = useCallback(() => {
    window.location.reload()
  }, [])

  const handleExportAndReset = useCallback(async () => {
    setIsExporting(true)
    setExportProgress(null)

    try {
      // Export all data
      const blob = await exportAllData({
        onProgress: (progress) => {
          setExportProgress(progress)
        },
      })

      // Trigger download
      triggerDownload(generateBackupFilename(), blob)
    } catch (error) {
      console.error('Failed to export data:', error)
    }

    // Clear cache regardless of export success
    try {
      await clearAllCache()
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }

    setIsExporting(false)

    // Reload page
    window.location.reload()
  }, [])

  return {
    showDetails,
    toggleDetails,
    isExporting,
    exportProgress,
    handleReload,
    handleExportAndReset,
  }
}
