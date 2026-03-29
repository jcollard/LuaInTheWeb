import { useState, useCallback, useMemo } from 'react'
import type { ImportEntry } from './layerImport'
import type { Layer } from './types'
import { isGroupLayer } from './types'
import { getAncestorGroupIds, getGroupDescendantIds } from './layerUtils'
import { expandSelectionWithAncestors, getCollapsedDescendantIds } from './layerExport'

/** Compute the set of visible layer IDs, excluding layers in hidden groups. */
function computeVisibleIds(entries: ImportEntry[], allLayers: Layer[]): Set<string> {
  const hiddenGroupIds = new Set(
    allLayers.filter(l => l.type === 'group' && !l.visible).map(l => l.id),
  )
  return new Set(entries.filter(e => {
    if (!e.layer.visible) return false
    for (const aid of getAncestorGroupIds(e.layer, allLayers)) {
      if (hiddenGroupIds.has(aid)) return false
    }
    return true
  }).map(e => e.layer.id))
}

/** Compute layer IDs matching a single tag (with ancestor expansion). */
function idsForTag(
  tag: string, entries: ImportEntry[], allLayers: Layer[], flattenToRoot: boolean,
): Set<string> {
  const ids = new Set<string>()
  for (const { layer } of entries) {
    if (layer.tags?.includes(tag)) ids.add(layer.id)
  }
  return flattenToRoot ? ids : expandSelectionWithAncestors(ids, allLayers)
}

/** Compute the union of layer IDs matching any of the active tags. */
function computeTagSelection(
  activeTags: Set<string>, entries: ImportEntry[], allLayers: Layer[], flattenToRoot: boolean,
): Set<string> {
  if (activeTags.size === 0) return new Set()
  const ids = new Set<string>()
  for (const tag of activeTags) {
    for (const id of idsForTag(tag, entries, allLayers, flattenToRoot)) ids.add(id)
  }
  return ids
}

export interface UseExportLayerSelectionOptions {
  entries: ImportEntry[]
  allLayers: Layer[]
  flattenToRoot: boolean
}

export function useExportLayerSelection({
  entries,
  allLayers,
  flattenToRoot,
}: UseExportLayerSelectionOptions) {
  const [selected, setSelected] = useState<Set<string>>(
    () => computeVisibleIds(entries, allLayers),
  )
  const [activeTags, setActiveTags] = useState<Set<string>>(() => new Set())
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())

  const hiddenByCollapse = useMemo(
    () => getCollapsedDescendantIds(collapsed, allLayers),
    [collapsed, allLayers],
  )

  const handleToggle = useCallback((id: string, checked: boolean) => {
    const layer = allLayers.find(l => l.id === id)

    if (layer && isGroupLayer(layer)) {
      setSelected(prev => {
        const next = new Set(prev)
        const descendantIds = getGroupDescendantIds(id, allLayers)
        if (checked) {
          next.add(id)
          for (const did of descendantIds) next.add(did)
          if (!flattenToRoot) {
            for (const aid of getAncestorGroupIds(layer, allLayers)) next.add(aid)
          }
        } else {
          next.delete(id)
          for (const did of descendantIds) next.delete(did)
        }
        return next
      })
      return
    }

    setSelected(prev => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
        if (!flattenToRoot && layer) {
          for (const aid of getAncestorGroupIds(layer, allLayers)) next.add(aid)
        }
      } else {
        next.delete(id)
      }
      return next
    })
  }, [flattenToRoot, allLayers])

  const handleSelectAll = useCallback(() => setSelected(new Set(entries.map(e => e.layer.id))), [entries])
  const handleDeselectAll = useCallback(() => { setSelected(new Set()); setActiveTags(new Set()) }, [])

  const handleSelectVisible = useCallback(() => {
    const visibleIds = computeVisibleIds(entries, allLayers)
    setSelected(prev => {
      const next = new Set(prev)
      for (const id of visibleIds) next.add(id)
      return next
    })
  }, [entries, allLayers])

  const handleAddTag = useCallback((tag: string) => {
    setActiveTags(prev => {
      if (prev.has(tag)) return prev
      const next = new Set(prev)
      next.add(tag)
      const tagLayerIds = idsForTag(tag, entries, allLayers, flattenToRoot)
      setSelected(prevSel => {
        const nextSel = new Set(prevSel)
        for (const id of tagLayerIds) nextSel.add(id)
        return nextSel
      })
      return next
    })
  }, [entries, allLayers, flattenToRoot])

  const handleRemoveTag = useCallback((tag: string) => {
    setActiveTags(prev => {
      const next = new Set(prev)
      next.delete(tag)
      const removedTagIds = idsForTag(tag, entries, allLayers, flattenToRoot)
      const remainingTagIds = computeTagSelection(next, entries, allLayers, flattenToRoot)
      setSelected(prevSel => {
        const nextSel = new Set(prevSel)
        for (const id of removedTagIds) {
          if (!remainingTagIds.has(id)) nextSel.delete(id)
        }
        return nextSel
      })
      return next
    })
  }, [entries, allLayers, flattenToRoot])

  const handleToggleCollapse = useCallback((groupId: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }, [])

  return {
    selected,
    activeTags,
    collapsed,
    hiddenByCollapse,
    handleToggle,
    handleSelectAll,
    handleDeselectAll,
    handleSelectVisible,
    handleAddTag,
    handleRemoveTag,
    handleToggleCollapse,
  }
}
