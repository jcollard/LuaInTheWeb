import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { ActivityBar } from './ActivityBar'

// Mock the useTheme hook used by ThemeToggle
vi.mock('../../contexts', () => ({
  useTheme: () => ({
    theme: 'dark',
    isDark: true,
    toggleTheme: vi.fn(),
  }),
}))

describe('ActivityBar', () => {
  const defaultProps = {
    activeItem: 'explorer' as const,
    onItemClick: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render icon buttons', () => {
      // Arrange & Act
      render(<ActivityBar {...defaultProps} />)

      // Assert - should have buttons for explorer, search, extensions
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThanOrEqual(3)
    })

    it('should render explorer icon', () => {
      // Arrange & Act
      render(<ActivityBar {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button', { name: /explorer/i })).toBeInTheDocument()
    })

    it('should render search icon', () => {
      // Arrange & Act
      render(<ActivityBar {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
    })

    it('should render extensions icon', () => {
      // Arrange & Act
      render(<ActivityBar {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button', { name: /extensions/i })).toBeInTheDocument()
    })
  })

  describe('active state', () => {
    it('should highlight explorer when active', () => {
      // Arrange & Act
      render(<ActivityBar {...defaultProps} activeItem="explorer" />)

      // Assert
      const explorerButton = screen.getByRole('button', { name: /explorer/i })
      expect(explorerButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should highlight search when active', () => {
      // Arrange & Act
      render(<ActivityBar {...defaultProps} activeItem="search" />)

      // Assert
      const searchButton = screen.getByRole('button', { name: /search/i })
      expect(searchButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should highlight extensions when active', () => {
      // Arrange & Act
      render(<ActivityBar {...defaultProps} activeItem="extensions" />)

      // Assert
      const extensionsButton = screen.getByRole('button', { name: /extensions/i })
      expect(extensionsButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should not highlight inactive items', () => {
      // Arrange & Act
      render(<ActivityBar {...defaultProps} activeItem="explorer" />)

      // Assert
      const searchButton = screen.getByRole('button', { name: /search/i })
      const extensionsButton = screen.getByRole('button', { name: /extensions/i })
      expect(searchButton).toHaveAttribute('aria-pressed', 'false')
      expect(extensionsButton).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('click handling', () => {
    it('should call onItemClick when explorer is clicked', () => {
      // Arrange
      const onItemClick = vi.fn()
      render(<ActivityBar {...defaultProps} onItemClick={onItemClick} />)

      // Act
      fireEvent.click(screen.getByRole('button', { name: /explorer/i }))

      // Assert
      expect(onItemClick).toHaveBeenCalledWith('explorer')
    })

    it('should call onItemClick when search is clicked', () => {
      // Arrange
      const onItemClick = vi.fn()
      render(<ActivityBar {...defaultProps} onItemClick={onItemClick} />)

      // Act
      fireEvent.click(screen.getByRole('button', { name: /search/i }))

      // Assert
      expect(onItemClick).toHaveBeenCalledWith('search')
    })

    it('should call onItemClick when extensions is clicked', () => {
      // Arrange
      const onItemClick = vi.fn()
      render(<ActivityBar {...defaultProps} onItemClick={onItemClick} />)

      // Act
      fireEvent.click(screen.getByRole('button', { name: /extensions/i }))

      // Assert
      expect(onItemClick).toHaveBeenCalledWith('extensions')
    })
  })

  describe('accessibility', () => {
    it('should have aria-labels for all icons', () => {
      // Arrange & Act
      render(<ActivityBar {...defaultProps} />)

      // Assert
      expect(screen.getByLabelText(/explorer/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/search/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/extensions/i)).toBeInTheDocument()
    })

    it('should be keyboard navigable', () => {
      // Arrange
      render(<ActivityBar {...defaultProps} />)
      const buttons = screen.getAllByRole('button')

      // Act & Assert - buttons should be focusable
      buttons.forEach(button => {
        button.focus()
        expect(button).toHaveFocus()
      })
    })

    it('should trigger click on Enter key', () => {
      // Arrange
      const onItemClick = vi.fn()
      render(<ActivityBar {...defaultProps} onItemClick={onItemClick} />)
      const explorerButton = screen.getByRole('button', { name: /explorer/i })

      // Act
      explorerButton.focus()
      fireEvent.keyDown(explorerButton, { key: 'Enter' })

      // Assert
      expect(onItemClick).toHaveBeenCalledWith('explorer')
    })

    it('should trigger click on Space key', () => {
      // Arrange
      const onItemClick = vi.fn()
      render(<ActivityBar {...defaultProps} onItemClick={onItemClick} />)
      const searchButton = screen.getByRole('button', { name: /search/i })

      // Act
      searchButton.focus()
      fireEvent.keyDown(searchButton, { key: ' ' })

      // Assert
      expect(onItemClick).toHaveBeenCalledWith('search')
    })

    it('should have navigation role', () => {
      // Arrange & Act
      render(<ActivityBar {...defaultProps} />)

      // Assert
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('should have aria-label for the navigation', () => {
      // Arrange & Act
      render(<ActivityBar {...defaultProps} />)

      // Assert
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Activity Bar')
    })
  })

  describe('custom className', () => {
    it('should apply custom className', () => {
      // Arrange & Act
      render(<ActivityBar {...defaultProps} className="custom-class" />)

      // Assert
      expect(screen.getByRole('navigation')).toHaveClass('custom-class')
    })
  })
})
