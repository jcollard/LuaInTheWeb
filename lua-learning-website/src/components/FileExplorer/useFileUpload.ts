import { useRef, useCallback } from 'react'

export interface UseFileUploadReturn {
  /** Ref to attach to the hidden file input element */
  fileInputRef: React.RefObject<HTMLInputElement | null>
  /** Trigger the file upload dialog for a specific target folder */
  triggerUpload: (targetPath: string) => void
  /** Handle file selection from the input element */
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void
  /** Ref to attach to the hidden folder input element (only present if onFolderSelected provided) */
  folderInputRef?: React.RefObject<HTMLInputElement | null>
  /** Trigger the folder upload dialog for a specific target folder */
  triggerFolderUpload?: (targetPath: string) => void
  /** Handle folder selection from the input element */
  handleFolderSelect?: (event: React.ChangeEvent<HTMLInputElement>) => void
}

interface UseFileUploadParams {
  /** Callback when files are selected */
  onFilesSelected: (files: FileList, targetPath: string) => void
  /** Callback when folder is selected (enables folder upload functionality) */
  onFolderSelected?: (files: FileList, targetPath: string) => void
}

/**
 * Hook to manage file and folder upload via hidden input elements.
 * Handles the flow: trigger -> select files/folder -> callback with target path.
 */
export function useFileUpload({
  onFilesSelected,
  onFolderSelected,
}: UseFileUploadParams): UseFileUploadReturn {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const folderInputRef = useRef<HTMLInputElement | null>(null)
  const uploadTargetPathRef = useRef<string | null>(null)
  const folderTargetPathRef = useRef<string | null>(null)

  const triggerUpload = useCallback((targetPath: string) => {
    uploadTargetPathRef.current = targetPath
    fileInputRef.current?.click()
  }, [])

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      const targetPath = uploadTargetPathRef.current

      if (files && files.length > 0 && targetPath) {
        onFilesSelected(files, targetPath)
      }

      // Reset input to allow selecting same file again
      event.target.value = ''
      uploadTargetPathRef.current = null
    },
    [onFilesSelected]
  )

  const triggerFolderUpload = useCallback((targetPath: string) => {
    folderTargetPathRef.current = targetPath
    folderInputRef.current?.click()
  }, [])

  const handleFolderSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      const targetPath = folderTargetPathRef.current

      if (files && files.length > 0 && targetPath && onFolderSelected) {
        onFolderSelected(files, targetPath)
      }

      // Reset input to allow selecting same folder again
      event.target.value = ''
      folderTargetPathRef.current = null
    },
    [onFolderSelected]
  )

  // Only expose folder methods if onFolderSelected is provided
  if (onFolderSelected) {
    return {
      fileInputRef,
      triggerUpload,
      handleFileSelect,
      folderInputRef,
      triggerFolderUpload,
      handleFolderSelect,
    }
  }

  return {
    fileInputRef,
    triggerUpload,
    handleFileSelect,
  }
}
