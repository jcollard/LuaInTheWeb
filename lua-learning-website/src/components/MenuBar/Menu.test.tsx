import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { Menu } from './Menu'
import type { MenuItemDefinition, MenuDividerDefinition } from './types'

describe('Menu', () => {
  const defaultItems: (MenuItemDefinition | MenuDividerDefinition)[] = [
    { id: 'item1', label: 'Item 1' },
    { id: 'item2', label: 'Item 2' },
    { type: 'divider' },
    { id: 'item3', label: 'Item 3', disabled: true },
  ]

  const defaultProps = {
    id: 'test-menu',
    label: 'Test',
    items: defaultItems,
    isOpen: true,
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render menu trigger button', () => {
      // Arrange & Act
      render(<Menu {...defaultProps} isOpen={false} />)

      // Assert
      expect(screen.getByRole('button', { name: 'Test' })).toBeInTheDocument()
    })

    it('should render dropdown when open', () => {
      // Arrange & Act
      render(<Menu {...defaultProps} />)

      // Assert
      expect(screen.getByRole('menu')).toBeInTheDocument()
    })

    it('should not render dropdown when closed', () => {
      // Arrange & Act
      render(<Menu {...defaultProps} isOpen={false} />)

      // Assert
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('should render all menu items', () => {
      // Arrange & Act
      render(<Menu {...defaultProps} />)

      // Assert
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
      expect(screen.getByText('Item 3')).toBeInTheDocument()
    })

    it('should render dividers', () => {
      // Arrange & Act
      render(<Menu {...defaultProps} />)

      // Assert
      expect(screen.getByRole('separator')).toBeInTheDocument()
    })
  })

  describe('trigger button', () => {
    it('should have aria-expanded true when open', () => {
      // Arrange & Act
      render(<Menu {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
    })

    it('should have aria-expanded false when closed', () => {
      // Arrange & Act
      render(<Menu {...defaultProps} isOpen={false} />)

      // Assert
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-expanded',
        'false'
      )
    })

    it('should have aria-haspopup menu', () => {
      // Arrange & Act
      render(<Menu {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-haspopup',
        'menu'
      )
    })

    it('should call onToggle when clicked', () => {
      // Arrange
      const onToggle = vi.fn()
      render(<Menu {...defaultProps} onToggle={onToggle} />)

      // Act
      fireEvent.click(screen.getByRole('button'))

      // Assert
      expect(onToggle).toHaveBeenCalledTimes(1)
    })
  })

  describe('item selection', () => {
    it('should call item action when clicked', () => {
      // Arrange
      const action = vi.fn()
      const items = [{ id: 'item1', label: 'Item 1', action }]
      render(<Menu {...defaultProps} items={items} />)

      // Act
      fireEvent.click(screen.getByText('Item 1'))

      // Assert
      expect(action).toHaveBeenCalledTimes(1)
    })

    it('should call onClose after item action', () => {
      // Arrange
      const action = vi.fn()
      const onClose = vi.fn()
      const items = [{ id: 'item1', label: 'Item 1', action }]
      render(<Menu {...defaultProps} items={items} onClose={onClose} />)

      // Act
      fireEvent.click(screen.getByText('Item 1'))

      // Assert
      expect(onClose).toHaveBeenCalled()
    })

    it('should not call onClose when disabled item is clicked', () => {
      // Arrange
      const action = vi.fn()
      const onClose = vi.fn()
      const items = [{ id: 'item1', label: 'Item 1', action, disabled: true }]
      render(<Menu {...defaultProps} items={items} onClose={onClose} />)

      // Act
      fireEvent.click(screen.getByText('Item 1'))

      // Assert
      expect(onClose).not.toHaveBeenCalled()
    })

    it('should call onClose for item without action', () => {
      // Arrange
      const onClose = vi.fn()
      const items = [{ id: 'item1', label: 'Item 1' }]
      render(<Menu {...defaultProps} items={items} onClose={onClose} />)

      // Act
      fireEvent.click(screen.getByText('Item 1'))

      // Assert
      expect(onClose).toHaveBeenCalled()
    })

    it('should not crash when clicking item without action', () => {
      // Arrange
      const items = [{ id: 'item1', label: 'Item 1' }]

      // Act & Assert - should not throw
      render(<Menu {...defaultProps} items={items} />)
      fireEvent.click(screen.getByText('Item 1'))
    })
  })

  describe('keyboard navigation', () => {
    it('should focus first item when menu opens', () => {
      // Arrange & Act
      render(<Menu {...defaultProps} />)

      // Assert
      const items = screen.getAllByRole('menuitem')
      expect(items[0].className).toMatch(/focused/)
    })

    it('should move focus down with ArrowDown', () => {
      // Arrange
      render(<Menu {...defaultProps} />)

      // Act
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' })

      // Assert
      const items = screen.getAllByRole('menuitem')
      expect(items[1].className).toMatch(/focused/)
    })

    it('should move focus up with ArrowUp', () => {
      // Arrange
      render(<Menu {...defaultProps} />)
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' })

      // Act
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' })

      // Assert
      const items = screen.getAllByRole('menuitem')
      expect(items[0].className).toMatch(/focused/)
    })

    it('should skip disabled items when navigating down', () => {
      // Arrange - items: [item1, item2, divider, item3(disabled)]
      // Navigable items: [item1, item2] (item3 is disabled)
      render(<Menu {...defaultProps} />)
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' }) // to item2

      // Act
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' }) // wraps to item1 (item3 disabled)

      // Assert - should wrap back to item1 (only 2 navigable items)
      const items = screen.getAllByRole('menuitem')
      expect(items[0].className).toMatch(/focused/)
    })

    it('should call onClose when Escape is pressed', () => {
      // Arrange
      const onClose = vi.fn()
      render(<Menu {...defaultProps} onClose={onClose} />)

      // Act
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })

      // Assert
      expect(onClose).toHaveBeenCalled()
    })

    it('should activate item when Enter is pressed', () => {
      // Arrange
      const action = vi.fn()
      const items = [{ id: 'item1', label: 'Item 1', action }]
      render(<Menu {...defaultProps} items={items} />)

      // Act
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Enter' })

      // Assert
      expect(action).toHaveBeenCalled()
    })

    it('should close menu when Enter pressed on item with action', () => {
      // Arrange
      const action = vi.fn()
      const onClose = vi.fn()
      const items = [{ id: 'item1', label: 'Item 1', action }]
      render(<Menu {...defaultProps} items={items} onClose={onClose} />)

      // Act
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Enter' })

      // Assert
      expect(onClose).toHaveBeenCalled()
    })

    it('should not crash when Enter pressed on item without action', () => {
      // Arrange
      const items = [{ id: 'item1', label: 'Item 1' }]
      render(<Menu {...defaultProps} items={items} />)

      // Act & Assert - should not throw
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Enter' })
    })

    it('should wrap focus to last item when ArrowUp from first', () => {
      // Arrange
      const items = [
        { id: 'item1', label: 'Item 1' },
        { id: 'item2', label: 'Item 2' },
      ]
      render(<Menu {...defaultProps} items={items} />)

      // Act
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' })

      // Assert - should wrap to last item
      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems[1].className).toMatch(/focused/)
    })

    it('should prevent default on keyboard events', () => {
      // Arrange
      const items = [{ id: 'item1', label: 'Item 1' }]
      render(<Menu {...defaultProps} items={items} />)

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
      screen.getByRole('menu').dispatchEvent(event)

      // Assert
      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('should wrap focus to first item when at last', () => {
      // Arrange - use items without disabled ones for clearer test
      const items = [
        { id: 'item1', label: 'Item 1' },
        { id: 'item2', label: 'Item 2' },
      ]
      render(<Menu {...defaultProps} items={items} />)
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' }) // to item2

      // Act - go down from last item
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' })

      // Assert - should wrap to item1
      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems[0].className).toMatch(/focused/)
    })
  })

  describe('accessibility', () => {
    it('should have role menu on dropdown', () => {
      // Arrange & Act
      render(<Menu {...defaultProps} />)

      // Assert
      expect(screen.getByRole('menu')).toBeInTheDocument()
    })

    it('should have aria-labelledby referencing trigger', () => {
      // Arrange & Act
      render(<Menu {...defaultProps} />)

      // Assert
      const menu = screen.getByRole('menu')
      expect(menu).toHaveAttribute('aria-labelledby', 'test-menu-trigger')
    })
  })

  describe('focus tracking', () => {
    it('should not show focus on disabled items', () => {
      // Arrange - first item disabled
      const items = [
        { id: 'item1', label: 'Item 1', disabled: true },
        { id: 'item2', label: 'Item 2' },
      ]
      render(<Menu {...defaultProps} items={items} />)

      // Assert - disabled item should not have focused class
      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems[0].className).not.toMatch(/focused/)
      expect(menuItems[1].className).toMatch(/focused/)
    })

    it('should track focus correctly with mixed items', () => {
      // Arrange - disabled item in middle
      const items = [
        { id: 'item1', label: 'Item 1' },
        { id: 'item2', label: 'Item 2', disabled: true },
        { id: 'item3', label: 'Item 3' },
      ]
      render(<Menu {...defaultProps} items={items} />)

      // Act - press down to go to next navigable item (item3)
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' })

      // Assert - item3 should be focused (item2 is skipped)
      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems[2].className).toMatch(/focused/)
    })

    it('should render shortcut when item has one', () => {
      // Arrange
      const items = [{ id: 'item1', label: 'Item 1', shortcut: 'Ctrl+N' }]
      render(<Menu {...defaultProps} items={items} />)

      // Assert
      expect(screen.getByText('Ctrl+N')).toBeInTheDocument()
    })

    it('should render multiple dividers correctly', () => {
      // Arrange
      const items: (MenuItemDefinition | MenuDividerDefinition)[] = [
        { id: 'item1', label: 'Item 1' },
        { type: 'divider', id: 'div1' },
        { id: 'item2', label: 'Item 2' },
        { type: 'divider' }, // no id
        { id: 'item3', label: 'Item 3' },
      ]
      render(<Menu {...defaultProps} items={items} />)

      // Assert - should render 2 dividers
      expect(screen.getAllByRole('separator')).toHaveLength(2)
    })
  })

  describe('trigger button', () => {
    it('should set trigger id correctly', () => {
      // Arrange & Act
      render(<Menu {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button')).toHaveAttribute('id', 'test-menu-trigger')
    })
  })
})
