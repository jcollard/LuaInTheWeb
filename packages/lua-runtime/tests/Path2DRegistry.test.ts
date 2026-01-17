/**
 * Tests for Path2DRegistry class - Registry for reusable Path2D objects.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { Path2DRegistry, type IPath2DRenderer } from '../src/Path2DRegistry'

/**
 * Mock Path2D class for testing in jsdom environment.
 * Path2D is not available in jsdom, so we mock it.
 */
class MockPath2D {
  private operations: string[] = []

  constructor(_svgPath?: string | MockPath2D) {
    if (typeof _svgPath === 'string') {
      this.operations.push(`svg:${_svgPath}`)
    } else if (_svgPath instanceof MockPath2D) {
      this.operations.push(..._svgPath.operations)
    }
  }

  moveTo(x: number, y: number): void {
    this.operations.push(`moveTo:${x},${y}`)
  }

  lineTo(x: number, y: number): void {
    this.operations.push(`lineTo:${x},${y}`)
  }

  closePath(): void {
    this.operations.push('closePath')
  }

  rect(x: number, y: number, w: number, h: number): void {
    this.operations.push(`rect:${x},${y},${w},${h}`)
  }

  roundRect(x: number, y: number, w: number, h: number, radii: number | number[]): void {
    this.operations.push(`roundRect:${x},${y},${w},${h},${JSON.stringify(radii)}`)
  }

  arc(x: number, y: number, r: number, start: number, end: number, ccw?: boolean): void {
    this.operations.push(`arc:${x},${y},${r},${start},${end},${ccw ?? false}`)
  }

  arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void {
    this.operations.push(`arcTo:${x1},${y1},${x2},${y2},${r}`)
  }

  ellipse(x: number, y: number, rx: number, ry: number, rot: number, start: number, end: number, ccw?: boolean): void {
    this.operations.push(`ellipse:${x},${y},${rx},${ry},${rot},${start},${end},${ccw ?? false}`)
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.operations.push(`quadraticCurveTo:${cpx},${cpy},${x},${y}`)
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    this.operations.push(`bezierCurveTo:${cp1x},${cp1y},${cp2x},${cp2y},${x},${y}`)
  }

  addPath(path: MockPath2D): void {
    this.operations.push(`addPath:${path.operations.length} ops`)
  }

  getOperations(): string[] {
    return [...this.operations]
  }
}

// Store original Path2D if it exists
let originalPath2D: typeof Path2D | undefined

beforeAll(() => {
  // Save original and install mock
  originalPath2D = (globalThis as unknown as { Path2D?: typeof Path2D }).Path2D
  ;(globalThis as unknown as { Path2D: typeof MockPath2D }).Path2D = MockPath2D as unknown as typeof Path2D
})

afterAll(() => {
  // Restore original
  if (originalPath2D) {
    ;(globalThis as unknown as { Path2D: typeof Path2D }).Path2D = originalPath2D
  } else {
    delete (globalThis as unknown as { Path2D?: typeof Path2D }).Path2D
  }
})

/**
 * Creates a mock renderer for testing hit testing methods.
 */
function createMockRenderer(): IPath2DRenderer & {
  isPointInPath: ReturnType<typeof vi.fn>
  isPointInStroke: ReturnType<typeof vi.fn>
} {
  return {
    isPointInPath: vi.fn().mockReturnValue(false),
    isPointInStroke: vi.fn().mockReturnValue(false),
  }
}

