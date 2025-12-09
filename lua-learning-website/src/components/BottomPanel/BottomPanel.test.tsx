import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { BottomPanel } from './BottomPanel'
import type { TerminalLine } from './types'

// Mock BashTerminal and LuaRepl since they use xterm which doesn't work in jsdom
vi.mock('../BashTerminal', () => ({
  default: () => (
    <div data-testid="bash-terminal">BashTerminal Mock</div>
  ),
}))

vi.mock('../LuaRepl', () => ({
  default: ({ embedded }: { embedded?: boolean }) => (
    <div data-testid="lua-repl" data-embedded={embedded}>LuaRepl Mock</div>
  ),
}))

describe('BottomPanel', () => {
  const defaultProps: { terminalOutput: TerminalLine[] } = {
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

    it('should pass embedded prop to LuaRepl', () => {
      // Arrange
      render(<BottomPanel {...defaultProps} />)

      // Act
      fireEvent.click(screen.getByRole('tab', { name: /repl/i }))

      // Assert
      const luaRepl = screen.getByTestId('lua-repl')
      expect(luaRepl).toHaveAttribute('data-embedded', 'true')
    })

    it('should display terminal output with stable keys', () => {
      // Arrange
      const terminalOutput: TerminalLine[] = [
        { id: 'line-1', text: 'Hello' },
        { id: 'line-2', text: 'World' },
      ]

      // Act
      render(<BottomPanel {...defaultProps} terminalOutput={terminalOutput} />)

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

  describe('input handling', () => {
    it('should not show input field when not awaiting input', () => {
      // Arrange & Act
      render(<BottomPanel {...defaultProps} isAwaitingInput={false} />)

      // Assert
      expect(screen.queryByRole('textbox', { name: /input/i })).not.toBeInTheDocument()
    })

    it('should show input field when awaiting input', () => {
      // Arrange & Act
      render(<BottomPanel {...defaultProps} isAwaitingInput={true} onSubmitInput={() => {}} />)

      // Assert
      expect(screen.getByRole('textbox', { name: /input/i })).toBeInTheDocument()
    })

    it('should focus input field when awaiting input', () => {
      // Arrange & Act
      render(<BottomPanel {...defaultProps} isAwaitingInput={true} onSubmitInput={() => {}} />)

      // Assert
      expect(screen.getByRole('textbox', { name: /input/i })).toHaveFocus()
    })

    it('should call onSubmitInput when Enter is pressed', () => {
      // Arrange
      const onSubmitInput = vi.fn()
      render(<BottomPanel {...defaultProps} isAwaitingInput={true} onSubmitInput={onSubmitInput} />)
      const input = screen.getByRole('textbox', { name: /input/i })

      // Act
      fireEvent.change(input, { target: { value: 'test input' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      // Assert
      expect(onSubmitInput).toHaveBeenCalledWith('test input')
    })

    it('should clear input field after submission', () => {
      // Arrange
      const onSubmitInput = vi.fn()
      render(<BottomPanel {...defaultProps} isAwaitingInput={true} onSubmitInput={onSubmitInput} />)
      const input = screen.getByRole('textbox', { name: /input/i })

      // Act
      fireEvent.change(input, { target: { value: 'test input' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      // Assert
      expect(input).toHaveValue('')
    })

    it('should show submit button when awaiting input', () => {
      // Arrange & Act
      render(<BottomPanel {...defaultProps} isAwaitingInput={true} onSubmitInput={() => {}} />)

      // Assert
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
    })

    it('should call onSubmitInput when submit button is clicked', () => {
      // Arrange
      const onSubmitInput = vi.fn()
      render(<BottomPanel {...defaultProps} isAwaitingInput={true} onSubmitInput={onSubmitInput} />)
      const input = screen.getByRole('textbox', { name: /input/i })

      // Act
      fireEvent.change(input, { target: { value: 'button input' } })
      fireEvent.click(screen.getByRole('button', { name: /submit/i }))

      // Assert
      expect(onSubmitInput).toHaveBeenCalledWith('button input')
    })
  })
})
