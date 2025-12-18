import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { TabBar } from './TabBar'
import * as useTabBarScrollModule from './useTabBarScroll'

describe('TabBar', () => {
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

  describe('rendering', () => {
    it('should render list of tabs', () => {
      // Arrange & Act
      render(<TabBar {...defaultProps} />)

      // Assert
      expect(screen.getByText('main.lua')).toBeInTheDocument()
      expect(screen.getByText('math.lua')).toBeInTheDocument()
      expect(screen.getByText('config.lua')).toBeInTheDocument()
    })

    it('should render empty state when no tabs', () => {
      // Arrange & Act
      render(<TabBar {...defaultProps} tabs={[]} activeTab={null} />)

      // Assert
      expect(screen.queryByRole('tab')).not.toBeInTheDocument()
      // Empty state should still hide overflow
      const tablist = screen.getByRole('tablist')
      expect(tablist).toHaveStyle({ overflow: 'hidden' })
    })

    it('should apply custom className when provided', () => {
      // Arrange & Act
      render(<TabBar {...defaultProps} className="custom-class" />)

      // Assert
      const tablist = screen.getByRole('tablist')
      expect(tablist).toHaveClass('custom-class')
    })
  })

  describe('active tab', () => {
    it('should highlight active tab', () => {
      // Arrange & Act
      render(<TabBar {...defaultProps} activeTab="/main.lua" />)

      // Assert
      const tabs = screen.getAllByRole('tab')
      const activeTab = tabs.find(tab => tab.getAttribute('aria-selected') === 'true')
      expect(activeTab).toHaveTextContent('main.lua')
    })

    it('should not highlight inactive tabs', () => {
      // Arrange & Act
      render(<TabBar {...defaultProps} activeTab="/main.lua" />)

      // Assert
      const tabs = screen.getAllByRole('tab')
      const inactiveTabs = tabs.filter(tab => tab.getAttribute('aria-selected') === 'false')
      expect(inactiveTabs).toHaveLength(2)
    })

    it('should apply active class to active tab', () => {
      // Arrange & Act
      render(<TabBar {...defaultProps} activeTab="/main.lua" />)

      // Assert
      const tabs = screen.getAllByRole('tab')
      const activeTab = tabs.find(tab => tab.getAttribute('aria-selected') === 'true')
      // CSS module class names are hashed, so check for substring
      expect(activeTab?.className).toMatch(/_active_/)
    })

    it('should apply tab class to all tabs', () => {
      // Arrange & Act
      render(<TabBar {...defaultProps} />)

      // Assert
      const tabs = screen.getAllByRole('tab')
      tabs.forEach(tab => {
        // CSS module class names are hashed, so check for substring
        expect(tab.className).toMatch(/_tab_/)
      })
    })

    it('should not apply active class to inactive tabs', () => {
      // Arrange & Act
      render(<TabBar {...defaultProps} activeTab="/main.lua" />)

      // Assert
      const tabs = screen.getAllByRole('tab')
      const inactiveTabs = tabs.filter(tab => tab.getAttribute('aria-selected') === 'false')
      inactiveTabs.forEach(tab => {
        // CSS module class names are hashed, so check for substring
        expect(tab.className).not.toMatch(/_active_/)
      })
    })
  })

  describe('dirty indicator', () => {
    it('should show dirty indicator (*) for unsaved tabs', () => {
      // Arrange & Act
      render(<TabBar {...defaultProps} />)

      // Assert - math.lua has isDirty: true
      const mathTab = screen.getByText('math.lua').closest('[role="tab"]')
      expect(mathTab?.textContent).toContain('*')
    })

    it('should not show dirty indicator for saved tabs', () => {
      // Arrange & Act
      render(<TabBar {...defaultProps} />)

      // Assert - main.lua has isDirty: false
      const mainTab = screen.getByText('main.lua').closest('[role="tab"]')
      expect(mainTab?.textContent).not.toContain('*')
    })
  })

  describe('tab selection', () => {
    it('should call onSelect when tab clicked', () => {
      // Arrange
      const onSelect = vi.fn()
      render(<TabBar {...defaultProps} onSelect={onSelect} />)

      // Act
      fireEvent.click(screen.getByText('config.lua'))

      // Assert
      expect(onSelect).toHaveBeenCalledWith('/config.lua')
    })
  })

  describe('tab close', () => {
    it('should show close button on each tab', () => {
      // Arrange & Act
      render(<TabBar {...defaultProps} />)

      // Assert
      const closeButtons = screen.getAllByRole('button', { name: /close/i })
      expect(closeButtons).toHaveLength(3)
    })

    it('should call onClose when close button clicked', () => {
      // Arrange
      const onClose = vi.fn()
      render(<TabBar {...defaultProps} onClose={onClose} />)

      // Act - close the first tab
      const closeButtons = screen.getAllByRole('button', { name: /close/i })
      fireEvent.click(closeButtons[0])

      // Assert
      expect(onClose).toHaveBeenCalledWith('/main.lua')
    })

    it('should not trigger onSelect when close button clicked', () => {
      // Arrange
      const onSelect = vi.fn()
      const onClose = vi.fn()
      render(<TabBar {...defaultProps} onSelect={onSelect} onClose={onClose} />)

      // Act - close a tab
      const closeButtons = screen.getAllByRole('button', { name: /close/i })
      fireEvent.click(closeButtons[0])

      // Assert
      expect(onClose).toHaveBeenCalled()
      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe('overflow navigation', () => {
    const mockScrollLeft = vi.fn()
    const mockScrollRight = vi.fn()
    const mockHandleScroll = vi.fn()
    const mockCheckOverflow = vi.fn()
    const mockSetContainerRef = vi.fn()

    beforeEach(() => {
      vi.clearAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should hide navigation arrows when no overflow', () => {
      // Arrange - mock hook to return no overflow
      vi.spyOn(useTabBarScrollModule, 'useTabBarScroll').mockReturnValue({
        canScrollLeft: false,
        canScrollRight: false,
        hasOverflow: false,
        scrollLeft: mockScrollLeft,
        scrollRight: mockScrollRight,
        handleScroll: mockHandleScroll,
        checkOverflow: mockCheckOverflow,
        setContainerRef: mockSetContainerRef,
      })

      // Act
      render(<TabBar {...defaultProps} />)

      // Assert - no arrows when no overflow
      expect(screen.queryByRole('button', { name: /scroll left/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /scroll right/i })).not.toBeInTheDocument()
    })

    it('should show only right arrow when at start with overflow', () => {
      // Arrange - mock hook to return overflow at start
      vi.spyOn(useTabBarScrollModule, 'useTabBarScroll').mockReturnValue({
        canScrollLeft: false,
        canScrollRight: true,
        hasOverflow: true,
        scrollLeft: mockScrollLeft,
        scrollRight: mockScrollRight,
        handleScroll: mockHandleScroll,
        checkOverflow: mockCheckOverflow,
        setContainerRef: mockSetContainerRef,
      })

      // Act
      render(<TabBar {...defaultProps} />)

      // Assert
      expect(screen.queryByRole('button', { name: /scroll left/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /scroll right/i })).toBeInTheDocument()
    })

    it('should show both arrows when in middle', () => {
      // Arrange - mock hook to return overflow in middle
      vi.spyOn(useTabBarScrollModule, 'useTabBarScroll').mockReturnValue({
        canScrollLeft: true,
        canScrollRight: true,
        hasOverflow: true,
        scrollLeft: mockScrollLeft,
        scrollRight: mockScrollRight,
        handleScroll: mockHandleScroll,
        checkOverflow: mockCheckOverflow,
        setContainerRef: mockSetContainerRef,
      })

      // Act
      render(<TabBar {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button', { name: /scroll left/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /scroll right/i })).toBeInTheDocument()
    })

    it('should show only left arrow when at end', () => {
      // Arrange - mock hook to return overflow at end
      vi.spyOn(useTabBarScrollModule, 'useTabBarScroll').mockReturnValue({
        canScrollLeft: true,
        canScrollRight: false,
        hasOverflow: true,
        scrollLeft: mockScrollLeft,
        scrollRight: mockScrollRight,
        handleScroll: mockHandleScroll,
        checkOverflow: mockCheckOverflow,
        setContainerRef: mockSetContainerRef,
      })

      // Act
      render(<TabBar {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button', { name: /scroll left/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /scroll right/i })).not.toBeInTheDocument()
    })

    it('should call scrollRight when right arrow is clicked', () => {
      // Arrange
      vi.spyOn(useTabBarScrollModule, 'useTabBarScroll').mockReturnValue({
        canScrollLeft: false,
        canScrollRight: true,
        hasOverflow: true,
        scrollLeft: mockScrollLeft,
        scrollRight: mockScrollRight,
        handleScroll: mockHandleScroll,
        checkOverflow: mockCheckOverflow,
        setContainerRef: mockSetContainerRef,
      })

      render(<TabBar {...defaultProps} />)

      // Act
      fireEvent.click(screen.getByRole('button', { name: /scroll right/i }))

      // Assert
      expect(mockScrollRight).toHaveBeenCalledTimes(1)
    })

    it('should call scrollLeft when left arrow is clicked', () => {
      // Arrange
      vi.spyOn(useTabBarScrollModule, 'useTabBarScroll').mockReturnValue({
        canScrollLeft: true,
        canScrollRight: false,
        hasOverflow: true,
        scrollLeft: mockScrollLeft,
        scrollRight: mockScrollRight,
        handleScroll: mockHandleScroll,
        checkOverflow: mockCheckOverflow,
        setContainerRef: mockSetContainerRef,
      })

      render(<TabBar {...defaultProps} />)

      // Act
      fireEvent.click(screen.getByRole('button', { name: /scroll left/i }))

      // Assert
      expect(mockScrollLeft).toHaveBeenCalledTimes(1)
    })

    it('should hide scrollbar on tablist container', () => {
      // Arrange & Act
      render(<TabBar {...defaultProps} />)

      // Assert - tablist container should hide overflow
      const tablist = screen.getByRole('tablist')
      expect(tablist).toHaveStyle({ overflow: 'hidden' })
    })

    it('should call checkOverflow when tabs change', () => {
      // Arrange
      vi.spyOn(useTabBarScrollModule, 'useTabBarScroll').mockReturnValue({
        canScrollLeft: false,
        canScrollRight: false,
        hasOverflow: false,
        scrollLeft: mockScrollLeft,
        scrollRight: mockScrollRight,
        handleScroll: mockHandleScroll,
        checkOverflow: mockCheckOverflow,
        setContainerRef: mockSetContainerRef,
      })

      const { rerender } = render(<TabBar {...defaultProps} />)

      // checkOverflow should be called on initial render
      expect(mockCheckOverflow).toHaveBeenCalled()
      mockCheckOverflow.mockClear()

      // Act - rerender with different tabs
      const newTabs = [...defaultTabs, { path: '/new.lua', name: 'new.lua', isDirty: false, type: 'file' as const, isPreview: false, isPinned: false }]
      rerender(<TabBar {...defaultProps} tabs={newTabs} />)

      // Assert - checkOverflow should be called again
      expect(mockCheckOverflow).toHaveBeenCalled()
    })

    it('should pass setContainerRef to tabs container', () => {
      // Arrange
      vi.spyOn(useTabBarScrollModule, 'useTabBarScroll').mockReturnValue({
        canScrollLeft: false,
        canScrollRight: false,
        hasOverflow: false,
        scrollLeft: mockScrollLeft,
        scrollRight: mockScrollRight,
        handleScroll: mockHandleScroll,
        checkOverflow: mockCheckOverflow,
        setContainerRef: mockSetContainerRef,
      })

      // Act
      render(<TabBar {...defaultProps} />)

      // Assert - setContainerRef should have been called (ref callback)
      expect(mockSetContainerRef).toHaveBeenCalled()
    })

    it('should not show arrows when hasOverflow is false even if canScroll is true', () => {
      // Arrange - edge case: hasOverflow is false but canScroll values are true
      vi.spyOn(useTabBarScrollModule, 'useTabBarScroll').mockReturnValue({
        canScrollLeft: true,
        canScrollRight: true,
        hasOverflow: false, // No overflow means no arrows regardless of canScroll
        scrollLeft: mockScrollLeft,
        scrollRight: mockScrollRight,
        handleScroll: mockHandleScroll,
        checkOverflow: mockCheckOverflow,
        setContainerRef: mockSetContainerRef,
      })

      // Act
      render(<TabBar {...defaultProps} />)

      // Assert - no arrows because hasOverflow is false
      expect(screen.queryByRole('button', { name: /scroll left/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /scroll right/i })).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have role tablist', () => {
      // Arrange & Act
      render(<TabBar {...defaultProps} />)

      // Assert
      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })

    it('should have role tab for each tab', () => {
      // Arrange & Act
      render(<TabBar {...defaultProps} />)

      // Assert
      expect(screen.getAllByRole('tab')).toHaveLength(3)
    })
  })

  describe('pinned tabs', () => {
    it('should apply pinned class to pinned tabs', () => {
      // Arrange
      const tabsWithPinned = [
        { path: '/pinned.lua', name: 'pinned.lua', isDirty: false, isPreview: false, type: 'file' as const, isPinned: true },
        { path: '/normal.lua', name: 'normal.lua', isDirty: false, isPreview: false, type: 'file' as const, isPinned: false },
      ]

      // Act
      render(<TabBar {...defaultProps} tabs={tabsWithPinned} />)

      // Assert
      const tabs = screen.getAllByRole('tab')
      expect(tabs[0].className).toMatch(/_pinned_/)
      expect(tabs[1].className).not.toMatch(/_pinned_/)
    })

    it('should show pin indicator for pinned tabs', () => {
      // Arrange
      const tabsWithPinned = [
        { path: '/pinned.lua', name: 'pinned.lua', isDirty: false, isPreview: false, type: 'file' as const, isPinned: true },
      ]

      // Act
      render(<TabBar {...defaultProps} tabs={tabsWithPinned} activeTab="/pinned.lua" />)

      // Assert - should find the pin icon
      const tab = screen.getByRole('tab')
      const pinIcon = tab.querySelector('[data-testid="pin-icon"]')
      expect(pinIcon).toBeInTheDocument()
    })

    it('should hide close button for pinned tabs', () => {
      // Arrange
      const tabsWithPinned = [
        { path: '/pinned.lua', name: 'pinned.lua', isDirty: false, isPreview: false, type: 'file' as const, isPinned: true },
        { path: '/normal.lua', name: 'normal.lua', isDirty: false, isPreview: false, type: 'file' as const, isPinned: false },
      ]

      // Act
      render(<TabBar {...defaultProps} tabs={tabsWithPinned} />)

      // Assert - only one close button (for the non-pinned tab)
      const closeButtons = screen.getAllByRole('button', { name: /close/i })
      expect(closeButtons).toHaveLength(1)
    })

    it('should not apply pinned class to non-pinned tabs', () => {
      // Arrange & Act
      render(<TabBar {...defaultProps} />)

      // Assert
      const tabs = screen.getAllByRole('tab')
      tabs.forEach(tab => {
        expect(tab.className).not.toMatch(/_pinned_/)
      })
    })
  })

  describe('context menu', () => {
    it('should open context menu on right-click', () => {
      // Arrange
      render(<TabBar {...defaultProps} />)
      const tab = screen.getAllByRole('tab')[0]

      // Act
      fireEvent.contextMenu(tab)

      // Assert
      expect(screen.getByRole('menu')).toBeInTheDocument()
    })

    it('should show Pin option for unpinned tabs', () => {
      // Arrange
      render(<TabBar {...defaultProps} />)
      const tab = screen.getAllByRole('tab')[0]

      // Act
      fireEvent.contextMenu(tab)

      // Assert
      expect(screen.getByRole('menuitem', { name: /pin/i })).toBeInTheDocument()
    })

    it('should show Unpin option for pinned tabs', () => {
      // Arrange
      const tabsWithPinned = [
        { path: '/pinned.lua', name: 'pinned.lua', isDirty: false, isPreview: false, type: 'file' as const, isPinned: true },
      ]
      render(<TabBar {...defaultProps} tabs={tabsWithPinned} activeTab="/pinned.lua" />)
      const tab = screen.getByRole('tab')

      // Act
      fireEvent.contextMenu(tab)

      // Assert
      expect(screen.getByRole('menuitem', { name: /unpin/i })).toBeInTheDocument()
    })

    it('should call onPinTab when Pin is clicked', () => {
      // Arrange
      const onPinTab = vi.fn()
      render(<TabBar {...defaultProps} onPinTab={onPinTab} />)
      const tab = screen.getAllByRole('tab')[0]

      // Act
      fireEvent.contextMenu(tab)
      fireEvent.click(screen.getByRole('menuitem', { name: /pin/i }))

      // Assert
      expect(onPinTab).toHaveBeenCalledWith('/main.lua')
    })

    it('should call onUnpinTab when Unpin is clicked', () => {
      // Arrange
      const onUnpinTab = vi.fn()
      const tabsWithPinned = [
        { path: '/pinned.lua', name: 'pinned.lua', isDirty: false, isPreview: false, type: 'file' as const, isPinned: true },
      ]
      render(<TabBar {...defaultProps} tabs={tabsWithPinned} activeTab="/pinned.lua" onUnpinTab={onUnpinTab} />)
      const tab = screen.getByRole('tab')

      // Act
      fireEvent.contextMenu(tab)
      fireEvent.click(screen.getByRole('menuitem', { name: /unpin/i }))

      // Assert
      expect(onUnpinTab).toHaveBeenCalledWith('/pinned.lua')
    })

    it('should call onClose when Close is clicked from context menu', () => {
      // Arrange
      const onClose = vi.fn()
      render(<TabBar {...defaultProps} onClose={onClose} />)
      const tab = screen.getAllByRole('tab')[0]

      // Act
      fireEvent.contextMenu(tab)
      fireEvent.click(screen.getByRole('menuitem', { name: /^close$/i }))

      // Assert
      expect(onClose).toHaveBeenCalledWith('/main.lua')
    })

    it('should call onCloseToRight when Close to Right is clicked', () => {
      // Arrange
      const onCloseToRight = vi.fn()
      render(<TabBar {...defaultProps} onCloseToRight={onCloseToRight} />)
      const tab = screen.getAllByRole('tab')[0]

      // Act
      fireEvent.contextMenu(tab)
      fireEvent.click(screen.getByRole('menuitem', { name: /close to right/i }))

      // Assert
      expect(onCloseToRight).toHaveBeenCalledWith('/main.lua')
    })

    it('should call onCloseOthers when Close Others is clicked', () => {
      // Arrange
      const onCloseOthers = vi.fn()
      render(<TabBar {...defaultProps} onCloseOthers={onCloseOthers} />)
      const tab = screen.getAllByRole('tab')[0]

      // Act
      fireEvent.contextMenu(tab)
      fireEvent.click(screen.getByRole('menuitem', { name: /close others/i }))

      // Assert
      expect(onCloseOthers).toHaveBeenCalledWith('/main.lua')
    })

    it('should close context menu after selecting an option', () => {
      // Arrange
      const onClose = vi.fn()
      render(<TabBar {...defaultProps} onClose={onClose} />)
      const tab = screen.getAllByRole('tab')[0]

      // Act
      fireEvent.contextMenu(tab)
      fireEvent.click(screen.getByRole('menuitem', { name: /^close$/i }))

      // Assert - menu should be closed
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('should disable Close option for pinned tabs', () => {
      // Arrange
      const tabsWithPinned = [
        { path: '/pinned.lua', name: 'pinned.lua', isDirty: false, isPreview: false, type: 'file' as const, isPinned: true },
      ]
      render(<TabBar {...defaultProps} tabs={tabsWithPinned} activeTab="/pinned.lua" />)
      const tab = screen.getByRole('tab')

      // Act
      fireEvent.contextMenu(tab)

      // Assert
      const closeItem = screen.getByRole('menuitem', { name: /^close$/i })
      expect(closeItem).toBeDisabled()
    })
  })

  describe('drag and drop', () => {
    it('should make tabs draggable', () => {
      // Arrange & Act
      render(<TabBar {...defaultProps} />)

      // Assert
      const tabs = screen.getAllByRole('tab')
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('draggable', 'true')
      })
    })

    it('should call onReorder when a tab is dropped at a new position', () => {
      // Arrange
      const onReorder = vi.fn()
      render(<TabBar {...defaultProps} onReorder={onReorder} />)
      const tabs = screen.getAllByRole('tab')

      // Act - simulate drag and drop
      fireEvent.dragStart(tabs[0], {
        dataTransfer: { setData: vi.fn(), getData: () => '/main.lua' }
      })
      fireEvent.dragOver(tabs[2])
      fireEvent.drop(tabs[2], {
        dataTransfer: { getData: () => '/main.lua' }
      })

      // Assert
      expect(onReorder).toHaveBeenCalledWith('/main.lua', 2)
    })

    it('should not call onReorder when dropped at same position', () => {
      // Arrange
      const onReorder = vi.fn()
      render(<TabBar {...defaultProps} onReorder={onReorder} />)
      const tabs = screen.getAllByRole('tab')

      // Act - simulate drag and drop to same position
      fireEvent.dragStart(tabs[0], {
        dataTransfer: { setData: vi.fn(), getData: () => '/main.lua' }
      })
      fireEvent.dragOver(tabs[0])
      fireEvent.drop(tabs[0], {
        dataTransfer: { getData: () => '/main.lua' }
      })

      // Assert
      expect(onReorder).not.toHaveBeenCalled()
    })

    it('should apply drag-over class when dragging over a tab', () => {
      // Arrange
      render(<TabBar {...defaultProps} />)
      const tabs = screen.getAllByRole('tab')

      // Act
      fireEvent.dragStart(tabs[0], {
        dataTransfer: { setData: vi.fn() }
      })
      fireEvent.dragEnter(tabs[1])

      // Assert
      expect(tabs[1].className).toMatch(/_dragOver_/)
    })

    it('should remove drag-over class when drag leaves', () => {
      // Arrange
      render(<TabBar {...defaultProps} />)
      const tabs = screen.getAllByRole('tab')

      // Act
      fireEvent.dragStart(tabs[0], {
        dataTransfer: { setData: vi.fn() }
      })
      fireEvent.dragEnter(tabs[1])
      fireEvent.dragLeave(tabs[1])

      // Assert
      expect(tabs[1].className).not.toMatch(/_dragOver_/)
    })
  })

  describe('preview tabs', () => {
    it('should apply preview class to preview tabs', () => {
      // Arrange
      const tabsWithPreview = [
        { path: '/main.lua', name: 'main.lua', isDirty: false, isPreview: false, type: 'file' as const, isPinned: false },
        { path: '/preview.lua', name: 'preview.lua', isDirty: false, isPreview: true, type: 'file' as const, isPinned: false },
      ]

      // Act
      render(<TabBar {...defaultProps} tabs={tabsWithPreview} />)

      // Assert
      const tabs = screen.getAllByRole('tab')
      expect(tabs[0].className).not.toMatch(/_preview_/)
      expect(tabs[1].className).toMatch(/_preview_/)
    })

    it('should show preview tab name in italics via CSS class', () => {
      // Arrange
      const tabsWithPreview = [
        { path: '/preview.lua', name: 'preview.lua', isDirty: false, isPreview: true, type: 'file' as const, isPinned: false },
      ]

      // Act
      render(<TabBar {...defaultProps} tabs={tabsWithPreview} activeTab="/preview.lua" />)

      // Assert
      const tab = screen.getByRole('tab')
      expect(tab.className).toMatch(/_preview_/)
    })

    it('should not apply preview class to permanent tabs', () => {
      // Arrange
      const tabsWithPermanent = [
        { path: '/permanent.lua', name: 'permanent.lua', isDirty: false, isPreview: false, type: 'file' as const, isPinned: false },
      ]

      // Act
      render(<TabBar {...defaultProps} tabs={tabsWithPermanent} activeTab="/permanent.lua" />)

      // Assert
      const tab = screen.getByRole('tab')
      expect(tab.className).not.toMatch(/_preview_/)
    })
  })
})
