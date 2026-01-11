/**
 * Tests for CanvasGamePanel scaling mode functionality.
 * Tests canvas scaling modes (fit, native, full) and the scaling selector.
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

describe('CanvasGamePanel scaling mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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

  it('applies full scaling mode CSS class when scalingMode is full', () => {
    const { container } = render(
      <CanvasGamePanel code="print('hello')" scalingMode="full" />
    )
    const canvasContainer = container.querySelector('[class*="canvasContainer"]')
    expect(canvasContainer?.className).toMatch(/canvasContainerFull/)
    const canvas = container.querySelector('canvas')
    expect(canvas?.className).toMatch(/canvasFull/)
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

  it('calls onScalingModeChange when scaling mode is changed to native', () => {
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

  it('calls onScalingModeChange when scaling mode is changed to full', () => {
    const onScalingModeChange = vi.fn()
    render(
      <CanvasGamePanel
        code="print('hello')"
        scalingMode="fit"
        onScalingModeChange={onScalingModeChange}
      />
    )
    const select = screen.getByRole('combobox', { name: /scale/i })
    fireEvent.change(select, { target: { value: 'full' } })
    expect(onScalingModeChange).toHaveBeenCalledWith('full')
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
