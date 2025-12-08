import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { TabBar } from './TabBar'
import { renderHook, act } from '@testing-library/react'
import { useTabBar } from './useTabBar'

describe('TabBar', () => {
  const defaultTabs = [
    { path: '/main.lua', name: 'main.lua', isDirty: false },
    { path: '/utils/math.lua', name: 'math.lua', isDirty: true },
    { path: '/config.lua', name: 'config.lua', isDirty: false },
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

  describe('overflow', () => {
    it('should have horizontal scroll when tabs overflow', () => {
      // Arrange & Act
      render(<TabBar {...defaultProps} />)

      // Assert
      const tablist = screen.getByRole('tablist')
      expect(tablist).toHaveStyle({ overflowX: 'auto' })
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
})

describe('useTabBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('tab management', () => {
    it('should initialize with empty tabs', () => {
      // Arrange & Act
      const { result } = renderHook(() => useTabBar())

      // Assert
      expect(result.current.tabs).toEqual([])
      expect(result.current.activeTab).toBeNull()
    })

    it('should open new tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      // Act
      act(() => {
        result.current.openTab('/main.lua', 'main.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs[0]).toMatchObject({
        path: '/main.lua',
        name: 'main.lua',
      })
    })

    it('should set active tab when opening', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      // Act
      act(() => {
        result.current.openTab('/main.lua', 'main.lua')
      })

      // Assert
      expect(result.current.activeTab).toBe('/main.lua')
    })

    it('should not duplicate tabs', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      // Act
      act(() => {
        result.current.openTab('/main.lua', 'main.lua')
        result.current.openTab('/main.lua', 'main.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(1)
    })

    it('should close tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/main.lua', 'main.lua')
        result.current.openTab('/config.lua', 'config.lua')
      })

      // Act
      act(() => {
        result.current.closeTab('/main.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs[0].path).toBe('/config.lua')
    })

    it('should select next tab when closing active tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/a.lua', 'a.lua')
        result.current.openTab('/b.lua', 'b.lua')
        result.current.openTab('/c.lua', 'c.lua')
        result.current.selectTab('/b.lua')
      })

      // Act
      act(() => {
        result.current.closeTab('/b.lua')
      })

      // Assert
      expect(result.current.activeTab).toBe('/c.lua')
    })

    it('should not change tabs when closing non-existent tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/a.lua', 'a.lua')
        result.current.openTab('/b.lua', 'b.lua')
      })

      // Act
      act(() => {
        result.current.closeTab('/nonexistent.lua')
      })

      // Assert - tabs unchanged
      expect(result.current.tabs).toHaveLength(2)
      expect(result.current.activeTab).toBe('/b.lua')
    })

    it('should not change activeTab when closing non-active tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/a.lua', 'a.lua')
        result.current.openTab('/b.lua', 'b.lua')
        result.current.openTab('/c.lua', 'c.lua')
        result.current.selectTab('/a.lua')
      })

      // Act - close non-active tab
      act(() => {
        result.current.closeTab('/b.lua')
      })

      // Assert - activeTab unchanged
      expect(result.current.tabs).toHaveLength(2)
      expect(result.current.activeTab).toBe('/a.lua')
    })

    it('should set activeTab to null when closing the only tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/only.lua', 'only.lua')
      })

      // Act
      act(() => {
        result.current.closeTab('/only.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(0)
      expect(result.current.activeTab).toBeNull()
    })

    it('should select last tab when closing last tab in list', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/a.lua', 'a.lua')
        result.current.openTab('/b.lua', 'b.lua')
        result.current.openTab('/c.lua', 'c.lua')
        // c.lua is active (last opened)
      })

      // Act - close the last tab (c.lua which is also active)
      act(() => {
        result.current.closeTab('/c.lua')
      })

      // Assert - should select b.lua (the new last tab)
      expect(result.current.activeTab).toBe('/b.lua')
    })
  })

  describe('dirty state', () => {
    it('should track dirty state per tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/main.lua', 'main.lua')
      })

      // Act
      act(() => {
        result.current.setDirty('/main.lua', true)
      })

      // Assert
      expect(result.current.tabs[0].isDirty).toBe(true)
    })

    it('should clear dirty state', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/main.lua', 'main.lua')
        result.current.setDirty('/main.lua', true)
      })

      // Act
      act(() => {
        result.current.setDirty('/main.lua', false)
      })

      // Assert
      expect(result.current.tabs[0].isDirty).toBe(false)
    })

    it('should only update dirty state for matching path', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/a.lua', 'a.lua')
        result.current.openTab('/b.lua', 'b.lua')
        result.current.setDirty('/a.lua', true)
      })

      // Act - set dirty on b.lua only
      act(() => {
        result.current.setDirty('/b.lua', true)
      })

      // Assert - both should be dirty, showing path matching works
      expect(result.current.tabs[0].isDirty).toBe(true) // a.lua
      expect(result.current.tabs[1].isDirty).toBe(true) // b.lua
    })

    it('should not affect other tabs when setting dirty state', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/a.lua', 'a.lua')
        result.current.openTab('/b.lua', 'b.lua')
      })

      // Act - set dirty on b.lua only
      act(() => {
        result.current.setDirty('/b.lua', true)
      })

      // Assert - a.lua should still be clean
      expect(result.current.tabs[0].isDirty).toBe(false) // a.lua unchanged
      expect(result.current.tabs[1].isDirty).toBe(true) // b.lua dirty
    })
  })

  describe('renameTab', () => {
    it('should rename tab path and name', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/old.lua', 'old.lua')
      })

      // Act
      act(() => {
        result.current.renameTab('/old.lua', '/new.lua', 'new.lua')
      })

      // Assert
      expect(result.current.tabs[0].path).toBe('/new.lua')
      expect(result.current.tabs[0].name).toBe('new.lua')
    })

    it('should update activeTab when renaming active tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/old.lua', 'old.lua')
      })
      expect(result.current.activeTab).toBe('/old.lua')

      // Act
      act(() => {
        result.current.renameTab('/old.lua', '/new.lua', 'new.lua')
      })

      // Assert
      expect(result.current.activeTab).toBe('/new.lua')
    })

    it('should not change activeTab when renaming inactive tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/a.lua', 'a.lua')
        result.current.openTab('/b.lua', 'b.lua')
        result.current.selectTab('/a.lua')
      })
      expect(result.current.activeTab).toBe('/a.lua')

      // Act - rename inactive tab b.lua
      act(() => {
        result.current.renameTab('/b.lua', '/c.lua', 'c.lua')
      })

      // Assert - activeTab should still be a.lua
      expect(result.current.activeTab).toBe('/a.lua')
      expect(result.current.tabs[1].path).toBe('/c.lua')
    })

    it('should only rename matching tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())
      act(() => {
        result.current.openTab('/a.lua', 'a.lua')
        result.current.openTab('/b.lua', 'b.lua')
      })

      // Act - rename b.lua
      act(() => {
        result.current.renameTab('/b.lua', '/c.lua', 'c.lua')
      })

      // Assert - a.lua should be unchanged
      expect(result.current.tabs[0].path).toBe('/a.lua')
      expect(result.current.tabs[0].name).toBe('a.lua')
      expect(result.current.tabs[1].path).toBe('/c.lua')
      expect(result.current.tabs[1].name).toBe('c.lua')
    })
  })
})
