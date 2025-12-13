import { describe, it, expect, vi } from 'vitest'
import type { IProcess, KeyModifiers } from '../../src/interfaces/IProcess'

describe('IProcess interface', () => {
  /**
   * Helper to create a mock process for testing interface compliance.
   */
  function createMockProcess(): IProcess {
    return {
      start: vi.fn(),
      stop: vi.fn(),
      isRunning: vi.fn(() => false),
      handleInput: vi.fn(),
      onOutput: vi.fn(),
      onError: vi.fn(),
      onExit: vi.fn(),
    }
  }

  describe('lifecycle methods', () => {
    it('should define start method', () => {
      const process = createMockProcess()
      expect(process.start).toBeDefined()
      expect(typeof process.start).toBe('function')
    })

    it('should define stop method', () => {
      const process = createMockProcess()
      expect(process.stop).toBeDefined()
      expect(typeof process.stop).toBe('function')
    })

    it('should define isRunning method that returns boolean', () => {
      const process = createMockProcess()
      expect(process.isRunning).toBeDefined()
      expect(typeof process.isRunning()).toBe('boolean')
    })
  })

  describe('input handling', () => {
    it('should define handleInput method that accepts string', () => {
      const process = createMockProcess()
      process.handleInput('test input')
      expect(process.handleInput).toHaveBeenCalledWith('test input')
    })
  })

  describe('output callbacks', () => {
    it('should define onOutput callback', () => {
      const process = createMockProcess()
      const callback = vi.fn()
      process.onOutput = callback
      process.onOutput('output text')
      expect(callback).toHaveBeenCalledWith('output text')
    })

    it('should define onError callback', () => {
      const process = createMockProcess()
      const callback = vi.fn()
      process.onError = callback
      process.onError('error text')
      expect(callback).toHaveBeenCalledWith('error text')
    })

    it('should define onExit callback with exit code', () => {
      const process = createMockProcess()
      const callback = vi.fn()
      process.onExit = callback
      process.onExit(0)
      expect(callback).toHaveBeenCalledWith(0)
    })

    it('should handle non-zero exit codes', () => {
      const process = createMockProcess()
      const callback = vi.fn()
      process.onExit = callback
      process.onExit(1)
      expect(callback).toHaveBeenCalledWith(1)
    })
  })

  describe('raw key input handling (optional)', () => {
    /**
     * Helper to create a mock process with raw key handling support.
     */
    function createMockProcessWithKeySupport(): IProcess {
      return {
        start: vi.fn(),
        stop: vi.fn(),
        isRunning: vi.fn(() => false),
        handleInput: vi.fn(),
        onOutput: vi.fn(),
        onError: vi.fn(),
        onExit: vi.fn(),
        supportsRawInput: true,
        handleKey: vi.fn(),
      }
    }

    it('should define optional supportsRawInput property', () => {
      const process = createMockProcessWithKeySupport()
      expect(process.supportsRawInput).toBe(true)
    })

    it('should define optional handleKey method', () => {
      const process = createMockProcessWithKeySupport()
      expect(process.handleKey).toBeDefined()
      expect(typeof process.handleKey).toBe('function')
    })

    it('should call handleKey with key string and optional modifiers', () => {
      const process = createMockProcessWithKeySupport()
      const modifiers: KeyModifiers = { ctrl: false, alt: false, shift: false }

      process.handleKey!('ArrowUp', modifiers)

      expect(process.handleKey).toHaveBeenCalledWith('ArrowUp', modifiers)
    })

    it('should allow process without raw key support', () => {
      const process = createMockProcess()
      // Process without supportsRawInput should work (defaults to false/undefined)
      expect(process.supportsRawInput).toBeUndefined()
      expect(process.handleKey).toBeUndefined()
    })
  })

  describe('KeyModifiers type', () => {
    it('should allow creating KeyModifiers with ctrl modifier', () => {
      const modifiers: KeyModifiers = { ctrl: true, alt: false, shift: false }
      expect(modifiers.ctrl).toBe(true)
    })

    it('should allow creating KeyModifiers with alt modifier', () => {
      const modifiers: KeyModifiers = { ctrl: false, alt: true, shift: false }
      expect(modifiers.alt).toBe(true)
    })

    it('should allow creating KeyModifiers with shift modifier', () => {
      const modifiers: KeyModifiers = { ctrl: false, alt: false, shift: true }
      expect(modifiers.shift).toBe(true)
    })
  })
})
