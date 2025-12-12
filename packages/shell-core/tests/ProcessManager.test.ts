import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProcessManager } from '../src/ProcessManager'
import type { IProcess } from '../src/interfaces/IProcess'

describe('ProcessManager', () => {
  let processManager: ProcessManager

  function createMockProcess(): IProcess {
    return {
      start: vi.fn(),
      stop: vi.fn(),
      isRunning: vi.fn(() => true),
      handleInput: vi.fn(),
      onOutput: vi.fn(),
      onError: vi.fn(),
      onExit: vi.fn(),
    }
  }

  beforeEach(() => {
    processManager = new ProcessManager()
  })

  describe('initial state', () => {
    it('should have no foreground process initially', () => {
      expect(processManager.hasForegroundProcess()).toBe(false)
    })

    it('should return null for current process initially', () => {
      expect(processManager.getCurrentProcess()).toBeNull()
    })
  })

  describe('startProcess', () => {
    it('should start the process', () => {
      const process = createMockProcess()

      processManager.startProcess(process)

      expect(process.start).toHaveBeenCalled()
    })

    it('should set process as foreground', () => {
      const process = createMockProcess()

      processManager.startProcess(process)

      expect(processManager.hasForegroundProcess()).toBe(true)
      expect(processManager.getCurrentProcess()).toBe(process)
    })

    it('should wire up onExit callback', () => {
      const process = createMockProcess()

      processManager.startProcess(process)

      // onExit should be set by ProcessManager
      expect(process.onExit).toBeDefined()
    })

    it('should stop existing process before starting new one', () => {
      const process1 = createMockProcess()
      const process2 = createMockProcess()

      processManager.startProcess(process1)
      processManager.startProcess(process2)

      expect(process1.stop).toHaveBeenCalled()
      expect(processManager.getCurrentProcess()).toBe(process2)
    })
  })

  describe('stopProcess', () => {
    it('should stop the current process', () => {
      const process = createMockProcess()
      processManager.startProcess(process)

      processManager.stopProcess()

      expect(process.stop).toHaveBeenCalled()
    })

    it('should clear the foreground process', () => {
      const process = createMockProcess()
      processManager.startProcess(process)

      processManager.stopProcess()

      expect(processManager.hasForegroundProcess()).toBe(false)
    })

    it('should do nothing if no process is running', () => {
      // Should not throw
      expect(() => processManager.stopProcess()).not.toThrow()
    })
  })

  describe('handleInput', () => {
    it('should route input to foreground process', () => {
      const process = createMockProcess()
      processManager.startProcess(process)

      processManager.handleInput('test input')

      expect(process.handleInput).toHaveBeenCalledWith('test input')
    })

    it('should return true when input was handled', () => {
      const process = createMockProcess()
      processManager.startProcess(process)

      const handled = processManager.handleInput('test')

      expect(handled).toBe(true)
    })

    it('should return false when no process is running', () => {
      const handled = processManager.handleInput('test')

      expect(handled).toBe(false)
    })
  })

  describe('process exit', () => {
    it('should clear foreground when process exits', () => {
      const process = createMockProcess()
      let exitCallback: (code: number) => void = () => {}

      // Capture the onExit callback
      Object.defineProperty(process, 'onExit', {
        set: (fn: (code: number) => void) => {
          exitCallback = fn
        },
        get: () => exitCallback,
      })

      processManager.startProcess(process)
      expect(processManager.hasForegroundProcess()).toBe(true)

      // Simulate process exit
      exitCallback(0)

      expect(processManager.hasForegroundProcess()).toBe(false)
    })

    it('should emit onProcessExit event', () => {
      const process = createMockProcess()
      let exitCallback: (code: number) => void = () => {}

      Object.defineProperty(process, 'onExit', {
        set: (fn: (code: number) => void) => {
          exitCallback = fn
        },
        get: () => exitCallback,
      })

      const exitHandler = vi.fn()
      processManager.onProcessExit = exitHandler

      processManager.startProcess(process)
      exitCallback(42)

      expect(exitHandler).toHaveBeenCalledWith(42)
    })
  })

  describe('onProcessExit callback', () => {
    it('should be callable without throwing when not set', () => {
      const process = createMockProcess()
      let exitCallback: (code: number) => void = () => {}

      Object.defineProperty(process, 'onExit', {
        set: (fn: (code: number) => void) => {
          exitCallback = fn
        },
        get: () => exitCallback,
      })

      processManager.startProcess(process)

      // Should not throw even when onProcessExit is not set
      expect(() => exitCallback(0)).not.toThrow()
    })
  })
})
