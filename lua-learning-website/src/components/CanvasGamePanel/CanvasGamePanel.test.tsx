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
const mockPauseGame = vi.fn()
const mockResumeGame = vi.fn()
const mockClearError = vi.fn()

vi.mock('../../hooks/useCanvasGame', () => ({
  useCanvasGame: vi.fn(() => ({
    state: 'idle',
    isRunning: false,
    isPaused: false,
    error: null,
    output: '',
    mode: 'performance',
    process: null,
    startGame: mockStartGame,
    stopGame: mockStopGame,
    pauseGame: mockPauseGame,
    resumeGame: mockResumeGame,
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

    it('renders pause button when running', async () => {
      const { useCanvasGame } = await import('../../hooks/useCanvasGame')
      vi.mocked(useCanvasGame).mockReturnValue({
        state: 'running',
        isRunning: true,
        isPaused: false,
        error: null,
        output: '',
        mode: 'performance',
        process: null,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        pauseGame: mockPauseGame,
        resumeGame: mockResumeGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" />)
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
    })

    it('renders mode indicator showing performance mode', async () => {
      const { useCanvasGame } = await import('../../hooks/useCanvasGame')
      vi.mocked(useCanvasGame).mockReturnValue({
        state: 'running',
        isRunning: true,
        isPaused: false,
        error: null,
        output: '',
        mode: 'performance',
        process: null,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        pauseGame: mockPauseGame,
        resumeGame: mockResumeGame,
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
        isPaused: false,
        error: null,
        output: '',
        mode: 'compatibility',
        process: null,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        pauseGame: mockPauseGame,
        resumeGame: mockResumeGame,
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
        isPaused: false,
        error: 'Runtime error: invalid operation',
        output: '',
        mode: 'performance',
        process: null,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        pauseGame: mockPauseGame,
        resumeGame: mockResumeGame,
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
    it('calls pauseGame when pause button is clicked', async () => {
      const { useCanvasGame } = await import('../../hooks/useCanvasGame')
      vi.mocked(useCanvasGame).mockReturnValue({
        state: 'running',
        isRunning: true,
        isPaused: false,
        error: null,
        output: '',
        mode: 'performance',
        process: null,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        pauseGame: mockPauseGame,
        resumeGame: mockResumeGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" />)
      fireEvent.click(screen.getByRole('button', { name: /pause/i }))
      expect(mockPauseGame).toHaveBeenCalled()
    })

    it('calls resumeGame when resume button is clicked', async () => {
      const { useCanvasGame } = await import('../../hooks/useCanvasGame')
      vi.mocked(useCanvasGame).mockReturnValue({
        state: 'running',
        isRunning: true,
        isPaused: true,
        error: null,
        output: '',
        mode: 'performance',
        process: null,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        pauseGame: mockPauseGame,
        resumeGame: mockResumeGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" />)
      fireEvent.click(screen.getByRole('button', { name: /resume/i }))
      expect(mockResumeGame).toHaveBeenCalled()
    })

    it('calls clearError when error is dismissed', async () => {
      const { useCanvasGame } = await import('../../hooks/useCanvasGame')
      vi.mocked(useCanvasGame).mockReturnValue({
        state: 'error',
        isRunning: false,
        isPaused: false,
        error: 'Some error',
        output: '',
        mode: 'performance',
        process: null,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        pauseGame: mockPauseGame,
        resumeGame: mockResumeGame,
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
        isPaused: false,
        error: null,
        output: '',
        mode: 'performance',
        process: null,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        pauseGame: mockPauseGame,
        resumeGame: mockResumeGame,
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
        isPaused: false,
        error: null,
        output: '',
        mode: 'performance',
        process: null,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        pauseGame: mockPauseGame,
        resumeGame: mockResumeGame,
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
          isPaused: false,
          error: null,
          output: '',
          mode: 'performance',
          process: null,
          startGame: mockStartGame,
          stopGame: mockStopGame,
          pauseGame: mockPauseGame,
          resumeGame: mockResumeGame,
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

  describe('scaling mode', () => {
    it('defaults to fit scaling mode', () => {
      const { container } = render(<CanvasGamePanel code="print('hello')" />)
      const canvasContainer = container.querySelector('[class*="canvasContainer"]')
      expect(canvasContainer?.className).toMatch(/canvasContainerFit/)
    })

    it('applies fit scaling mode CSS class when scalingMode is fit', () => {
      const { container } = render(
        <CanvasGamePanel code="print('hello')" scalingMode="fit" />
      )
      const canvasContainer = container.querySelector('[class*="canvasContainer"]')
      expect(canvasContainer?.className).toMatch(/canvasContainerFit/)
      const canvas = container.querySelector('canvas')
      expect(canvas?.className).toMatch(/canvasFit/)
    })

    it('applies native scaling mode CSS class when scalingMode is native', () => {
      const { container } = render(
        <CanvasGamePanel code="print('hello')" scalingMode="native" />
      )
      const canvasContainer = container.querySelector('[class*="canvasContainer"]')
      expect(canvasContainer?.className).toMatch(/canvasContainerNative/)
      const canvas = container.querySelector('canvas')
      expect(canvas?.className).toMatch(/canvasNative/)
    })

    it('renders scaling mode selector when onScalingModeChange is provided', () => {
      const onScalingModeChange = vi.fn()
      render(
        <CanvasGamePanel
          code="print('hello')"
          scalingMode="fit"
          onScalingModeChange={onScalingModeChange}
        />
      )
      expect(screen.getByRole('combobox', { name: /scale/i })).toBeInTheDocument()
    })

    it('does not render scaling mode selector when onScalingModeChange is not provided', () => {
      render(<CanvasGamePanel code="print('hello')" scalingMode="fit" />)
      expect(screen.queryByRole('combobox', { name: /scale/i })).not.toBeInTheDocument()
    })

    it('calls onScalingModeChange when scaling mode is changed', () => {
      const onScalingModeChange = vi.fn()
      render(
        <CanvasGamePanel
          code="print('hello')"
          scalingMode="fit"
          onScalingModeChange={onScalingModeChange}
        />
      )
      const select = screen.getByRole('combobox', { name: /scale/i })
      fireEvent.change(select, { target: { value: 'native' } })
      expect(onScalingModeChange).toHaveBeenCalledWith('native')
    })

    it('displays correct option as selected in scaling selector', () => {
      const onScalingModeChange = vi.fn()
      render(
        <CanvasGamePanel
          code="print('hello')"
          scalingMode="native"
          onScalingModeChange={onScalingModeChange}
        />
      )
      const select = screen.getByRole('combobox', { name: /scale/i }) as HTMLSelectElement
      expect(select.value).toBe('native')
    })
  })

})
