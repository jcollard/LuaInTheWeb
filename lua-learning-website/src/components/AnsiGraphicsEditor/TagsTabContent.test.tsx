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

  // --- Visibility toggle tests ---

  it('layer row shows visibility toggle button', () => {
    const layer = { ...createLayer('Hero', 'l1'), tags: ['Characters'] }
    renderTags({ layers: [layer], availableTags: ['Characters'] })
    const row = screen.getByTestId('tag-layer-row-Characters-l1')
    const btn = row.querySelector('[aria-label="Toggle visibility"]')
    expect(btn).toBeTruthy()
  })

  it('shows eye icon for visible layer', () => {
    const layer = { ...createLayer('Hero', 'l1'), tags: ['Characters'], visible: true }
    renderTags({ layers: [layer], availableTags: ['Characters'] })
    const row = screen.getByTestId('tag-layer-row-Characters-l1')
    const btn = row.querySelector('[aria-label="Toggle visibility"]')!
    expect(btn.textContent).toBe('\u{1F441}')
  })

  it('shows hidden icon for hidden layer', () => {
    const layer = { ...createLayer('Hero', 'l1'), tags: ['Characters'], visible: false }
    renderTags({ layers: [layer], availableTags: ['Characters'] })
    const row = screen.getByTestId('tag-layer-row-Characters-l1')
    const btn = row.querySelector('[aria-label="Toggle visibility"]')!
    expect(btn.textContent).toBe('\u{1F441}\u{200D}\u{1F5E8}')
  })

  it('clicking visibility toggle calls onToggleVisibility', () => {
    const onToggleVisibility = vi.fn()
    const layer = { ...createLayer('Hero', 'l1'), tags: ['Characters'] }
    renderTags({ layers: [layer], availableTags: ['Characters'], onToggleVisibility })
    const row = screen.getByTestId('tag-layer-row-Characters-l1')
    const btn = row.querySelector('[aria-label="Toggle visibility"]')!
    fireEvent.click(btn)
    expect(onToggleVisibility).toHaveBeenCalledWith('l1')
  })

  it('clicking visibility toggle does NOT trigger onSetActive', () => {
    const onSetActive = vi.fn()
    const layer = { ...createLayer('Hero', 'l1'), tags: ['Characters'] }
    renderTags({ layers: [layer], availableTags: ['Characters'], onSetActive })
    const row = screen.getByTestId('tag-layer-row-Characters-l1')
    const btn = row.querySelector('[aria-label="Toggle visibility"]')!
    fireEvent.click(btn)
    expect(onSetActive).not.toHaveBeenCalled()
  })

  // --- Layer rename tests ---

  it('double-clicking layer row starts rename with input', () => {
    const layer = { ...createLayer('Hero', 'l1'), tags: ['Characters'] }
    renderTags({ layers: [layer], availableTags: ['Characters'] })
    const row = screen.getByTestId('tag-layer-row-Characters-l1')
    const nameSpan = row.querySelector('span')!
    fireEvent.doubleClick(nameSpan)
    expect(screen.getByTestId('tag-layer-rename-input-l1')).toBeTruthy()
  })

  it('rename input is prefilled with current name', () => {
    const layer = { ...createLayer('Hero', 'l1'), tags: ['Characters'] }
    renderTags({ layers: [layer], availableTags: ['Characters'] })
    const row = screen.getByTestId('tag-layer-row-Characters-l1')
    const nameSpan = row.querySelector('span')!
    fireEvent.doubleClick(nameSpan)
    expect(screen.getByTestId<HTMLInputElement>('tag-layer-rename-input-l1').value).toBe('Hero')
  })

  it('Enter commits rename and calls onRenameLayer', () => {
    const onRenameLayer = vi.fn()
    const layer = { ...createLayer('Hero', 'l1'), tags: ['Characters'] }
    renderTags({ layers: [layer], availableTags: ['Characters'], onRenameLayer })
    const row = screen.getByTestId('tag-layer-row-Characters-l1')
    const nameSpan = row.querySelector('span')!
    fireEvent.doubleClick(nameSpan)
    const input = screen.getByTestId('tag-layer-rename-input-l1')
    fireEvent.change(input, { target: { value: 'Warrior' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onRenameLayer).toHaveBeenCalledWith('l1', 'Warrior')
  })

  it('Escape cancels rename without calling onRenameLayer', () => {
    const onRenameLayer = vi.fn()
    const layer = { ...createLayer('Hero', 'l1'), tags: ['Characters'] }
    renderTags({ layers: [layer], availableTags: ['Characters'], onRenameLayer })
    const row = screen.getByTestId('tag-layer-row-Characters-l1')
    const nameSpan = row.querySelector('span')!
    fireEvent.doubleClick(nameSpan)
    const input = screen.getByTestId('tag-layer-rename-input-l1')
    fireEvent.change(input, { target: { value: 'Warrior' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onRenameLayer).not.toHaveBeenCalled()
  })

  it('blur commits rename', () => {
    const onRenameLayer = vi.fn()
    const layer = { ...createLayer('Hero', 'l1'), tags: ['Characters'] }
    renderTags({ layers: [layer], availableTags: ['Characters'], onRenameLayer })
    const row = screen.getByTestId('tag-layer-row-Characters-l1')
    const nameSpan = row.querySelector('span')!
    fireEvent.doubleClick(nameSpan)
    const input = screen.getByTestId('tag-layer-rename-input-l1')
    fireEvent.change(input, { target: { value: 'Warrior' } })
    fireEvent.blur(input)
    expect(onRenameLayer).toHaveBeenCalledWith('l1', 'Warrior')
  })

  it('does not commit rename if name unchanged', () => {
    const onRenameLayer = vi.fn()
    const layer = { ...createLayer('Hero', 'l1'), tags: ['Characters'] }
    renderTags({ layers: [layer], availableTags: ['Characters'], onRenameLayer })
    const row = screen.getByTestId('tag-layer-row-Characters-l1')
    const nameSpan = row.querySelector('span')!
    fireEvent.doubleClick(nameSpan)
    const input = screen.getByTestId('tag-layer-rename-input-l1')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onRenameLayer).not.toHaveBeenCalled()
  })

  it('does not commit rename if name is whitespace', () => {
    const onRenameLayer = vi.fn()
    const layer = { ...createLayer('Hero', 'l1'), tags: ['Characters'] }
    renderTags({ layers: [layer], availableTags: ['Characters'], onRenameLayer })
    const row = screen.getByTestId('tag-layer-row-Characters-l1')
    const nameSpan = row.querySelector('span')!
    fireEvent.doubleClick(nameSpan)
    const input = screen.getByTestId('tag-layer-rename-input-l1')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onRenameLayer).not.toHaveBeenCalled()
  })

  it('clicking rename input does NOT trigger onSetActive', () => {
    const onSetActive = vi.fn()
    const layer = { ...createLayer('Hero', 'l1'), tags: ['Characters'] }
    renderTags({ layers: [layer], availableTags: ['Characters'], onSetActive })
    const row = screen.getByTestId('tag-layer-row-Characters-l1')
    const nameSpan = row.querySelector('span')!
    fireEvent.doubleClick(nameSpan)
    const input = screen.getByTestId('tag-layer-rename-input-l1')
    fireEvent.click(input)
    expect(onSetActive).not.toHaveBeenCalled()
  })
})
