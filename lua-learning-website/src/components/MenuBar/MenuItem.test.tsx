import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { MenuItem } from './MenuItem'

describe('MenuItem', () => {
  const defaultProps = {
    id: 'test-item',
    label: 'Test Item',
  }

  describe('rendering', () => {
    it('should render the label', () => {
      // Arrange & Act
      render(<MenuItem {...defaultProps} />)

      // Assert
      expect(screen.getByText('Test Item')).toBeInTheDocument()
    })

    it('should have role menuitem', () => {
      // Arrange & Act
      render(<MenuItem {...defaultProps} />)

      // Assert
      expect(screen.getByRole('menuitem')).toBeInTheDocument()
    })

    it('should render keyboard shortcut when provided', () => {
      // Arrange & Act
      render(<MenuItem {...defaultProps} shortcut="Ctrl+S" />)

      // Assert
      expect(screen.getByText('Ctrl+S')).toBeInTheDocument()
    })

    it('should not render shortcut element when not provided', () => {
      // Arrange & Act
      render(<MenuItem {...defaultProps} />)

      // Assert
      expect(screen.queryByText('Ctrl+S')).not.toBeInTheDocument()
    })

    it('should render label inside span element', () => {
      // Arrange & Act
      render(<MenuItem {...defaultProps} />)

      // Assert
      const label = screen.getByText('Test Item')
      expect(label.tagName).toBe('SPAN')
    })

    it('should render shortcut in its own span element', () => {
      // Arrange & Act
      render(<MenuItem {...defaultProps} shortcut="Ctrl+N" />)

      // Assert
      const shortcut = screen.getByText('Ctrl+N')
      expect(shortcut.tagName).toBe('SPAN')
    })
  })

  describe('disabled state', () => {
    it('should have aria-disabled when disabled', () => {
      // Arrange & Act
      render(<MenuItem {...defaultProps} disabled />)

      // Assert
      expect(screen.getByRole('menuitem')).toHaveAttribute(
        'aria-disabled',
        'true'
      )
    })

    it('should not have aria-disabled when enabled', () => {
      // Arrange & Act
      render(<MenuItem {...defaultProps} disabled={false} />)

      // Assert
      expect(screen.getByRole('menuitem')).not.toHaveAttribute('aria-disabled')
    })

    it('should not call action when disabled and clicked', () => {
      // Arrange
      const action = vi.fn()
      render(<MenuItem {...defaultProps} action={action} disabled />)

      // Act
      fireEvent.click(screen.getByRole('menuitem'))

      // Assert
      expect(action).not.toHaveBeenCalled()
    })

    it('should apply disabled CSS class when disabled', () => {
      // Arrange & Act
      render(<MenuItem {...defaultProps} disabled />)

      // Assert
      expect(screen.getByRole('menuitem').className).toMatch(/disabled/)
    })

    it('should not apply disabled CSS class when not disabled', () => {
      // Arrange & Act
      render(<MenuItem {...defaultProps} />)

      // Assert
      expect(screen.getByRole('menuitem').className).not.toMatch(/disabled/)
    })
  })

  describe('click handling', () => {
    it('should call action when clicked', () => {
      // Arrange
      const action = vi.fn()
      render(<MenuItem {...defaultProps} action={action} />)

      // Act
      fireEvent.click(screen.getByRole('menuitem'))

      // Assert
      expect(action).toHaveBeenCalledTimes(1)
    })

    it('should not crash when clicked without action', () => {
      // Arrange & Act & Assert - should not throw
      render(<MenuItem {...defaultProps} />)
      fireEvent.click(screen.getByRole('menuitem'))
    })
  })

  describe('keyboard handling', () => {
    it('should call action when Enter is pressed', () => {
      // Arrange
      const action = vi.fn()
      render(<MenuItem {...defaultProps} action={action} />)

      // Act
      fireEvent.keyDown(screen.getByRole('menuitem'), { key: 'Enter' })

      // Assert
      expect(action).toHaveBeenCalledTimes(1)
    })

    it('should call action when Space is pressed', () => {
      // Arrange
      const action = vi.fn()
      render(<MenuItem {...defaultProps} action={action} />)

      // Act
      fireEvent.keyDown(screen.getByRole('menuitem'), { key: ' ' })

      // Assert
      expect(action).toHaveBeenCalledTimes(1)
    })

    it('should not call action on Enter when disabled', () => {
      // Arrange
      const action = vi.fn()
      render(<MenuItem {...defaultProps} action={action} disabled />)

      // Act
      fireEvent.keyDown(screen.getByRole('menuitem'), { key: 'Enter' })

      // Assert
      expect(action).not.toHaveBeenCalled()
    })

    it('should not call action on Space when disabled', () => {
      // Arrange
      const action = vi.fn()
      render(<MenuItem {...defaultProps} action={action} disabled />)

      // Act
      fireEvent.keyDown(screen.getByRole('menuitem'), { key: ' ' })

      // Assert
      expect(action).not.toHaveBeenCalled()
    })

    it('should not call action for other keys', () => {
      // Arrange
      const action = vi.fn()
      render(<MenuItem {...defaultProps} action={action} />)

      // Act
      fireEvent.keyDown(screen.getByRole('menuitem'), { key: 'a' })

      // Assert
      expect(action).not.toHaveBeenCalled()
    })
  })

  describe('focus state', () => {
    it('should apply focused style when isFocused is true', () => {
      // Arrange & Act
      render(<MenuItem {...defaultProps} isFocused />)

      // Assert
      const item = screen.getByRole('menuitem')
      expect(item.className).toMatch(/focused/)
    })

    it('should not apply focused style when isFocused is false', () => {
      // Arrange & Act
      render(<MenuItem {...defaultProps} isFocused={false} />)

      // Assert
      const item = screen.getByRole('menuitem')
      expect(item.className).not.toMatch(/focused/)
    })
  })

  describe('accessibility', () => {
    it('should have tabindex -1 for keyboard navigation', () => {
      // Arrange & Act
      render(<MenuItem {...defaultProps} />)

      // Assert
      expect(screen.getByRole('menuitem')).toHaveAttribute('tabindex', '-1')
    })
  })
})
