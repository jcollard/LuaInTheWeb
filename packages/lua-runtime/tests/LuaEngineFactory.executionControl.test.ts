import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LuaEngine } from 'wasmoon'
import {
  LuaEngineFactory,
  type LuaEngineCallbacks,
  type LuaEngineOptions,
  DEFAULT_INSTRUCTION_LIMIT,
  DEFAULT_INSTRUCTION_CHECK_INTERVAL,
} from '../src/LuaEngineFactory'
import { setupAnsiAPI } from '../src/setupAnsiAPI'
import type { AnsiController } from '../src/AnsiController'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_FG, DEFAULT_BG } from '../src/screenTypes'

describe('LuaEngineFactory - Execution Control', () => {
  let callbacks: LuaEngineCallbacks

  beforeEach(() => {
    callbacks = {
      onOutput: vi.fn(),
      onError: vi.fn(),
      onReadInput: vi.fn(),
    }
  })

  describe('LuaEngineOptions', () => {
    it('should export default instruction limit constant', () => {
      expect(DEFAULT_INSTRUCTION_LIMIT).toBe(10_000_000)
    })

    it('should export default instruction check interval constant', () => {
      expect(DEFAULT_INSTRUCTION_CHECK_INTERVAL).toBe(1000)
    })

    it('should accept options parameter in create method', async () => {
      const options: LuaEngineOptions = {
        instructionLimit: 5_000_000,
        instructionCheckInterval: 500,
      }

      const engine = await LuaEngineFactory.create(callbacks, options)

      expect(engine).toBeDefined()
      engine.global.close()
    })

    it('should use default options when not provided', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      // Verify engine is created successfully with defaults
      expect(engine).toBeDefined()

      // Check that the Lua globals for limits are set to defaults
      const limit = await engine.doString('return __instruction_limit')
      const interval = await engine.doString('return __check_interval')

      expect(limit).toBe(DEFAULT_INSTRUCTION_LIMIT)
      expect(interval).toBe(DEFAULT_INSTRUCTION_CHECK_INTERVAL)

      engine.global.close()
    })

    it('should apply custom instruction limit', async () => {
      const options: LuaEngineOptions = {
        instructionLimit: 1_000_000,
      }

      const engine = await LuaEngineFactory.create(callbacks, options)

      const limit = await engine.doString('return __instruction_limit')
      expect(limit).toBe(1_000_000)

      engine.global.close()
    })

    it('should apply custom check interval', async () => {
      const options: LuaEngineOptions = {
        instructionCheckInterval: 2000,
      }

      const engine = await LuaEngineFactory.create(callbacks, options)

      const interval = await engine.doString('return __check_interval')
      expect(interval).toBe(2000)

      engine.global.close()
    })
  })

  describe('onInstructionLimitReached callback', () => {
    it('should verify debug.sethook is installed by factory', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      // Check that the debug hook globals are set up
      const instructionLimit = await engine.doString('return __instruction_limit')
      const checkInterval = await engine.doString('return __check_interval')
      const stopRequested = await engine.doString('return __stop_requested')
      const lineCount = await engine.doString('return __line_count')

      expect(instructionLimit).toBe(DEFAULT_INSTRUCTION_LIMIT)
      expect(checkInterval).toBe(DEFAULT_INSTRUCTION_CHECK_INTERVAL)
      expect(stopRequested).toBe(false)
      expect(lineCount).toBe(0)

      // Verify the hook function exists
      const hookInfo = await engine.doString('return debug.gethook()')
      expect(hookInfo).toBeDefined()

      engine.global.close()
    })

    it('should increment line count when code runs with hook setup', async () => {
      const options: LuaEngineOptions = {
        instructionLimit: 1_000_000,
        instructionCheckInterval: 10,
      }
      const engine = await LuaEngineFactory.create(callbacks, options)

      // Check if execution control functions are defined
      const funcsCheck = await engine.doString(`
        return type(__setup_execution_hook) .. "," .. type(__clear_execution_hook) .. "," .. type(__execution_hook)
      `)
      expect(funcsCheck).toBe('function,function,function')

      // Use the hook setup within a single doString to verify it works
      const lineCountTest = await engine.doString(`
        __setup_execution_hook()
        local initial = __line_count
        for i = 1, 100 do
          local x = i
        end
        local final = __line_count
        __clear_execution_hook()
        return final - initial
      `)

      // Line count should increase for loop iterations
      expect(lineCountTest).toBeGreaterThan(50)

      engine.global.close()
    })

    it('should call onInstructionLimitReached when instruction limit is exceeded', async () => {
      const limitReachedCallback = vi.fn().mockReturnValue(false) // Synchronous callback
      const callbacksWithLimit: LuaEngineCallbacks = {
        ...callbacks,
        onInstructionLimitReached: limitReachedCallback,
      }
      const options: LuaEngineOptions = {
        instructionLimit: 100, // Low limit for line count
        instructionCheckInterval: 10,
      }

      const engine = await LuaEngineFactory.create(callbacksWithLimit, options)

      // Run a loop with hook setup that will exceed line limit
      try {
        await engine.doString(`
          __setup_execution_hook()
          for i = 1, 1000 do
            local x = i
          end
          __clear_execution_hook()
        `)
      } catch {
        // Expected to throw when stopped
      }

      expect(limitReachedCallback).toHaveBeenCalled()

      engine.global.close()
    })

    it('should continue execution when callback returns true', async () => {
      let callCount = 0
      const limitReachedCallback = vi.fn().mockImplementation(() => {
        callCount++
        // Continue first time, stop second time
        return callCount < 2
      })
      const callbacksWithLimit: LuaEngineCallbacks = {
        ...callbacks,
        onInstructionLimitReached: limitReachedCallback,
      }
      const options: LuaEngineOptions = {
        instructionLimit: 50, // Lower limit to trigger multiple times
        instructionCheckInterval: 5,
      }

      const engine = await LuaEngineFactory.create(callbacksWithLimit, options)

      try {
        await engine.doString(`
          __setup_execution_hook()
          for i = 1, 1000 do
            local x = i
            local y = i * 2
          end
          __clear_execution_hook()
        `)
      } catch {
        // Expected to throw when finally stopped
      }

      // Should be called at least twice (once to continue, once to stop)
      expect(limitReachedCallback.mock.calls.length).toBeGreaterThanOrEqual(2)

      engine.global.close()
    })

    it('should stop execution when callback returns false', async () => {
      const limitReachedCallback = vi.fn().mockReturnValue(false) // Synchronous callback
      const callbacksWithLimit: LuaEngineCallbacks = {
        ...callbacks,
        onInstructionLimitReached: limitReachedCallback,
      }
      const options: LuaEngineOptions = {
        instructionLimit: 100,
        instructionCheckInterval: 10,
      }

      const engine = await LuaEngineFactory.create(callbacksWithLimit, options)

      await expect(
        engine.doString(`
          __setup_execution_hook()
          for i = 1, 1000 do
            local x = i
          end
          __clear_execution_hook()
        `)
      ).rejects.toThrow()

      expect(limitReachedCallback).toHaveBeenCalledTimes(1)

      engine.global.close()
    })

    it('should not call callback when no limit callback is provided', async () => {
      const options: LuaEngineOptions = {
        instructionLimit: 100,
        instructionCheckInterval: 10,
      }

      const engine = await LuaEngineFactory.create(callbacks, options)

      // With hook setup but no callback, default __on_limit_reached returns true (continue)
      await engine.doString(`
        __setup_execution_hook()
        for i = 1, 1000 do
          local x = i
        end
        __clear_execution_hook()
      `)

      engine.global.close()
    })
  })

  describe('load_screen execution control integration', () => {
    /**
     * Build a minimal V1 .ansi.lua file content string.
     * Uses one line per cell so parsing triggers the line-based debug hook
     * (debug.sethook with "l" flag counts each new line).
     */
    function makeV1FileContent(): string {
      const lines: string[] = ['local grid = {}']
      for (let r = 1; r <= ANSI_ROWS; r++) {
        lines.push(`grid[${r}] = {}`)
        for (let c = 1; c <= ANSI_COLS; c++) {
          lines.push(
            `grid[${r}][${c}] = { char = " ", fg = {${DEFAULT_FG.join(',')}}, bg = {${DEFAULT_BG.join(',')}} }`
          )
        }
      }
      lines.push(
        `return { version = 1, width = ${ANSI_COLS}, height = ${ANSI_ROWS}, grid = grid }`
      )
      return lines.join('\n')
    }

    function createMockController(): AnsiController {
      let nextId = 1
      return {
        isActive: vi.fn().mockReturnValue(false),
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn(),
        setOnTickCallback: vi.fn(),
        write: vi.fn(),
        setCursor: vi.fn(),
        clear: vi.fn(),
        setForeground: vi.fn(),
        setBackground: vi.fn(),
        reset: vi.fn(),
        getDelta: vi.fn().mockReturnValue(0),
        getTime: vi.fn().mockReturnValue(0),
        isKeyDown: vi.fn().mockReturnValue(false),
        isKeyPressed: vi.fn().mockReturnValue(false),
        getKeysDown: vi.fn().mockReturnValue([]),
        getKeysPressed: vi.fn().mockReturnValue([]),
        getMouseCol: vi.fn().mockReturnValue(1),
        getMouseRow: vi.fn().mockReturnValue(1),
        isMouseTopHalf: vi.fn().mockReturnValue(false),
        getMouseX: vi.fn().mockReturnValue(0),
        getMouseY: vi.fn().mockReturnValue(0),
        isMouseButtonDown: vi.fn().mockReturnValue(false),
        isMouseButtonPressed: vi.fn().mockReturnValue(false),
        createScreen: vi.fn().mockImplementation(() => nextId++),
        setScreen: vi.fn(),
        getActiveScreenId: vi.fn().mockReturnValue(null),
        getScreenLayers: vi.fn().mockReturnValue([]),
        setScreenLayerVisible: vi.fn(),
        toggleScreenLayer: vi.fn(),
        screenPlay: vi.fn(),
        screenPause: vi.fn(),
        screenIsPlaying: vi.fn().mockReturnValue(false),
      } as unknown as AnsiController
    }

    /**
     * Create a Lua engine with ANSI API configured for load_screen testing.
     * Returns the engine instance (caller is responsible for engine.global.close()).
     */
    async function createEngineWithAnsi(
      engineCallbacks: LuaEngineCallbacks,
      options: LuaEngineOptions
    ): Promise<LuaEngine> {
      const engine = await LuaEngineFactory.create(engineCallbacks, options)
      const controller = createMockController()
      setupAnsiAPI(engine, () => controller, {
        fileReader: engineCallbacks.fileReader,
        cwd: '/',
      })
      return engine
    }

    /** File reader that returns V1 content for /art/test.ansi.lua. */
    function v1FileReader(path: string): string | null {
      if (path === '/art/test.ansi.lua') return makeV1FileContent()
      return null
    }

    it('should not trigger instruction limit during load_screen', async () => {
      const limitReachedCallback = vi.fn().mockReturnValue(false)
      const engine = await createEngineWithAnsi(
        { ...callbacks, onInstructionLimitReached: limitReachedCallback, fileReader: v1FileReader },
        { instructionLimit: 50, instructionCheckInterval: 5 }
      )

      await engine.doString(`
        __setup_execution_hook()
        local ansi = require("ansi")
        ansi.load_screen("art/test.ansi.lua")
        __clear_execution_hook()
      `)

      expect(limitReachedCallback).not.toHaveBeenCalled()

      engine.global.close()
    })

    it('should reset instruction count after load_screen completes', async () => {
      const limitReachedCallback = vi.fn().mockReturnValue(false)
      // The file generates ~2000+ lines. Use a limit well above the post-reset
      // overhead but below the file's line count to verify the reset prevents
      // accumulation from the loaded file.
      const engine = await createEngineWithAnsi(
        { ...callbacks, onInstructionLimitReached: limitReachedCallback, fileReader: v1FileReader },
        { instructionLimit: 200, instructionCheckInterval: 10 }
      )

      // After load_screen, run a loop that would exceed the limit if the
      // file's 2000+ lines hadn't been reset. With the reset, the loop's
      // ~100 lines plus post-load overhead stays under the 200 limit.
      await engine.doString(`
        __setup_execution_hook()
        local ansi = require("ansi")
        ansi.load_screen("art/test.ansi.lua")
        for i = 1, 50 do
          local x = i
        end
        __clear_execution_hook()
      `)

      expect(limitReachedCallback).not.toHaveBeenCalled()

      engine.global.close()
    })

    it('should still honor stop requests during load_screen', async () => {
      const engine = await createEngineWithAnsi(
        { ...callbacks, fileReader: v1FileReader },
        { instructionLimit: 1_000_000, instructionCheckInterval: 5 }
      )

      // Set stop flag before calling load_screen
      await engine.doString('__stop_requested = true')

      await expect(
        engine.doString(`
          __setup_execution_hook()
          local ansi = require("ansi")
          ansi.load_screen("art/test.ansi.lua")
          __clear_execution_hook()
        `)
      ).rejects.toThrow('Execution stopped by user')

      const loadingDepth = await engine.doString('return __loading_depth')
      expect(loadingDepth).toBe(0)

      engine.global.close()
    })

    it('should not leak __loading_depth when load_screen errors', async () => {
      const engine = await createEngineWithAnsi(
        { ...callbacks, fileReader: () => 'return 42' },
        { instructionLimit: 1_000_000, instructionCheckInterval: 10 }
      )

      // load_screen should error because the file returns a number, not a table
      try {
        await engine.doString(`
          __setup_execution_hook()
          local ansi = require("ansi")
          ansi.load_screen("bad.ansi.lua")
          __clear_execution_hook()
        `)
      } catch {
        // Expected error
      }

      const loadingDepth = await engine.doString('return __loading_depth')
      expect(loadingDepth).toBe(0)

      engine.global.close()
    })
  })

  describe('stop request mechanism', () => {
    it('should provide __request_stop function', async () => {
      const engine = await LuaEngineFactory.create(callbacks)

      const funcType = await engine.doString('return type(__request_stop)')
      expect(funcType).toBe('function')

      engine.global.close()
    })

    it('should stop execution when __request_stop is called', async () => {
      const options: LuaEngineOptions = {
        instructionLimit: 1_000_000,
        instructionCheckInterval: 10,
      }
      const engine = await LuaEngineFactory.create(callbacks, options)

      await expect(
        engine.doString(`
          __setup_execution_hook()
          for i = 1, 100 do
            if i == 50 then
              __request_stop()
            end
            local x = i
          end
          __clear_execution_hook()
        `)
      ).rejects.toThrow('Execution stopped by user')

      engine.global.close()
    })

    it('should reset stop flag after stopping', async () => {
      const options: LuaEngineOptions = {
        instructionLimit: 1_000_000,
        instructionCheckInterval: 10,
      }
      const engine = await LuaEngineFactory.create(callbacks, options)

      // First execution - request stop
      try {
        await engine.doString(`
          __setup_execution_hook()
          for i = 1, 100 do
            if i == 10 then
              __request_stop()
            end
            local x = i
          end
          __clear_execution_hook()
        `)
      } catch {
        // Expected
      }

      // Second execution - should run without stopping
      // (stop flag should have been reset)
      const result = await engine.doString(`
        __setup_execution_hook()
        local count = 0
        for i = 1, 50 do
          count = count + 1
        end
        __clear_execution_hook()
        return count
      `)

      expect(result).toBe(50)

      engine.global.close()
    })

    it('should allow setting stop flag from JavaScript', async () => {
      const options: LuaEngineOptions = {
        instructionLimit: 1_000_000,
        instructionCheckInterval: 10,
      }
      const engine = await LuaEngineFactory.create(callbacks, options)

      // Set stop flag directly via Lua global
      await engine.doString('__stop_requested = true')

      await expect(
        engine.doString(`
          __setup_execution_hook()
          for i = 1, 1000 do
            local x = i
          end
          __clear_execution_hook()
        `)
      ).rejects.toThrow('Execution stopped by user')

      engine.global.close()
    })
  })
})
