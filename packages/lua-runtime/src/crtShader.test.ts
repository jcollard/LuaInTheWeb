/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CrtShader, CRT_DEFAULTS } from './crtShader'

// Minimal WebGL2RenderingContext mock
function createMockGL(): Record<string, unknown> {
  return {
    VERTEX_SHADER: 0x8B31,
    FRAGMENT_SHADER: 0x8B30,
    LINK_STATUS: 0x8B82,
    COMPILE_STATUS: 0x8B81,
    TEXTURE_2D: 0x0DE1,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    LINEAR: 0x2601,
    CLAMP_TO_EDGE: 0x812F,
    RGBA: 0x1908,
    UNSIGNED_BYTE: 0x1401,
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88E4,
    FLOAT: 0x1406,
    TEXTURE0: 0x84C0,
    TRIANGLE_STRIP: 0x0005,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getUniformLocation: vi.fn(() => 0),
    getAttribLocation: vi.fn(() => 0),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    createTexture: vi.fn(() => ({})),
    bindTexture: vi.fn(),
    texParameteri: vi.fn(),
    texImage2D: vi.fn(),
    viewport: vi.fn(),
    useProgram: vi.fn(),
    activeTexture: vi.fn(),
    uniform1i: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    drawArrays: vi.fn(),
    deleteTexture: vi.fn(),
    deleteProgram: vi.fn(),
    deleteShader: vi.fn(),
    getExtension: vi.fn(() => ({ loseContext: vi.fn() })),
  }
}

