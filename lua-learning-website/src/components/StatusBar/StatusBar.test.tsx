import { render, screen } from '@testing-library/react'
import { StatusBar } from './StatusBar'

describe('StatusBar', () => {
  const defaultProps = {
    line: 1,
    column: 1,
    language: 'Lua',
    encoding: 'UTF-8',
    indentation: 'Spaces: 2',
  }

  describe('rendering', () => {
    it('should render line and column numbers', () => {
      // Arrange & Act
      render(<StatusBar {...defaultProps} line={42} column={15} />)

      // Assert
      expect(screen.getByText(/Ln 42/)).toBeInTheDocument()
      expect(screen.getByText(/Col 15/)).toBeInTheDocument()
    })

    it('should render language name', () => {
      // Arrange & Act
      render(<StatusBar {...defaultProps} language="Lua" />)

      // Assert
      expect(screen.getByText('Lua')).toBeInTheDocument()
    })

    it('should render encoding', () => {
      // Arrange & Act
      render(<StatusBar {...defaultProps} encoding="UTF-8" />)

      // Assert
      expect(screen.getByText('UTF-8')).toBeInTheDocument()
    })

    it('should render indentation info', () => {
      // Arrange & Act
      render(<StatusBar {...defaultProps} indentation="Spaces: 2" />)

      // Assert
      expect(screen.getByText('Spaces: 2')).toBeInTheDocument()
    })

    it('should render different indentation settings', () => {
      // Arrange & Act
      render(<StatusBar {...defaultProps} indentation="Tabs" />)

      // Assert
      expect(screen.getByText('Tabs')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have role status for the status bar', () => {
      // Arrange & Act
      render(<StatusBar {...defaultProps} />)

      // Assert
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should have aria-label for cursor position', () => {
      // Arrange & Act
      render(<StatusBar {...defaultProps} line={10} column={5} />)

      // Assert
      expect(screen.getByLabelText(/cursor position/i)).toBeInTheDocument()
    })

    it('should have aria-label for language', () => {
      // Arrange & Act
      render(<StatusBar {...defaultProps} language="Lua" />)

      // Assert
      expect(screen.getByLabelText(/language mode/i)).toBeInTheDocument()
    })

    it('should have aria-label for encoding', () => {
      // Arrange & Act
      render(<StatusBar {...defaultProps} encoding="UTF-8" />)

      // Assert
      expect(screen.getByLabelText(/file encoding/i)).toBeInTheDocument()
    })

    it('should have aria-label for indentation', () => {
      // Arrange & Act
      render(<StatusBar {...defaultProps} indentation="Spaces: 2" />)

      // Assert
      expect(screen.getByLabelText(/indentation/i)).toBeInTheDocument()
    })
  })

  describe('custom className', () => {
    it('should apply custom className', () => {
      // Arrange & Act
      render(<StatusBar {...defaultProps} className="custom-class" />)

      // Assert
      expect(screen.getByRole('status')).toHaveClass('custom-class')
    })
  })

  describe('edge cases', () => {
    it('should handle line and column of 0', () => {
      // Arrange & Act
      render(<StatusBar {...defaultProps} line={0} column={0} />)

      // Assert
      expect(screen.getByText(/Ln 0/)).toBeInTheDocument()
      expect(screen.getByText(/Col 0/)).toBeInTheDocument()
    })

    it('should handle large line and column numbers', () => {
      // Arrange & Act
      render(<StatusBar {...defaultProps} line={9999} column={999} />)

      // Assert
      expect(screen.getByText(/Ln 9999/)).toBeInTheDocument()
      expect(screen.getByText(/Col 999/)).toBeInTheDocument()
    })

    it('should handle empty language string', () => {
      // Arrange & Act
      render(<StatusBar {...defaultProps} language="" />)

      // Assert
      // Should not crash, status bar should still render
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })
})
