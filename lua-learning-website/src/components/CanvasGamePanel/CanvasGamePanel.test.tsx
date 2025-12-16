/**
 * Tests for CanvasGamePanel component.
 * Renders the canvas game and provides controls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CanvasGamePanel } from './CanvasGamePanel'

// Mock the useCanvasGame hook
const mockStartGame = vi.fn()
const mockStopGame = vi.fn()
const mockClearError = vi.fn()

vi.mock('../../hooks/useCanvasGame', () => ({
  useCanvasGame: vi.fn(() => ({
    state: 'idle',
    isRunning: false,
    error: null,
    output: '',
    mode: 'performance',
    process: null,
    startGame: mockStartGame,
    stopGame: mockStopGame,
    clearOutput: vi.fn(),
    clearError: mockClearError,
  })),
}))

describe('CanvasGamePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders a canvas element', () => {
      render(<CanvasGamePanel code="print('hello')" />)
      const canvas = document.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
    })

    it('renders stop button when running', async () => {
      const { useCanvasGame } = await import('../../hooks/useCanvasGame')
      vi.mocked(useCanvasGame).mockReturnValue({
        state: 'running',
        isRunning: true,
        error: null,
        output: '',
        mode: 'performance',
        process: null,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" />)
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
    })

    it('renders mode indicator showing performance mode', async () => {
      const { useCanvasGame } = await import('../../hooks/useCanvasGame')
      vi.mocked(useCanvasGame).mockReturnValue({
        state: 'running',
        isRunning: true,
        error: null,
        output: '',
        mode: 'performance',
        process: null,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" />)
      expect(screen.getByText(/performance/i)).toBeInTheDocument()
    })

    it('renders mode indicator showing compatibility mode', async () => {
      const { useCanvasGame } = await import('../../hooks/useCanvasGame')
      vi.mocked(useCanvasGame).mockReturnValue({
        state: 'running',
        isRunning: true,
        error: null,
        output: '',
        mode: 'compatibility',
        process: null,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" />)
      expect(screen.getByText(/compatibility/i)).toBeInTheDocument()
    })

    it('displays error message when in error state', async () => {
      const { useCanvasGame } = await import('../../hooks/useCanvasGame')
      vi.mocked(useCanvasGame).mockReturnValue({
        state: 'error',
        isRunning: false,
        error: 'Runtime error: invalid operation',
        output: '',
        mode: 'performance',
        process: null,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" />)
      expect(screen.getByText(/runtime error/i)).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <CanvasGamePanel code="print('hello')" className="custom-class" />
      )
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('renders with default canvas size', () => {
      render(<CanvasGamePanel code="print('hello')" />)
      const canvas = document.querySelector('canvas')
      expect(canvas).toHaveAttribute('width', '800')
      expect(canvas).toHaveAttribute('height', '600')
    })

    it('renders with custom canvas size', () => {
      render(
        <CanvasGamePanel code="print('hello')" width={640} height={480} />
      )
      const canvas = document.querySelector('canvas')
      expect(canvas).toHaveAttribute('width', '640')
      expect(canvas).toHaveAttribute('height', '480')
    })
  })

  describe('interactions', () => {
    it('calls stopGame when stop button is clicked', async () => {
      const { useCanvasGame } = await import('../../hooks/useCanvasGame')
      vi.mocked(useCanvasGame).mockReturnValue({
        state: 'running',
        isRunning: true,
        error: null,
        output: '',
        mode: 'performance',
        process: null,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" />)
      fireEvent.click(screen.getByRole('button', { name: /stop/i }))
      expect(mockStopGame).toHaveBeenCalled()
    })

    it('calls onStop callback when stop button is clicked', async () => {
      const onStop = vi.fn()
      const { useCanvasGame } = await import('../../hooks/useCanvasGame')
      vi.mocked(useCanvasGame).mockReturnValue({
        state: 'running',
        isRunning: true,
        error: null,
        output: '',
        mode: 'performance',
        process: null,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" onStop={onStop} />)
      fireEvent.click(screen.getByRole('button', { name: /stop/i }))
      expect(onStop).toHaveBeenCalled()
    })

    it('calls clearError when error is dismissed', async () => {
      const { useCanvasGame } = await import('../../hooks/useCanvasGame')
      vi.mocked(useCanvasGame).mockReturnValue({
        state: 'error',
        isRunning: false,
        error: 'Some error',
        output: '',
        mode: 'performance',
        process: null,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" />)
      const dismissButton = screen.getByRole('button', { name: /dismiss/i })
      fireEvent.click(dismissButton)
      expect(mockClearError).toHaveBeenCalled()
    })
  })

  describe('lifecycle', () => {
    it('starts game when autoStart is true', async () => {
      const { useCanvasGame } = await import('../../hooks/useCanvasGame')
      vi.mocked(useCanvasGame).mockReturnValue({
        state: 'idle',
        isRunning: false,
        error: null,
        output: '',
        mode: 'performance',
        process: null,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" autoStart />)
      expect(mockStartGame).toHaveBeenCalled()
    })

    it('does not start game when autoStart is false', async () => {
      const { useCanvasGame } = await import('../../hooks/useCanvasGame')
      vi.mocked(useCanvasGame).mockReturnValue({
        state: 'idle',
        isRunning: false,
        error: null,
        output: '',
        mode: 'performance',
        process: null,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" autoStart={false} />)
      expect(mockStartGame).not.toHaveBeenCalled()
    })

    it('calls onExit callback when process exits', async () => {
      const onExit = vi.fn()
      const { useCanvasGame } = await import('../../hooks/useCanvasGame')

      // Capture the onExit callback passed to useCanvasGame
      let capturedOnExit: ((code: number) => void) | undefined
      vi.mocked(useCanvasGame).mockImplementation((options) => {
        capturedOnExit = options?.onExit
        return {
          state: 'running',
          isRunning: true,
          error: null,
          output: '',
          mode: 'performance',
          process: null,
          startGame: mockStartGame,
          stopGame: mockStopGame,
          clearOutput: vi.fn(),
          clearError: mockClearError,
        }
      })

      render(<CanvasGamePanel code="print('hello')" onExit={onExit} />)

      // Simulate process exit
      capturedOnExit?.(0)
      expect(onExit).toHaveBeenCalledWith(0)
    })
  })

  describe('accessibility', () => {
    it('canvas has tabIndex for keyboard focus', () => {
      render(<CanvasGamePanel code="print('hello')" />)
      const canvas = document.querySelector('canvas')
      expect(canvas).toHaveAttribute('tabIndex', '0')
    })

    it('canvas has aria-label', () => {
      render(<CanvasGamePanel code="print('hello')" />)
      const canvas = document.querySelector('canvas')
      expect(canvas).toHaveAttribute('aria-label', 'Canvas game')
    })
  })

  describe('pop-out functionality', () => {
    it('renders pop-out button when running and onPopOut is provided', async () => {
      const { useCanvasGame } = await import('../../hooks/useCanvasGame')
      vi.mocked(useCanvasGame).mockReturnValue({
        state: 'running',
        isRunning: true,
        error: null,
        output: '',
        mode: 'performance',
        process: null,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" onPopOut={vi.fn()} />)
      expect(screen.getByRole('button', { name: /pop.?out/i })).toBeInTheDocument()
    })

    it('does not render pop-out button when onPopOut is not provided', async () => {
      const { useCanvasGame } = await import('../../hooks/useCanvasGame')
      vi.mocked(useCanvasGame).mockReturnValue({
        state: 'running',
        isRunning: true,
        error: null,
        output: '',
        mode: 'performance',
        process: null,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" />)
      expect(screen.queryByRole('button', { name: /pop.?out/i })).not.toBeInTheDocument()
    })

    it('calls onPopOut when pop-out button is clicked', async () => {
      const onPopOut = vi.fn()
      const { useCanvasGame } = await import('../../hooks/useCanvasGame')
      vi.mocked(useCanvasGame).mockReturnValue({
        state: 'running',
        isRunning: true,
        error: null,
        output: '',
        mode: 'performance',
        process: null,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" onPopOut={onPopOut} />)
      fireEvent.click(screen.getByRole('button', { name: /pop.?out/i }))
      expect(onPopOut).toHaveBeenCalled()
    })

    it('does not render pop-out button when not running', async () => {
      const { useCanvasGame } = await import('../../hooks/useCanvasGame')
      vi.mocked(useCanvasGame).mockReturnValue({
        state: 'idle',
        isRunning: false,
        error: null,
        output: '',
        mode: 'performance',
        process: null,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" onPopOut={vi.fn()} />)
      expect(screen.queryByRole('button', { name: /pop.?out/i })).not.toBeInTheDocument()
    })
  })
})
