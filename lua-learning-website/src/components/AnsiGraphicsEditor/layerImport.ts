import type { Layer } from './types'
import { isClipLayer, isReferenceLayer, getParentId } from './types'
import { cloneLayer } from './layerUtils'

export interface ImportEntry {
  layer: Layer
  depth: number
}

/**
 * Build display entries for the import dialog, computing nesting depth
 * for each layer based on its parentId chain.
 */
export function buildImportEntries(layers: Layer[]): ImportEntry[] {
  const depthMap = new Map<string, number>()

  for (const layer of layers) {
    const parentId = getParentId(layer)
    if (parentId !== undefined && depthMap.has(parentId)) {
      depthMap.set(layer.id, depthMap.get(parentId)! + 1)
    } else {
      depthMap.set(layer.id, 0)
    }
  }

  return layers.map(layer => ({
    layer,
    depth: depthMap.get(layer.id) ?? 0,
  }))
}

/**
 * Remap IDs and hierarchy for selected layers, preparing them for import.
 *
 * - Every layer gets a new UUID
 * - parentId is remapped if the parent is in the selected set,
 *   otherwise set to targetParentId (or undefined for root)
 * - ReferenceLayer: sourceLayerId remapped if in set; if source not
 *   in set AND not in existingIds → layer is excluded
 * - ClipLayer: excluded if parent group not in selected set
 * - Deep-clones all layer data via cloneLayer()
 */
export function remapLayers(
  selected: Layer[],
  targetParentId: string | undefined,
  existingIds: Set<string>,
): Layer[] {
  const idMap = new Map<string, string>()
  for (const layer of selected) {
    idMap.set(layer.id, crypto.randomUUID())
  }

  const selectedIds = new Set(selected.map(l => l.id))

  const result: Layer[] = []

  for (const layer of selected) {
    // Exclude ClipLayer if parent group not selected
    if (isClipLayer(layer)) {
      const parentId = getParentId(layer)
      if (parentId === undefined || !selectedIds.has(parentId)) {
        continue
      }
    }

    // Exclude ReferenceLayer if source not resolvable
    if (isReferenceLayer(layer)) {
      const sourceId = layer.sourceLayerId
      if (!idMap.has(sourceId) && !existingIds.has(sourceId)) {
        continue
      }
    }

    const cloned = cloneLayer(layer)
    const newId = idMap.get(layer.id)!

    // Remap parentId: use remapped parent if in set, otherwise targetParentId
    const parentId = getParentId(layer)
    const newParentId = (parentId !== undefined && idMap.has(parentId))
      ? idMap.get(parentId)
      : targetParentId

    // Remap sourceLayerId for reference layers
    if (isReferenceLayer(cloned) && idMap.has(cloned.sourceLayerId)) {
      cloned.sourceLayerId = idMap.get(cloned.sourceLayerId)!
    }

    result.push({ ...cloned, id: newId, parentId: newParentId } as Layer)
  }

  return result
}