describe('Path2DRegistry', () => {
  let registry: Path2DRegistry
  let mockAddDrawCommand: ReturnType<typeof vi.fn>
  let mockRenderer: ReturnType<typeof createMockRenderer>

  beforeEach(() => {
    registry = new Path2DRegistry()
    mockAddDrawCommand = vi.fn()
    mockRenderer = createMockRenderer()
  })

  describe('construction', () => {
    it('should construct with no arguments', () => {
      expect(registry).toBeDefined()
    })

    it('should start with no paths', () => {
      expect(registry.hasPath(1)).toBe(false)
    })
  })

  describe('setAddDrawCommand', () => {
    it('should allow setting the draw command callback', () => {
      registry.setAddDrawCommand(mockAddDrawCommand)
      const { id } = registry.createPath()
      registry.fillPath(id)
      expect(mockAddDrawCommand).toHaveBeenCalled()
    })

    it('should allow setting callback to null', () => {
      registry.setAddDrawCommand(mockAddDrawCommand)
      registry.setAddDrawCommand(null)
      const { id } = registry.createPath()
      registry.fillPath(id)
      expect(mockAddDrawCommand).not.toHaveBeenCalled()
    })
  })

  describe('setRenderer', () => {
    it('should allow setting the renderer', () => {
      mockRenderer.isPointInPath.mockReturnValue(true)
      registry.setRenderer(mockRenderer)
      const { id } = registry.createPath()
      expect(registry.isPointInStoredPath(id, 10, 10)).toBe(true)
    })

    it('should allow setting renderer to null', () => {
      registry.setRenderer(mockRenderer)
      registry.setRenderer(null)
      const { id } = registry.createPath()
      expect(registry.isPointInStoredPath(id, 10, 10)).toBe(false)
    })
  })

  describe('registry management', () => {
    describe('createPath', () => {
      it('should create a new path and return an id', () => {
        const result = registry.createPath()
        expect(result).toHaveProperty('id')
        expect(typeof result.id).toBe('number')
      })

      it('should create unique ids for each path', () => {
        const path1 = registry.createPath()
        const path2 = registry.createPath()
        const path3 = registry.createPath()
        expect(path1.id).not.toBe(path2.id)
        expect(path2.id).not.toBe(path3.id)
        expect(path1.id).not.toBe(path3.id)
      })

      it('should create a path from SVG string', () => {
        const result = registry.createPath('M10 10 L50 50 Z')
        expect(result).toHaveProperty('id')
        expect(registry.hasPath(result.id)).toBe(true)
      })

      it('should create an empty path when no SVG string is provided', () => {
        const result = registry.createPath()
        expect(registry.hasPath(result.id)).toBe(true)
      })

      it('should create an empty path when undefined is passed', () => {
        const result = registry.createPath(undefined)
        expect(registry.hasPath(result.id)).toBe(true)
      })
    })

    describe('clonePath', () => {
      it('should clone an existing path', () => {
        const original = registry.createPath()
        const cloned = registry.clonePath(original.id)
        expect(cloned).not.toBeNull()
        expect(cloned?.id).not.toBe(original.id)
        expect(registry.hasPath(cloned!.id)).toBe(true)
      })

      it('should return null when cloning non-existent path', () => {
        const result = registry.clonePath(999)
        expect(result).toBeNull()
      })

      it('should return null when cloning disposed path', () => {
        const original = registry.createPath()
        registry.disposePath(original.id)
        const result = registry.clonePath(original.id)
        expect(result).toBeNull()
      })
    })

    describe('disposePath', () => {
      it('should remove a path from the registry', () => {
        const path = registry.createPath()
        expect(registry.hasPath(path.id)).toBe(true)
        registry.disposePath(path.id)
        expect(registry.hasPath(path.id)).toBe(false)
      })

      it('should do nothing when disposing non-existent path', () => {
        expect(() => registry.disposePath(999)).not.toThrow()
      })

      it('should allow disposing already disposed path', () => {
        const path = registry.createPath()
        registry.disposePath(path.id)
        expect(() => registry.disposePath(path.id)).not.toThrow()
      })
    })

    describe('hasPath', () => {
      it('should return true for existing path', () => {
        const path = registry.createPath()
        expect(registry.hasPath(path.id)).toBe(true)
      })

      it('should return false for non-existent path', () => {
        expect(registry.hasPath(999)).toBe(false)
      })

      it('should return false for disposed path', () => {
        const path = registry.createPath()
        registry.disposePath(path.id)
        expect(registry.hasPath(path.id)).toBe(false)
      })
    })

    describe('getPath', () => {
      it('should return the Path2D for existing path', () => {
        const path = registry.createPath()
        const retrieved = registry.getPath(path.id)
        expect(retrieved).toBeDefined()
        // Check it has Path2D-like methods
        expect(typeof (retrieved as MockPath2D).moveTo).toBe('function')
      })

      it('should return undefined for non-existent path', () => {
        expect(registry.getPath(999)).toBeUndefined()
      })
    })
  })

  describe('path building methods', () => {
    it('should execute path building methods on existing paths', () => {
      const path = registry.createPath()
      expect(() => registry.pathMoveTo(path.id, 10, 20)).not.toThrow()
      expect(() => registry.pathLineTo(path.id, 50, 50)).not.toThrow()
      expect(() => registry.pathClosePath(path.id)).not.toThrow()
      expect(() => registry.pathRect(path.id, 10, 10, 100, 50)).not.toThrow()
      expect(() => registry.pathRoundRect(path.id, 10, 10, 100, 50, 5)).not.toThrow()
      expect(() => registry.pathRoundRect(path.id, 10, 10, 100, 50, [5, 10, 15, 20])).not.toThrow()
      expect(() => registry.pathArc(path.id, 50, 50, 25, 0, Math.PI)).not.toThrow()
      expect(() => registry.pathArc(path.id, 50, 50, 25, 0, Math.PI, true)).not.toThrow()
      expect(() => registry.pathArcTo(path.id, 50, 0, 50, 50, 10)).not.toThrow()
      expect(() => registry.pathEllipse(path.id, 50, 50, 30, 20, 0, 0, Math.PI * 2)).not.toThrow()
      expect(() => registry.pathEllipse(path.id, 50, 50, 30, 20, Math.PI / 4, 0, Math.PI, true)).not.toThrow()
      expect(() => registry.pathQuadraticCurveTo(path.id, 25, 50, 50, 0)).not.toThrow()
      expect(() => registry.pathBezierCurveTo(path.id, 10, 40, 40, 40, 50, 0)).not.toThrow()
    })

    it('should do nothing for non-existent paths', () => {
      expect(() => registry.pathMoveTo(999, 10, 20)).not.toThrow()
      expect(() => registry.pathLineTo(999, 50, 50)).not.toThrow()
      expect(() => registry.pathClosePath(999)).not.toThrow()
      expect(() => registry.pathRect(999, 10, 10, 100, 50)).not.toThrow()
      expect(() => registry.pathRoundRect(999, 10, 10, 100, 50, 5)).not.toThrow()
      expect(() => registry.pathArc(999, 50, 50, 25, 0, Math.PI)).not.toThrow()
      expect(() => registry.pathArcTo(999, 50, 0, 50, 50, 10)).not.toThrow()
      expect(() => registry.pathEllipse(999, 50, 50, 30, 20, 0, 0, Math.PI * 2)).not.toThrow()
      expect(() => registry.pathQuadraticCurveTo(999, 25, 50, 50, 0)).not.toThrow()
      expect(() => registry.pathBezierCurveTo(999, 10, 40, 40, 40, 50, 0)).not.toThrow()
    })

    it('should add one path to another', () => {
      const path1 = registry.createPath()
      const path2 = registry.createPath()
      registry.pathRect(path2.id, 10, 10, 50, 50)
      expect(() => registry.pathAddPath(path1.id, path2.id)).not.toThrow()
    })

    it('should do nothing when pathAddPath has invalid paths', () => {
      const path = registry.createPath()
      expect(() => registry.pathAddPath(999, path.id)).not.toThrow()
      expect(() => registry.pathAddPath(path.id, 999)).not.toThrow()
      expect(() => registry.pathAddPath(999, 998)).not.toThrow()
    })
  })

  describe('rendering methods', () => {
    beforeEach(() => {
      registry.setAddDrawCommand(mockAddDrawCommand)
    })

    it('should add rendering commands for existing paths', () => {
      const path = registry.createPath()
      registry.fillPath(path.id)
      expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'fillPath', pathId: path.id, fillRule: undefined })
      mockAddDrawCommand.mockClear()

      registry.fillPath(path.id, 'evenodd')
      expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'fillPath', pathId: path.id, fillRule: 'evenodd' })
      mockAddDrawCommand.mockClear()

      registry.strokePath(path.id)
      expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'strokePath', pathId: path.id })
      mockAddDrawCommand.mockClear()

      registry.clipPath(path.id)
      expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'clipPath', pathId: path.id, fillRule: undefined })
      mockAddDrawCommand.mockClear()

      registry.clipPath(path.id, 'evenodd')
      expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'clipPath', pathId: path.id, fillRule: 'evenodd' })
    })

    it('should do nothing for non-existent paths', () => {
      registry.fillPath(999)
      registry.strokePath(999)
      registry.clipPath(999)
      expect(mockAddDrawCommand).not.toHaveBeenCalled()
    })

    it('should do nothing when addDrawCommand is null', () => {
      registry.setAddDrawCommand(null)
      const path = registry.createPath()
      expect(() => registry.fillPath(path.id)).not.toThrow()
      expect(() => registry.strokePath(path.id)).not.toThrow()
      expect(() => registry.clipPath(path.id)).not.toThrow()
    })
  })

  describe('hit testing methods', () => {
    beforeEach(() => {
      registry.setRenderer(mockRenderer)
    })

    it('should delegate hit testing to renderer', () => {
      const path = registry.createPath()
      mockRenderer.isPointInPath.mockReturnValue(true)
      expect(registry.isPointInStoredPath(path.id, 10, 10)).toBe(true)

      mockRenderer.isPointInPath.mockReturnValue(false)
      expect(registry.isPointInStoredPath(path.id, 10, 10)).toBe(false)

      mockRenderer.isPointInStroke.mockReturnValue(true)
      expect(registry.isPointInStoredStroke(path.id, 10, 10)).toBe(true)

      mockRenderer.isPointInStroke.mockReturnValue(false)
      expect(registry.isPointInStoredStroke(path.id, 10, 10)).toBe(false)
    })

    it('should pass fill rule to renderer', () => {
      const path = registry.createPath()
      registry.isPointInStoredPath(path.id, 10, 10, 'evenodd')
      expect(mockRenderer.isPointInPath).toHaveBeenCalledWith(expect.anything(), 10, 10, 'evenodd')
    })

    it('should return false for non-existent paths', () => {
      mockRenderer.isPointInPath.mockReturnValue(true)
      mockRenderer.isPointInStroke.mockReturnValue(true)
      expect(registry.isPointInStoredPath(999, 10, 10)).toBe(false)
      expect(registry.isPointInStoredStroke(999, 10, 10)).toBe(false)
      expect(mockRenderer.isPointInPath).not.toHaveBeenCalled()
      expect(mockRenderer.isPointInStroke).not.toHaveBeenCalled()
    })

    it('should return false when renderer is null', () => {
      registry.setRenderer(null)
      const path = registry.createPath()
      expect(registry.isPointInStoredPath(path.id, 10, 10)).toBe(false)
      expect(registry.isPointInStoredStroke(path.id, 10, 10)).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle creating many paths with unique ids', () => {
      const paths = []
      for (let i = 0; i < 100; i++) paths.push(registry.createPath())
      const ids = new Set(paths.map((p) => p.id))
      expect(ids.size).toBe(100)
    })

    it('should handle disposing paths in different orders and maintain id incrementing', () => {
      const path1 = registry.createPath()
      const path2 = registry.createPath()
      const path3 = registry.createPath()
      registry.disposePath(path2.id)
      expect(registry.hasPath(path1.id)).toBe(true)
      expect(registry.hasPath(path2.id)).toBe(false)
      expect(registry.hasPath(path3.id)).toBe(true)
      registry.disposePath(path1.id)
      const path4 = registry.createPath()
      expect(path4.id).toBeGreaterThan(path3.id)
    })

    it('should handle complex path operations and SVG paths', () => {
      const path = registry.createPath()
      registry.pathMoveTo(path.id, 50, 50)
      registry.pathArc(path.id, 50, 50, 25, 0, Math.PI * 2)
      registry.pathClosePath(path.id)
      const path2 = registry.createPath('M0 0 L100 0 L100 100 L0 100 Z')
      registry.pathAddPath(path.id, path2.id)
      expect(registry.hasPath(path.id)).toBe(true)
      expect(registry.hasPath(path2.id)).toBe(true)
    })

    it('should handle rendering commands in order', () => {
      registry.setAddDrawCommand(mockAddDrawCommand)
      const path1 = registry.createPath()
      const path2 = registry.createPath()
      registry.fillPath(path1.id)
      registry.strokePath(path2.id)
      registry.clipPath(path1.id, 'evenodd')
      expect(mockAddDrawCommand).toHaveBeenCalledTimes(3)
      expect(mockAddDrawCommand.mock.calls[0][0].type).toBe('fillPath')
      expect(mockAddDrawCommand.mock.calls[1][0].type).toBe('strokePath')
      expect(mockAddDrawCommand.mock.calls[2][0].type).toBe('clipPath')
    })
  })
})
