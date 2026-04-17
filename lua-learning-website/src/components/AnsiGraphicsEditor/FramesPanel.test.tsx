import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
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
    onReorderFrame: vi.fn(),
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
    expect(screen.getAllByTestId(/^frame-cell-\d+$/)).toHaveLength(5)
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

describe('FramesPanel drag-and-drop frame reordering', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  /** Fire dragStart and flush the deferred requestAnimationFrame. */
  function startDrag(cell: HTMLElement): void {
    fireEvent.dragStart(cell, { dataTransfer: { setData: vi.fn(), effectAllowed: '' } })
    act(() => { vi.runAllTimers() })
  }

  it('renders frameCount + 1 drop zones', () => {
    render(<FramesPanel {...defaultProps({ frameCount: 4 })} />)
    expect(screen.getAllByTestId(/^frame-drop-zone-\d+$/)).toHaveLength(5)
  })

  it('renders drop zones at the correct positions', () => {
    render(<FramesPanel {...defaultProps({ frameCount: 3 })} />)
    expect(screen.getByTestId('frame-drop-zone-0')).toBeTruthy()
    expect(screen.getByTestId('frame-drop-zone-1')).toBeTruthy()
    expect(screen.getByTestId('frame-drop-zone-2')).toBeTruthy()
    expect(screen.getByTestId('frame-drop-zone-3')).toBeTruthy()
  })

  it('frame cells are draggable when not playing', () => {
    render(<FramesPanel {...defaultProps({ frameCount: 3 })} />)
    expect(screen.getByTestId('frame-cell-0').getAttribute('draggable')).toBe('true')
  })

  it('frame cells are not draggable while playing', () => {
    render(<FramesPanel {...defaultProps({ frameCount: 3, isPlaying: true })} />)
    expect(screen.getByTestId('frame-cell-0').getAttribute('draggable')).toBe('false')
  })

  it('dropping frame 0 on zone 2 calls onReorderFrame(0, 1)', () => {
    // zone 2 is between frames 1 and 2. from=0, zone=2, zone>from+1 → to=zone-1=1
    const onReorderFrame = vi.fn()
    render(<FramesPanel {...defaultProps({ frameCount: 3, onReorderFrame })} />)
    startDrag(screen.getByTestId('frame-cell-0'))
    const zone = screen.getByTestId('frame-drop-zone-2')
    fireEvent.dragOver(zone, { dataTransfer: { dropEffect: '' }, preventDefault: vi.fn() })
    fireEvent.drop(zone, { dataTransfer: { getData: () => '0' }, preventDefault: vi.fn() })
    expect(onReorderFrame).toHaveBeenCalledWith(0, 1)
  })

  it('dropping frame 0 on the last zone calls onReorderFrame(0, frameCount-1)', () => {
    // from=0, zone=3 (after last frame when frameCount=3), zone>from+1 → to=zone-1=2
    const onReorderFrame = vi.fn()
    render(<FramesPanel {...defaultProps({ frameCount: 3, onReorderFrame })} />)
    startDrag(screen.getByTestId('frame-cell-0'))
    const zone = screen.getByTestId('frame-drop-zone-3')
    fireEvent.dragOver(zone, { dataTransfer: { dropEffect: '' }, preventDefault: vi.fn() })
    fireEvent.drop(zone, { dataTransfer: { getData: () => '0' }, preventDefault: vi.fn() })
    expect(onReorderFrame).toHaveBeenCalledWith(0, 2)
  })

  it('dropping frame 2 on zone 0 calls onReorderFrame(2, 0)', () => {
    // zone 0 is before frame 0. from=2, zone=0, zone<from → to=zone=0
    const onReorderFrame = vi.fn()
    render(<FramesPanel {...defaultProps({ frameCount: 3, onReorderFrame })} />)
    startDrag(screen.getByTestId('frame-cell-2'))
    const zone = screen.getByTestId('frame-drop-zone-0')
    fireEvent.dragOver(zone, { dataTransfer: { dropEffect: '' }, preventDefault: vi.fn() })
    fireEvent.drop(zone, { dataTransfer: { getData: () => '2' }, preventDefault: vi.fn() })
    expect(onReorderFrame).toHaveBeenCalledWith(2, 0)
  })

  it('dropping frame on its left flanking zone is a no-op', () => {
    // from=1, zone=1 (left of frame 1) → no-op
    const onReorderFrame = vi.fn()
    render(<FramesPanel {...defaultProps({ frameCount: 3, onReorderFrame })} />)
    startDrag(screen.getByTestId('frame-cell-1'))
    const zone = screen.getByTestId('frame-drop-zone-1')
    fireEvent.dragOver(zone, { dataTransfer: { dropEffect: '' }, preventDefault: vi.fn() })
    fireEvent.drop(zone, { dataTransfer: { getData: () => '1' }, preventDefault: vi.fn() })
    expect(onReorderFrame).not.toHaveBeenCalled()
  })

  it('dropping frame on its right flanking zone is a no-op', () => {
    // from=1, zone=2 (right of frame 1) → no-op
    const onReorderFrame = vi.fn()
    render(<FramesPanel {...defaultProps({ frameCount: 3, onReorderFrame })} />)
    startDrag(screen.getByTestId('frame-cell-1'))
    const zone = screen.getByTestId('frame-drop-zone-2')
    fireEvent.dragOver(zone, { dataTransfer: { dropEffect: '' }, preventDefault: vi.fn() })
    fireEvent.drop(zone, { dataTransfer: { getData: () => '1' }, preventDefault: vi.fn() })
    expect(onReorderFrame).not.toHaveBeenCalled()
  })

  it('active drop zone gets the active class while dragging', () => {
    render(<FramesPanel {...defaultProps({ frameCount: 3 })} />)
    startDrag(screen.getByTestId('frame-cell-0'))
    const zone = screen.getByTestId('frame-drop-zone-2')
    fireEvent.dragOver(zone, { dataTransfer: { dropEffect: '' }, preventDefault: vi.fn() })
    expect(zone.className).toContain('frameDropZoneActive')
  })

  it('drop zones do not trigger onReorderFrame while playing', () => {
    const onReorderFrame = vi.fn()
    render(<FramesPanel {...defaultProps({ frameCount: 3, isPlaying: true, onReorderFrame })} />)
    const zone = screen.getByTestId('frame-drop-zone-2')
    fireEvent.drop(zone, { dataTransfer: { getData: () => '0' }, preventDefault: vi.fn() })
    expect(onReorderFrame).not.toHaveBeenCalled()
  })

  it('dragging cell applies dragging class', () => {
    render(<FramesPanel {...defaultProps({ frameCount: 3 })} />)
    const cell = screen.getByTestId('frame-cell-0')
    startDrag(cell)
    expect(cell.className).toContain('frameCellDragging')
  })

  it('dragEnd clears dragging state', () => {
    render(<FramesPanel {...defaultProps({ frameCount: 3 })} />)
    const cell = screen.getByTestId('frame-cell-0')
    startDrag(cell)
    fireEvent.dragEnd(cell)
    expect(cell.className).not.toContain('frameCellDragging')
  })

  it('invalid dataTransfer payload does not call onReorderFrame', () => {
    const onReorderFrame = vi.fn()
    render(<FramesPanel {...defaultProps({ frameCount: 3, onReorderFrame })} />)
    const zone = screen.getByTestId('frame-drop-zone-2')
    fireEvent.drop(zone, { dataTransfer: { getData: () => 'not-a-number' }, preventDefault: vi.fn() })
    expect(onReorderFrame).not.toHaveBeenCalled()
  })
})
