import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { BottomPanel } from './BottomPanel'

// Mock BashTerminal and LuaRepl since they use xterm which doesn't work in jsdom
vi.mock('../BashTerminal', () => ({
  default: () => (
    <div data-testid="bash-terminal">BashTerminal Mock</div>
  ),
}))

vi.mock('../LuaRepl', () => ({
  default: () => <div data-testid="lua-repl">LuaRepl Mock</div>,
}))

describe('BottomPanel', () => {
  const defaultProps = {
    terminalOutput: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('tab bar', () => {
    it('should render tab bar with Terminal tab', () => {
      // Arrange & Act
      render(<BottomPanel {...defaultProps} />)

      // Assert
      expect(screen.getByRole('tab', { name: /terminal/i })).toBeInTheDocument()
    })

    it('should render tab bar with REPL tab', () => {
      // Arrange & Act
      render(<BottomPanel {...defaultProps} />)

      // Assert
      expect(screen.getByRole('tab', { name: /repl/i })).toBeInTheDocument()
    })
  })

  describe('default state', () => {
    it('should show Terminal content by default', () => {
      // Arrange & Act
      render(<BottomPanel {...defaultProps} />)

      // Assert
      expect(screen.getByTestId('terminal-content')).toBeInTheDocument()
    })

    it('should have Terminal tab selected by default', () => {
      // Arrange & Act
      render(<BottomPanel {...defaultProps} />)

      // Assert
      const terminalTab = screen.getByRole('tab', { name: /terminal/i })
      expect(terminalTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('tab switching', () => {
    it('should switch to REPL when REPL tab is clicked', () => {
      // Arrange
      render(<BottomPanel {...defaultProps} />)

      // Act
      fireEvent.click(screen.getByRole('tab', { name: /repl/i }))

      // Assert
      expect(screen.getByTestId('lua-repl')).toBeInTheDocument()
    })

    it('should switch back to Terminal when Terminal tab is clicked', () => {
      // Arrange
      render(<BottomPanel {...defaultProps} />)
      fireEvent.click(screen.getByRole('tab', { name: /repl/i }))

      // Act
      fireEvent.click(screen.getByRole('tab', { name: /terminal/i }))

      // Assert
      expect(screen.getByTestId('terminal-content')).toBeInTheDocument()
    })

    it('should update aria-selected when switching tabs', () => {
      // Arrange
      render(<BottomPanel {...defaultProps} />)

      // Act
      fireEvent.click(screen.getByRole('tab', { name: /repl/i }))

      // Assert
      expect(screen.getByRole('tab', { name: /repl/i })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('tab', { name: /terminal/i })).toHaveAttribute('aria-selected', 'false')
    })
  })

  describe('terminal content', () => {
    it('should render LuaRepl in REPL tab', () => {
      // Arrange
      render(<BottomPanel {...defaultProps} />)

      // Act
      fireEvent.click(screen.getByRole('tab', { name: /repl/i }))

      // Assert
      expect(screen.getByTestId('lua-repl')).toBeInTheDocument()
    })

    it('should display terminal output', () => {
      // Arrange & Act
      render(<BottomPanel {...defaultProps} terminalOutput={['Hello', 'World']} />)

      // Assert
      expect(screen.getByText('Hello')).toBeInTheDocument()
      expect(screen.getByText('World')).toBeInTheDocument()
    })
  })

  describe('custom className', () => {
    it('should apply custom className', () => {
      // Arrange & Act
      render(<BottomPanel {...defaultProps} className="custom-class" />)

      // Assert
      expect(screen.getByTestId('bottom-panel')).toHaveClass('custom-class')
    })
  })

  describe('accessibility', () => {
    it('should have tablist role for tab container', () => {
      // Arrange & Act
      render(<BottomPanel {...defaultProps} />)

      // Assert
      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })

    it('should have tabpanel role for content area', () => {
      // Arrange & Act
      render(<BottomPanel {...defaultProps} />)

      // Assert
      expect(screen.getByRole('tabpanel')).toBeInTheDocument()
    })
  })
})
