import { describe, it, expect } from 'vitest'
import { extractCrtConfig } from '../src/projectCrtConfig'
import { CRT_DEFAULTS } from '../src/crtShader'

describe('extractCrtConfig', () => {
  it('should return null for non-ansi project', () => {
    const content = `return { name = "test", main = "main.lua", type = "canvas" }`
    expect(extractCrtConfig(content)).toBeNull()
  })

  it('should return null when crt is false', () => {
    const content = `return {
      name = "test", main = "main.lua", type = "ansi",
      ansi = { crt = false }
    }`
    expect(extractCrtConfig(content)).toBeNull()
  })

  it('should return null when ansi section is missing', () => {
    const content = `return { name = "test", main = "main.lua", type = "ansi" }`
    expect(extractCrtConfig(content)).toBeNull()
  })

  it('should return CRT_DEFAULTS when crt is true with no overrides', () => {
    const content = `return {
      name = "test", main = "main.lua", type = "ansi",
      ansi = { crt = true }
    }`
    const config = extractCrtConfig(content)
    expect(config).toEqual(CRT_DEFAULTS)
  })

  it('should merge custom values with defaults', () => {
    const content = `return {
      name = "test", main = "main.lua", type = "ansi",
      ansi = { crt = true, crt_curvature = 0.2, crt_brightness = 1.5 }
    }`
    const config = extractCrtConfig(content)
    expect(config).not.toBeNull()
    expect(config!.curvature).toBe(0.2)
    expect(config!.brightness).toBe(1.5)
    expect(config!.scanlineIntensity).toBe(CRT_DEFAULTS.scanlineIntensity)
  })

  it('should handle crt_smoothing boolean', () => {
    const content = `return {
      name = "test", main = "main.lua", type = "ansi",
      ansi = { crt = true, crt_smoothing = false }
    }`
    const config = extractCrtConfig(content)
    expect(config!.smoothing).toBe(false)
  })

  it('should return null for invalid Lua syntax', () => {
    expect(extractCrtConfig('return { name =')).toBeNull()
  })

  it('should return null for non-table return', () => {
    expect(extractCrtConfig('return 42')).toBeNull()
  })
})
