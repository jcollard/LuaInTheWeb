/**
 * Tests for StyleAPI class - Facade for canvas style operations.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StyleAPI } from '../src/StyleAPI'
import type { DrawCommand } from '@lua-learning/canvas-runtime'

describe('StyleAPI', () => {
  let styleAPI: StyleAPI
  let mockAddDrawCommand: ReturnType<typeof vi.fn<[DrawCommand], void>>

  beforeEach(() => {
    styleAPI = new StyleAPI()
    mockAddDrawCommand = vi.fn()
  })

  describe('construction', () => {
    it('should construct with no arguments', () => {
      expect(styleAPI).toBeDefined()
    })

    it('should start with empty lineDashSegments', () => {
      expect(styleAPI.getLineDash()).toEqual([])
    })
  })

  describe('setAddDrawCommand', () => {
    it('should allow setting the draw command callback', () => {
      styleAPI.setAddDrawCommand(mockAddDrawCommand)
      styleAPI.setLineCap('round')
      expect(mockAddDrawCommand).toHaveBeenCalled()
    })

    it('should allow setting callback to null', () => {
      styleAPI.setAddDrawCommand(mockAddDrawCommand)
      styleAPI.setAddDrawCommand(null)
      styleAPI.setLineCap('round')
      expect(mockAddDrawCommand).not.toHaveBeenCalled()
    })

    it('should not throw when addDrawCommand is null', () => {
      expect(() => styleAPI.setLineCap('round')).not.toThrow()
      expect(() => styleAPI.setLineJoin('bevel')).not.toThrow()
      expect(() => styleAPI.setMiterLimit(5)).not.toThrow()
      expect(() => styleAPI.setLineDash([5, 10])).not.toThrow()
      expect(() => styleAPI.setLineDashOffset(5)).not.toThrow()
      expect(() => styleAPI.setFillStyle('red')).not.toThrow()
      expect(() => styleAPI.setStrokeStyle('blue')).not.toThrow()
      expect(() => styleAPI.setShadowColor('black')).not.toThrow()
      expect(() => styleAPI.setShadowBlur(10)).not.toThrow()
      expect(() => styleAPI.setShadowOffsetX(5)).not.toThrow()
      expect(() => styleAPI.setShadowOffsetY(5)).not.toThrow()
      expect(() => styleAPI.setShadow('black', 10, 5, 5)).not.toThrow()
      expect(() => styleAPI.clearShadow()).not.toThrow()
      expect(() => styleAPI.setGlobalAlpha(0.5)).not.toThrow()
      expect(() => styleAPI.setCompositeOperation('multiply')).not.toThrow()
      expect(() => styleAPI.setImageSmoothing(false)).not.toThrow()
    })
  })

  describe('line style methods', () => {
    beforeEach(() => {
      styleAPI.setAddDrawCommand(mockAddDrawCommand)
    })

    describe('setLineCap', () => {
      it('should add setLineCap command for "butt"', () => {
        styleAPI.setLineCap('butt')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setLineCap', cap: 'butt' })
      })

      it('should add setLineCap command for "round"', () => {
        styleAPI.setLineCap('round')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setLineCap', cap: 'round' })
      })

      it('should add setLineCap command for "square"', () => {
        styleAPI.setLineCap('square')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setLineCap', cap: 'square' })
      })
    })

    describe('setLineJoin', () => {
      it('should add setLineJoin command for "miter"', () => {
        styleAPI.setLineJoin('miter')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setLineJoin', join: 'miter' })
      })

      it('should add setLineJoin command for "round"', () => {
        styleAPI.setLineJoin('round')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setLineJoin', join: 'round' })
      })

      it('should add setLineJoin command for "bevel"', () => {
        styleAPI.setLineJoin('bevel')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setLineJoin', join: 'bevel' })
      })
    })

    describe('setMiterLimit', () => {
      it('should add setMiterLimit command', () => {
        styleAPI.setMiterLimit(10)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setMiterLimit', limit: 10 })
      })

      it('should handle different miter limit values', () => {
        styleAPI.setMiterLimit(5)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setMiterLimit', limit: 5 })

        mockAddDrawCommand.mockClear()
        styleAPI.setMiterLimit(1)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setMiterLimit', limit: 1 })
      })
    })

    describe('setLineDash', () => {
      it('should add setLineDash command', () => {
        styleAPI.setLineDash([10, 5])
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setLineDash', segments: [10, 5] })
      })

      it('should store the line dash segments internally', () => {
        styleAPI.setLineDash([10, 5])
        expect(styleAPI.getLineDash()).toEqual([10, 5])
      })

      it('should handle empty array (solid line)', () => {
        styleAPI.setLineDash([])
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setLineDash', segments: [] })
        expect(styleAPI.getLineDash()).toEqual([])
      })

      it('should handle complex dash patterns', () => {
        styleAPI.setLineDash([10, 5, 2, 5])
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setLineDash', segments: [10, 5, 2, 5] })
        expect(styleAPI.getLineDash()).toEqual([10, 5, 2, 5])
      })
    })

    describe('getLineDash', () => {
      it('should return empty array by default', () => {
        expect(styleAPI.getLineDash()).toEqual([])
      })

      it('should return a defensive copy', () => {
        styleAPI.setLineDash([10, 5])
        const dash1 = styleAPI.getLineDash()
        const dash2 = styleAPI.getLineDash()
        expect(dash1).not.toBe(dash2)
        expect(dash1).toEqual(dash2)
      })

      it('should not be affected by modifying the returned array', () => {
        styleAPI.setLineDash([10, 5])
        const dash = styleAPI.getLineDash()
        dash.push(100)
        expect(styleAPI.getLineDash()).toEqual([10, 5])
      })

      it('should not be affected by modifying the input array', () => {
        const segments = [10, 5]
        styleAPI.setLineDash(segments)
        segments.push(100)
        expect(styleAPI.getLineDash()).toEqual([10, 5])
      })
    })

    describe('setLineDashOffset', () => {
      it('should add setLineDashOffset command', () => {
        styleAPI.setLineDashOffset(5)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setLineDashOffset', offset: 5 })
      })

      it('should handle negative offsets', () => {
        styleAPI.setLineDashOffset(-10)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setLineDashOffset', offset: -10 })
      })

      it('should handle zero offset', () => {
        styleAPI.setLineDashOffset(0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setLineDashOffset', offset: 0 })
      })
    })
  })

  describe('fill/stroke style methods', () => {
    beforeEach(() => {
      styleAPI.setAddDrawCommand(mockAddDrawCommand)
    })

    describe('setFillStyle', () => {
      it('should add setFillStyle command with color string', () => {
        styleAPI.setFillStyle('red')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setFillStyle', style: 'red' })
      })

      it('should handle CSS color formats', () => {
        styleAPI.setFillStyle('#ff0000')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setFillStyle', style: '#ff0000' })

        mockAddDrawCommand.mockClear()
        styleAPI.setFillStyle('rgb(255, 0, 0)')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setFillStyle', style: 'rgb(255, 0, 0)' })

        mockAddDrawCommand.mockClear()
        styleAPI.setFillStyle('rgba(255, 0, 0, 0.5)')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setFillStyle', style: 'rgba(255, 0, 0, 0.5)' })
      })

      it('should handle gradient definition', () => {
        const gradient = {
          type: 'linear' as const,
          x0: 0,
          y0: 0,
          x1: 100,
          y1: 0,
          stops: [
            { offset: 0, color: 'red' },
            { offset: 1, color: 'blue' },
          ],
        }
        styleAPI.setFillStyle(gradient)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setFillStyle', style: gradient })
      })
    })

    describe('setStrokeStyle', () => {
      it('should add setStrokeStyle command with color string', () => {
        styleAPI.setStrokeStyle('blue')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setStrokeStyle', style: 'blue' })
      })

      it('should handle CSS color formats', () => {
        styleAPI.setStrokeStyle('#0000ff')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setStrokeStyle', style: '#0000ff' })
      })

      it('should handle gradient definition', () => {
        const gradient = {
          type: 'radial' as const,
          x0: 50,
          y0: 50,
          r0: 0,
          x1: 50,
          y1: 50,
          r1: 50,
          stops: [
            { offset: 0, color: 'white' },
            { offset: 1, color: 'black' },
          ],
        }
        styleAPI.setStrokeStyle(gradient)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setStrokeStyle', style: gradient })
      })
    })
  })

  describe('shadow methods', () => {
    beforeEach(() => {
      styleAPI.setAddDrawCommand(mockAddDrawCommand)
    })

    describe('setShadowColor', () => {
      it('should add setShadowColor command', () => {
        styleAPI.setShadowColor('rgba(0, 0, 0, 0.5)')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setShadowColor', color: 'rgba(0, 0, 0, 0.5)' })
      })

      it('should handle different color formats', () => {
        styleAPI.setShadowColor('black')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setShadowColor', color: 'black' })

        mockAddDrawCommand.mockClear()
        styleAPI.setShadowColor('#000')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setShadowColor', color: '#000' })
      })
    })

    describe('setShadowBlur', () => {
      it('should add setShadowBlur command', () => {
        styleAPI.setShadowBlur(10)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setShadowBlur', blur: 10 })
      })

      it('should handle zero blur', () => {
        styleAPI.setShadowBlur(0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setShadowBlur', blur: 0 })
      })
    })

    describe('setShadowOffsetX', () => {
      it('should add setShadowOffsetX command', () => {
        styleAPI.setShadowOffsetX(5)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setShadowOffsetX', offset: 5 })
      })

      it('should handle negative offsets', () => {
        styleAPI.setShadowOffsetX(-5)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setShadowOffsetX', offset: -5 })
      })
    })

    describe('setShadowOffsetY', () => {
      it('should add setShadowOffsetY command', () => {
        styleAPI.setShadowOffsetY(5)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setShadowOffsetY', offset: 5 })
      })

      it('should handle negative offsets', () => {
        styleAPI.setShadowOffsetY(-5)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setShadowOffsetY', offset: -5 })
      })
    })

    describe('setShadow', () => {
      it('should add setShadow command with all properties', () => {
        styleAPI.setShadow('rgba(0, 0, 0, 0.5)', 10, 5, 5)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'setShadow',
          color: 'rgba(0, 0, 0, 0.5)',
          blur: 10,
          offsetX: 5,
          offsetY: 5,
        })
      })

      it('should handle zero values', () => {
        styleAPI.setShadow('black', 0, 0, 0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'setShadow',
          color: 'black',
          blur: 0,
          offsetX: 0,
          offsetY: 0,
        })
      })

      it('should handle negative offsets', () => {
        styleAPI.setShadow('black', 5, -10, -10)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({
          type: 'setShadow',
          color: 'black',
          blur: 5,
          offsetX: -10,
          offsetY: -10,
        })
      })
    })

    describe('clearShadow', () => {
      it('should add clearShadow command', () => {
        styleAPI.clearShadow()
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'clearShadow' })
      })
    })
  })

  describe('compositing methods', () => {
    beforeEach(() => {
      styleAPI.setAddDrawCommand(mockAddDrawCommand)
    })

    describe('setGlobalAlpha', () => {
      it('should add setGlobalAlpha command', () => {
        styleAPI.setGlobalAlpha(0.5)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setGlobalAlpha', alpha: 0.5 })
      })

      it('should handle fully transparent (0)', () => {
        styleAPI.setGlobalAlpha(0)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setGlobalAlpha', alpha: 0 })
      })

      it('should handle fully opaque (1)', () => {
        styleAPI.setGlobalAlpha(1)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setGlobalAlpha', alpha: 1 })
      })
    })

    describe('setCompositeOperation', () => {
      it('should add setCompositeOperation command for "source-over"', () => {
        styleAPI.setCompositeOperation('source-over')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'source-over' })
      })

      it('should add setCompositeOperation command for "multiply"', () => {
        styleAPI.setCompositeOperation('multiply')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'multiply' })
      })

      it('should add setCompositeOperation command for "screen"', () => {
        styleAPI.setCompositeOperation('screen')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'screen' })
      })

      it('should add setCompositeOperation command for "overlay"', () => {
        styleAPI.setCompositeOperation('overlay')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'overlay' })
      })

      it('should add setCompositeOperation command for "darken"', () => {
        styleAPI.setCompositeOperation('darken')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'darken' })
      })

      it('should add setCompositeOperation command for "lighten"', () => {
        styleAPI.setCompositeOperation('lighten')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'lighten' })
      })

      it('should add setCompositeOperation command for "color-dodge"', () => {
        styleAPI.setCompositeOperation('color-dodge')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'color-dodge' })
      })

      it('should add setCompositeOperation command for "color-burn"', () => {
        styleAPI.setCompositeOperation('color-burn')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'color-burn' })
      })

      it('should add setCompositeOperation command for "hard-light"', () => {
        styleAPI.setCompositeOperation('hard-light')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'hard-light' })
      })

      it('should add setCompositeOperation command for "soft-light"', () => {
        styleAPI.setCompositeOperation('soft-light')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'soft-light' })
      })

      it('should add setCompositeOperation command for "difference"', () => {
        styleAPI.setCompositeOperation('difference')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'difference' })
      })

      it('should add setCompositeOperation command for "exclusion"', () => {
        styleAPI.setCompositeOperation('exclusion')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'exclusion' })
      })

      it('should add setCompositeOperation command for "hue"', () => {
        styleAPI.setCompositeOperation('hue')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'hue' })
      })

      it('should add setCompositeOperation command for "saturation"', () => {
        styleAPI.setCompositeOperation('saturation')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'saturation' })
      })

      it('should add setCompositeOperation command for "color"', () => {
        styleAPI.setCompositeOperation('color')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'color' })
      })

      it('should add setCompositeOperation command for "luminosity"', () => {
        styleAPI.setCompositeOperation('luminosity')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'luminosity' })
      })

      it('should add setCompositeOperation command for "source-in"', () => {
        styleAPI.setCompositeOperation('source-in')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'source-in' })
      })

      it('should add setCompositeOperation command for "source-out"', () => {
        styleAPI.setCompositeOperation('source-out')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'source-out' })
      })

      it('should add setCompositeOperation command for "source-atop"', () => {
        styleAPI.setCompositeOperation('source-atop')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'source-atop' })
      })

      it('should add setCompositeOperation command for "destination-over"', () => {
        styleAPI.setCompositeOperation('destination-over')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'destination-over' })
      })

      it('should add setCompositeOperation command for "destination-in"', () => {
        styleAPI.setCompositeOperation('destination-in')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'destination-in' })
      })

      it('should add setCompositeOperation command for "destination-out"', () => {
        styleAPI.setCompositeOperation('destination-out')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'destination-out' })
      })

      it('should add setCompositeOperation command for "destination-atop"', () => {
        styleAPI.setCompositeOperation('destination-atop')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'destination-atop' })
      })

      it('should add setCompositeOperation command for "lighter"', () => {
        styleAPI.setCompositeOperation('lighter')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'lighter' })
      })

      it('should add setCompositeOperation command for "copy"', () => {
        styleAPI.setCompositeOperation('copy')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'copy' })
      })

      it('should add setCompositeOperation command for "xor"', () => {
        styleAPI.setCompositeOperation('xor')
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setCompositeOperation', operation: 'xor' })
      })
    })

    describe('setImageSmoothing', () => {
      it('should add setImageSmoothing command when enabled', () => {
        styleAPI.setImageSmoothing(true)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setImageSmoothing', enabled: true })
      })

      it('should add setImageSmoothing command when disabled', () => {
        styleAPI.setImageSmoothing(false)
        expect(mockAddDrawCommand).toHaveBeenCalledWith({ type: 'setImageSmoothing', enabled: false })
      })
    })
  })

  describe('edge cases', () => {
    beforeEach(() => {
      styleAPI.setAddDrawCommand(mockAddDrawCommand)
    })

    it('should handle rapid consecutive calls', () => {
      styleAPI.setLineCap('round')
      styleAPI.setLineCap('square')
      styleAPI.setLineCap('butt')
      expect(mockAddDrawCommand).toHaveBeenCalledTimes(3)
    })

    it('should handle setting and resetting styles', () => {
      styleAPI.setLineDash([10, 5])
      styleAPI.setLineDash([])
      expect(styleAPI.getLineDash()).toEqual([])
    })

    it('should maintain command order', () => {
      styleAPI.setGlobalAlpha(0.5)
      styleAPI.setCompositeOperation('multiply')
      styleAPI.setShadow('black', 5, 2, 2)

      expect(mockAddDrawCommand).toHaveBeenCalledTimes(3)
      expect(mockAddDrawCommand.mock.calls[0][0].type).toBe('setGlobalAlpha')
      expect(mockAddDrawCommand.mock.calls[1][0].type).toBe('setCompositeOperation')
      expect(mockAddDrawCommand.mock.calls[2][0].type).toBe('setShadow')
    })

    it('should handle all methods being called with null callback', () => {
      const api = new StyleAPI()
      // No callback set, all methods should be no-ops
      expect(() => {
        api.setLineCap('round')
        api.setLineJoin('bevel')
        api.setMiterLimit(5)
        api.setLineDash([5, 10])
        api.setLineDashOffset(5)
        api.setFillStyle('red')
        api.setStrokeStyle('blue')
        api.setShadowColor('black')
        api.setShadowBlur(10)
        api.setShadowOffsetX(5)
        api.setShadowOffsetY(5)
        api.setShadow('black', 10, 5, 5)
        api.clearShadow()
        api.setGlobalAlpha(0.5)
        api.setCompositeOperation('multiply')
        api.setImageSmoothing(false)
      }).not.toThrow()

      // getLineDash should still work (internal state)
      expect(api.getLineDash()).toEqual([5, 10])
    })
  })
})
