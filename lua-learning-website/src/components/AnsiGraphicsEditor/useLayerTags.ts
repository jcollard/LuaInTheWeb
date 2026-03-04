import { useState, useCallback, useRef } from 'react'
import type { Layer, LayerState } from './types'
import { removeTagFromLayer as removeTagFromLayerUtil, addTagToLayer as addTagToLayerUtil } from './layerUtils'

export interface UseLayerTagsReturn {
  availableTags: string[]
  availableTagsRef: React.RefObject<string[]>
  addTagToLayer: (layerId: string, tag: string) => void
  removeTagFromLayer: (layerId: string, tag: string) => void
  createTag: (tag: string) => void
  deleteTag: (tag: string) => void
  renameTag: (oldTag: string, newTag: string) => void
  importLayers: (newLayers: Layer[]) => void
}

export function useLayerTags(
  initial: LayerState | undefined,
  setLayers: React.Dispatch<React.SetStateAction<Layer[]>>,
  setActiveLayerId: React.Dispatch<React.SetStateAction<string>>,
): UseLayerTagsReturn {
  const [availableTags, setAvailableTags] = useState<string[]>(
    () => initial?.availableTags ?? [],
  )
  const availableTagsRef = useRef(availableTags)
  availableTagsRef.current = availableTags

  const addTagToLayerCb = useCallback((layerId: string, tag: string) => {
    setLayers(prev => prev.map(l =>
      l.id === layerId ? addTagToLayerUtil(l, tag) : l
    ))
    // Auto-add to availableTags if new
    setAvailableTags(prev => prev.includes(tag) ? prev : [...prev, tag])
  }, [setLayers])

  const removeTagFromLayerCb = useCallback((layerId: string, tag: string) => {
    setLayers(prev => prev.map(l =>
      l.id === layerId ? removeTagFromLayerUtil(l, tag) : l
    ))
  }, [setLayers])

  const createTag = useCallback((tag: string) => {
    setAvailableTags(prev => prev.includes(tag) ? prev : [...prev, tag])
  }, [])

  const deleteTag = useCallback((tag: string) => {
    setAvailableTags(prev => prev.filter(t => t !== tag))
    setLayers(prev => prev.map(l => removeTagFromLayerUtil(l, tag)))
  }, [setLayers])

  const renameTag = useCallback((oldTag: string, newTag: string) => {
    setAvailableTags(prev => prev.map(t => t === oldTag ? newTag : t))
    setLayers(prev => prev.map(l => {
      if (!l.tags?.includes(oldTag)) return l
      return { ...l, tags: l.tags.map(t => t === oldTag ? newTag : t) }
    }))
  }, [setLayers])

  const importLayers = useCallback((newLayers: Layer[]) => {
    if (newLayers.length === 0) return
    setLayers(prev => [...prev, ...newLayers])
    setActiveLayerId(newLayers[0].id)
  }, [setLayers, setActiveLayerId])

  return {
    availableTags,
    availableTagsRef,
    addTagToLayer: addTagToLayerCb,
    removeTagFromLayer: removeTagFromLayerCb,
    createTag,
    deleteTag,
    renameTag,
    importLayers,
  }
}
