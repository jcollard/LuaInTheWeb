import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { ContextMenu } from './ContextMenu'
import { useContextMenu } from './useContextMenu'
import { renderHook, act } from '@testing-library/react'

describe('ContextMenu', () => {
  const defaultProps = {
    isOpen: true,
    position: { x: 100, y: 200 },
    items: [
      { id: 'new-file', label: 'New File' },
      { id: 'new-folder', label: 'New Folder' },
      { id: 'divider', type: 'divider' as const },
      { id: 'rename', label: 'Rename' },
      { id: 'delete', label: 'Delete' },
    ],
    onSelect: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render at specified position', () => {
      // Arrange & Act
      render(<ContextMenu {...defaultProps} />)

      // Assert
      const menu = screen.getByRole('menu')
      expect(menu).toHaveStyle({ left: '100px', top: '200px' })
    })

    it('should render menu items', () => {
      // Arrange & Act
      render(<ContextMenu {...defaultProps} />)

      // Assert
      expect(screen.getByText('New File')).toBeInTheDocument()
      expect(screen.getByText('New Folder')).toBeInTheDocument()
      expect(screen.getByText('Rename')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      // Arrange & Act
      render(<ContextMenu {...defaultProps} isOpen={false} />)

      // Assert
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('should render dividers', () => {
      // Arrange & Act
      render(<ContextMenu {...defaultProps} />)

      // Assert
      expect(screen.getByRole('separator')).toBeInTheDocument()
    })
  })

  describe('selection', () => {
    it('should call onSelect when item clicked', () => {
      // Arrange
      const onSelect = vi.fn()
      render(<ContextMenu {...defaultProps} onSelect={onSelect} />)

      // Act
      fireEvent.click(screen.getByText('New File'))

      // Assert
      expect(onSelect).toHaveBeenCalledWith('new-file')
    })

    it('should call onClose after selection', () => {
      // Arrange
      const onClose = vi.fn()
      render(<ContextMenu {...defaultProps} onClose={onClose} />)

      // Act
      fireEvent.click(screen.getByText('New File'))

      // Assert
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('close behavior', () => {
    it('should close when clicking outside', () => {
      // Arrange
      const onClose = vi.fn()
      render(
        <div>
          <ContextMenu {...defaultProps} onClose={onClose} />
          <div data-testid="outside">Outside</div>
        </div>
      )

      // Act
      fireEvent.mouseDown(screen.getByTestId('outside'))

      // Assert
      expect(onClose).toHaveBeenCalled()
    })

    it('should close on Escape key', () => {
      // Arrange
      const onClose = vi.fn()
      render(<ContextMenu {...defaultProps} onClose={onClose} />)

      // Act
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })

      // Assert
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('keyboard navigation', () => {
    it('should focus first item on open', () => {
      // Arrange & Act
      render(<ContextMenu {...defaultProps} />)

      // Assert
      const firstItem = screen.getAllByRole('menuitem')[0]
      expect(firstItem).toHaveFocus()
    })

    it('should move focus down with ArrowDown', () => {
      // Arrange
      render(<ContextMenu {...defaultProps} />)
      const items = screen.getAllByRole('menuitem')

      // Act
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' })

      // Assert
      expect(items[1]).toHaveFocus()
    })

    it('should move focus up with ArrowUp', () => {
      // Arrange
      render(<ContextMenu {...defaultProps} />)
      const items = screen.getAllByRole('menuitem')
      // First move down to second item using keyboard (updates internal state)
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' })
      expect(items[1]).toHaveFocus()

      // Act
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' })

      // Assert
      expect(items[0]).toHaveFocus()
    })

    it('should select item with Enter key', () => {
      // Arrange
      const onSelect = vi.fn()
      render(<ContextMenu {...defaultProps} onSelect={onSelect} />)

      // Act
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Enter' })

      // Assert
      expect(onSelect).toHaveBeenCalledWith('new-file')
    })
  })

  describe('accessibility', () => {
    it('should have role menu', () => {
      // Arrange & Act
      render(<ContextMenu {...defaultProps} />)

      // Assert
      expect(screen.getByRole('menu')).toBeInTheDocument()
    })

    it('should have menu items with role menuitem', () => {
      // Arrange & Act
      render(<ContextMenu {...defaultProps} />)

      // Assert
      expect(screen.getAllByRole('menuitem')).toHaveLength(4) // excluding divider
    })
  })
})

describe('useContextMenu', () => {
  it('should return show and hide functions', () => {
    // Arrange & Act
    const { result } = renderHook(() => useContextMenu())

    // Assert
    expect(result.current.show).toBeDefined()
    expect(result.current.hide).toBeDefined()
    expect(result.current.isOpen).toBe(false)
  })

  it('should track position when shown', () => {
    // Arrange
    const { result } = renderHook(() => useContextMenu())

    // Act
    act(() => {
      result.current.show(150, 250)
    })

    // Assert
    expect(result.current.isOpen).toBe(true)
    expect(result.current.position).toEqual({ x: 150, y: 250 })
  })

  it('should hide menu', () => {
    // Arrange
    const { result } = renderHook(() => useContextMenu())
    act(() => {
      result.current.show(100, 200)
    })

    // Act
    act(() => {
      result.current.hide()
    })

    // Assert
    expect(result.current.isOpen).toBe(false)
  })
})
