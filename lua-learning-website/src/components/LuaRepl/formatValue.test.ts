import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupLuaFormatter, LUA_FORMATTER_CODE } from './formatValue'

// Mock wasmoon - WASM doesn't load properly in test environment
const { mockDoString, mockLuaEngine } = vi.hoisted(() => {
  const mockDoString = vi.fn()
  const mockLuaEngine = {
    doString: mockDoString,
    global: {
      set: vi.fn(),
    },
  }
  return { mockDoString, mockLuaEngine }
})

vi.mock('wasmoon', () => {
  return {
    LuaFactory: class {
      async createEngine() {
        return mockLuaEngine
      }
    },
    LuaEngine: class {},
  }
})

describe('formatValue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('setupLuaFormatter', () => {
    it('should inject the Lua formatter code into the engine', async () => {
      // Arrange
      const lua = mockLuaEngine as unknown as import('wasmoon').LuaEngine

      // Act
      await setupLuaFormatter(lua)

      // Assert
      expect(mockDoString).toHaveBeenCalledWith(LUA_FORMATTER_CODE)
    })
  })

  describe('LUA_FORMATTER_CODE content', () => {
    it('should define __format_value function', () => {
      expect(LUA_FORMATTER_CODE).toContain('function __format_value(v, seen, depth)')
    })

    it('should handle nil values', () => {
      expect(LUA_FORMATTER_CODE).toContain('if v == nil then')
      expect(LUA_FORMATTER_CODE).toContain('return "nil"')
    })

    it('should handle boolean values', () => {
      expect(LUA_FORMATTER_CODE).toContain('if t == "boolean" then')
    })

    it('should handle number values', () => {
      expect(LUA_FORMATTER_CODE).toContain('if t == "number" then')
    })

    it('should handle string values with quotes', () => {
      expect(LUA_FORMATTER_CODE).toContain('if t == "string" then')
      expect(LUA_FORMATTER_CODE).toContain('string.format("%q", v)')
    })

    it('should handle function values with debug.getinfo', () => {
      expect(LUA_FORMATTER_CODE).toContain('if t == "function" then')
      expect(LUA_FORMATTER_CODE).toContain('debug.getinfo(v, "Su")')
    })

    it('should detect C functions', () => {
      expect(LUA_FORMATTER_CODE).toContain('if info.what == "C" then')
      expect(LUA_FORMATTER_CODE).toContain('return "function: [C]"')
    })

    it('should format Lua functions with parameters', () => {
      expect(LUA_FORMATTER_CODE).toContain('info.nparams')
      expect(LUA_FORMATTER_CODE).toContain('"arg" .. i')
    })

    it('should handle variadic functions', () => {
      expect(LUA_FORMATTER_CODE).toContain('info.isvararg')
      expect(LUA_FORMATTER_CODE).toContain('"..."')
    })

    it('should handle thread (coroutine) values', () => {
      expect(LUA_FORMATTER_CODE).toContain('if t == "thread" then')
      expect(LUA_FORMATTER_CODE).toContain('"thread: "')
    })

    it('should handle userdata values', () => {
      expect(LUA_FORMATTER_CODE).toContain('if t == "userdata" then')
      expect(LUA_FORMATTER_CODE).toContain('"userdata: "')
    })

    it('should handle table values', () => {
      expect(LUA_FORMATTER_CODE).toContain('if t == "table" then')
    })

    it('should respect custom __tostring metamethod', () => {
      expect(LUA_FORMATTER_CODE).toContain('mt and mt.__tostring')
      expect(LUA_FORMATTER_CODE).toContain('return tostring(v)')
    })

    it('should detect circular references', () => {
      expect(LUA_FORMATTER_CODE).toContain('if seen[v] then')
      expect(LUA_FORMATTER_CODE).toContain('<circular ref>')
    })

    it('should limit recursion depth', () => {
      expect(LUA_FORMATTER_CODE).toContain('maxDepth')
      expect(LUA_FORMATTER_CODE).toContain('if depth >= maxDepth then')
      expect(LUA_FORMATTER_CODE).toContain('return "{...}"')
    })

    it('should limit number of items displayed', () => {
      expect(LUA_FORMATTER_CODE).toContain('maxItems')
      expect(LUA_FORMATTER_CODE).toContain('if count >= maxItems then')
    })

    it('should handle array-like tables', () => {
      expect(LUA_FORMATTER_CODE).toContain('isArray')
    })

    it('should handle key-value tables', () => {
      expect(LUA_FORMATTER_CODE).toContain('keyStr .. " = "')
    })
  })
})
