import { useState, useEffect, useRef, useCallback } from 'react'
import { LuaFactory, LuaEngine } from 'wasmoon'
import type { UseLuaEngineOptions, UseLuaEngineReturn } from './types'

/**
 * Hook that provides a Lua execution environment
 */
export function useLuaEngine(options: UseLuaEngineOptions): UseLuaEngineReturn {
  const { onOutput, onError, onReadInput, onCleanup } = options
  const [isReady, setIsReady] = useState(false)
  const engineRef = useRef<LuaEngine | null>(null)

  // Store callbacks in refs so they're always current when called from Lua
  const onCleanupRef = useRef(onCleanup)
  onCleanupRef.current = onCleanup

  const onOutputRef = useRef(onOutput)
  onOutputRef.current = onOutput

  const onReadInputRef = useRef(onReadInput)
  onReadInputRef.current = onReadInput

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
      const factory = new LuaFactory()
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
