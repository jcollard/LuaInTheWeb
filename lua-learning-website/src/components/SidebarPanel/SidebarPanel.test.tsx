import { render, screen } from '@testing-library/react'
import { SidebarPanel } from './SidebarPanel'

describe('SidebarPanel', () => {
  describe('rendering', () => {
    it('should render placeholder content', () => {
      // Arrange & Act
      render(<SidebarPanel activePanel="explorer" />)

      // Assert
      expect(screen.getByTestId('sidebar-panel')).toBeInTheDocument()
    })

    it('should show "Explorer" header when explorer is active', () => {
      // Arrange & Act
      render(<SidebarPanel activePanel="explorer" />)

      // Assert
      expect(screen.getByText('Explorer')).toBeInTheDocument()
    })

    it('should show "Search" header when search is active', () => {
      // Arrange & Act
      render(<SidebarPanel activePanel="search" />)

      // Assert
      expect(screen.getByText('Search')).toBeInTheDocument()
    })

    it('should show "Extensions" header when extensions is active', () => {
      // Arrange & Act
      render(<SidebarPanel activePanel="extensions" />)

      // Assert
      expect(screen.getByText('Extensions')).toBeInTheDocument()
    })

    it('should show "Coming soon" placeholder message', () => {
      // Arrange & Act
      render(<SidebarPanel activePanel="explorer" />)

      // Assert
      expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
    })
  })

  describe('custom className', () => {
    it('should accept className prop', () => {
      // Arrange & Act
      render(<SidebarPanel activePanel="explorer" className="custom-class" />)

      // Assert
      expect(screen.getByTestId('sidebar-panel')).toHaveClass('custom-class')
    })
  })

  describe('accessibility', () => {
    it('should have appropriate region role', () => {
      // Arrange & Act
      render(<SidebarPanel activePanel="explorer" />)

      // Assert
      expect(screen.getByRole('complementary')).toBeInTheDocument()
    })

    it('should have aria-label describing the panel', () => {
      // Arrange & Act
      render(<SidebarPanel activePanel="explorer" />)

      // Assert
      expect(screen.getByRole('complementary')).toHaveAttribute('aria-label', 'Sidebar')
    })
  })
})
