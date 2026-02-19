import { describe, it, expect } from 'vitest'
import { bresenhamLine, midpointEllipse } from './lineAlgorithm'

describe('bresenhamLine', () => {
  it('should return a single point when start equals end', () => {
    expect(bresenhamLine(5, 3, 5, 3)).toEqual([{ x: 5, y: 3 }])
  })

  it('should draw a horizontal line left to right', () => {
    const points = bresenhamLine(0, 0, 4, 0)
    expect(points).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ])
  })

  it('should draw a horizontal line right to left', () => {
    const points = bresenhamLine(4, 0, 0, 0)
    expect(points).toEqual([
      { x: 4, y: 0 },
      { x: 3, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 0 },
    ])
  })

  it('should draw a vertical line top to bottom', () => {
    const points = bresenhamLine(0, 0, 0, 3)
    expect(points).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: 0, y: 3 },
    ])
  })

  it('should draw a vertical line bottom to top', () => {
    const points = bresenhamLine(0, 3, 0, 0)
    expect(points).toEqual([
      { x: 0, y: 3 },
      { x: 0, y: 2 },
      { x: 0, y: 1 },
      { x: 0, y: 0 },
    ])
  })

  it('should draw a 45-degree diagonal down-right', () => {
    const points = bresenhamLine(0, 0, 3, 3)
    expect(points).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ])
  })

  it('should draw a 45-degree diagonal up-left', () => {
    const points = bresenhamLine(3, 3, 0, 0)
    expect(points).toEqual([
      { x: 3, y: 3 },
      { x: 2, y: 2 },
      { x: 1, y: 1 },
      { x: 0, y: 0 },
    ])
  })

  it('should draw a shallow line (dx > dy)', () => {
    const points = bresenhamLine(0, 0, 5, 2)
    expect(points[0]).toEqual({ x: 0, y: 0 })
    expect(points[points.length - 1]).toEqual({ x: 5, y: 2 })
    expect(points.length).toBe(6) // longest axis + 1
  })

  it('should draw a steep line (dy > dx)', () => {
    const points = bresenhamLine(0, 0, 2, 5)
    expect(points[0]).toEqual({ x: 0, y: 0 })
    expect(points[points.length - 1]).toEqual({ x: 2, y: 5 })
    expect(points.length).toBe(6) // longest axis + 1
  })

  it('should always include both endpoints', () => {
    const cases: [number, number, number, number][] = [
      [1, 2, 7, 4],
      [10, 3, 2, 8],
      [0, 0, 0, 0],
      [5, 5, 5, 5],
    ]
    for (const [x0, y0, x1, y1] of cases) {
      const points = bresenhamLine(x0, y0, x1, y1)
      expect(points[0]).toEqual({ x: x0, y: y0 })
      expect(points[points.length - 1]).toEqual({ x: x1, y: y1 })
    }
  })

  it('should have no gaps between consecutive points', () => {
    const cases: [number, number, number, number][] = [
      [0, 0, 7, 3],
      [0, 0, 3, 7],
      [5, 5, 0, 2],
      [10, 0, 0, 10],
    ]
    for (const [x0, y0, x1, y1] of cases) {
      const points = bresenhamLine(x0, y0, x1, y1)
      for (let i = 1; i < points.length; i++) {
        const dx = Math.abs(points[i].x - points[i - 1].x)
        const dy = Math.abs(points[i].y - points[i - 1].y)
        expect(dx).toBeLessThanOrEqual(1)
        expect(dy).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('midpointEllipse', () => {
  it('should return a single point when both semi-axes are zero', () => {
    const points = midpointEllipse(5, 3, 0, 0)
    expect(points).toEqual([{ x: 5, y: 3 }])
  })

  it('should return a horizontal line when b=0', () => {
    const points = midpointEllipse(5, 3, 3, 0)
    const sorted = [...points].sort((a, b) => a.x - b.x)
    expect(sorted).toEqual([
      { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 },
      { x: 5, y: 3 }, { x: 6, y: 3 }, { x: 7, y: 3 }, { x: 8, y: 3 },
    ])
  })

  it('should return a vertical line when a=0', () => {
    const points = midpointEllipse(5, 3, 0, 2)
    const sorted = [...points].sort((a, b) => a.y - b.y)
    expect(sorted).toEqual([
      { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 },
      { x: 5, y: 4 }, { x: 5, y: 5 },
    ])
  })

  it('should produce symmetric output for a circle', () => {
    const points = midpointEllipse(10, 10, 5, 5)
    // 4-fold symmetry: for every (x,y) relative to center, (cx±dx, cy±dy) should all be present
    const set = new Set(points.map(p => `${p.x},${p.y}`))
    for (const p of points) {
      const dx = p.x - 10
      const dy = p.y - 10
      expect(set.has(`${10 + dx},${10 + dy}`)).toBe(true)
      expect(set.has(`${10 - dx},${10 + dy}`)).toBe(true)
      expect(set.has(`${10 + dx},${10 - dy}`)).toBe(true)
      expect(set.has(`${10 - dx},${10 - dy}`)).toBe(true)
    }
  })

  it('should produce exact points for a small ellipse (a=2, b=1)', () => {
    const points = midpointEllipse(0, 0, 2, 1)
    const set = new Set(points.map(p => `${p.x},${p.y}`))
    // Must include the 4 axis endpoints
    expect(set.has('2,0')).toBe(true)
    expect(set.has('-2,0')).toBe(true)
    expect(set.has('0,1')).toBe(true)
    expect(set.has('0,-1')).toBe(true)
    // All points should be on or near the ellipse
    for (const p of points) {
      const val = (p.x * p.x) / (2 * 2) + (p.y * p.y) / (1 * 1)
      // Points on the perimeter should satisfy the equation within tolerance
      expect(val).toBeLessThanOrEqual(1.5)
      expect(val).toBeGreaterThanOrEqual(0.25)
    }
  })

  it('should handle half-integer center (even bounding box)', () => {
    // Bounding box of width 4 (cols 0-3) → center 1.5, semi-axis 1.5
    // Bounding box of height 2 (rows 0-1) → center 0.5, semi-axis 0.5
    const points = midpointEllipse(1.5, 0.5, 1.5, 0.5)
    // All outputs should be integers (rounded)
    for (const p of points) {
      expect(Number.isInteger(p.x)).toBe(true)
      expect(Number.isInteger(p.y)).toBe(true)
    }
    // Should span the bounding box
    const xs = points.map(p => p.x)
    const ys = points.map(p => p.y)
    expect(Math.min(...xs)).toBe(0)
    expect(Math.max(...xs)).toBe(3)
    expect(Math.min(...ys)).toBe(0)
    expect(Math.max(...ys)).toBe(1)
  })

  it('should have no duplicate points', () => {
    const points = midpointEllipse(10, 10, 5, 3)
    const keys = points.map(p => `${p.x},${p.y}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('should produce an 8-connected perimeter (no gaps)', () => {
    const points = midpointEllipse(10, 10, 8, 5)
    const set = new Set(points.map(p => `${p.x},${p.y}`))
    for (const p of points) {
      // Each point should have at least one 8-connected neighbor in the set
      let hasNeighbor = false
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue
          if (set.has(`${p.x + dx},${p.y + dy}`)) {
            hasNeighbor = true
            break
          }
        }
        if (hasNeighbor) break
      }
      expect(hasNeighbor).toBe(true)
    }
  })
})
