import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TagsTabContent } from './TagsTabContent'
import type { Layer } from './types'
import { createLayer } from './layerUtils'

describe('TagsTabContent', () => {
  const noop = () => {}

  function renderTags(overrides?: {
    layers?: Layer[]
    availableTags?: string[]
    activeLayerId?: string
    onSetActive?: (id: string) => void
    onAddTagToLayer?: (layerId: string, tag: string) => void
    onRemoveTagFromLayer?: (layerId: string, tag: string) => void
    onCreateTag?: (tag: string) => void
    onDeleteTag?: (tag: string) => void
    onRenameTag?: (oldTag: string, newTag: string) => void
  }) {
    const layers = overrides?.layers ?? [createLayer('BG', 'l1')]
    return render(
      <TagsTabContent
        layers={layers}
        availableTags={overrides?.availableTags ?? []}
        activeLayerId={overrides?.activeLayerId ?? layers[0].id}
        onSetActive={overrides?.onSetActive ?? noop}
        onAddTagToLayer={overrides?.onAddTagToLayer ?? noop}
        onRemoveTagFromLayer={overrides?.onRemoveTagFromLayer ?? noop}
        onCreateTag={overrides?.onCreateTag ?? noop}
        onDeleteTag={overrides?.onDeleteTag ?? noop}
        onRenameTag={overrides?.onRenameTag ?? noop}
      />
    )
  }

  it('renders empty state when no tags', () => {
    renderTags()
    expect(screen.getByTestId('tags-empty')).toBeTruthy()
  })

  it('renders new tag input', () => {
    renderTags()
    expect(screen.getByTestId('new-tag-input')).toBeTruthy()
  })

  it('creates a tag when typing and pressing Enter', () => {
    const onCreateTag = vi.fn()
    renderTags({ onCreateTag })
    const input = screen.getByTestId('new-tag-input')
    fireEvent.change(input, { target: { value: 'Characters' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onCreateTag).toHaveBeenCalledWith('Characters')
  })

  it('creates a tag when clicking + button', () => {
    const onCreateTag = vi.fn()
    renderTags({ onCreateTag })
    fireEvent.change(screen.getByTestId('new-tag-input'), { target: { value: 'Props' } })
    fireEvent.click(screen.getByTestId('new-tag-button'))
    expect(onCreateTag).toHaveBeenCalledWith('Props')
  })

  it('disables + button when input is empty', () => {
    renderTags()
    expect(screen.getByTestId('new-tag-button')).toBeDisabled()
  })

  it('disables + button when tag name already exists', () => {
    renderTags({ availableTags: ['Characters'] })
    fireEvent.change(screen.getByTestId('new-tag-input'), { target: { value: 'Characters' } })
    expect(screen.getByTestId('new-tag-button')).toBeDisabled()
  })

  it('renders tag headings for each available tag', () => {
    renderTags({ availableTags: ['Characters', 'Props'] })
    expect(screen.getByTestId('tag-heading-Characters')).toBeTruthy()
    expect(screen.getByTestId('tag-heading-Props')).toBeTruthy()
  })

  it('shows layers under their tags', () => {
    const layer = { ...createLayer('Hero', 'l1'), tags: ['Characters'] }
    renderTags({ layers: [layer], availableTags: ['Characters'] })
    expect(screen.getByTestId('tag-layer-row-Characters-l1')).toBeTruthy()
    expect(screen.getByTestId('tag-layer-row-Characters-l1').textContent).toBe('Hero')
  })

  it('shows layer count in tag heading', () => {
    const l1 = { ...createLayer('Hero', 'l1'), tags: ['Characters'] }
    const l2 = { ...createLayer('Villain', 'l2'), tags: ['Characters'] }
    renderTags({ layers: [l1, l2], availableTags: ['Characters'] })
    expect(screen.getByTestId('tag-heading-Characters').textContent).toContain('(2)')
  })

  it('multi-tag layer appears under each heading', () => {
    const layer = { ...createLayer('Hero', 'l1'), tags: ['Characters', 'Props'] }
    renderTags({ layers: [layer], availableTags: ['Characters', 'Props'] })
    expect(screen.getByTestId('tag-layer-row-Characters-l1')).toBeTruthy()
    expect(screen.getByTestId('tag-layer-row-Props-l1')).toBeTruthy()
  })

  it('clicking a layer row calls onSetActive', () => {
    const onSetActive = vi.fn()
    const layer = { ...createLayer('Hero', 'l1'), tags: ['Characters'] }
    renderTags({ layers: [layer], availableTags: ['Characters'], onSetActive })
    fireEvent.click(screen.getByTestId('tag-layer-row-Characters-l1'))
    expect(onSetActive).toHaveBeenCalledWith('l1')
  })

  it('collapses tag section when heading is clicked', () => {
    const layer = { ...createLayer('Hero', 'l1'), tags: ['Characters'] }
    renderTags({ layers: [layer], availableTags: ['Characters'] })
    fireEvent.click(screen.getByTestId('tag-heading-Characters'))
    expect(screen.queryByTestId('tag-layer-row-Characters-l1')).toBeNull()
  })

  it('expands tag section when clicked again', () => {
    const layer = { ...createLayer('Hero', 'l1'), tags: ['Characters'] }
    renderTags({ layers: [layer], availableTags: ['Characters'] })
    fireEvent.click(screen.getByTestId('tag-heading-Characters'))
    fireEvent.click(screen.getByTestId('tag-heading-Characters'))
    expect(screen.getByTestId('tag-layer-row-Characters-l1')).toBeTruthy()
  })

  it('clicking delete button calls onDeleteTag', () => {
    const onDeleteTag = vi.fn()
    renderTags({ availableTags: ['Characters'], onDeleteTag })
    fireEvent.click(screen.getByTestId('tag-delete-Characters'))
    expect(onDeleteTag).toHaveBeenCalledWith('Characters')
  })

  it('double-clicking heading starts rename', () => {
    renderTags({ availableTags: ['Characters'] })
    fireEvent.doubleClick(screen.getByTestId('tag-heading-Characters'))
    expect(screen.getByTestId('tag-rename-input-Characters')).toBeTruthy()
  })

  it('rename commits on Enter', () => {
    const onRenameTag = vi.fn()
    renderTags({ availableTags: ['Characters'], onRenameTag })
    fireEvent.doubleClick(screen.getByTestId('tag-heading-Characters'))
    const input = screen.getByTestId('tag-rename-input-Characters')
    fireEvent.change(input, { target: { value: 'Actors' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onRenameTag).toHaveBeenCalledWith('Characters', 'Actors')
  })

  it('rename cancels on Escape', () => {
    const onRenameTag = vi.fn()
    renderTags({ availableTags: ['Characters'], onRenameTag })
    fireEvent.doubleClick(screen.getByTestId('tag-heading-Characters'))
    const input = screen.getByTestId('tag-rename-input-Characters')
    fireEvent.change(input, { target: { value: 'Actors' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onRenameTag).not.toHaveBeenCalled()
  })

  it('shows no layers for empty tag', () => {
    renderTags({ availableTags: ['Characters'] })
    expect(screen.getByTestId('tag-heading-Characters').textContent).toContain('(0)')
  })

  it('active layer row gets active styling', () => {
    const layer = { ...createLayer('Hero', 'l1'), tags: ['Characters'] }
    renderTags({ layers: [layer], availableTags: ['Characters'], activeLayerId: 'l1' })
    expect(screen.getByTestId('tag-layer-row-Characters-l1').className).toContain('Active')
  })
})
