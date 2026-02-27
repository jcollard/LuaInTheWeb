import { useState, useEffect, useRef, useCallback } from 'react'
import { LuaFactory, LuaEngine } from 'wasmoon'
import { getWasmUri } from '../wasmSetup'
import type { UseLuaEngineOptions, UseLuaEngineReturn } from './types'

/**
 * Convert module name to file path
 * "utils.math" -> "/utils/math.lua"
 */
function moduleNameToPath(moduleName: string): string {
  const path = '/' + moduleName.replace(/\./g, '/') + '.lua'
  return path
}

/**
 * Hook that provides a Lua execution environment
 */
export function useLuaEngine(options: UseLuaEngineOptions): UseLuaEngineReturn {
  const { onOutput, onError, onReadInput, onCleanup, fileReader } = options
  const [isReady, setIsReady] = useState(false)
  const engineRef = useRef<LuaEngine | null>(null)

  // Store callbacks in refs so they're always current when called from Lua
  const onCleanupRef = useRef(onCleanup)
  onCleanupRef.current = onCleanup

  const onOutputRef = useRef(onOutput)
  onOutputRef.current = onOutput

  const onReadInputRef = useRef(onReadInput)
  onReadInputRef.current = onReadInput

  const fileReaderRef = useRef(fileReader)
  fileReaderRef.current = fileReader

  const setupEngine = useCallback(async (lua: LuaEngine) => {
    // Override print to call onOutput - use ref to get current callback
    lua.global.set('print', (...args: unknown[]) => {
      const message = args.map(arg => String(arg)).join('\t')
      onOutputRef.current?.(message)
    })

    // Set up __js_read_input for io.read - use ref to get current callback
    lua.global.set('__js_read_input', async () => {
      if (onReadInputRef.current) {
        return await onReadInputRef.current()
      }
      return ''
    })

    // Set up __js_require for require() - only if fileReader is provided
    if (fileReaderRef.current) {
      lua.global.set('__js_require', (moduleName: string): string | null => {
        if (!fileReaderRef.current) return null

        // Try module.lua first
        const modulePath = moduleNameToPath(moduleName)
        let content = fileReaderRef.current(modulePath)

        // If not found, try module/init.lua
        if (content === null) {
          const initPath = '/' + moduleName.replace(/\./g, '/') + '/init.lua'
          content = fileReaderRef.current(initPath)
        }

        return content
      })

      // Set up require() override in Lua
      await lua.doString(`
        __loaded_modules = {}

        function require(modname)
          -- Check cache first
          if __loaded_modules[modname] ~= nil then
            return __loaded_modules[modname]
          end

          -- Get content from JavaScript
          local content = __js_require(modname)
          if content == nil then
            error("module '" .. modname .. "' not found")
          end

          -- Load and execute the module
          local fn, err = load(content, modname)
          if not fn then
            error("error loading module '" .. modname .. "': " .. (err or "unknown error"))
          end

          local result = fn()
          -- Cache the result (use true if module returns nil)
          __loaded_modules[modname] = result or true
          return __loaded_modules[modname]
        end
      `)
    }

    // Set up io table with write function via Lua code
    await lua.doString(`
      io = io or {}
      io.write = function(...)
        local args = {...}
        local output = ""
        for i, v in ipairs(args) do
          output = output .. tostring(v)
        end
        print(output)
      end
      io.read = function(format)
        local input = __js_read_input():await()
        if format == "*n" or format == "*number" then
          return tonumber(input)
        elseif format == "*a" or format == "*all" then
          return input
        else
          -- Default is "*l" or "*line"
          return input
        end
      end
    `)
  }, []) // No dependencies - uses refs for current callbacks

  useEffect(() => {
    let mounted = true

    const initEngine = async () => {
      const factory = new LuaFactory(getWasmUri())
      const lua = await factory.createEngine()

      if (!mounted) {
        lua.global.close()
        return
      }

      await setupEngine(lua)
      engineRef.current = lua
      setIsReady(true)
    }

    initEngine()

    return () => {
      mounted = false
      if (engineRef.current) {
        onCleanupRef.current?.()
        engineRef.current.global.close()
        engineRef.current = null
      }
    }
  }, [setupEngine])

  const execute = useCallback(async (code: string) => {
    if (!engineRef.current) return
    try {
      await engineRef.current.doString(code)
    } catch (error) {
      if (error instanceof Error) {
        onError?.(error.message)
      }
    }
  }, [onError])

  const reset = useCallback(async () => {
    if (!engineRef.current) return

    // Cleanup old engine
    onCleanup?.()
    engineRef.current.global.close()

    // Create new engine
    const factory = new LuaFactory()
    const lua = await factory.createEngine()
    await setupEngine(lua)
    engineRef.current = lua
  }, [onCleanup, setupEngine])

  return {
    isReady,
    execute,
    reset,
  }
}
