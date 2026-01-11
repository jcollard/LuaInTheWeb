/**
 * Tests for CanvasGamePanel execution controls.
 * Tests play, pause, stop, and step button visibility and interactions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CanvasGamePanel } from './CanvasGamePanel'

// Mock the useCanvasGame hook
const mockStartGame = vi.fn()
const mockStopGame = vi.fn()
const mockPauseGame = vi.fn()
const mockResumeGame = vi.fn()
const mockStepGame = vi.fn()
const mockReloadGame = vi.fn()
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
    stepGame: mockStepGame,
    reloadGame: mockReloadGame,
    clearOutput: vi.fn(),
    clearError: mockClearError,
  })),
}))

describe('CanvasGamePanel execution controls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('button visibility', () => {
    it('shows play button when running and paused', async () => {
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
        stepGame: mockStepGame,
        reloadGame: mockReloadGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" />)
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument()
    })

    it('shows stop button when running', async () => {
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
        stepGame: mockStepGame,
        reloadGame: mockReloadGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" />)
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
    })

    it('shows step button when running and paused', async () => {
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
        stepGame: mockStepGame,
        reloadGame: mockReloadGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" />)
      expect(screen.getByRole('button', { name: /step/i })).toBeInTheDocument()
    })

    it('hides step button when not paused', async () => {
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
        stepGame: mockStepGame,
        reloadGame: mockReloadGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" />)
      expect(screen.queryByRole('button', { name: /step/i })).not.toBeInTheDocument()
    })

    it('hides all execution controls when not running', async () => {
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
        stepGame: mockStepGame,
        reloadGame: mockReloadGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" />)
      expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /play/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /stop/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /step/i })).not.toBeInTheDocument()
    })
  })

  describe('button interactions', () => {
    it('calls stopGame when stop button is clicked', async () => {
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
        stepGame: mockStepGame,
        reloadGame: mockReloadGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" />)
      fireEvent.click(screen.getByRole('button', { name: /stop/i }))
      expect(mockStopGame).toHaveBeenCalled()
    })

    it('calls stepGame when step button is clicked', async () => {
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
        stepGame: mockStepGame,
        reloadGame: mockReloadGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" />)
      fireEvent.click(screen.getByRole('button', { name: /step/i }))
      expect(mockStepGame).toHaveBeenCalled()
    })

    it('calls resumeGame when play button is clicked', async () => {
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
        stepGame: mockStepGame,
        reloadGame: mockReloadGame,
        clearOutput: vi.fn(),
        clearError: mockClearError,
      })

      render(<CanvasGamePanel code="print('hello')" />)
      fireEvent.click(screen.getByRole('button', { name: /play/i }))
      expect(mockResumeGame).toHaveBeenCalled()
    })
  })
})
