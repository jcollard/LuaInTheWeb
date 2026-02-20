import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FramesPanel } from './FramesPanel'
import type { FramesPanelProps } from './FramesPanel'

function defaultProps(overrides: Partial<FramesPanelProps> = {}): FramesPanelProps {
  return {
    frameCount: 3,
    currentFrame: 1,
    frameDuration: 100,
    isPlaying: false,
    onSelectFrame: vi.fn(),
    onAddFrame: vi.fn(),
    onDuplicateFrame: vi.fn(),
    onRemoveFrame: vi.fn(),
    onSetDuration: vi.fn(),
    onTogglePlayback: vi.fn(),
    ...overrides,
  }
}

describe('FramesPanel', () => {
  it('renders frame counter with 1-based display', () => {
    render(<FramesPanel {...defaultProps()} />)
    expect(screen.getByTestId('frame-counter').textContent).toContain('Frame 2 / 3')
  })

  it('renders the correct number of frame cells', () => {
    render(<FramesPanel {...defaultProps({ frameCount: 5 })} />)
    expect(screen.getByTestId('frames-strip').children).toHaveLength(5)
  })

  it('highlights the active frame cell', () => {
    render(<FramesPanel {...defaultProps({ currentFrame: 0 })} />)
    const cell0 = screen.getByTestId('frame-cell-0')
    expect(cell0.className).toContain('frameCellActive')
    const cell1 = screen.getByTestId('frame-cell-1')
    expect(cell1.className).not.toContain('frameCellActive')
  })

  it('calls onSelectFrame when a frame cell is clicked', () => {
    const onSelectFrame = vi.fn()
    render(<FramesPanel {...defaultProps({ onSelectFrame })} />)
    fireEvent.click(screen.getByTestId('frame-cell-2'))
    expect(onSelectFrame).toHaveBeenCalledWith(2)
  })

  it('calls onAddFrame when Add button is clicked', () => {
    const onAddFrame = vi.fn()
    render(<FramesPanel {...defaultProps({ onAddFrame })} />)
    fireEvent.click(screen.getByTestId('add-frame'))
    expect(onAddFrame).toHaveBeenCalledOnce()
  })

  it('calls onDuplicateFrame when Dup button is clicked', () => {
    const onDuplicateFrame = vi.fn()
    render(<FramesPanel {...defaultProps({ onDuplicateFrame })} />)
    fireEvent.click(screen.getByTestId('duplicate-frame'))
    expect(onDuplicateFrame).toHaveBeenCalledOnce()
  })

  it('calls onRemoveFrame when Del button is clicked', () => {
    const onRemoveFrame = vi.fn()
    render(<FramesPanel {...defaultProps({ onRemoveFrame })} />)
    fireEvent.click(screen.getByTestId('remove-frame'))
    expect(onRemoveFrame).toHaveBeenCalledOnce()
  })

  it('disables Del button when only one frame', () => {
    render(<FramesPanel {...defaultProps({ frameCount: 1, currentFrame: 0 })} />)
    expect(screen.getByTestId('remove-frame')).toBeDisabled()
  })

  it('calls onTogglePlayback when play button is clicked', () => {
    const onTogglePlayback = vi.fn()
    render(<FramesPanel {...defaultProps({ onTogglePlayback })} />)
    fireEvent.click(screen.getByTestId('playback-toggle'))
    expect(onTogglePlayback).toHaveBeenCalledOnce()
  })

  it('shows stop icon when playing', () => {
    render(<FramesPanel {...defaultProps({ isPlaying: true })} />)
    expect(screen.getByTestId('playback-toggle').textContent).toBe('\u25A0')
  })

  it('shows play icon when not playing', () => {
    render(<FramesPanel {...defaultProps({ isPlaying: false })} />)
    expect(screen.getByTestId('playback-toggle').textContent).toBe('\u25B6')
  })

  it('disables controls during playback except stop', () => {
    render(<FramesPanel {...defaultProps({ isPlaying: true })} />)
    expect(screen.getByTestId('add-frame')).toBeDisabled()
    expect(screen.getByTestId('duplicate-frame')).toBeDisabled()
    expect(screen.getByTestId('remove-frame')).toBeDisabled()
    expect(screen.getByTestId('frame-duration-input')).toBeDisabled()
    expect(screen.getByTestId('frame-cell-0')).toBeDisabled()
    // Play/stop button should still work
    expect(screen.getByTestId('playback-toggle')).not.toBeDisabled()
  })

  it('calls onSetDuration on blur with valid value', () => {
    const onSetDuration = vi.fn()
    render(<FramesPanel {...defaultProps({ onSetDuration })} />)
    const input = screen.getByTestId('frame-duration-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: '200' } })
    fireEvent.blur(input)
    expect(onSetDuration).toHaveBeenCalledWith(200)
  })

  it('calls onSetDuration on Enter key', () => {
    const onSetDuration = vi.fn()
    render(<FramesPanel {...defaultProps({ onSetDuration })} />)
    const input = screen.getByTestId('frame-duration-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: '300' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSetDuration).toHaveBeenCalledWith(300)
  })
})
