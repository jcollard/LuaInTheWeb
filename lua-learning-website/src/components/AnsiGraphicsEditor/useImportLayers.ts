import { useCallback, useRef, useState } from 'react'
import { buildImportEntries, remapLayers } from './layerImport'
import { isReferenceLayer } from './types'
import type { ImportEntry } from './layerImport'
import type { Layer, LayerState } from './types'

interface ImportDialogState {
  entries: ImportEntry[]
  sourceLayers: LayerState
  warnings: string[]
}

interface UseImportLayersOptions {
  layers: Layer[]
  parseAnsiFile: (file: File) => Promise<LayerState | null>
  importLayersWithUndo: (layers: Layer[]) => void
}

export function useImportLayers({ layers, parseAnsiFile, importLayersWithUndo }: UseImportLayersOptions) {
  const layerFileInputRef = useRef<HTMLInputElement>(null)
  const [importDialogState, setImportDialogState] = useState<ImportDialogState | null>(null)

  const handleImportLayersClick = useCallback(() => {
    layerFileInputRef.current?.click()
  }, [])

  const handleLayerFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const parsed = await parseAnsiFile(file)
    if (!parsed) return

    const entries = buildImportEntries(parsed.layers)
    const existingIds = new Set(layers.map(l => l.id))
    const warnings: string[] = []

    for (const { layer } of entries) {
      if (isReferenceLayer(layer)) {
        const sourceId = layer.sourceLayerId
        const sourceInFile = parsed.layers.some(l => l.id === sourceId)
        if (!sourceInFile && !existingIds.has(sourceId)) {
          warnings.push(`Ref "${layer.name}" source missing`)
        }
      }
    }

    setImportDialogState({ entries, sourceLayers: parsed, warnings })
  }, [parseAnsiFile, layers])

  const handleImportConfirm = useCallback((selectedIds: Set<string>, targetParentId: string | undefined) => {
    if (!importDialogState) return
    const selected = importDialogState.sourceLayers.layers.filter(l => selectedIds.has(l.id))
    const existingIds = new Set(layers.map(l => l.id))
    const remapped = remapLayers(selected, targetParentId, existingIds)
    if (remapped.length > 0) {
      importLayersWithUndo(remapped)
    }
    setImportDialogState(null)
  }, [importDialogState, layers, importLayersWithUndo])

  const handleImportCancel = useCallback(() => {
    setImportDialogState(null)
  }, [])

  return {
    layerFileInputRef,
    importDialogState,
    handleImportLayersClick,
    handleLayerFileSelected,
    handleImportConfirm,
    handleImportCancel,
  }
}
