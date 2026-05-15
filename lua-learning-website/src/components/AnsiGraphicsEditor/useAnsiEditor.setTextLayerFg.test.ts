import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnsiEditor } from './useAnsiEditor'
import type { AnsiGrid, LayerState, RGBColor, TextLayer } from './types'

const emptyCell = { char: ' ', fg: [0, 0, 0] as RGBColor, bg: [0, 0, 0] as RGBColor }
const emptyGrid: AnsiGrid = [[{ ...emptyCell }]]

function textLayerState(textFg: RGBColor): LayerState {
  return {
    layers: [{
      type: 'text',
      id: 'text-1',
      name: 'Label',
      visible: true,
      text: '',
      bounds: { r0: 0, c0: 0, r1: 0, c1: 4 },
      textFg,
      grid: emptyGrid,
    } as TextLayer],
    activeLayerId: 'text-1',
  }
}

describe('useAnsiEditor.setTextLayerFgFromBrush', () => {
  it('updates the targeted text layer’s textFg from the current brush', () => {
    const { result } = renderHook(() => useAnsiEditor({ initialLayerState: textLayerState([170, 85, 0]) }))
    const green: RGBColor = [0, 170, 0]
    act(() => result.current.setBrushFg(green))
    act(() => result.current.setTextLayerFgFromBrush('text-1'))
    const layer = result.current.layers.find(l => l.id === 'text-1') as TextLayer
    expect(layer.textFg).toEqual(green)
  })

  it('is undoable', () => {
    const orange: RGBColor = [170, 85, 0]
    const { result } = renderHook(() => useAnsiEditor({ initialLayerState: textLayerState(orange) }))
    act(() => result.current.setBrushFg([0, 170, 0]))
    act(() => result.current.setTextLayerFgFromBrush('text-1'))
    expect(result.current.canUndo).toBe(true)
    act(() => result.current.undo())
    const layer = result.current.layers.find(l => l.id === 'text-1') as TextLayer
    expect(layer.textFg).toEqual(orange)
  })

  it('is a no-op for non-text layers (silently)', () => {
    const drawnOnlyState: LayerState = {
      layers: [{
        type: 'drawn', id: 'bg', name: 'Background', visible: true,
        grid: emptyGrid,
        frames: [emptyGrid], currentFrameIndex: 0, frameDurationMs: 100,
      }],
      activeLayerId: 'bg',
    }
    const { result } = renderHook(() => useAnsiEditor({ initialLayerState: drawnOnlyState }))
    act(() => result.current.setBrushFg([0, 170, 0]))
    act(() => result.current.setTextLayerFgFromBrush('bg'))
    expect(result.current.canUndo).toBe(false)
  })
})
