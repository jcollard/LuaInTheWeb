/* eslint-disable max-lines */
/**
 * Tests for DrawingAPI class - Facade for canvas drawing primitive operations.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DrawingAPI } from '../src/DrawingAPI'
import type { DrawCommand } from '@lua-learning/canvas-runtime'

describe('DrawingAPI', () => {
  let drawingAPI: DrawingAPI
  let mockAddDrawCommand: ReturnType<typeof vi.fn<[DrawCommand], void>>

  beforeEach(() => {
    drawingAPI = new DrawingAPI()
    mockAddDrawCommand = vi.fn()
  })

  describe('construction', () => {
    it('should construct with no arguments', () => {
      expect(drawingAPI).toBeDefined()
    })
  })

  describe('setAddDrawCommand', () => {
    it('should allow setting the draw command callback', () => {
      drawingAPI.setAddDrawCommand(mockAddDrawCommand)
      drawingAPI.clear()
      expect(mockAddDrawCommand).toHaveBeenCalled()
    })

    it('should allow setting callback to null', () => {
      drawingAPI.setAddDrawCommand(mockAddDrawCommand)
      drawingAPI.setAddDrawCommand(null)
      drawingAPI.clear()
      expect(mockAddDrawCommand).not.toHaveBeenCalled()
    })

    it('should not throw when addDrawCommand is null', () => {
      expect(() => drawingAPI.clear()).not.toThrow()
      expect(() => drawingAPI.clearRect(0, 0, 100, 100)).not.toThrow()
      expect(() => drawingAPI.setColor(255, 0, 0)).not.toThrow()
      expect(() => drawingAPI.setColor(255, 0, 0, 128)).not.toThrow()
      expect(() => drawingAPI.setLineWidth(5)).not.toThrow()
      expect(() => drawingAPI.drawRect(0, 0, 100, 100)).not.toThrow()
      expect(() => drawingAPI.fillRect(0, 0, 100, 100)).not.toThrow()
      expect(() => drawingAPI.drawCircle(50, 50, 25)).not.toThrow()
      expect(() => drawingAPI.fillCircle(50, 50, 25)).not.toThrow()
      expect(() => drawingAPI.drawLine(0, 0, 100, 100)).not.toThrow()
      expect(() => drawingAPI.drawText(10, 10, 'Hello')).not.toThrow()
      expect(() => drawingAPI.strokeText(10, 10, 'Hello')).not.toThrow()
    })
  })

  describe('canvas clearing methods', () => {
    beforeEach(() => {
      drawingAPI.setAddDrawCommand(mockAddDrawCommand)
    })

    describe('clear', () => {
      it('should add clear command', () => {
        drawingAPI.clear()
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'clear' })
      })

      it('should call clear multiple times', () => {
        drawingAPI.clear()
        drawingAPI.clear()
        expect(mockAddDrawCommand).toHaveBeenCalledTimes(2)
      })
    })

    describe('clearRect', () => {
      it('should add clearRect command with coordinates', () => {
        drawingAPI.clearRect(10, 20, 100, 200)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'clearRect',
          x: 10,
          y: 20,
          width: 100,
          height: 200,
        })
      })

      it('should handle zero values', () => {
        drawingAPI.clearRect(0, 0, 0, 0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'clearRect',
          x: 0,
          y: 0,
          width: 0,
          height: 0,
        })
      })

      it('should handle negative coordinates', () => {
        drawingAPI.clearRect(-10, -20, 100, 100)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'clearRect',
          x: -10,
          y: -20,
          width: 100,
          height: 100,
        })
      })
    })
  })

  describe('color and line width methods', () => {
    beforeEach(() => {
      drawingAPI.setAddDrawCommand(mockAddDrawCommand)
    })

    describe('setColor', () => {
      it('should add setColor command with RGB values', () => {
        drawingAPI.setColor(255, 128, 64)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'setColor',
          r: 255,
          g: 128,
          b: 64,
        })
      })

      it('should add setColor command with RGBA values', () => {
        drawingAPI.setColor(255, 128, 64, 200)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'setColor',
          r: 255,
          g: 128,
          b: 64,
          a: 200,
        })
      })

      it('should handle zero alpha', () => {
        drawingAPI.setColor(255, 0, 0, 0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'setColor',
          r: 255,
          g: 0,
          b: 0,
          a: 0,
        })
      })

      it('should not include alpha when undefined', () => {
        drawingAPI.setColor(100, 150, 200, undefined)
        const call = mockAddDrawCommand.mock.calls[0][0]
        expect(call).toEqual({ type: 'setColor', r: 100, g: 150, b: 200 })
        expect('a' in call).toBe(false)
      })

      it('should not include alpha when null', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        drawingAPI.setColor(100, 150, 200, null as any)
        const call = mockAddDrawCommand.mock.calls[0][0]
        expect(call).toEqual({ type: 'setColor', r: 100, g: 150, b: 200 })
        expect('a' in call).toBe(false)
      })

      it('should handle edge case color values', () => {
        drawingAPI.setColor(0, 0, 0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'setColor',
          r: 0,
          g: 0,
          b: 0,
        })

        mockAddDrawCommand.mockClear()
        drawingAPI.setColor(255, 255, 255)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'setColor',
          r: 255,
          g: 255,
          b: 255,
        })
      })
    })

    describe('setLineWidth', () => {
      it('should add setLineWidth command', () => {
        drawingAPI.setLineWidth(5)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'setLineWidth',
          width: 5,
        })
      })

      it('should handle various line widths', () => {
        drawingAPI.setLineWidth(1)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'setLineWidth',
          width: 1,
        })

        mockAddDrawCommand.mockClear()
        drawingAPI.setLineWidth(0.5)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'setLineWidth',
          width: 0.5,
        })

        mockAddDrawCommand.mockClear()
        drawingAPI.setLineWidth(10)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'setLineWidth',
          width: 10,
        })
      })

      it('should handle zero line width', () => {
        drawingAPI.setLineWidth(0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'setLineWidth',
          width: 0,
        })
      })
    })
  })

  describe('shape primitive methods', () => {
    beforeEach(() => {
      drawingAPI.setAddDrawCommand(mockAddDrawCommand)
    })

    describe('drawRect', () => {
      it('should add rect command', () => {
        drawingAPI.drawRect(10, 20, 100, 50)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'rect',
          x: 10,
          y: 20,
          width: 100,
          height: 50,
        })
      })

      it('should handle zero dimensions', () => {
        drawingAPI.drawRect(0, 0, 0, 0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'rect',
          x: 0,
          y: 0,
          width: 0,
          height: 0,
        })
      })

      it('should handle negative coordinates', () => {
        drawingAPI.drawRect(-50, -50, 100, 100)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'rect',
          x: -50,
          y: -50,
          width: 100,
          height: 100,
        })
      })
    })

    describe('fillRect', () => {
      it('should add fillRect command', () => {
        drawingAPI.fillRect(10, 20, 100, 50)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'fillRect',
          x: 10,
          y: 20,
          width: 100,
          height: 50,
        })
      })

      it('should handle floating point values', () => {
        drawingAPI.fillRect(10.5, 20.5, 100.5, 50.5)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'fillRect',
          x: 10.5,
          y: 20.5,
          width: 100.5,
          height: 50.5,
        })
      })
    })

    describe('drawCircle', () => {
      it('should add circle command', () => {
        drawingAPI.drawCircle(50, 50, 25)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'circle',
          x: 50,
          y: 50,
          radius: 25,
        })
      })

      it('should handle zero radius', () => {
        drawingAPI.drawCircle(100, 100, 0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'circle',
          x: 100,
          y: 100,
          radius: 0,
        })
      })

      it('should handle large radius', () => {
        drawingAPI.drawCircle(0, 0, 1000)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'circle',
          x: 0,
          y: 0,
          radius: 1000,
        })
      })
    })

    describe('fillCircle', () => {
      it('should add fillCircle command', () => {
        drawingAPI.fillCircle(50, 50, 25)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'fillCircle',
          x: 50,
          y: 50,
          radius: 25,
        })
      })

      it('should handle negative coordinates', () => {
        drawingAPI.fillCircle(-100, -100, 50)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'fillCircle',
          x: -100,
          y: -100,
          radius: 50,
        })
      })
    })

    describe('drawLine', () => {
      it('should add line command', () => {
        drawingAPI.drawLine(0, 0, 100, 100)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 100,
          y2: 100,
        })
      })

      it('should handle horizontal line', () => {
        drawingAPI.drawLine(0, 50, 100, 50)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'line',
          x1: 0,
          y1: 50,
          x2: 100,
          y2: 50,
        })
      })

      it('should handle vertical line', () => {
        drawingAPI.drawLine(50, 0, 50, 100)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'line',
          x1: 50,
          y1: 0,
          x2: 50,
          y2: 100,
        })
      })

      it('should handle zero-length line (same point)', () => {
        drawingAPI.drawLine(50, 50, 50, 50)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'line',
          x1: 50,
          y1: 50,
          x2: 50,
          y2: 50,
        })
      })

      it('should handle negative coordinates', () => {
        drawingAPI.drawLine(-50, -50, 50, 50)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'line',
          x1: -50,
          y1: -50,
          x2: 50,
          y2: 50,
        })
      })
    })
  })

  describe('text rendering methods', () => {
    beforeEach(() => {
      drawingAPI.setAddDrawCommand(mockAddDrawCommand)
    })

    describe('drawText', () => {
      it('should add text command with basic parameters', () => {
        drawingAPI.drawText(10, 20, 'Hello World')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'text',
          x: 10,
          y: 20,
          text: 'Hello World',
        })
      })

      it('should handle empty text', () => {
        drawingAPI.drawText(0, 0, '')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'text',
          x: 0,
          y: 0,
          text: '',
        })
      })

      it('should add fontSize option when provided', () => {
        drawingAPI.drawText(10, 20, 'Hello', { fontSize: 24 })
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'text',
          x: 10,
          y: 20,
          text: 'Hello',
          fontSize: 24,
        })
      })

      it('should add fontFamily option when provided', () => {
        drawingAPI.drawText(10, 20, 'Hello', { fontFamily: 'Arial' })
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'text',
          x: 10,
          y: 20,
          text: 'Hello',
          fontFamily: 'Arial',
        })
      })

      it('should add maxWidth option when provided', () => {
        drawingAPI.drawText(10, 20, 'Hello', { maxWidth: 100 })
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'text',
          x: 10,
          y: 20,
          text: 'Hello',
          maxWidth: 100,
        })
      })

      it('should add all options when provided', () => {
        drawingAPI.drawText(10, 20, 'Hello', {
          fontSize: 24,
          fontFamily: 'Arial',
          maxWidth: 100,
        })
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'text',
          x: 10,
          y: 20,
          text: 'Hello',
          fontSize: 24,
          fontFamily: 'Arial',
          maxWidth: 100,
        })
      })

      it('should handle partial options', () => {
        drawingAPI.drawText(10, 20, 'Hello', { fontSize: 32 })
        const call = mockAddDrawCommand.mock.calls[0][0]
        expect(call).toEqual({
          type: 'text',
          x: 10,
          y: 20,
          text: 'Hello',
          fontSize: 32,
        })
        expect('fontFamily' in call).toBe(false)
        expect('maxWidth' in call).toBe(false)
      })

      it('should handle undefined options', () => {
        drawingAPI.drawText(10, 20, 'Hello', undefined)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'text',
          x: 10,
          y: 20,
          text: 'Hello',
        })
      })

      it('should handle special characters in text', () => {
        drawingAPI.drawText(0, 0, 'Hello\nWorld\t!')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'text',
          x: 0,
          y: 0,
          text: 'Hello\nWorld\t!',
        })
      })

      it('should handle unicode text', () => {
        drawingAPI.drawText(0, 0, 'Hello \u4e16\u754c')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'text',
          x: 0,
          y: 0,
          text: 'Hello \u4e16\u754c',
        })
      })
    })

    describe('strokeText', () => {
      it('should add strokeText command with basic parameters', () => {
        drawingAPI.strokeText(10, 20, 'Hello World')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'strokeText',
          x: 10,
          y: 20,
          text: 'Hello World',
        })
      })

      it('should handle empty text', () => {
        drawingAPI.strokeText(0, 0, '')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'strokeText',
          x: 0,
          y: 0,
          text: '',
        })
      })

      it('should add fontSize option when provided', () => {
        drawingAPI.strokeText(10, 20, 'Hello', { fontSize: 24 })
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'strokeText',
          x: 10,
          y: 20,
          text: 'Hello',
          fontSize: 24,
        })
      })

      it('should add fontFamily option when provided', () => {
        drawingAPI.strokeText(10, 20, 'Hello', { fontFamily: 'Arial' })
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'strokeText',
          x: 10,
          y: 20,
          text: 'Hello',
          fontFamily: 'Arial',
        })
      })

      it('should add maxWidth option when provided', () => {
        drawingAPI.strokeText(10, 20, 'Hello', { maxWidth: 100 })
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'strokeText',
          x: 10,
          y: 20,
          text: 'Hello',
          maxWidth: 100,
        })
      })

      it('should add all options when provided', () => {
        drawingAPI.strokeText(10, 20, 'Hello', {
          fontSize: 24,
          fontFamily: 'Arial',
          maxWidth: 100,
        })
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'strokeText',
          x: 10,
          y: 20,
          text: 'Hello',
          fontSize: 24,
          fontFamily: 'Arial',
          maxWidth: 100,
        })
      })

      it('should handle partial options', () => {
        drawingAPI.strokeText(10, 20, 'Hello', { maxWidth: 200 })
        const call = mockAddDrawCommand.mock.calls[0][0]
        expect(call).toEqual({
          type: 'strokeText',
          x: 10,
          y: 20,
          text: 'Hello',
          maxWidth: 200,
        })
        expect('fontSize' in call).toBe(false)
        expect('fontFamily' in call).toBe(false)
      })
    })
  })

  describe('edge cases', () => {
    beforeEach(() => {
      drawingAPI.setAddDrawCommand(mockAddDrawCommand)
    })

    it('should handle rapid consecutive calls', () => {
      drawingAPI.clear()
      drawingAPI.setColor(255, 0, 0)
      drawingAPI.fillRect(0, 0, 100, 100)
      drawingAPI.setColor(0, 255, 0)
      drawingAPI.fillCircle(50, 50, 25)
      expect(mockAddDrawCommand).toHaveBeenCalledTimes(5)
    })

    it('should maintain command order', () => {
      drawingAPI.clear()
      drawingAPI.setColor(255, 0, 0)
      drawingAPI.setLineWidth(5)
      drawingAPI.drawRect(10, 10, 100, 100)

      expect(mockAddDrawCommand).toHaveBeenCalledTimes(4)
      expect(mockAddDrawCommand.mock.calls[0][0].type).toBe('clear')
      expect(mockAddDrawCommand.mock.calls[1][0].type).toBe('setColor')
      expect(mockAddDrawCommand.mock.calls[2][0].type).toBe('setLineWidth')
      expect(mockAddDrawCommand.mock.calls[3][0].type).toBe('rect')
    })

    it('should handle all methods being called with null callback', () => {
      const api = new DrawingAPI()
      // No callback set, all methods should be no-ops
      expect(() => {
        api.clear()
        api.clearRect(0, 0, 100, 100)
        api.setColor(255, 0, 0)
        api.setColor(255, 0, 0, 128)
        api.setLineWidth(5)
        api.drawRect(0, 0, 100, 100)
        api.fillRect(0, 0, 100, 100)
        api.drawCircle(50, 50, 25)
        api.fillCircle(50, 50, 25)
        api.drawLine(0, 0, 100, 100)
        api.drawText(10, 10, 'Hello')
        api.drawText(10, 10, 'Hello', { fontSize: 24, fontFamily: 'Arial', maxWidth: 100 })
        api.strokeText(10, 10, 'Hello')
        api.strokeText(10, 10, 'Hello', { fontSize: 24, fontFamily: 'Arial', maxWidth: 100 })
      }).not.toThrow()
    })

    it('should handle switching callback to null mid-operation', () => {
      drawingAPI.clear()
      expect(mockAddDrawCommand).toHaveBeenCalledTimes(1)

      drawingAPI.setAddDrawCommand(null)
      drawingAPI.fillRect(0, 0, 100, 100)
      expect(mockAddDrawCommand).toHaveBeenCalledTimes(1) // Still 1, no new calls
    })

    it('should handle floating point coordinates', () => {
      drawingAPI.drawLine(0.5, 0.5, 100.5, 100.5)
      expect(mockAddDrawCommand).toHaveBeenCalledWith({
        type: 'line',
        x1: 0.5,
        y1: 0.5,
        x2: 100.5,
        y2: 100.5,
      })
    })
  })
})
