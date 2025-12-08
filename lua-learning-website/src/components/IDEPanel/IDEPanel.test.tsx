import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { IDEPanel } from './IDEPanel'

// Mock react-resizable-panels
vi.mock('react-resizable-panels', () => ({
  Panel: ({
    children,
    defaultSize,
    minSize,
    maxSize,
    collapsible,
    collapsedSize,
    onCollapse,
    onExpand,
    className,
  }: {
    children: React.ReactNode
    defaultSize?: number
    minSize?: number
    maxSize?: number
    collapsible?: boolean
    collapsedSize?: number
    onCollapse?: () => void
    onExpand?: () => void
    className?: string
  }) => (
    <div
      data-testid="panel"
      data-default-size={defaultSize}
      data-min-size={minSize}
      data-max-size={maxSize}
      data-collapsible={collapsible}
      data-collapsed-size={collapsedSize}
      className={className}
      onClick={() => onCollapse?.()}
      onDoubleClick={() => onExpand?.()}
    >
      {children}
    </div>
  ),
}))

describe('IDEPanel', () => {
  describe('rendering', () => {
    it('should render children', () => {
      // Arrange & Act
      render(
        <IDEPanel>
          <div data-testid="child-content">Panel Content</div>
        </IDEPanel>
      )

      // Assert
      expect(screen.getByTestId('child-content')).toBeInTheDocument()
      expect(screen.getByText('Panel Content')).toBeInTheDocument()
    })

    it('should render the panel container', () => {
      // Arrange & Act
      render(
        <IDEPanel>
          <div>Content</div>
        </IDEPanel>
      )

      // Assert
      expect(screen.getByTestId('panel')).toBeInTheDocument()
    })
  })

  describe('size constraints', () => {
    it('should pass defaultSize to Panel', () => {
      // Arrange & Act
      render(
        <IDEPanel defaultSize={30}>
          <div>Content</div>
        </IDEPanel>
      )

      // Assert
      expect(screen.getByTestId('panel')).toHaveAttribute(
        'data-default-size',
        '30'
      )
    })

    it('should pass minSize to Panel', () => {
      // Arrange & Act
      render(
        <IDEPanel minSize={10}>
          <div>Content</div>
        </IDEPanel>
      )

      // Assert
      expect(screen.getByTestId('panel')).toHaveAttribute('data-min-size', '10')
    })

    it('should pass maxSize to Panel', () => {
      // Arrange & Act
      render(
        <IDEPanel maxSize={80}>
          <div>Content</div>
        </IDEPanel>
      )

      // Assert
      expect(screen.getByTestId('panel')).toHaveAttribute('data-max-size', '80')
    })
  })

  describe('header', () => {
    it('should render header when provided', () => {
      // Arrange & Act
      render(
        <IDEPanel header={<span>Explorer</span>}>
          <div>Content</div>
        </IDEPanel>
      )

      // Assert
      expect(screen.getByText('Explorer')).toBeInTheDocument()
    })

    it('should not render header section when not provided', () => {
      // Arrange & Act
      render(
        <IDEPanel>
          <div>Content</div>
        </IDEPanel>
      )

      // Assert
      expect(screen.queryByTestId('panel-header')).not.toBeInTheDocument()
    })

    it('should render header with testid for accessibility', () => {
      // Arrange & Act
      render(
        <IDEPanel header="My Header">
          <div>Content</div>
        </IDEPanel>
      )

      // Assert
      expect(screen.getByTestId('panel-header')).toBeInTheDocument()
    })
  })

  describe('collapsible behavior', () => {
    it('should pass collapsible prop to Panel', () => {
      // Arrange & Act
      render(
        <IDEPanel collapsible>
          <div>Content</div>
        </IDEPanel>
      )

      // Assert
      expect(screen.getByTestId('panel')).toHaveAttribute(
        'data-collapsible',
        'true'
      )
    })

    it('should pass collapsedSize when collapsible', () => {
      // Arrange & Act
      render(
        <IDEPanel collapsible>
          <div>Content</div>
        </IDEPanel>
      )

      // Assert - collapsedSize should be set to 0 when collapsible
      expect(screen.getByTestId('panel')).toHaveAttribute(
        'data-collapsed-size',
        '0'
      )
    })

    it('should hide content when collapsed', () => {
      // Arrange & Act
      render(
        <IDEPanel collapsible collapsed header="Header">
          <div data-testid="panel-content">Content</div>
        </IDEPanel>
      )

      // Assert - header visible, content hidden
      expect(screen.getByText('Header')).toBeInTheDocument()
      expect(screen.queryByTestId('panel-content')).not.toBeInTheDocument()
    })

    it('should show content when not collapsed', () => {
      // Arrange & Act
      render(
        <IDEPanel collapsible collapsed={false} header="Header">
          <div data-testid="panel-content">Content</div>
        </IDEPanel>
      )

      // Assert
      expect(screen.getByTestId('panel-content')).toBeInTheDocument()
    })

    it('should call onCollapse when collapse state changes', () => {
      // Arrange
      const onCollapse = vi.fn()
      render(
        <IDEPanel collapsible collapsed={false} onCollapse={onCollapse}>
          <div>Content</div>
        </IDEPanel>
      )

      // Act - simulate collapse via mock's onClick
      fireEvent.click(screen.getByTestId('panel'))

      // Assert
      expect(onCollapse).toHaveBeenCalledWith(true)
    })
  })

  describe('className', () => {
    it('should apply custom className', () => {
      // Arrange & Act
      render(
        <IDEPanel className="custom-panel">
          <div>Content</div>
        </IDEPanel>
      )

      // Assert
      expect(screen.getByTestId('panel')).toHaveClass('custom-panel')
    })
  })

  describe('collapse button', () => {
    it('should render collapse button when collapsible and header provided', () => {
      // Arrange & Act
      render(
        <IDEPanel collapsible header="Explorer">
          <div>Content</div>
        </IDEPanel>
      )

      // Assert
      expect(
        screen.getByRole('button', { name: /collapse/i })
      ).toBeInTheDocument()
    })

    it('should not render collapse button when not collapsible', () => {
      // Arrange & Act
      render(
        <IDEPanel header="Explorer">
          <div>Content</div>
        </IDEPanel>
      )

      // Assert
      expect(
        screen.queryByRole('button', { name: /collapse/i })
      ).not.toBeInTheDocument()
    })

    it('should show expand button when collapsed', () => {
      // Arrange & Act
      render(
        <IDEPanel collapsible collapsed header="Explorer">
          <div>Content</div>
        </IDEPanel>
      )

      // Assert
      expect(
        screen.getByRole('button', { name: /expand/i })
      ).toBeInTheDocument()
    })

    it('should display collapse arrow icon when expanded', () => {
      // Arrange & Act
      render(
        <IDEPanel collapsible collapsed={false} header="Explorer">
          <div>Content</div>
        </IDEPanel>
      )

      // Assert - should show left arrow (◀) when expanded
      const button = screen.getByRole('button', { name: /collapse/i })
      expect(button).toHaveTextContent('◀')
    })

    it('should display expand arrow icon when collapsed', () => {
      // Arrange & Act
      render(
        <IDEPanel collapsible collapsed header="Explorer">
          <div>Content</div>
        </IDEPanel>
      )

      // Assert - should show right arrow (▶) when collapsed
      const button = screen.getByRole('button', { name: /expand/i })
      expect(button).toHaveTextContent('▶')
    })
  })
})
