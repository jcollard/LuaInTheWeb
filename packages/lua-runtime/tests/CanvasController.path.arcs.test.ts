/**
 * Tests for CanvasController - Arc operations.
 * Tests arc, arcTo, and ellipse path commands.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CanvasController } from '../src/CanvasController'
import { resetCapturedCallback, createTestController } from './CanvasController.path.setup'

describe('CanvasController Path API - Arc Operations', () => {
  let controller: CanvasController

  beforeEach(() => {
    resetCapturedCallback()
    const setup = createTestController()
    controller = setup.controller
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('arc', () => {
    it('should add arc command with all parameters', () => {
      controller.arc(100, 100, 50, 0, Math.PI, true)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'arc',
        x: 100,
        y: 100,
        radius: 50,
        startAngle: 0,
        endAngle: Math.PI,
        counterclockwise: true,
      })
    })

    it('should add arc command without counterclockwise parameter', () => {
      controller.arc(200, 200, 75, Math.PI / 2, Math.PI * 2)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'arc',
        x: 200,
        y: 200,
        radius: 75,
        startAngle: Math.PI / 2,
        endAngle: Math.PI * 2,
        counterclockwise: undefined,
      })
    })

    it('should add arc command with counterclockwise false', () => {
      controller.arc(150, 150, 30, 0, Math.PI / 4, false)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'arc',
        x: 150,
        y: 150,
        radius: 30,
        startAngle: 0,
        endAngle: Math.PI / 4,
        counterclockwise: false,
      })
    })

    it('should add arc command with negative angles', () => {
      controller.arc(100, 100, 50, -Math.PI, 0)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'arc',
        x: 100,
        y: 100,
        radius: 50,
        startAngle: -Math.PI,
        endAngle: 0,
        counterclockwise: undefined,
      })
    })
  })

  describe('arcTo', () => {
    it('should add arcTo command', () => {
      controller.arcTo(100, 100, 100, 50, 20)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'arcTo',
        x1: 100,
        y1: 100,
        x2: 100,
        y2: 50,
        radius: 20,
      })
    })

    it('should add arcTo command with zero radius', () => {
      controller.arcTo(50, 50, 100, 50, 0)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'arcTo',
        x1: 50,
        y1: 50,
        x2: 100,
        y2: 50,
        radius: 0,
      })
    })

    it('should add arcTo command with negative coordinates', () => {
      controller.arcTo(-50, -50, -100, -50, 25)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'arcTo',
        x1: -50,
        y1: -50,
        x2: -100,
        y2: -50,
        radius: 25,
      })
    })
  })

  describe('ellipse', () => {
    it('should add ellipse command with all parameters', () => {
      controller.ellipse(200, 150, 100, 50, 0, 0, Math.PI * 2, false)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'ellipse',
        x: 200,
        y: 150,
        radiusX: 100,
        radiusY: 50,
        rotation: 0,
        startAngle: 0,
        endAngle: Math.PI * 2,
        counterclockwise: false,
      })
    })

    it('should add ellipse command without counterclockwise parameter', () => {
      controller.ellipse(100, 100, 80, 40, Math.PI / 4, 0, Math.PI)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'ellipse',
        x: 100,
        y: 100,
        radiusX: 80,
        radiusY: 40,
        rotation: Math.PI / 4,
        startAngle: 0,
        endAngle: Math.PI,
        counterclockwise: undefined,
      })
    })

    it('should add ellipse command with counterclockwise true', () => {
      controller.ellipse(150, 150, 60, 30, 0, 0, Math.PI / 2, true)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'ellipse',
        x: 150,
        y: 150,
        radiusX: 60,
        radiusY: 30,
        rotation: 0,
        startAngle: 0,
        endAngle: Math.PI / 2,
        counterclockwise: true,
      })
    })

    it('should add ellipse command with rotation', () => {
      controller.ellipse(200, 200, 100, 50, Math.PI / 6, 0, Math.PI * 2)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'ellipse',
        x: 200,
        y: 200,
        radiusX: 100,
        radiusY: 50,
        rotation: Math.PI / 6,
        startAngle: 0,
        endAngle: Math.PI * 2,
        counterclockwise: undefined,
      })
    })

    it('should add ellipse command with partial arc', () => {
      controller.ellipse(100, 100, 50, 25, 0, Math.PI / 4, Math.PI * 3 / 4)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'ellipse',
        x: 100,
        y: 100,
        radiusX: 50,
        radiusY: 25,
        rotation: 0,
        startAngle: Math.PI / 4,
        endAngle: Math.PI * 3 / 4,
        counterclockwise: undefined,
      })
    })
  })

  describe('arc workflow', () => {
    it('should support pie chart slice workflow with arc', () => {
      controller.beginPath()
      controller.moveTo(200, 200)
      controller.arc(200, 200, 100, 0, Math.PI / 2)
      controller.closePath()
      controller.fill()

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(5)
      expect(commands[0]).toEqual({ type: 'beginPath' })
      expect(commands[1]).toEqual({ type: 'moveTo', x: 200, y: 200 })
      expect(commands[2]).toEqual({
        type: 'arc',
        x: 200,
        y: 200,
        radius: 100,
        startAngle: 0,
        endAngle: Math.PI / 2,
        counterclockwise: undefined,
      })
      expect(commands[3]).toEqual({ type: 'closePath' })
      expect(commands[4]).toEqual({ type: 'fill' })
    })

    it('should support rounded corner workflow with arcTo', () => {
      controller.beginPath()
      controller.moveTo(50, 100)
      controller.arcTo(100, 100, 100, 50, 20)
      controller.stroke()

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(4)
      expect(commands[0]).toEqual({ type: 'beginPath' })
      expect(commands[1]).toEqual({ type: 'moveTo', x: 50, y: 100 })
      expect(commands[2]).toEqual({
        type: 'arcTo',
        x1: 100,
        y1: 100,
        x2: 100,
        y2: 50,
        radius: 20,
      })
      expect(commands[3]).toEqual({ type: 'stroke' })
    })
  })
})