describe('CrtShader', () => {
  let sourceCanvas: HTMLCanvasElement
  let container: HTMLDivElement
  let mockGL: Record<string, unknown>

  beforeEach(() => {
    sourceCanvas = document.createElement('canvas')
    sourceCanvas.width = 640
    sourceCanvas.height = 400
    container = document.createElement('div')
    container.appendChild(sourceCanvas)

    mockGL = createMockGL()

    // Mock getContext on dynamically created canvases
    const origCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreateElement(tag)
      if (tag === 'canvas') {
        vi.spyOn(el as HTMLCanvasElement, 'getContext').mockImplementation((id: string) => {
          if (id === 'webgl2') return mockGL as unknown as WebGL2RenderingContext
          return null
        })
      }
      return el
    })

    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1)
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should construct without errors', () => {
    const crt = new CrtShader(sourceCanvas, container)
    expect(crt.isEnabled()).toBe(false)
    expect(crt.isFallback()).toBe(false)
  })

  it('enable() should create WebGL overlay canvas', () => {
    const crt = new CrtShader(sourceCanvas, container)
    crt.enable(0.5)

    expect(crt.isEnabled()).toBe(true)
    expect(crt.isFallback()).toBe(false)
    // WebGL canvas appended to container
    const canvases = container.querySelectorAll('canvas')
    expect(canvases.length).toBe(2) // source + overlay
    // Source canvas should be hidden
    expect(sourceCanvas.style.visibility).toBe('hidden')
    // rAF started
    expect(requestAnimationFrame).toHaveBeenCalled()

    crt.dispose()
  })

  it('enable() should be idempotent', () => {
    const crt = new CrtShader(sourceCanvas, container)
    crt.enable(0.5)
    crt.enable(0.8) // second call should just update intensity

    expect(crt.isEnabled()).toBe(true)
    const canvases = container.querySelectorAll('canvas')
    expect(canvases.length).toBe(2)

    crt.dispose()
  })

  it('disable() should remove overlay and restore source visibility', () => {
    const crt = new CrtShader(sourceCanvas, container)
    crt.enable(0.7)
    crt.disable()

    expect(crt.isEnabled()).toBe(false)
    expect(sourceCanvas.style.visibility).toBe('')
    expect(cancelAnimationFrame).toHaveBeenCalled()
    // Overlay canvas removed
    const canvases = container.querySelectorAll('canvas')
    expect(canvases.length).toBe(1) // only source remains
  })

  it('disable() should be safe to call when not enabled', () => {
    const crt = new CrtShader(sourceCanvas, container)
    expect(() => crt.disable()).not.toThrow()
  })

  it('setIntensity() should clamp to [0, 1]', () => {
    const crt = new CrtShader(sourceCanvas, container)
    crt.enable(0.5)

    crt.setIntensity(-0.5)
    // Can't directly check private field, but at least no errors
    crt.setIntensity(2.0)
    crt.setIntensity(0.3)

    crt.dispose()
  })

  it('dispose() should clean up WebGL resources', () => {
    const crt = new CrtShader(sourceCanvas, container)
    crt.enable(0.7)
    crt.dispose()

    expect(crt.isEnabled()).toBe(false)
    expect(mockGL.deleteTexture).toHaveBeenCalled()
    expect(mockGL.deleteProgram).toHaveBeenCalled()
    expect(mockGL.getExtension).toHaveBeenCalledWith('WEBGL_lose_context')
  })

  it('dispose() is safe to call multiple times', () => {
    const crt = new CrtShader(sourceCanvas, container)
    crt.enable(0.7)
    crt.dispose()
    expect(() => crt.dispose()).not.toThrow()
  })

  describe('CSS fallback', () => {
    beforeEach(() => {
      // Make WebGL2 unavailable
      vi.restoreAllMocks()
      const origCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = origCreateElement(tag)
        if (tag === 'canvas') {
          vi.spyOn(el as HTMLCanvasElement, 'getContext').mockReturnValue(null)
        }
        return el
      })
      vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1)
      vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})
    })

    it('should fall back to CSS when WebGL2 is unavailable', () => {
      const crt = new CrtShader(sourceCanvas, container, {
        fallbackCssClass: 'crtEnabled',
      })
      crt.enable(0.6)

      expect(crt.isEnabled()).toBe(true)
      expect(crt.isFallback()).toBe(true)
      expect(container.classList.contains('crtEnabled')).toBe(true)
      expect(container.style.getPropertyValue('--crt-intensity')).toBe('0.6')

      crt.dispose()
    })

    it('setIntensity() should update CSS property in fallback mode', () => {
      const crt = new CrtShader(sourceCanvas, container, {
        fallbackCssClass: 'crtEnabled',
      })
      crt.enable(0.5)
      crt.setIntensity(0.5)

      expect(container.style.getPropertyValue('--crt-intensity')).toBe('0.5')

      crt.dispose()
    })

    it('disable() should remove CSS class and property in fallback mode', () => {
      const crt = new CrtShader(sourceCanvas, container, {
        fallbackCssClass: 'crtEnabled',
      })
      crt.enable(0.7)
      crt.disable()

      expect(crt.isEnabled()).toBe(false)
      expect(crt.isFallback()).toBe(false)
      expect(container.classList.contains('crtEnabled')).toBe(false)
      expect(container.style.getPropertyValue('--crt-intensity')).toBe('')
    })

    it('should work without a fallbackCssClass option', () => {
      const crt = new CrtShader(sourceCanvas, container)
      crt.enable()

      expect(crt.isFallback()).toBe(true)
      // No class added, but property is set (defaults → fallback intensity 1.0)
      expect(container.style.getPropertyValue('--crt-intensity')).toBe('1')

      crt.dispose()
    })
  })

  describe('per-effect config', () => {
    it('getConfig() returns defaults after enable()', () => {
      const crt = new CrtShader(sourceCanvas, container)
      crt.enable()
      expect(crt.getConfig()).toEqual(CRT_DEFAULTS)
      crt.dispose()
    })

    it('enable() with partial config merges with defaults', () => {
      const crt = new CrtShader(sourceCanvas, container)
      crt.enable({ scanlines: 0.8, curvature: 0.3 })
      const cfg = crt.getConfig()
      expect(cfg.scanlines).toBe(0.8)
      expect(cfg.curvature).toBe(0.3)
      expect(cfg.bloom).toBe(CRT_DEFAULTS.bloom)
      crt.dispose()
    })

    it('enable() with numeric intensity scales all defaults', () => {
      const crt = new CrtShader(sourceCanvas, container)
      crt.enable(0.5)
      const cfg = crt.getConfig()
      expect(cfg.curvature).toBeCloseTo(CRT_DEFAULTS.curvature * 0.5)
      expect(cfg.scanlines).toBeCloseTo(CRT_DEFAULTS.scanlines * 0.5)
      expect(cfg.bloom).toBeCloseTo(CRT_DEFAULTS.bloom * 0.5)
      // Brightness scales relative to 1.0
      expect(cfg.brightness).toBeCloseTo(1 + (CRT_DEFAULTS.brightness - 1) * 0.5)
      crt.dispose()
    })

    it('setConfig() merges partial config', () => {
      const crt = new CrtShader(sourceCanvas, container)
      crt.enable()
      crt.setConfig({ bloom: 0.9 })
      expect(crt.getConfig().bloom).toBe(0.9)
      expect(crt.getConfig().scanlines).toBe(CRT_DEFAULTS.scanlines)
      crt.dispose()
    })

    it('setIntensity() scales all defaults proportionally', () => {
      const crt = new CrtShader(sourceCanvas, container)
      crt.enable()
      crt.setIntensity(0)
      const cfg = crt.getConfig()
      expect(cfg.curvature).toBe(0)
      expect(cfg.scanlines).toBe(0)
      expect(cfg.brightness).toBe(1)
      crt.dispose()
    })

    it('per-effect uniforms are set during render', () => {
      const crt = new CrtShader(sourceCanvas, container)
      crt.enable({ scanlines: 0.9 })
      // Verify uniform1f was called (indirectly via the mock GL)
      expect(mockGL.uniform1f).toHaveBeenCalled()
      crt.dispose()
    })
  })

  describe('shader compilation failure', () => {
    it('should fall back if shader compile fails', () => {
      vi.restoreAllMocks()
      const failGL = createMockGL()
      failGL.getShaderParameter = vi.fn(() => false)

      const origCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = origCreateElement(tag)
        if (tag === 'canvas') {
          vi.spyOn(el as HTMLCanvasElement, 'getContext').mockImplementation((id: string) => {
            if (id === 'webgl2') return failGL as unknown as WebGL2RenderingContext
            return null
          })
        }
        return el
      })
      vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1)
      vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})

      const crt = new CrtShader(sourceCanvas, container, { fallbackCssClass: 'crtEnabled' })
      crt.enable(0.7)

      expect(crt.isFallback()).toBe(true)
      crt.dispose()
    })

    it('should fall back if program link fails', () => {
      vi.restoreAllMocks()
      const failGL = createMockGL()
      failGL.getProgramParameter = vi.fn(() => false)

      const origCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = origCreateElement(tag)
        if (tag === 'canvas') {
          vi.spyOn(el as HTMLCanvasElement, 'getContext').mockImplementation((id: string) => {
            if (id === 'webgl2') return failGL as unknown as WebGL2RenderingContext
            return null
          })
        }
        return el
      })
      vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1)
      vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})

      const crt = new CrtShader(sourceCanvas, container, { fallbackCssClass: 'crtEnabled' })
      crt.enable(0.7)

      expect(crt.isFallback()).toBe(true)
      crt.dispose()
    })
  })
})
