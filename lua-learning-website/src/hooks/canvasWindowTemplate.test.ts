import { describe, it, expect } from 'vitest'
import { generateCanvasWindowHTML } from './canvasWindowTemplate'

describe('canvasWindowTemplate', () => {
  describe('drag prevention CSS', () => {
    it('should include user-select: none on canvas', () => {
      const html = generateCanvasWindowHTML()
      expect(html).toContain('user-select: none')
    })

    it('should include -webkit-user-drag: none on canvas', () => {
      const html = generateCanvasWindowHTML()
      expect(html).toContain('-webkit-user-drag: none')
    })
  })
})
