/**
 * Tests for CanvasController - Styling operations.
 * Tests line styles (cap, join, miter, dash) and fill/stroke styles.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CanvasController } from '../src/CanvasController'
import { resetCapturedCallback, createTestController } from './CanvasController.path.setup'

describe('CanvasController Path API - Styling', () => {
  let controller: CanvasController

  beforeEach(() => {
    resetCapturedCallback()
    const setup = createTestController()
    controller = setup.controller
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('setLineCap', () => {
    it('should add setLineCap command with butt', () => {
      controller.setLineCap('butt')

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineCap',
        cap: 'butt',
      })
    })

    it('should add setLineCap command with round', () => {
      controller.setLineCap('round')

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineCap',
        cap: 'round',
      })
    })

    it('should add setLineCap command with square', () => {
      controller.setLineCap('square')

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineCap',
        cap: 'square',
      })
    })
  })

  describe('setLineJoin', () => {
    it('should add setLineJoin command with miter', () => {
      controller.setLineJoin('miter')

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineJoin',
        join: 'miter',
      })
    })

    it('should add setLineJoin command with round', () => {
      controller.setLineJoin('round')

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineJoin',
        join: 'round',
      })
    })

    it('should add setLineJoin command with bevel', () => {
      controller.setLineJoin('bevel')

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineJoin',
        join: 'bevel',
      })
    })
  })

  describe('setMiterLimit', () => {
    it('should add setMiterLimit command', () => {
      controller.setMiterLimit(15)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setMiterLimit',
        limit: 15,
      })
    })

    it('should add setMiterLimit command with default value', () => {
      controller.setMiterLimit(10)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setMiterLimit',
        limit: 10,
      })
    })
  })

  describe('setLineDash', () => {
    it('should add setLineDash command with simple pattern', () => {
      controller.setLineDash([10, 5])

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineDash',
        segments: [10, 5],
      })
    })

    it('should add setLineDash command with complex pattern', () => {
      controller.setLineDash([15, 5, 5, 5])

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineDash',
        segments: [15, 5, 5, 5],
      })
    })

    it('should add setLineDash command with empty array for solid line', () => {
      controller.setLineDash([])

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineDash',
        segments: [],
      })
    })

    it('should store segments in internal state', () => {
      controller.setLineDash([10, 5])

      expect(controller.getLineDash()).toEqual([10, 5])
    })
  })

  describe('getLineDash', () => {
    it('should return empty array initially', () => {
      expect(controller.getLineDash()).toEqual([])
    })

    it('should return current dash pattern', () => {
      controller.setLineDash([10, 5])

      expect(controller.getLineDash()).toEqual([10, 5])
    })
  })

  describe('setLineDashOffset', () => {
    it('should add setLineDashOffset command', () => {
      controller.setLineDashOffset(5)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineDashOffset',
        offset: 5,
      })
    })

    it('should add setLineDashOffset command with zero', () => {
      controller.setLineDashOffset(0)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineDashOffset',
        offset: 0,
      })
    })

    it('should add setLineDashOffset command with negative value', () => {
      controller.setLineDashOffset(-10)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setLineDashOffset',
        offset: -10,
      })
    })
  })

  describe('setFillStyle', () => {
    it('should add setFillStyle command with string color', () => {
      controller.setFillStyle('#ff0000')

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setFillStyle',
        style: '#ff0000',
      })
    })

    it('should add setFillStyle command with named color', () => {
      controller.setFillStyle('blue')

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setFillStyle',
        style: 'blue',
      })
    })

    it('should add setFillStyle command with linear gradient', () => {
      const gradient = {
        type: 'linear' as const,
        x0: 0,
        y0: 0,
        x1: 100,
        y1: 0,
        stops: [
          { offset: 0, color: '#ff0000' },
          { offset: 1, color: '#0000ff' },
        ],
      }
      controller.setFillStyle(gradient)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setFillStyle',
        style: gradient,
      })
    })

    it('should add setFillStyle command with radial gradient', () => {
      const gradient = {
        type: 'radial' as const,
        x0: 100,
        y0: 100,
        r0: 0,
        x1: 100,
        y1: 100,
        r1: 50,
        stops: [
          { offset: 0, color: 'white' },
          { offset: 1, color: 'black' },
        ],
      }
      controller.setFillStyle(gradient)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setFillStyle',
        style: gradient,
      })
    })
  })

  describe('setStrokeStyle', () => {
    it('should add setStrokeStyle command with string color', () => {
      controller.setStrokeStyle('#00ff00')

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setStrokeStyle',
        style: '#00ff00',
      })
    })

    it('should add setStrokeStyle command with named color', () => {
      controller.setStrokeStyle('red')

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setStrokeStyle',
        style: 'red',
      })
    })

    it('should add setStrokeStyle command with linear gradient', () => {
      const gradient = {
        type: 'linear' as const,
        x0: 0,
        y0: 0,
        x1: 200,
        y1: 0,
        stops: [
          { offset: 0, color: 'red' },
          { offset: 0.5, color: 'yellow' },
          { offset: 1, color: 'green' },
        ],
      }
      controller.setStrokeStyle(gradient)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setStrokeStyle',
        style: gradient,
      })
    })

    it('should add setStrokeStyle command with radial gradient', () => {
      const gradient = {
        type: 'radial' as const,
        x0: 50,
        y0: 50,
        r0: 10,
        x1: 50,
        y1: 50,
        r1: 100,
        stops: [
          { offset: 0, color: '#ffffff' },
          { offset: 1, color: '#000000' },
        ],
      }
      controller.setStrokeStyle(gradient)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'setStrokeStyle',
        style: gradient,
      })
    })
  })
})
