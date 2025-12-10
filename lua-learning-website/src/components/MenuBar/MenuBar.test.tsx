import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { MenuBar } from './MenuBar'
import type { MenuDefinition } from './types'

describe('MenuBar', () => {
  const defaultMenus: MenuDefinition[] = [
    {
      id: 'file',
      label: 'File',
      items: [
        { id: 'new', label: 'New', shortcut: 'Ctrl+N' },
        { id: 'save', label: 'Save', shortcut: 'Ctrl+S' },
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z' },
        { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Y' },
      ],
    },
  ]

  describe('rendering', () => {
    it('should render with role menubar', () => {
      // Arrange & Act
      render(<MenuBar menus={defaultMenus} />)

      // Assert
      expect(screen.getByRole('menubar')).toBeInTheDocument()
    })

    it('should render all menu triggers', () => {
      // Arrange & Act
      render(<MenuBar menus={defaultMenus} />)

      // Assert
      expect(screen.getByRole('button', { name: 'File' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    })

    it('should not render any dropdown by default', () => {
      // Arrange & Act
      render(<MenuBar menus={defaultMenus} />)

      // Assert
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
  })

  describe('menu opening', () => {
    it('should open menu when trigger is clicked', () => {
      // Arrange
      render(<MenuBar menus={defaultMenus} />)

      // Act
      fireEvent.click(screen.getByRole('button', { name: 'File' }))

      // Assert
      expect(screen.getByRole('menu')).toBeInTheDocument()
      expect(screen.getByText('New')).toBeInTheDocument()
    })

    it('should close menu when trigger is clicked again', () => {
      // Arrange
      render(<MenuBar menus={defaultMenus} />)
      fireEvent.click(screen.getByRole('button', { name: 'File' }))

      // Act
      fireEvent.click(screen.getByRole('button', { name: 'File' }))

      // Assert
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('should switch menu when different trigger is clicked', () => {
      // Arrange
      render(<MenuBar menus={defaultMenus} />)
      fireEvent.click(screen.getByRole('button', { name: 'File' }))

      // Act
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

      // Assert
      expect(screen.getByRole('menu')).toBeInTheDocument()
      expect(screen.getByText('Undo')).toBeInTheDocument()
      expect(screen.queryByText('New')).not.toBeInTheDocument()
    })
  })

  describe('menu closing', () => {
    it('should close menu when clicking outside', () => {
      // Arrange
      render(
        <div>
          <MenuBar menus={defaultMenus} />
          <div data-testid="outside">Outside</div>
        </div>
      )
      fireEvent.click(screen.getByRole('button', { name: 'File' }))

      // Act
      fireEvent.mouseDown(screen.getByTestId('outside'))

      // Assert
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('should close menu when item is clicked', () => {
      // Arrange
      const action = vi.fn()
      const menus: MenuDefinition[] = [
        {
          id: 'file',
          label: 'File',
          items: [{ id: 'new', label: 'New', action }],
        },
      ]
      render(<MenuBar menus={menus} />)
      fireEvent.click(screen.getByRole('button', { name: 'File' }))

      // Act
      fireEvent.click(screen.getByText('New'))

      // Assert
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(action).toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should have aria-label for menubar', () => {
      // Arrange & Act
      render(<MenuBar menus={defaultMenus} />)

      // Assert
      expect(screen.getByRole('menubar')).toHaveAttribute(
        'aria-label',
        'Application menu'
      )
    })
  })

  describe('className', () => {
    it('should apply custom className', () => {
      // Arrange & Act
      render(<MenuBar menus={defaultMenus} className="custom-class" />)

      // Assert
      expect(screen.getByRole('menubar').className).toMatch(/custom-class/)
    })

    it('should apply default menuBar class without custom className', () => {
      // Arrange & Act
      render(<MenuBar menus={defaultMenus} />)

      // Assert
      expect(screen.getByRole('menubar').className).toMatch(/menuBar/)
    })
  })

  describe('click outside cleanup', () => {
    it('should not crash when unmounted', () => {
      // Arrange
      const { unmount } = render(<MenuBar menus={defaultMenus} />)
      fireEvent.click(screen.getByRole('button', { name: 'File' }))

      // Act & Assert - should not throw
      unmount()
      fireEvent.mouseDown(document.body)
    })

    it('should not close when clicking inside menu', () => {
      // Arrange
      render(<MenuBar menus={defaultMenus} />)
      fireEvent.click(screen.getByRole('button', { name: 'File' }))

      // Act - click on the dropdown
      fireEvent.mouseDown(screen.getByRole('menu'))

      // Assert - menu should still be open
      expect(screen.getByRole('menu')).toBeInTheDocument()
    })
  })
})
