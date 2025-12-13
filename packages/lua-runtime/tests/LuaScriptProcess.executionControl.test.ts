import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LuaScriptProcess } from '../src/LuaScriptProcess'
import type { ShellContext, IFileSystem } from '@lua-learning/shell-core'

describe('LuaScriptProcess - Execution Control', () => {
  let onOutput: ReturnType<typeof vi.fn>
  let onError: ReturnType<typeof vi.fn>
  let onExit: ReturnType<typeof vi.fn>
  let mockFileSystem: IFileSystem
  let mockContext: ShellContext

  beforeEach(() => {
    onOutput = vi.fn()
    onError = vi.fn()
    onExit = vi.fn()

    mockFileSystem = {
      exists: vi.fn().mockReturnValue(true),
      isDirectory: vi.fn().mockReturnValue(false),
      readFile: vi.fn().mockReturnValue('print("hello")'),
      writeFile: vi.fn(),
      appendFile: vi.fn(),
      deleteFile: vi.fn(),
      createDirectory: vi.fn(),
      deleteDirectory: vi.fn(),
      listDirectory: vi.fn().mockReturnValue([]),
      getFileInfo: vi.fn(),
      copyFile: vi.fn(),
      moveFile: vi.fn(),
    }

    mockContext = {
      cwd: '/home/user',
      env: {},
      filesystem: mockFileSystem,
    }
  })

  describe('instruction limit callback', () => {
    it('should stop execution when instruction limit is reached and callback returns false', async () => {
      const limitReachedCallback = vi.fn().mockReturnValue(false)
      mockFileSystem.readFile = vi.fn().mockReturnValue(`
        for i = 1, 1000 do
          local x = i
        end
      `)

      const process = new LuaScriptProcess('test.lua', mockContext, {
        instructionLimit: 100,
        instructionCheckInterval: 10,
        onInstructionLimitReached: limitReachedCallback,
      })
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      process.start()
      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(limitReachedCallback).toHaveBeenCalled()
      expect(onError).toHaveBeenCalled()
      const errorMsg = onError.mock.calls.find((call) =>
        call[0].includes('instruction limit')
      )
      expect(errorMsg).toBeDefined()
    })

    it('should continue execution when callback returns true', async () => {
      let callCount = 0
      const limitReachedCallback = vi.fn().mockImplementation(() => {
        callCount++
        return callCount < 3 // Continue first 2 times
      })
      mockFileSystem.readFile = vi.fn().mockReturnValue(`
        for i = 1, 1000 do
          local x = i
        end
      `)

      const process = new LuaScriptProcess('test.lua', mockContext, {
        instructionLimit: 50,
        instructionCheckInterval: 5,
        onInstructionLimitReached: limitReachedCallback,
      })
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      process.start()
      await new Promise((resolve) => setTimeout(resolve, 300))

      expect(callCount).toBeGreaterThanOrEqual(2)
    })
  })

  describe('stop request mechanism', () => {
    it('should request stop from Lua when stop() is called during execution', async () => {
      mockFileSystem.readFile = vi.fn().mockReturnValue(`
        for i = 1, 1000000 do
          local x = i
        end
      `)

      const process = new LuaScriptProcess('test.lua', mockContext, {
        instructionLimit: 10_000_000, // High limit so stop() is what stops it
        instructionCheckInterval: 100,
      })
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      process.start()

      // Give it a tiny bit to start
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Stop the process
      process.stop()

      // Should stop cleanly
      expect(process.isRunning()).toBe(false)
    })
  })

  describe('normal execution without limits', () => {
    it('should execute script normally when no limit callback provided', async () => {
      mockFileSystem.readFile = vi.fn().mockReturnValue('print("hello")')

      const process = new LuaScriptProcess('test.lua', mockContext)
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      process.start()
      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(onOutput).toHaveBeenCalledWith('hello\n')
      expect(onExit).toHaveBeenCalledWith(0)
    })
  })
})
