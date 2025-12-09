import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupLuaFormatter, formatLuaValue, LUA_FORMATTER_CODE } from './formatValue'

// Mock wasmoon - WASM doesn't load properly in test environment
const { mockDoString, mockGlobalSet, mockLuaEngine } = vi.hoisted(() => {
  const mockDoString = vi.fn()
  const mockGlobalSet = vi.fn()
  const mockLuaEngine = {
    doString: mockDoString,
    global: {
      set: mockGlobalSet,
    },
  }
  return { mockDoString, mockGlobalSet, mockLuaEngine }
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

  describe('formatLuaValue - primitive types', () => {
    it('should format null as "nil"', async () => {
      // Arrange
      const lua = mockLuaEngine as unknown as import('wasmoon').LuaEngine

      // Act
      const result = await formatLuaValue(lua, null)

      // Assert
      expect(result).toBe('nil')
    })

    it('should format undefined as "nil"', async () => {
      // Arrange
      const lua = mockLuaEngine as unknown as import('wasmoon').LuaEngine

      // Act
      const result = await formatLuaValue(lua, undefined)

      // Assert
      expect(result).toBe('nil')
    })

    it('should format boolean true', async () => {
      // Arrange
      const lua = mockLuaEngine as unknown as import('wasmoon').LuaEngine

      // Act
      const result = await formatLuaValue(lua, true)

      // Assert
      expect(result).toBe('true')
    })

    it('should format boolean false', async () => {
      // Arrange
      const lua = mockLuaEngine as unknown as import('wasmoon').LuaEngine

      // Act
      const result = await formatLuaValue(lua, false)

      // Assert
      expect(result).toBe('false')
    })

    it('should format integer numbers', async () => {
      // Arrange
      const lua = mockLuaEngine as unknown as import('wasmoon').LuaEngine

      // Act
      const result = await formatLuaValue(lua, 42)

      // Assert
      expect(result).toBe('42')
    })

    it('should format floating point numbers', async () => {
      // Arrange
      const lua = mockLuaEngine as unknown as import('wasmoon').LuaEngine

      // Act
      const result = await formatLuaValue(lua, 3.14159)

      // Assert
      expect(result).toBe('3.14159')
    })

    it('should format strings with quotes', async () => {
      // Arrange
      const lua = mockLuaEngine as unknown as import('wasmoon').LuaEngine

      // Act
      const result = await formatLuaValue(lua, 'hello')

      // Assert
      expect(result).toBe('"hello"')
    })

    it('should format empty strings with quotes', async () => {
      // Arrange
      const lua = mockLuaEngine as unknown as import('wasmoon').LuaEngine

      // Act
      const result = await formatLuaValue(lua, '')

      // Assert
      expect(result).toBe('""')
    })
  })

  describe('formatLuaValue - complex types (via Lua formatter)', () => {
    it('should use Lua formatter for function values', async () => {
      // Arrange
      const lua = mockLuaEngine as unknown as import('wasmoon').LuaEngine
      const mockFunction = () => {}
      mockDoString.mockResolvedValueOnce('function() [string "..."]:1]')

      // Act
      const result = await formatLuaValue(lua, mockFunction)

      // Assert
      expect(mockGlobalSet).toHaveBeenCalledWith('__temp_value', mockFunction)
      expect(mockDoString).toHaveBeenCalledWith('return __format_value(__temp_value)')
      expect(result).toBe('function() [string "..."]:1]')
    })

    it('should use Lua formatter for table/object values', async () => {
      // Arrange
      const lua = mockLuaEngine as unknown as import('wasmoon').LuaEngine
      const mockTable = { a: 1, b: 2 }
      mockDoString.mockResolvedValueOnce('{a = 1, b = 2}')

      // Act
      const result = await formatLuaValue(lua, mockTable)

      // Assert
      expect(mockGlobalSet).toHaveBeenCalledWith('__temp_value', mockTable)
      expect(mockDoString).toHaveBeenCalledWith('return __format_value(__temp_value)')
      expect(result).toBe('{a = 1, b = 2}')
    })

    it('should use Lua formatter for array values', async () => {
      // Arrange
      const lua = mockLuaEngine as unknown as import('wasmoon').LuaEngine
      const mockArray = [1, 2, 3]
      mockDoString.mockResolvedValueOnce('{1, 2, 3}')

      // Act
      const result = await formatLuaValue(lua, mockArray)

      // Assert
      expect(mockGlobalSet).toHaveBeenCalledWith('__temp_value', mockArray)
      expect(mockDoString).toHaveBeenCalledWith('return __format_value(__temp_value)')
      expect(result).toBe('{1, 2, 3}')
    })

    it('should clear __temp_value after formatting', async () => {
      // Arrange
      const lua = mockLuaEngine as unknown as import('wasmoon').LuaEngine
      const mockTable = { key: 'value' }
      mockDoString.mockResolvedValueOnce('{key = "value"}')

      // Act
      await formatLuaValue(lua, mockTable)

      // Assert - verify temp value is cleared
      const setCalls = mockGlobalSet.mock.calls
      expect(setCalls[setCalls.length - 1]).toEqual(['__temp_value', null])
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
