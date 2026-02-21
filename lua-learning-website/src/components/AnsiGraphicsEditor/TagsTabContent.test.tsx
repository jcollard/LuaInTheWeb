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
    onCreateTag?: (tag: string) => void
    onDeleteTag?: (tag: string) => void
    onRenameTag?: (oldTag: string, newTag: string) => void
    onToggleVisibility?: (id: string) => void
    onSetLayerVisibility?: (ids: string[], visible: boolean) => void
    onRenameLayer?: (id: string, name: string) => void
  }) {
    const layers = overrides?.layers ?? [createLayer('BG', 'l1')]
    return render(
      <TagsTabContent
        layers={layers}
        availableTags={overrides?.availableTags ?? []}
        activeLayerId={overrides?.activeLayerId ?? layers[0].id}
        onSetActive={overrides?.onSetActive ?? noop}
        onCreateTag={overrides?.onCreateTag ?? noop}
        onDeleteTag={overrides?.onDeleteTag ?? noop}
        onRenameTag={overrides?.onRenameTag ?? noop}
        onToggleVisibility={overrides?.onToggleVisibility ?? noop}
        onSetLayerVisibility={overrides?.onSetLayerVisibility ?? noop}
        onRenameLayer={overrides?.onRenameLayer ?? noop}
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
    expect(screen.getByTestId('tag-layer-row-Characters-l1').textContent).toContain('Hero')
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

  // --- Helpers for tagged layer tests ---

  function renderTaggedHeroRow(
    layerOverrides?: Partial<Layer>,
    propOverrides?: Omit<Parameters<typeof renderTags>[0], 'layers' | 'availableTags'>,
  ): HTMLElement {
    const layer = { ...createLayer('Hero', 'l1'), tags: ['Characters'], ...layerOverrides } as Layer
    renderTags({ layers: [layer], availableTags: ['Characters'], ...propOverrides })
    return screen.getByTestId('tag-layer-row-Characters-l1')
  }

  function getVisibilityButton(row: HTMLElement): Element {
    return row.querySelector('[aria-label="Toggle visibility"]')!
  }

  function startLayerRename(row: HTMLElement): void {
    const nameSpan = row.querySelector('span')!
    fireEvent.doubleClick(nameSpan)
  }

  function getRenameInput(): HTMLInputElement {
    return screen.getByTestId<HTMLInputElement>('tag-layer-rename-input-l1')
  }

  // --- Visibility toggle tests ---

  it('layer row shows visibility toggle button', () => {
    const row = renderTaggedHeroRow()
    expect(getVisibilityButton(row)).toBeTruthy()
  })

  it('shows eye icon for visible layer', () => {
    const row = renderTaggedHeroRow({ visible: true })
    expect(getVisibilityButton(row).textContent).toBe('\u{1F441}')
  })

  it('shows hidden icon for hidden layer', () => {
    const row = renderTaggedHeroRow({ visible: false })
    expect(getVisibilityButton(row).textContent).toBe('\u{1F441}\u{200D}\u{1F5E8}')
  })

  it('clicking visibility toggle calls onToggleVisibility', () => {
    const onToggleVisibility = vi.fn()
    const row = renderTaggedHeroRow(undefined, { onToggleVisibility })
    fireEvent.click(getVisibilityButton(row))
    expect(onToggleVisibility).toHaveBeenCalledWith('l1')
  })

  it('clicking visibility toggle does NOT trigger onSetActive', () => {
    const onSetActive = vi.fn()
    const row = renderTaggedHeroRow(undefined, { onSetActive })
    fireEvent.click(getVisibilityButton(row))
    expect(onSetActive).not.toHaveBeenCalled()
  })

  // --- Layer rename tests ---

  it('double-clicking layer row starts rename with input', () => {
    const row = renderTaggedHeroRow()
    startLayerRename(row)
    expect(screen.getByTestId('tag-layer-rename-input-l1')).toBeTruthy()
  })

  it('rename input is prefilled with current name', () => {
    const row = renderTaggedHeroRow()
    startLayerRename(row)
    expect(getRenameInput().value).toBe('Hero')
  })

  it('Enter commits rename and calls onRenameLayer', () => {
    const onRenameLayer = vi.fn()
    const row = renderTaggedHeroRow(undefined, { onRenameLayer })
    startLayerRename(row)
    fireEvent.change(getRenameInput(), { target: { value: 'Warrior' } })
    fireEvent.keyDown(getRenameInput(), { key: 'Enter' })
    expect(onRenameLayer).toHaveBeenCalledWith('l1', 'Warrior')
  })

  it('Escape cancels rename without calling onRenameLayer', () => {
    const onRenameLayer = vi.fn()
    const row = renderTaggedHeroRow(undefined, { onRenameLayer })
    startLayerRename(row)
    fireEvent.change(getRenameInput(), { target: { value: 'Warrior' } })
    fireEvent.keyDown(getRenameInput(), { key: 'Escape' })
    expect(onRenameLayer).not.toHaveBeenCalled()
  })

  it('blur commits rename', () => {
    const onRenameLayer = vi.fn()
    const row = renderTaggedHeroRow(undefined, { onRenameLayer })
    startLayerRename(row)
    fireEvent.change(getRenameInput(), { target: { value: 'Warrior' } })
    fireEvent.blur(getRenameInput())
    expect(onRenameLayer).toHaveBeenCalledWith('l1', 'Warrior')
  })

  it('does not commit rename if name unchanged', () => {
    const onRenameLayer = vi.fn()
    const row = renderTaggedHeroRow(undefined, { onRenameLayer })
    startLayerRename(row)
    fireEvent.keyDown(getRenameInput(), { key: 'Enter' })
    expect(onRenameLayer).not.toHaveBeenCalled()
  })

  it('does not commit rename if name is whitespace', () => {
    const onRenameLayer = vi.fn()
    const row = renderTaggedHeroRow(undefined, { onRenameLayer })
    startLayerRename(row)
    fireEvent.change(getRenameInput(), { target: { value: '   ' } })
    fireEvent.keyDown(getRenameInput(), { key: 'Enter' })
    expect(onRenameLayer).not.toHaveBeenCalled()
  })

  it('clicking rename input does NOT trigger onSetActive', () => {
    const onSetActive = vi.fn()
    const row = renderTaggedHeroRow(undefined, { onSetActive })
    startLayerRename(row)
    fireEvent.click(getRenameInput())
    expect(onSetActive).not.toHaveBeenCalled()
  })

  // --- Tag heading visibility toggle tests ---

  it('tag heading shows visibility toggle', () => {
    renderTags({ availableTags: ['Characters'] })
    expect(screen.getByTestId('tag-visibility-Characters')).toBeTruthy()
  })

  it('tag heading shows eye icon when all layers visible', () => {
    const l1 = { ...createLayer('Hero', 'l1'), tags: ['Characters'], visible: true }
    const l2 = { ...createLayer('Villain', 'l2'), tags: ['Characters'], visible: true }
    renderTags({ layers: [l1, l2], availableTags: ['Characters'] })
    expect(screen.getByTestId('tag-visibility-Characters').textContent).toBe('\u{1F441}')
  })

  it('tag heading shows hidden icon when all layers hidden', () => {
    const l1 = { ...createLayer('Hero', 'l1'), tags: ['Characters'], visible: false }
    const l2 = { ...createLayer('Villain', 'l2'), tags: ['Characters'], visible: false }
    renderTags({ layers: [l1, l2], availableTags: ['Characters'] })
    expect(screen.getByTestId('tag-visibility-Characters').textContent).toBe('\u{1F441}\u{200D}\u{1F5E8}')
  })

  it('tag heading shows hidden icon when mixed visibility', () => {
    const l1 = { ...createLayer('Hero', 'l1'), tags: ['Characters'], visible: true }
    const l2 = { ...createLayer('Villain', 'l2'), tags: ['Characters'], visible: false }
    renderTags({ layers: [l1, l2], availableTags: ['Characters'] })
    expect(screen.getByTestId('tag-visibility-Characters').textContent).toBe('\u{1F441}\u{200D}\u{1F5E8}')
  })

  it('clicking tag visibility when all visible calls onSetLayerVisibility with false', () => {
    const onSetLayerVisibility = vi.fn()
    const l1 = { ...createLayer('Hero', 'l1'), tags: ['Characters'], visible: true }
    const l2 = { ...createLayer('Villain', 'l2'), tags: ['Characters'], visible: true }
    renderTags({ layers: [l1, l2], availableTags: ['Characters'], onSetLayerVisibility })
    fireEvent.click(screen.getByTestId('tag-visibility-Characters'))
    expect(onSetLayerVisibility).toHaveBeenCalledWith(['l1', 'l2'], false)
  })

  it('clicking tag visibility when any hidden calls onSetLayerVisibility with true', () => {
    const onSetLayerVisibility = vi.fn()
    const l1 = { ...createLayer('Hero', 'l1'), tags: ['Characters'], visible: true }
    const l2 = { ...createLayer('Villain', 'l2'), tags: ['Characters'], visible: false }
    renderTags({ layers: [l1, l2], availableTags: ['Characters'], onSetLayerVisibility })
    fireEvent.click(screen.getByTestId('tag-visibility-Characters'))
    expect(onSetLayerVisibility).toHaveBeenCalledWith(['l1', 'l2'], true)
  })

  it('clicking tag visibility when all hidden calls onSetLayerVisibility with true', () => {
    const onSetLayerVisibility = vi.fn()
    const l1 = { ...createLayer('Hero', 'l1'), tags: ['Characters'], visible: false }
    const l2 = { ...createLayer('Villain', 'l2'), tags: ['Characters'], visible: false }
    renderTags({ layers: [l1, l2], availableTags: ['Characters'], onSetLayerVisibility })
    fireEvent.click(screen.getByTestId('tag-visibility-Characters'))
    expect(onSetLayerVisibility).toHaveBeenCalledWith(['l1', 'l2'], true)
  })

  it('clicking tag visibility does NOT trigger collapse toggle', () => {
    const l1 = { ...createLayer('Hero', 'l1'), tags: ['Characters'] }
    renderTags({ layers: [l1], availableTags: ['Characters'] })
    fireEvent.click(screen.getByTestId('tag-visibility-Characters'))
    // Layer rows should still be visible (not collapsed)
    expect(screen.getByTestId('tag-layer-row-Characters-l1')).toBeTruthy()
  })

  it('empty tag shows eye icon', () => {
    renderTags({ availableTags: ['Characters'] })
    expect(screen.getByTestId('tag-visibility-Characters').textContent).toBe('\u{1F441}')
  })

  it('empty tag click calls onSetLayerVisibility with empty array and false', () => {
    const onSetLayerVisibility = vi.fn()
    renderTags({ availableTags: ['Characters'], onSetLayerVisibility })
    fireEvent.click(screen.getByTestId('tag-visibility-Characters'))
    expect(onSetLayerVisibility).toHaveBeenCalledWith([], false)
  })
})
