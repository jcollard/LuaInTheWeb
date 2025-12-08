import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Delete File',
    message: 'Are you sure you want to delete main.lua?',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render title and message', () => {
      // Arrange & Act
      render(<ConfirmDialog {...defaultProps} />)

      // Assert
      expect(screen.getByText('Delete File')).toBeInTheDocument()
      expect(screen.getByText('Are you sure you want to delete main.lua?')).toBeInTheDocument()
    })

    it('should render confirm and cancel buttons', () => {
      // Arrange & Act
      render(<ConfirmDialog {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      // Arrange & Act
      render(<ConfirmDialog {...defaultProps} isOpen={false} />)

      // Assert
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('button actions', () => {
    it('should call onConfirm when confirm button clicked', () => {
      // Arrange
      const onConfirm = vi.fn()
      render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />)

      // Act
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

      // Assert
      expect(onConfirm).toHaveBeenCalled()
    })

    it('should call onCancel when cancel button clicked', () => {
      // Arrange
      const onCancel = vi.fn()
      render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />)

      // Act
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      // Assert
      expect(onCancel).toHaveBeenCalled()
    })
  })

  describe('keyboard behavior', () => {
    it('should call onCancel on Escape key', () => {
      // Arrange
      const onCancel = vi.fn()
      render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />)

      // Act
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

      // Assert
      expect(onCancel).toHaveBeenCalled()
    })

    it('should call onConfirm on Enter key', () => {
      // Arrange
      const onConfirm = vi.fn()
      render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />)

      // Act
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' })

      // Assert
      expect(onConfirm).toHaveBeenCalled()
    })
  })

  describe('focus behavior', () => {
    it('should trap focus within modal', () => {
      // Arrange & Act
      render(<ConfirmDialog {...defaultProps} />)

      // Get all focusable elements
      const buttons = screen.getAllByRole('button')
      const lastButton = buttons[buttons.length - 1]

      // Focus last button and tab
      lastButton.focus()
      fireEvent.keyDown(lastButton, { key: 'Tab' })

      // Assert - focus should wrap to first button
      expect(buttons[0]).toHaveFocus()
    })

    it('should focus cancel button on open', () => {
      // Arrange & Act
      render(<ConfirmDialog {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
    })
  })

  describe('accessibility', () => {
    it('should have role dialog', () => {
      // Arrange & Act
      render(<ConfirmDialog {...defaultProps} />)

      // Assert
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should have aria-modal attribute', () => {
      // Arrange & Act
      render(<ConfirmDialog {...defaultProps} />)

      // Assert
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('should have aria-labelledby pointing to title', () => {
      // Arrange & Act
      render(<ConfirmDialog {...defaultProps} />)

      // Assert
      const dialog = screen.getByRole('dialog')
      const titleId = dialog.getAttribute('aria-labelledby')
      expect(titleId).toBeTruthy()
      expect(document.getElementById(titleId!)).toHaveTextContent('Delete File')
    })

    it('should have aria-describedby pointing to message', () => {
      // Arrange & Act
      render(<ConfirmDialog {...defaultProps} />)

      // Assert
      const dialog = screen.getByRole('dialog')
      const descId = dialog.getAttribute('aria-describedby')
      expect(descId).toBeTruthy()
      expect(document.getElementById(descId!)).toHaveTextContent('Are you sure')
    })
  })

  describe('variant styling', () => {
    it('should apply danger variant to confirm button for destructive actions', () => {
      // Arrange & Act
      render(<ConfirmDialog {...defaultProps} variant="danger" />)

      // Assert - confirm button should have danger styling
      const confirmButton = screen.getByRole('button', { name: 'Delete' })
      expect(confirmButton.className).toMatch(/danger/)
    })
  })
})
