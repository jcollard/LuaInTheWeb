import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { TabBar } from './TabBar'

describe('TabBar middle-click to close', () => {
  const defaultTabs = [
    { path: '/main.lua', name: 'main.lua', isDirty: false, type: 'file' as const, isPreview: false, isPinned: false },
    { path: '/utils/math.lua', name: 'math.lua', isDirty: true, type: 'file' as const, isPreview: false, isPinned: false },
    { path: '/config.lua', name: 'config.lua', isDirty: false, type: 'file' as const, isPreview: false, isPinned: false },
  ]

  const defaultProps = {
    tabs: defaultTabs,
    activeTab: '/main.lua',
    onSelect: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should close unpinned tab on middle-click', () => {
    // Arrange
    const onClose = vi.fn()
    render(<TabBar {...defaultProps} onClose={onClose} />)
    const tab = screen.getAllByRole('tab')[0]

    // Act - middle-click (button === 1)
    fireEvent.mouseDown(tab, { button: 1 })

    // Assert
    expect(onClose).toHaveBeenCalledWith('/main.lua')
  })

  it('should not close pinned tab on middle-click', () => {
    // Arrange
    const onClose = vi.fn()
    const tabsWithPinned = [
      { path: '/pinned.lua', name: 'pinned.lua', isDirty: false, isPreview: false, type: 'file' as const, isPinned: true },
    ]
    render(<TabBar {...defaultProps} tabs={tabsWithPinned} activeTab="/pinned.lua" onClose={onClose} />)
    const tab = screen.getByRole('tab')

    // Act - middle-click on pinned tab
    fireEvent.mouseDown(tab, { button: 1 })

    // Assert
    expect(onClose).not.toHaveBeenCalled()
  })

  it('should prevent default on middle-click to avoid auto-scroll', () => {
    // Arrange
    render(<TabBar {...defaultProps} />)
    const tab = screen.getAllByRole('tab')[0]

    // Act
    const event = new MouseEvent('mousedown', { button: 1, bubbles: true, cancelable: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
    tab.dispatchEvent(event)

    // Assert
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('should not interfere with left-click (tab selection)', () => {
    // Arrange
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(<TabBar {...defaultProps} onSelect={onSelect} onClose={onClose} />)
    const tab = screen.getAllByRole('tab')[0]

    // Act - left-click (button === 0)
    fireEvent.mouseDown(tab, { button: 0 })
    fireEvent.click(tab)

    // Assert
    expect(onSelect).toHaveBeenCalledWith('/main.lua')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('should not interfere with right-click (context menu)', () => {
    // Arrange
    const onClose = vi.fn()
    render(<TabBar {...defaultProps} onClose={onClose} />)
    const tab = screen.getAllByRole('tab')[0]

    // Act - right-click (button === 2)
    fireEvent.mouseDown(tab, { button: 2 })

    // Assert
    expect(onClose).not.toHaveBeenCalled()
  })
})
