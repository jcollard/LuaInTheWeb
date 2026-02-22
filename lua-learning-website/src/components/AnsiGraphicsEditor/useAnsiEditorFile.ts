import { useCallback, useMemo, useState } from 'react'
import type { AnsiGrid, Layer, LayerState } from './types'
import { compositeGrid, visibleDrawableLayers } from './layerUtils'
import { exportAnsFile } from './ansExport'
import { exportShFile, exportAnimatedShFile } from './shExport'
import { serializeLayers, deserializeLayers } from './serialization'

/** Find the maximum frame count across all visible drawn layers. */
function getMaxFrameCount(layers: Layer[]): number {
  const drawable = visibleDrawableLayers(layers)
  let max = 1
  for (const layer of drawable) {
    if (layer.type === 'drawn' && layer.frames.length > max) {
      max = layer.frames.length
    }
  }
  return max
}

/** Composite each frame index across all layers, clamping single-frame layers to frame 0. */
function allFrameComposites(layers: Layer[], frameCount: number): AnsiGrid[] {
  const frames: AnsiGrid[] = []
  for (let f = 0; f < frameCount; f++) {
    const snapshotLayers = layers.map(layer => {
      if (layer.type !== 'drawn') return layer
      const frameIdx = Math.min(f, layer.frames.length - 1)
      return { ...layer, grid: layer.frames[frameIdx] }
    })
    frames.push(compositeGrid(snapshotLayers))
  }
  return frames
}

/** Derive an export filename from the editor's filePath, replacing the extension. */
function deriveExportFilename(filePath: string | undefined, ext: string): string {
  if (!filePath || filePath.startsWith('ansi-editor://')) return `untitled.${ext}`
  const base = filePath.split('/').pop() ?? 'untitled'
  const replaced = base.replace(/\.ansi\.lua$/, `.${ext}`)
  return replaced.endsWith(`.${ext}`) ? replaced : `${base}.${ext}`
}

/** Trigger a browser download for the given blob. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export interface FileSystemLike {
  readFile(path: string): string | null
  writeFile(path: string, content: string): void
  createFile(path: string, content: string): void
  exists(path: string): boolean
  flush(): Promise<void>
}

export interface UseAnsiEditorFileOptions {
  filePath?: string
  fileSystem: FileSystemLike
  refreshFileTree: () => void
  updateAnsiEditorTabPath: (oldPath: string, newPath: string) => void
  closeSaveDialog: () => void
}

export interface UseAnsiEditorFileReturn {
  initialLayerState: LayerState | undefined
  pendingSave: { path: string; content: string } | null
  handleSave: (layers: Layer[], activeLayerId: string, availableTags: string[], markClean: () => void, openSaveDialog: () => void) => Promise<void>
  handleSaveAs: (folderPath: string, fileName: string, layers: Layer[], activeLayerId: string, availableTags: string[]) => Promise<void>
  handleConfirmOverwrite: () => Promise<void>
  handleCancelOverwrite: () => void
  handleExportAns: (layers: Layer[]) => void
  handleExportSh: (layers: Layer[]) => void
  finishSaveAs: (savedPath: string) => Promise<void>
}

export function useAnsiEditorFile({
  filePath,
  fileSystem,
  refreshFileTree,
  updateAnsiEditorTabPath,
  closeSaveDialog,
}: UseAnsiEditorFileOptions): UseAnsiEditorFileReturn {
  const [pendingSave, setPendingSave] = useState<{ path: string; content: string } | null>(null)

  const initialLayerState = useMemo((): LayerState | undefined => {
    if (!filePath || filePath.startsWith('ansi-editor://')) return undefined
    const content = fileSystem.readFile(filePath)
    if (content === null) return undefined
    try {
      return deserializeLayers(content)
    } catch {
      return undefined
    }
  }, [filePath, fileSystem])

  const finishSaveAs = useCallback(async (savedPath: string) => {
    await fileSystem.flush()
    refreshFileTree()
    closeSaveDialog()
    if (filePath) {
      updateAnsiEditorTabPath(filePath, savedPath)
    }
  }, [fileSystem, refreshFileTree, closeSaveDialog, filePath, updateAnsiEditorTabPath])

  const handleSaveAs = useCallback(async (folderPath: string, fileName: string, layers: Layer[], activeLayerId: string, availableTags: string[]) => {
    const fullPath = folderPath === '/' ? `/${fileName}` : `${folderPath}/${fileName}`
    const content = serializeLayers({ layers, activeLayerId }, availableTags)
    if (fileSystem.exists(fullPath)) {
      setPendingSave({ path: fullPath, content })
      return
    }
    fileSystem.createFile(fullPath, content)
    await finishSaveAs(fullPath)
  }, [fileSystem, finishSaveAs])

  const handleConfirmOverwrite = useCallback(async () => {
    if (!pendingSave) return
    fileSystem.writeFile(pendingSave.path, pendingSave.content)
    await finishSaveAs(pendingSave.path)
    setPendingSave(null)
  }, [pendingSave, fileSystem, finishSaveAs])

  const handleCancelOverwrite = useCallback(() => {
    setPendingSave(null)
  }, [])

  const handleSave = useCallback(async (layers: Layer[], activeLayerId: string, availableTags: string[], markClean: () => void, openSaveDialog: () => void) => {
    if (filePath && !filePath.startsWith('ansi-editor://')) {
      const content = serializeLayers({ layers, activeLayerId }, availableTags)
      fileSystem.writeFile(filePath, content)
      await fileSystem.flush()
      markClean()
    } else {
      openSaveDialog()
    }
  }, [filePath, fileSystem])

  const handleExportAns = useCallback((layers: Layer[]) => {
    const grid = compositeGrid(layers)
    const filename = deriveExportFilename(filePath, 'ans')
    const title = filename.replace(/\.ans$/, '')
    const data = exportAnsFile(grid, title)
    downloadBlob(new Blob([new Uint8Array(data)], { type: 'application/octet-stream' }), filename)
  }, [filePath])

  const handleExportSh = useCallback((layers: Layer[]) => {
    const filename = deriveExportFilename(filePath, 'sh')
    const maxFrames = getMaxFrameCount(layers)

    let script: string
    if (maxFrames > 1) {
      const frames = allFrameComposites(layers, maxFrames)
      const drawable = visibleDrawableLayers(layers)
      const drawnLayer = drawable.find(l => l.type === 'drawn' && l.frames.length > 1)
      const durationMs = drawnLayer?.type === 'drawn' ? drawnLayer.frameDurationMs : 100
      script = exportAnimatedShFile(frames, durationMs)
    } else {
      script = exportShFile(compositeGrid(layers))
    }

    downloadBlob(new Blob([script], { type: 'text/x-shellscript' }), filename)
  }, [filePath])

  return {
    initialLayerState,
    pendingSave,
    handleSave,
    handleSaveAs,
    handleConfirmOverwrite,
    handleCancelOverwrite,
    handleExportAns,
    handleExportSh,
    finishSaveAs,
  }
}
