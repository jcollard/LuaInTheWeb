import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnsiEditor } from './useAnsiEditor'

describe('useAnsiEditor — font settings', () => {
  it('setFont marks the editor dirty so Save picks up the change', () => {
    const { result } = renderHook(() => useAnsiEditor())
    expect(result.current.isDirty).toBe(false)
    expect(result.current.font).toBe('IBM_VGA_8x16') // default

    act(() => result.current.setFont('IBM_VGA_9x16'))
    expect(result.current.font).toBe('IBM_VGA_9x16')
    expect(result.current.isDirty).toBe(true)
  })

  it('setUseFontBlocks marks the editor dirty', () => {
    const { result } = renderHook(() => useAnsiEditor())
    expect(result.current.isDirty).toBe(false)
    expect(result.current.useFontBlocks).toBe(true) // default

    act(() => result.current.setUseFontBlocks(false))
    expect(result.current.useFontBlocks).toBe(false)
    expect(result.current.isDirty).toBe(true)
  })

  it('setFont normalizes a non-string id to the default', () => {
    const { result } = renderHook(() => useAnsiEditor())
    // Simulate a caller passing an empty string (schema protection).
    act(() => result.current.setFont(''))
    // normalizeAnsiFontId returns DEFAULT_ANSI_FONT_ID when empty.
    expect(result.current.font).toBe('IBM_VGA_8x16')
  })

  it('hydrates font / useFontBlocks from initialLayerState', () => {
    const { result } = renderHook(() =>
      useAnsiEditor({
        initialLayerState: {
          layers: [{
            type: 'drawn', id: 'bg', name: 'Background', visible: true,
            grid: [[{ char: ' ', fg: [0, 0, 0], bg: [0, 0, 0] }]],
            frames: [[[{ char: ' ', fg: [0, 0, 0], bg: [0, 0, 0] }]]],
            currentFrameIndex: 0,
            frameDurationMs: 100,
          }],
          activeLayerId: 'bg',
          font: 'IBM_CGA_8x8',
          useFontBlocks: false,
        },
      }),
    )
    expect(result.current.font).toBe('IBM_CGA_8x8')
    expect(result.current.useFontBlocks).toBe(false)
    // Hydration from loaded state should NOT mark dirty — it's just loading.
    expect(result.current.isDirty).toBe(false)
  })
})
