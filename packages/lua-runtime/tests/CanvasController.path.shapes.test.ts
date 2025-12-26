/**
 * Tests for CanvasController - Shape operations.
 * Tests roundRect and clip commands.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CanvasController } from '../src/CanvasController'
import { resetCapturedCallback, createTestController } from './CanvasController.path.setup'

describe('CanvasController Path API - Shapes', () => {
  let controller: CanvasController

  beforeEach(() => {
    resetCapturedCallback()
    const setup = createTestController()
    controller = setup.controller
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('rectPath', () => {
    it('should add rectPath command with all parameters', () => {
      controller.rectPath(10, 20, 100, 50)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'rectPath',
        x: 10,
        y: 20,
        width: 100,
        height: 50,
      })
    })

    it('should add rectPath command at origin', () => {
      controller.rectPath(0, 0, 200, 150)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'rectPath',
        x: 0,
        y: 0,
        width: 200,
        height: 150,
      })
    })

    it('should add rectPath command with negative coordinates', () => {
      controller.rectPath(-50, -25, 100, 50)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'rectPath',
        x: -50,
        y: -25,
        width: 100,
        height: 50,
      })
    })
  })

  describe('roundRect', () => {
    it('should add roundRect command with single radius value', () => {
      controller.roundRect(50, 50, 200, 100, 15)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'roundRect',
        x: 50,
        y: 50,
        width: 200,
        height: 100,
        radii: 15,
      })
    })

    it('should add roundRect command with array of radii', () => {
      controller.roundRect(100, 100, 150, 80, [10, 20, 30, 40])

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'roundRect',
        x: 100,
        y: 100,
        width: 150,
        height: 80,
        radii: [10, 20, 30, 40],
      })
    })

    it('should add roundRect command with single-element radii array', () => {
      controller.roundRect(0, 0, 100, 50, [25])

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'roundRect',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        radii: [25],
      })
    })

    it('should add roundRect command with two-element radii array', () => {
      controller.roundRect(10, 20, 200, 100, [10, 20])

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'roundRect',
        x: 10,
        y: 20,
        width: 200,
        height: 100,
        radii: [10, 20],
      })
    })

    it('should add roundRect command with three-element radii array', () => {
      controller.roundRect(30, 40, 180, 90, [5, 10, 15])

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'roundRect',
        x: 30,
        y: 40,
        width: 180,
        height: 90,
        radii: [5, 10, 15],
      })
    })

    it('should add roundRect command with zero radius', () => {
      controller.roundRect(0, 0, 100, 100, 0)

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'roundRect',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        radii: 0,
      })
    })
  })

  describe('clip', () => {
    it('should add clip command with no fill rule', () => {
      controller.clip()

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'clip',
        fillRule: undefined,
      })
    })

    it('should add clip command with nonzero fill rule', () => {
      controller.clip('nonzero')

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'clip',
        fillRule: 'nonzero',
      })
    })

    it('should add clip command with evenodd fill rule', () => {
      controller.clip('evenodd')

      const commands = controller.getFrameCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toEqual({
        type: 'clip',
        fillRule: 'evenodd',
      })
    })
  })
})
