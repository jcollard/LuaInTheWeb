import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { IDEResizeHandle } from './IDEResizeHandle'

// Mock react-resizable-panels
vi.mock('react-resizable-panels', () => ({
  PanelResizeHandle: ({ className, onDragging, onDoubleClick, children, id }: {
    className?: string
    onDragging?: (isDragging: boolean) => void
    onDoubleClick?: () => void
    children?: React.ReactNode
    id?: string
  }) => (
    <div
      data-testid="resize-handle"
      className={className}
      role="separator"
      tabIndex={0}
      aria-label="Resize panels"
      id={id}
      onMouseDown={() => onDragging?.(true)}
      onMouseUp={() => onDragging?.(false)}
      onDoubleClick={onDoubleClick}
    >
      {children}
    </div>
  ),
}))

// Helper to check if element has a class containing a substring (for CSS modules)
function hasClassContaining(element: HTMLElement, substring: string): boolean {
  return Array.from(element.classList).some(cls => cls.includes(substring))
}

describe('IDEResizeHandle', () => {
  describe('rendering', () => {
    it('should render with separator role', () => {
      // Arrange & Act
      render(<IDEResizeHandle />)

      // Assert
      expect(screen.getByRole('separator')).toBeInTheDocument()
    })

    it('should render the inner handle element', () => {
      // Arrange & Act
      render(<IDEResizeHandle />)

      // Assert
      expect(screen.getByTestId('resize-handle-inner')).toBeInTheDocument()
    })

    it('should have inner element with tabIndex -1 for programmatic focus', () => {
      // Arrange & Act
      render(<IDEResizeHandle />)
      const innerHandle = screen.getByTestId('resize-handle-inner')

      // Assert - tabIndex -1 allows programmatic focus but not tab navigation
      expect(innerHandle).toHaveAttribute('tabIndex', '-1')
    })
  })

  describe('initial state', () => {
    it('should start with hover state false', () => {
      // Arrange & Act
      render(<IDEResizeHandle />)
      const innerHandle = screen.getByTestId('resize-handle-inner')

      // Assert
      expect(innerHandle).toHaveAttribute('data-hovered', 'false')
    })

    it('should start with dragging state false', () => {
      // Arrange & Act
      render(<IDEResizeHandle />)
      const innerHandle = screen.getByTestId('resize-handle-inner')

      // Assert
      expect(innerHandle).toHaveAttribute('data-dragging', 'false')
    })

    it('should start with focus state false', () => {
      // Arrange & Act
      render(<IDEResizeHandle />)
      const innerHandle = screen.getByTestId('resize-handle-inner')

      // Assert
      expect(innerHandle).toHaveAttribute('data-focused', 'false')
    })
  })

  describe('cursor style', () => {
    it('should have resize handle class with proper styling', () => {
      // Arrange & Act
      render(<IDEResizeHandle />)

      // Assert - CSS modules hash the class names, so we check for partial match
      const handle = screen.getByTestId('resize-handle')
      expect(hasClassContaining(handle, 'handle')).toBe(true)
    })
  })

  describe('hover state', () => {
    it('should show hover state on mouseenter', () => {
      // Arrange
      render(<IDEResizeHandle />)
      const handle = screen.getByTestId('resize-handle-inner')

      // Act
      fireEvent.mouseEnter(handle)

      // Assert - handle should have hover class added
      expect(handle).toHaveAttribute('data-hovered', 'true')
    })

    it('should remove hover state on mouseleave', () => {
      // Arrange
      render(<IDEResizeHandle />)
      const handle = screen.getByTestId('resize-handle-inner')

      // Act
      fireEvent.mouseEnter(handle)
      fireEvent.mouseLeave(handle)

      // Assert
      expect(handle).toHaveAttribute('data-hovered', 'false')
    })
  })

  describe('active state (dragging)', () => {
    it('should show active state when dragging starts', () => {
      // Arrange
      render(<IDEResizeHandle />)
      const handle = screen.getByTestId('resize-handle-inner')

      // Act - simulate drag start via mousedown on outer handle
      fireEvent.mouseDown(screen.getByTestId('resize-handle'))

      // Assert
      expect(handle).toHaveAttribute('data-dragging', 'true')
    })

    it('should remove active state when dragging ends', () => {
      // Arrange
      render(<IDEResizeHandle />)
      const outerHandle = screen.getByTestId('resize-handle')
      const innerHandle = screen.getByTestId('resize-handle-inner')

      // Act
      fireEvent.mouseDown(outerHandle)
      fireEvent.mouseUp(outerHandle)

      // Assert
      expect(innerHandle).toHaveAttribute('data-dragging', 'false')
    })
  })

  describe('keyboard accessibility', () => {
    it('should be keyboard focusable', () => {
      // Arrange & Act
      render(<IDEResizeHandle />)
      const handle = screen.getByRole('separator')

      // Assert
      expect(handle).toHaveAttribute('tabIndex', '0')
    })

    it('should have aria-label for screen readers', () => {
      // Arrange & Act
      render(<IDEResizeHandle />)
      const handle = screen.getByRole('separator')

      // Assert
      expect(handle).toHaveAttribute('aria-label', 'Resize panels')
    })

    it('should show focus state when inner element is focused', () => {
      // Arrange
      render(<IDEResizeHandle />)
      const innerHandle = screen.getByTestId('resize-handle-inner')

      // Act - focus the inner element directly (it has tabIndex for accessibility)
      fireEvent.focus(innerHandle)

      // Assert
      expect(innerHandle).toHaveAttribute('data-focused', 'true')
    })

    it('should remove focus state when blurred', () => {
      // Arrange
      render(<IDEResizeHandle />)
      const innerHandle = screen.getByTestId('resize-handle-inner')

      // Act
      fireEvent.focus(innerHandle)
      fireEvent.blur(innerHandle)

      // Assert
      expect(innerHandle).toHaveAttribute('data-focused', 'false')
    })
  })

  describe('className', () => {
    it('should apply custom className', () => {
      // Arrange & Act
      render(<IDEResizeHandle className="custom-class" />)

      // Assert
      expect(screen.getByTestId('resize-handle')).toHaveClass('custom-class')
    })
  })

  describe('double-click reset', () => {
    it('should call onDoubleClick when handle is double-clicked', () => {
      // Arrange
      const onDoubleClick = vi.fn()
      render(<IDEResizeHandle onDoubleClick={onDoubleClick} />)
      const handle = screen.getByTestId('resize-handle')

      // Act
      fireEvent.doubleClick(handle)

      // Assert
      expect(onDoubleClick).toHaveBeenCalledTimes(1)
    })

    it('should not throw when double-clicked without onDoubleClick handler', () => {
      // Arrange
      render(<IDEResizeHandle />)
      const handle = screen.getByTestId('resize-handle')

      // Act & Assert - should not throw
      expect(() => fireEvent.doubleClick(handle)).not.toThrow()
    })
  })
})
