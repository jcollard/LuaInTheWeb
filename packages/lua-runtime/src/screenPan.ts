export interface PanState {
  startCol: number
  startRow: number
  endCol: number
  endRow: number
  duration: number
  elapsed: number
}

export function startPan(
  duration: number,
  fromCol: number, fromRow: number,
  toCol: number, toRow: number,
): PanState {
  if (duration <= 0) throw new Error('Pan duration must be positive.')
  return { startCol: fromCol, startRow: fromRow, endCol: toCol, endRow: toRow, duration, elapsed: 0 }
}

export function advancePan(pan: PanState, dt: number): { col: number; row: number; done: boolean } {
  pan.elapsed += dt
  const t = Math.min(pan.elapsed / pan.duration, 1)
  const col = pan.startCol + (pan.endCol - pan.startCol) * t
  const row = pan.startRow + (pan.endRow - pan.startRow) * t
  return { col, row, done: t >= 1 }
}
