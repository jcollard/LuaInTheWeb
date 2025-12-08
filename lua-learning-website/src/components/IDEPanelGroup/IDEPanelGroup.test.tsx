import { render, screen } from '@testing-library/react'
import { vi, beforeEach, afterEach } from 'vitest'
import { IDEPanelGroup } from './IDEPanelGroup'

// Mock react-resizable-panels
vi.mock('react-resizable-panels', () => ({
  PanelGroup: ({ children, direction, autoSaveId, className, onLayout }: {
    children: React.ReactNode
    direction: 'horizontal' | 'vertical'
    autoSaveId?: string
    className?: string
    onLayout?: (sizes: number[]) => void
  }) => (
    <div
      data-testid="panel-group"
      data-direction={direction}
      data-autosave-id={autoSaveId}
      className={className}
      onClick={() => onLayout?.([50, 50])}
    >
      {children}
    </div>
  ),
}))

describe('IDEPanelGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('rendering', () => {
    it('should render children correctly', () => {
      // Arrange & Act
      render(
        <IDEPanelGroup direction="horizontal">
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </IDEPanelGroup>
      )

      // Assert
      expect(screen.getByTestId('child-1')).toBeInTheDocument()
      expect(screen.getByTestId('child-2')).toBeInTheDocument()
    })

    it('should render with the panel-group container', () => {
      // Arrange & Act
      render(
        <IDEPanelGroup direction="horizontal">
          <div>Content</div>
        </IDEPanelGroup>
      )

      // Assert
      expect(screen.getByTestId('panel-group')).toBeInTheDocument()
    })
  })

  describe('direction prop', () => {
    it('should apply horizontal direction', () => {
      // Arrange & Act
      render(
        <IDEPanelGroup direction="horizontal">
          <div>Content</div>
        </IDEPanelGroup>
      )

      // Assert
      expect(screen.getByTestId('panel-group')).toHaveAttribute('data-direction', 'horizontal')
    })

    it('should apply vertical direction', () => {
      // Arrange & Act
      render(
        <IDEPanelGroup direction="vertical">
          <div>Content</div>
        </IDEPanelGroup>
      )

      // Assert
      expect(screen.getByTestId('panel-group')).toHaveAttribute('data-direction', 'vertical')
    })
  })

  describe('persistence', () => {
    it('should pass persistId to PanelGroup as autoSaveId', () => {
      // Arrange & Act
      render(
        <IDEPanelGroup direction="horizontal" persistId="test-layout">
          <div>Content</div>
        </IDEPanelGroup>
      )

      // Assert
      expect(screen.getByTestId('panel-group')).toHaveAttribute('data-autosave-id', 'test-layout')
    })

    it('should not set autoSaveId when persistId is not provided', () => {
      // Arrange & Act
      render(
        <IDEPanelGroup direction="horizontal">
          <div>Content</div>
        </IDEPanelGroup>
      )

      // Assert
      expect(screen.getByTestId('panel-group')).not.toHaveAttribute('data-autosave-id')
    })
  })

  describe('corrupted localStorage', () => {
    it('should handle corrupted localStorage gracefully by falling back to defaults', () => {
      // Arrange - Set corrupted data
      localStorage.setItem('react-resizable-panels:test-corrupt', 'not-valid-json{{{')

      // Act & Assert - Should not throw
      expect(() => {
        render(
          <IDEPanelGroup direction="horizontal" persistId="test-corrupt">
            <div>Content</div>
          </IDEPanelGroup>
        )
      }).not.toThrow()

      expect(screen.getByTestId('panel-group')).toBeInTheDocument()
    })

    it('should handle null localStorage values', () => {
      // Arrange - Simulate null storage
      localStorage.setItem('react-resizable-panels:test-null', 'null')

      // Act & Assert - Should not throw
      expect(() => {
        render(
          <IDEPanelGroup direction="horizontal" persistId="test-null">
            <div>Content</div>
          </IDEPanelGroup>
        )
      }).not.toThrow()
    })
  })

  describe('className', () => {
    it('should apply custom className', () => {
      // Arrange & Act
      render(
        <IDEPanelGroup direction="horizontal" className="custom-class">
          <div>Content</div>
        </IDEPanelGroup>
      )

      // Assert
      expect(screen.getByTestId('panel-group')).toHaveClass('custom-class')
    })
  })
})
