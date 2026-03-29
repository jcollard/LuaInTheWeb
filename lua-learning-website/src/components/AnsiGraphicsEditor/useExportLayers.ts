import { useCallback, useState } from 'react'
import type { Layer } from './types'
import type { ImportEntry } from './layerImport'
import { buildImportEntries } from './layerImport'
import { buildExportLayers, filterExportTags } from './layerExport'
import { serializeLayers } from './serialization'
import type { FileSystemLike } from './useAnsiEditorFile'

export interface UseExportLayersOptions {
  layers: Layer[]
  availableTags: string[] | undefined
  fileSystem: FileSystemLike
  refreshFileTree: () => void
  filePath?: string
}

export interface UseExportLayersReturn {
  isExportDialogOpen: boolean
  exportEntries: ImportEntry[]
  defaultExportFileName: string
  defaultExportFolderPath: string
  checkFileExists: (path: string) => boolean
  handleExportLayersClick: () => void
  handleExportConfirm: (selectedIds: Set<string>, flattenToRoot: boolean, includeEmptyGroups: boolean, folderPath: string, fileName: string) => Promise<void>
  handleExportCancel: () => void
}

function deriveExportFileName(filePath: string | undefined): string {
  if (!filePath || filePath.startsWith('ansi-editor://')) return 'export.ansi.lua'
  const base = filePath.split('/').pop() ?? 'export'
  const stem = base.replace(/\.ansi\.lua$/, '')
  return `${stem}-export.ansi.lua`
}

function deriveExportFolderPath(filePath: string | undefined): string {
  if (!filePath || filePath.startsWith('ansi-editor://')) return '/'
  const lastSlash = filePath.lastIndexOf('/')
  if (lastSlash <= 0) return '/'
  return filePath.substring(0, lastSlash)
}

export function useExportLayers({
  layers,
  availableTags,
  fileSystem,
  refreshFileTree,
  filePath,
}: UseExportLayersOptions): UseExportLayersReturn {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [exportEntries, setExportEntries] = useState<ImportEntry[]>([])

  const defaultExportFileName = deriveExportFileName(filePath)
  const defaultExportFolderPath = deriveExportFolderPath(filePath)

  const checkFileExists = useCallback((path: string) => fileSystem.exists(path), [fileSystem])

  const handleExportLayersClick = useCallback(() => {
    setExportEntries(buildImportEntries(layers))
    setIsExportDialogOpen(true)
  }, [layers])

  const handleExportConfirm = useCallback(async (
    selectedIds: Set<string>,
    flattenToRoot: boolean,
    includeEmptyGroups: boolean,
    folderPath: string,
    fileName: string,
  ) => {
    const { layers: exportLayers } = buildExportLayers(selectedIds, layers, flattenToRoot, { includeEmptyGroups })
    if (exportLayers.length === 0) return

    const filteredTags = filterExportTags(exportLayers, availableTags)
    const activeLayerId = exportLayers[0].id
    const content = serializeLayers({ layers: exportLayers, activeLayerId }, filteredTags)

    const fullPath = folderPath === '/' ? `/${fileName}` : `${folderPath}/${fileName}`

    fileSystem.createFile(fullPath, content)
    await fileSystem.flush()
    refreshFileTree()
    setIsExportDialogOpen(false)
  }, [layers, availableTags, fileSystem, refreshFileTree])

  const handleExportCancel = useCallback(() => {
    setIsExportDialogOpen(false)
  }, [])

  return {
    isExportDialogOpen,
    exportEntries,
    defaultExportFileName,
    defaultExportFolderPath,
    checkFileExists,
    handleExportLayersClick,
    handleExportConfirm,
    handleExportCancel,
  }
}
