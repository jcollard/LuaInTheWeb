/**
 * Tests for CanvasController - Bezier curve operations.
 * Tests quadraticCurveTo and bezierCurveTo commands.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CanvasController } from '../src/CanvasController'
import { resetCapturedCallback, createTestController } from './CanvasController.path.setup'

describe('CanvasController Path API - Bezier Curves', () => {
  let controller: CanvasController

  beforeEach(() => {
    resetCapturedCallback()
    const setup = createTestController()
    controller = setup.controller
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('quadraticCurveTo', () => {
    it('should add quadraticCurveTo command', () => {
      controller.quadraticCurveTo(100, 50, 200, 100)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'quadraticCurveTo',
        cpx: 100,
        cpy: 50,
        x: 200,
        y: 100,
      })
    })

    it('should add quadraticCurveTo command with zero coordinates', () => {
      controller.quadraticCurveTo(0, 0, 0, 0)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'quadraticCurveTo',
        cpx: 0,
        cpy: 0,
        x: 0,
        y: 0,
      })
    })

    it('should add quadraticCurveTo command with negative coordinates', () => {
      controller.quadraticCurveTo(-50, -100, -150, -200)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'quadraticCurveTo',
        cpx: -50,
        cpy: -100,
        x: -150,
        y: -200,
      })
    })
  })

  describe('bezierCurveTo', () => {
    it('should add bezierCurveTo command', () => {
      controller.bezierCurveTo(100, 50, 200, 150, 300, 100)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'bezierCurveTo',
        cp1x: 100,
        cp1y: 50,
        cp2x: 200,
        cp2y: 150,
        x: 300,
        y: 100,
      })
    })

    it('should add bezierCurveTo command with zero coordinates', () => {
      controller.bezierCurveTo(0, 0, 0, 0, 0, 0)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'bezierCurveTo',
        cp1x: 0,
        cp1y: 0,
        cp2x: 0,
        cp2y: 0,
        x: 0,
        y: 0,
      })
    })

    it('should add bezierCurveTo command with negative coordinates', () => {
      controller.bezierCurveTo(-50, -100, -150, -200, -250, -300)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'bezierCurveTo',
        cp1x: -50,
        cp1y: -100,
        cp2x: -150,
        cp2y: -200,
        x: -250,
        y: -300,
      })
    })
  })
})
