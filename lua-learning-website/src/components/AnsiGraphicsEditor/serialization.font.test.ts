import { describe, it, expect } from 'vitest'
import { serializeLayers, deserializeLayers } from './serialization'
import type { LayerState } from './types'
import { createLayer } from './layerUtils'

function makeState(overrides: Partial<LayerState> = {}): LayerState {
  return {
    layers: [createLayer('BG', 'l1')],
    activeLayerId: 'l1',
    ...overrides,
  }
}

describe('font + useFontBlocks serialization', () => {
  it('omits font field when value is the default IBM_VGA', () => {
    const lua = serializeLayers(makeState({ font: 'IBM_VGA' }))
    expect(lua).not.toContain('["font"]')
  })

  it('omits useFontBlocks field when value is the default true', () => {
    const lua = serializeLayers(makeState({ useFontBlocks: true }))
    expect(lua).not.toContain('["useFontBlocks"]')
  })

  it('writes useFontBlocks = false when explicitly disabled', () => {
    const lua = serializeLayers(makeState({ useFontBlocks: false }))
    expect(lua).toContain('["useFontBlocks"] = false')
  })

  it('round-trips defaults when fields are absent in the file', () => {
    const lua = serializeLayers(makeState())
    const restored = deserializeLayers(lua)
    expect(restored.font).toBe('IBM_VGA')
    expect(restored.useFontBlocks).toBe(true)
  })

  it('round-trips useFontBlocks = false', () => {
    const lua = serializeLayers(makeState({ useFontBlocks: false }))
    const restored = deserializeLayers(lua)
    expect(restored.useFontBlocks).toBe(false)
    expect(restored.font).toBe('IBM_VGA')
  })

  it('normalizes unknown font IDs to the default on read', () => {
    const lua = serializeLayers(makeState()).replace(
      'return {',
      'return {\n  ["font"] = "BOGUS_FONT",',
    )
    const restored = deserializeLayers(lua)
    expect(restored.font).toBe('IBM_VGA')
  })

  it('reads explicit font + useFontBlocks fields when present in v7 file', () => {
    const lua = serializeLayers(makeState()).replace(
      'return {',
      'return {\n  ["font"] = "IBM_VGA",\n  ["useFontBlocks"] = false,',
    )
    const restored = deserializeLayers(lua)
    expect(restored.font).toBe('IBM_VGA')
    expect(restored.useFontBlocks).toBe(false)
  })
})
