import { describe, it, expect } from 'vitest'
import { bresenhamLine } from './lineAlgorithm'

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
