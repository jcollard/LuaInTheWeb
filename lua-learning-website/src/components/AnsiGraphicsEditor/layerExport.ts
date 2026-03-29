import type { Layer } from './types'
import { isClipLayer, isReferenceLayer, isGroupLayer, getParentId } from './types'
import { getAncestorGroupIds, getGroupDescendantIds } from './layerUtils'

export interface ExportOptions {
  includeEmptyGroups?: boolean
}

/**
 * Expand a set of selected layer IDs to include all ancestor groups.
 * For each selected layer, walks its parentId chain and adds every ancestor.
 */
export function expandSelectionWithAncestors(
  selectedIds: Set<string>,
  allLayers: Layer[],
): Set<string> {
  const expanded = new Set(selectedIds)
  for (const id of selectedIds) {
    const layer = allLayers.find(l => l.id === id)
    if (!layer) continue
    for (const ancestorId of getAncestorGroupIds(layer, allLayers)) {
      expanded.add(ancestorId)
    }
  }
  return expanded
}

/**
 * Build the list of layers to export from a user selection.
 *
 * - If !flattenToRoot: auto-includes ancestor groups for selected children
 * - Excludes reference layers whose source is not in the export set (+ warning)
 * - Excludes clip layers whose parent group is not in the export set (+ warning)
 * - If flattenToRoot: also excludes clip layers and strips parentId from all layers
 * - Does not mutate input layers
 */
export function buildExportLayers(
  selectedIds: Set<string>,
  allLayers: Layer[],
  flattenToRoot: boolean,
  options?: ExportOptions,
): { layers: Layer[]; warnings: string[] } {
  const includeEmptyGroups = options?.includeEmptyGroups ?? false
  const finalIds = flattenToRoot
    ? selectedIds
    : expandSelectionWithAncestors(selectedIds, allLayers)

  const warnings: string[] = []
  const result: Layer[] = []

  for (const layer of allLayers) {
    if (!finalIds.has(layer.id)) continue

    if (isClipLayer(layer)) {
      if (flattenToRoot) {
        warnings.push(`Clip layer "${layer.name}" excluded — clip layers require a parent group`)
        continue
      }
      const parentId = getParentId(layer)
      if (parentId === undefined || !finalIds.has(parentId)) {
        warnings.push(`Clip layer "${layer.name}" excluded — parent group not in export set`)
        continue
      }
    }

    if (isReferenceLayer(layer)) {
      if (!finalIds.has(layer.sourceLayerId)) {
        warnings.push(`Reference layer "${layer.name}" excluded — source layer not in export set`)
        continue
      }
    }

    if (flattenToRoot) {
      result.push({ ...layer, parentId: undefined })
    } else {
      result.push({ ...layer })
    }
  }

  if (!includeEmptyGroups) {
    return { layers: stripEmptyGroups(result), warnings }
  }
  return { layers: result, warnings }
}

/** Remove groups that have no non-group descendants in the result set. */
function stripEmptyGroups(layers: Layer[]): Layer[] {
  const hasContent = new Set<string>()
  // Mark groups that contain non-group layers
  for (const layer of layers) {
    if (isGroupLayer(layer)) continue
    let pid = getParentId(layer)
    while (pid) {
      if (hasContent.has(pid)) break
      hasContent.add(pid)
      const parent = layers.find(l => l.id === pid)
      pid = parent ? getParentId(parent) : undefined
    }
  }
  return layers.filter(l => !isGroupLayer(l) || hasContent.has(l.id))
}

/**
 * Filter availableTags to only those actually used by the export layers.
 * Returns undefined if no tags exist or none are used.
 */
export function filterExportTags(
  exportLayers: Layer[],
  availableTags: string[] | undefined,
): string[] | undefined {
  if (!availableTags || availableTags.length === 0) return undefined
  const usedTags = new Set<string>()
  for (const layer of exportLayers) {
    if (layer.tags) {
      for (const tag of layer.tags) {
        usedTags.add(tag)
      }
    }
  }
  if (usedTags.size === 0) return undefined
  return availableTags.filter(t => usedTags.has(t))
}

export type GroupCheckState = 'all' | 'some' | 'none'

/** Compute tri-state for a group: all/some/none of its descendants are selected. */
export function getGroupCheckState(groupId: string, allLayers: Layer[], selected: Set<string>): GroupCheckState {
  const descendantIds = getGroupDescendantIds(groupId, allLayers)
  if (descendantIds.size === 0) return selected.has(groupId) ? 'all' : 'none'
  let anySelected = false
  let allSelected = true
  for (const id of descendantIds) {
    if (selected.has(id)) anySelected = true
    else allSelected = false
  }
  if (allSelected) return 'all'
  if (anySelected) return 'some'
  return 'none'
}

/** Compute the set of layer IDs hidden by collapsed ancestor groups. */
export function getCollapsedDescendantIds(
  collapsedGroupIds: Set<string>,
  allLayers: Layer[],
): Set<string> {
  if (collapsedGroupIds.size === 0) return new Set()
  const layerMap = new Map(allLayers.map(l => [l.id, l]))
  const hidden = new Set<string>()
  for (const layer of allLayers) {
    let pid = getParentId(layer)
    while (pid) {
      if (collapsedGroupIds.has(pid)) { hidden.add(layer.id); break }
      const parent = layerMap.get(pid)
      pid = parent ? getParentId(parent) : undefined
    }
  }
  return hidden
}

/** Compute warnings for clip/reference layers that will be excluded from export. */
export function computeExportWarnings(
  entries: { layer: Layer }[],
  selected: Set<string>,
  flattenToRoot: boolean,
): string[] {
  const warnings: string[] = []
  for (const { layer } of entries) {
    if (!selected.has(layer.id)) continue
    if (isClipLayer(layer)) {
      if (flattenToRoot) {
        warnings.push(`Clip layer "${layer.name}" will be excluded — clip layers require a parent group`)
      } else {
        const parentId = getParentId(layer)
        if (parentId === undefined || !selected.has(parentId)) {
          warnings.push(`Clip layer "${layer.name}" will be excluded — parent group not selected`)
        }
      }
    }
    if (isReferenceLayer(layer) && !selected.has(layer.sourceLayerId)) {
      warnings.push(`Reference layer "${layer.name}" will be excluded — source layer not selected`)
    }
  }
  return warnings
}

const ANSI_LUA_EXT = '.ansi.lua'

/**
 * If `folderPath/fileName` already exists, append -1, -2, ... before the
 * extension until a free name is found.  Returns { finalName, renamed }.
 */
export function deduplicateFileName(
  folderPath: string,
  fileName: string,
  exists: (path: string) => boolean,
): { finalName: string; renamed: boolean } {
  const buildPath = (name: string) =>
    folderPath === '/' ? `/${name}` : `${folderPath}/${name}`

  if (!exists(buildPath(fileName))) return { finalName: fileName, renamed: false }

  const stem = fileName.replace(/\.ansi\.lua$/, '')
  for (let n = 1; n < 1000; n++) {
    const candidate = `${stem}-${n}${ANSI_LUA_EXT}`
    if (!exists(buildPath(candidate))) return { finalName: candidate, renamed: true }
  }
  return { finalName: fileName, renamed: false }
}
