export interface Point {
  x: number
  y: number
}

export function midpointEllipse(cx: number, cy: number, a: number, b: number): Point[] {
  if (a === 0 && b === 0) return [{ x: Math.round(cx), y: Math.round(cy) }]

  if (b === 0) {
    const points: Point[] = []
    const minX = Math.round(cx - a)
    const maxX = Math.round(cx + a)
    const ry = Math.round(cy)
    for (let x = minX; x <= maxX; x++) points.push({ x, y: ry })
    return points
  }

  if (a === 0) {
    const points: Point[] = []
    const minY = Math.round(cy - b)
    const maxY = Math.round(cy + b)
    const rx = Math.round(cx)
    for (let y = minY; y <= maxY; y++) points.push({ x: rx, y })
    return points
  }

  const seen = new Set<string>()
  const points: Point[] = []

  function plot(rx: number, ry: number): void {
    const key = `${rx},${ry}`
    if (!seen.has(key)) {
      seen.add(key)
      points.push({ x: rx, y: ry })
    }
  }

  // Scale to integer semi-axes when center has fractional parts (even-sized bounding box)
  const scale = (a % 1 !== 0 || b % 1 !== 0) ? 2 : 1
  const ia = Math.round(a * scale)
  const ib = Math.round(b * scale)

  function plotSymmetric(dx: number, dy: number): void {
    plot(Math.round(cx + dx / scale), Math.round(cy + dy / scale))
    plot(Math.round(cx - dx / scale), Math.round(cy + dy / scale))
    plot(Math.round(cx + dx / scale), Math.round(cy - dy / scale))
    plot(Math.round(cx - dx / scale), Math.round(cy - dy / scale))
  }

  // Region 1: slope magnitude < 1
  let x = 0
  let y = ib
  const a2 = ia * ia
  const b2 = ib * ib
  let d1 = b2 - a2 * ib + 0.25 * a2
  let dx = 2 * b2 * x
  let dy = 2 * a2 * y

  while (dx < dy) {
    plotSymmetric(x, y)
    x++
    dx += 2 * b2
    if (d1 < 0) {
      d1 += dx + b2
    } else {
      y--
      dy -= 2 * a2
      d1 += dx - dy + b2
    }
  }

  // Region 2: slope magnitude >= 1
  let d2 = b2 * (x + 0.5) * (x + 0.5) + a2 * (y - 1) * (y - 1) - a2 * b2

  while (y >= 0) {
    plotSymmetric(x, y)
    y--
    dy -= 2 * a2
    if (d2 > 0) {
      d2 += a2 - dy
    } else {
      x++
      dx += 2 * b2
      d2 += dx - dy + a2
    }
  }

  return points
}

export function bresenhamLine(x0: number, y0: number, x1: number, y1: number): Point[] {
  const points: Point[] = []
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy
  let x = x0
  let y = y0

  for (;;) {
    points.push({ x, y })
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x += sx
    }
    if (e2 < dx) {
      err += dx
      y += sy
    }
  }

  return points
}
