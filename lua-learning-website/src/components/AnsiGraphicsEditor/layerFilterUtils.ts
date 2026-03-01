import type { Layer } from './types'
import { isGroupLayer } from './types'
import { getAncestorGroupIds, getGroupDescendantIds } from './layerUtils'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** Format a layer ID for display: truncate UUIDs to first 8 chars + '...'. */
export function formatLayerId(id: string): string {
  if (UUID_PATTERN.test(id)) return id.slice(0, 8) + '...'
  return id
}

/** Check if a layer matches a search query against name, full ID, and truncated ID. */
export function layerMatchesQuery(layer: Layer, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (q === '') return true
  const name = layer.name.toLowerCase()
  const id = layer.id.toLowerCase()
  const truncated = formatLayerId(layer.id).toLowerCase()
  return name.includes(q) || id.includes(q) || truncated.includes(q)
}

/** Filter layers by query, preserving group hierarchy. Matching child includes ancestors; matching group includes descendants. */
export function filterLayers(layers: Layer[], query: string): Layer[] {
  const q = query.trim()
  if (q === '') return layers

  // Find directly matching layer IDs
  const matchingIds = new Set<string>()
  for (const layer of layers) {
    if (layerMatchesQuery(layer, q)) matchingIds.add(layer.id)
  }

  // Expand: matching child → include all ancestor groups
  const includeIds = new Set(matchingIds)
  for (const layer of layers) {
    if (matchingIds.has(layer.id)) {
      for (const ancestorId of getAncestorGroupIds(layer, layers)) {
        includeIds.add(ancestorId)
      }
    }
  }

  // Expand: matching group → include all descendants
  for (const layer of layers) {
    if (matchingIds.has(layer.id) && isGroupLayer(layer)) {
      for (const descId of getGroupDescendantIds(layer.id, layers)) {
        includeIds.add(descId)
      }
    }
  }

  return layers.filter(l => includeIds.has(l.id))
}

export interface FilteredTag {
  tag: string
  layers: Layer[]
}

/** Filter tags tab: tag name match includes all layers, layer-only match includes only matching layers. */
export function filterTagsTab(availableTags: string[], layers: Layer[], query: string): FilteredTag[] {
  const q = query.trim().toLowerCase()
  if (q === '') {
    return availableTags.map(tag => ({
      tag,
      layers: layers.filter(l => l.tags?.includes(tag)),
    }))
  }

  const result: FilteredTag[] = []
  for (const tag of availableTags) {
    const tagNameMatches = tag.toLowerCase().includes(q)
    const tagLayers = layers.filter(l => l.tags?.includes(tag))

    if (tagNameMatches) {
      result.push({ tag, layers: tagLayers })
    } else {
      const matchingLayers = tagLayers.filter(l => layerMatchesQuery(l, q))
      if (matchingLayers.length > 0) {
        result.push({ tag, layers: matchingLayers })
      }
    }
  }
  return result
}
