/**
 * Integration tests for localStorage API setup.
 * Tests that bridge functions are registered correctly in LuaEngineFactory
 * and that the deprecated setupLocalStorageAPI is a no-op.
 *
 * Note: These tests run in Node.js (not jsdom) because wasmoon requires
 * a real Node.js or browser environment, not jsdom.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupLocalStorageAPI } from '../src/setupLocalStorageAPI'
import { LuaEngineFactory, type LuaEngineCallbacks } from '../src/LuaEngineFactory'
import type { LuaEngine } from 'wasmoon'

// Create a mock Lua engine for testing the deprecated function
function createMockLuaEngine(): LuaEngine {
  const globals = new Map<string, unknown>()

  return {
    global: {
      set: vi.fn((name: string, value: unknown) => {
        globals.set(name, value)
      }),
      get: vi.fn((name: string) => globals.get(name)),
    },
    doStringSync: vi.fn(),
  } as unknown as LuaEngine
}

// Mock localStorage for Node.js environment
function createMockLocalStorage(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => {
      const keys = Array.from(store.keys())
      return keys[index] ?? null
    },
    get length() {
      return store.size
    },
  }
}

describe('setupLocalStorageAPI (deprecated)', () => {
  it('is a no-op and does not register any functions', () => {
    const mockEngine = createMockLuaEngine()

    setupLocalStorageAPI(mockEngine)

    // Should NOT call engine.global.set - function is now a no-op
    expect(mockEngine.global.set).not.toHaveBeenCalled()
  })

  it('does not execute Lua code', () => {
    const mockEngine = createMockLuaEngine()

    setupLocalStorageAPI(mockEngine)

    // Should NOT call doStringSync - function is now a no-op
    expect(mockEngine.doStringSync).not.toHaveBeenCalled()
  })
})

describe('localStorage bridge functions (via LuaEngineFactory)', () => {
  let engine: LuaEngine | null = null
  let mockStorage: Storage
  let originalLocalStorage: Storage | undefined

  const createTestCallbacks = (): LuaEngineCallbacks => ({
    onOutput: vi.fn(),
    onError: vi.fn(),
  })

  beforeEach(() => {
    // Save original localStorage (if exists in Node.js)
    originalLocalStorage = (global as unknown as { localStorage?: Storage }).localStorage

    // Create and set mock localStorage
    mockStorage = createMockLocalStorage()
    ;(global as unknown as { localStorage: Storage }).localStorage = mockStorage
  })

  afterEach(() => {
    vi.clearAllMocks()

    // Restore original localStorage
    if (originalLocalStorage !== undefined) {
      ;(global as unknown as { localStorage: Storage }).localStorage = originalLocalStorage
    } else {
      delete (global as unknown as { localStorage?: Storage }).localStorage
    }

    // Clean up engine
    if (engine) {
      LuaEngineFactory.close(engine)
      engine = null
    }
  })

  it('registers all localStorage global functions', async () => {
    engine = await LuaEngineFactory.create(createTestCallbacks())

    // Verify all bridge functions are registered
    const getItem = engine.global.get('__localstorage_getItem')
    const setItem = engine.global.get('__localstorage_setItem')
    const removeItem = engine.global.get('__localstorage_removeItem')
    const clear = engine.global.get('__localstorage_clear')
    const clearWithPrefix = engine.global.get('__localstorage_clearWithPrefix')
    const getRemainingSpace = engine.global.get('__localstorage_getRemainingSpace')

    expect(typeof getItem).toBe('function')
    expect(typeof setItem).toBe('function')
    expect(typeof removeItem).toBe('function')
    expect(typeof clear).toBe('function')
    expect(typeof clearWithPrefix).toBe('function')
    expect(typeof getRemainingSpace).toBe('function')
  })

  describe('__localstorage_getItem', () => {
    it('returns value for existing key', async () => {
      mockStorage.setItem('testKey', 'testValue')
      engine = await LuaEngineFactory.create(createTestCallbacks())

      const getItem = engine.global.get('__localstorage_getItem') as (key: string) => string | null

      expect(getItem('testKey')).toBe('testValue')
    })

    it('returns nil for non-existent key (called from Lua)', async () => {
      engine = await LuaEngineFactory.create(createTestCallbacks())

      // Call from Lua to test the real use case
      // The bridge function returns null which Lua sees as nil
      const result = await engine.doString(`
        local result = __localstorage_getItem('nonExistent')
        return result == nil
      `)

      expect(result).toBe(true)
    })

    it('returns nil when localStorage is undefined (called from Lua)', async () => {
      // Create engine first with working localStorage
      engine = await LuaEngineFactory.create(createTestCallbacks())

      // Temporarily remove localStorage
      delete (global as unknown as { localStorage?: Storage }).localStorage

      // Call from Lua to test the real use case
      const result = await engine.doString(`
        local result = __localstorage_getItem('testKey')
        return result == nil
      `)

      expect(result).toBe(true)

      // Restore for cleanup
      ;(global as unknown as { localStorage: Storage }).localStorage = mockStorage
    })
  })

  describe('__localstorage_setItem', () => {
    it('stores value and returns success', async () => {
      engine = await LuaEngineFactory.create(createTestCallbacks())

      // Note: Return type uses undefined (not null) for wasmoon compatibility
      const setItem = engine.global.get('__localstorage_setItem') as (
        key: string,
        value: string
      ) => [boolean, string | undefined]

      const [success, error] = setItem('testKey', 'testValue')

      expect(success).toBe(true)
      expect(error).toBeUndefined()
      expect(mockStorage.getItem('testKey')).toBe('testValue')
    })

    it('overwrites existing value', async () => {
      mockStorage.setItem('testKey', 'oldValue')
      engine = await LuaEngineFactory.create(createTestCallbacks())

      const setItem = engine.global.get('__localstorage_setItem') as (
        key: string,
        value: string
      ) => [boolean, string | undefined]

      const [success] = setItem('testKey', 'newValue')

      expect(success).toBe(true)
      expect(mockStorage.getItem('testKey')).toBe('newValue')
    })

    it('returns error when localStorage is undefined', async () => {
      // Create engine first with working localStorage
      engine = await LuaEngineFactory.create(createTestCallbacks())
      const setItem = engine.global.get('__localstorage_setItem') as (
        key: string,
        value: string
      ) => [boolean, string | null]

      // Temporarily remove localStorage
      delete (global as unknown as { localStorage?: Storage }).localStorage

      const [success, error] = setItem('testKey', 'testValue')

      expect(success).toBe(false)
      expect(error).toBe('localStorage not available')

      // Restore for cleanup
      ;(global as unknown as { localStorage: Storage }).localStorage = mockStorage
    })

    it('returns quota exceeded error on QuotaExceededError', async () => {
      engine = await LuaEngineFactory.create(createTestCallbacks())
      const setItem = engine.global.get('__localstorage_setItem') as (
        key: string,
        value: string
      ) => [boolean, string | null]

      // Create a mock storage that throws on setItem
      const throwingStorage = {
        ...mockStorage,
        setItem: () => {
          const quotaError = new Error('Storage is full')
          quotaError.name = 'QuotaExceededError'
          throw quotaError
        },
      }
      ;(global as unknown as { localStorage: Storage }).localStorage = throwingStorage as Storage

      const [success, error] = setItem('testKey', 'testValue')

      expect(success).toBe(false)
      expect(error).toBe('Storage quota exceeded')
    })

    it('returns quota exceeded error when message contains quota', async () => {
      engine = await LuaEngineFactory.create(createTestCallbacks())
      const setItem = engine.global.get('__localstorage_setItem') as (
        key: string,
        value: string
      ) => [boolean, string | null]

      const throwingStorage = {
        ...mockStorage,
        setItem: () => {
          throw new Error('The quota has been exceeded')
        },
      }
      ;(global as unknown as { localStorage: Storage }).localStorage = throwingStorage as Storage

      const [success, error] = setItem('testKey', 'testValue')

      expect(success).toBe(false)
      expect(error).toBe('Storage quota exceeded')
    })

    it('returns generic error message for other errors', async () => {
      engine = await LuaEngineFactory.create(createTestCallbacks())
      const setItem = engine.global.get('__localstorage_setItem') as (
        key: string,
        value: string
      ) => [boolean, string | null]

      const throwingStorage = {
        ...mockStorage,
        setItem: () => {
          throw new Error('Some other error')
        },
      }
      ;(global as unknown as { localStorage: Storage }).localStorage = throwingStorage as Storage

      const [success, error] = setItem('testKey', 'testValue')

      expect(success).toBe(false)
      expect(error).toBe('Some other error')
    })

    it('handles non-Error throws', async () => {
      engine = await LuaEngineFactory.create(createTestCallbacks())
      const setItem = engine.global.get('__localstorage_setItem') as (
        key: string,
        value: string
      ) => [boolean, string | null]

      const throwingStorage = {
        ...mockStorage,
        setItem: () => {
          throw 'string error'
        },
      }
      ;(global as unknown as { localStorage: Storage }).localStorage = throwingStorage as Storage

      const [success, error] = setItem('testKey', 'testValue')

      expect(success).toBe(false)
      expect(error).toBe('Unknown error')
    })
  })

  describe('__localstorage_removeItem', () => {
    it('removes existing item', async () => {
      mockStorage.setItem('testKey', 'testValue')
      engine = await LuaEngineFactory.create(createTestCallbacks())

      const removeItem = engine.global.get('__localstorage_removeItem') as (key: string) => void

      removeItem('testKey')

      expect(mockStorage.getItem('testKey')).toBeNull()
    })

    it('does nothing for non-existent key', async () => {
      engine = await LuaEngineFactory.create(createTestCallbacks())

      const removeItem = engine.global.get('__localstorage_removeItem') as (key: string) => void

      // Should not throw
      expect(() => removeItem('nonExistent')).not.toThrow()
    })

    it('handles localStorage undefined silently', async () => {
      engine = await LuaEngineFactory.create(createTestCallbacks())
      const removeItem = engine.global.get('__localstorage_removeItem') as (key: string) => void

      // Temporarily remove localStorage
      delete (global as unknown as { localStorage?: Storage }).localStorage

      // Should not throw
      expect(() => removeItem('testKey')).not.toThrow()

      // Restore for cleanup
      ;(global as unknown as { localStorage: Storage }).localStorage = mockStorage
    })

    it('handles errors silently', async () => {
      engine = await LuaEngineFactory.create(createTestCallbacks())
      const removeItem = engine.global.get('__localstorage_removeItem') as (key: string) => void

      const throwingStorage = {
        ...mockStorage,
        removeItem: () => {
          throw new Error('Access denied')
        },
      }
      ;(global as unknown as { localStorage: Storage }).localStorage = throwingStorage as Storage

      // Should not throw
      expect(() => removeItem('testKey')).not.toThrow()
    })
  })

  describe('__localstorage_clear', () => {
    it('clears all items', async () => {
      mockStorage.setItem('key1', 'value1')
      mockStorage.setItem('key2', 'value2')
      engine = await LuaEngineFactory.create(createTestCallbacks())

      const clear = engine.global.get('__localstorage_clear') as () => void

      clear()

      expect(mockStorage.length).toBe(0)
    })

    it('handles localStorage undefined silently', async () => {
      engine = await LuaEngineFactory.create(createTestCallbacks())
      const clear = engine.global.get('__localstorage_clear') as () => void

      // Temporarily remove localStorage
      delete (global as unknown as { localStorage?: Storage }).localStorage

      expect(() => clear()).not.toThrow()

      // Restore for cleanup
      ;(global as unknown as { localStorage: Storage }).localStorage = mockStorage
    })

    it('handles errors silently', async () => {
      engine = await LuaEngineFactory.create(createTestCallbacks())
      const clear = engine.global.get('__localstorage_clear') as () => void

      const throwingStorage = {
        ...mockStorage,
        clear: () => {
          throw new Error('Access denied')
        },
      }
      ;(global as unknown as { localStorage: Storage }).localStorage = throwingStorage as Storage

      expect(() => clear()).not.toThrow()
    })
  })

  describe('__localstorage_getRemainingSpace', () => {
    it('returns positive number for empty storage', async () => {
      engine = await LuaEngineFactory.create(createTestCallbacks())

      const getRemainingSpace = engine.global.get('__localstorage_getRemainingSpace') as () => number

      const space = getRemainingSpace()

      // Should return approximately 5MB (5 * 1024 * 1024)
      expect(space).toBe(5 * 1024 * 1024)
    })

    it('returns reduced space when items stored', async () => {
      // Store a 100-character key and 100-character value
      // = 200 characters * 2 bytes = 400 bytes used
      mockStorage.setItem('a'.repeat(100), 'b'.repeat(100))
      engine = await LuaEngineFactory.create(createTestCallbacks())

      const getRemainingSpace = engine.global.get('__localstorage_getRemainingSpace') as () => number

      const space = getRemainingSpace()

      // Should be 5MB - 400 bytes
      expect(space).toBe(5 * 1024 * 1024 - 400)
    })

    it('returns 0 when localStorage is undefined', async () => {
      engine = await LuaEngineFactory.create(createTestCallbacks())
      const getRemainingSpace = engine.global.get('__localstorage_getRemainingSpace') as () => number

      // Temporarily remove localStorage
      delete (global as unknown as { localStorage?: Storage }).localStorage

      expect(getRemainingSpace()).toBe(0)

      // Restore for cleanup
      ;(global as unknown as { localStorage: Storage }).localStorage = mockStorage
    })

    it('returns 0 on error', async () => {
      engine = await LuaEngineFactory.create(createTestCallbacks())
      const getRemainingSpace = engine.global.get('__localstorage_getRemainingSpace') as () => number

      // Create a mock storage that throws on length access
      const throwingStorage = {
        get length(): number {
          throw new Error('Access denied')
        },
        getItem: mockStorage.getItem,
        setItem: mockStorage.setItem,
        removeItem: mockStorage.removeItem,
        clear: mockStorage.clear,
        key: mockStorage.key,
      }
      ;(global as unknown as { localStorage: Storage }).localStorage = throwingStorage as Storage

      expect(getRemainingSpace()).toBe(0)
    })

    it('handles null values in storage', async () => {
      mockStorage.setItem('testKey', 'testValue')
      engine = await LuaEngineFactory.create(createTestCallbacks())

      // Replace getItem to return null
      const modifiedStorage = {
        ...mockStorage,
        getItem: () => null,
      }
      ;(global as unknown as { localStorage: Storage }).localStorage = modifiedStorage as Storage

      const getRemainingSpace = engine.global.get('__localstorage_getRemainingSpace') as () => number

      // Should still work without errors
      expect(getRemainingSpace()).toBeGreaterThan(0)
    })
  })

  describe('__localstorage_clearWithPrefix', () => {
    it('removes only keys with the specified prefix', async () => {
      mockStorage.setItem('myapp_score', '100')
      mockStorage.setItem('myapp_name', 'Player')
      mockStorage.setItem('other_data', 'value')
      mockStorage.setItem('unrelated', 'data')
      engine = await LuaEngineFactory.create(createTestCallbacks())

      const clearWithPrefix = engine.global.get('__localstorage_clearWithPrefix') as (
        prefix: string
      ) => void

      clearWithPrefix('myapp_')

      // Only prefixed keys should be removed
      expect(mockStorage.getItem('myapp_score')).toBeNull()
      expect(mockStorage.getItem('myapp_name')).toBeNull()
      expect(mockStorage.getItem('other_data')).toBe('value')
      expect(mockStorage.getItem('unrelated')).toBe('data')
    })

    it('does nothing when no keys match prefix', async () => {
      mockStorage.setItem('other_key', 'value')
      engine = await LuaEngineFactory.create(createTestCallbacks())

      const clearWithPrefix = engine.global.get('__localstorage_clearWithPrefix') as (
        prefix: string
      ) => void

      clearWithPrefix('myapp_')

      expect(mockStorage.getItem('other_key')).toBe('value')
    })

    it('handles localStorage undefined silently', async () => {
      engine = await LuaEngineFactory.create(createTestCallbacks())
      const clearWithPrefix = engine.global.get('__localstorage_clearWithPrefix') as (
        prefix: string
      ) => void

      delete (global as unknown as { localStorage?: Storage }).localStorage

      expect(() => clearWithPrefix('myapp_')).not.toThrow()

      ;(global as unknown as { localStorage: Storage }).localStorage = mockStorage
    })

    it('handles errors silently', async () => {
      engine = await LuaEngineFactory.create(createTestCallbacks())
      const clearWithPrefix = engine.global.get('__localstorage_clearWithPrefix') as (
        prefix: string
      ) => void

      const throwingStorage = {
        ...mockStorage,
        key: () => {
          throw new Error('Access denied')
        },
      }
      ;(global as unknown as { localStorage: Storage }).localStorage = throwingStorage as Storage

      expect(() => clearWithPrefix('myapp_')).not.toThrow()
    })
  })

  describe('localstorage Lua library prefix functionality', () => {
    it('set_prefix sets the prefix for subsequent operations', async () => {
      engine = await LuaEngineFactory.create(createTestCallbacks())

      await engine.doString(`
        local ls = require('localstorage')
        ls.set_prefix("game_")
        ls.set_item("score", "100")
      `)

      // Key should be stored with prefix
      expect(mockStorage.getItem('game_score')).toBe('100')
    })

    it('get_item uses prefix', async () => {
      mockStorage.setItem('game_score', '200')
      engine = await LuaEngineFactory.create(createTestCallbacks())

      const result = await engine.doString(`
        local ls = require('localstorage')
        ls.set_prefix("game_")
        return ls.get_item("score")
      `)

      expect(result).toBe('200')
    })

    it('remove_item uses prefix', async () => {
      mockStorage.setItem('game_data', 'test')
      mockStorage.setItem('other_data', 'keep')
      engine = await LuaEngineFactory.create(createTestCallbacks())

      await engine.doString(`
        local ls = require('localstorage')
        ls.set_prefix("game_")
        ls.remove_item("data")
      `)

      expect(mockStorage.getItem('game_data')).toBeNull()
      expect(mockStorage.getItem('other_data')).toBe('keep')
    })

    it('clear() only removes prefixed keys when prefix is set', async () => {
      mockStorage.setItem('game_score', '100')
      mockStorage.setItem('game_name', 'Player')
      mockStorage.setItem('other_app_data', 'keep')
      engine = await LuaEngineFactory.create(createTestCallbacks())

      await engine.doString(`
        local ls = require('localstorage')
        ls.set_prefix("game_")
        ls.clear()
      `)

      expect(mockStorage.getItem('game_score')).toBeNull()
      expect(mockStorage.getItem('game_name')).toBeNull()
      expect(mockStorage.getItem('other_app_data')).toBe('keep')
    })

    it('clear() clears all when no prefix is set', async () => {
      mockStorage.setItem('key1', 'value1')
      mockStorage.setItem('key2', 'value2')
      engine = await LuaEngineFactory.create(createTestCallbacks())

      await engine.doString(`
        local ls = require('localstorage')
        ls.clear()
      `)

      expect(mockStorage.length).toBe(0)
    })

    it('clear_all() clears all keys regardless of prefix', async () => {
      mockStorage.setItem('game_score', '100')
      mockStorage.setItem('other_data', 'value')
      engine = await LuaEngineFactory.create(createTestCallbacks())

      await engine.doString(`
        local ls = require('localstorage')
        ls.set_prefix("game_")
        ls.clear_all()
      `)

      expect(mockStorage.length).toBe(0)
    })

    it('operations work correctly without prefix', async () => {
      engine = await LuaEngineFactory.create(createTestCallbacks())

      await engine.doString(`
        local ls = require('localstorage')
        ls.set_item("key", "value")
      `)

      expect(mockStorage.getItem('key')).toBe('value')
    })

    it('prefix can be changed mid-session', async () => {
      engine = await LuaEngineFactory.create(createTestCallbacks())

      await engine.doString(`
        local ls = require('localstorage')
        ls.set_prefix("app1_")
        ls.set_item("data", "from_app1")
        ls.set_prefix("app2_")
        ls.set_item("data", "from_app2")
      `)

      expect(mockStorage.getItem('app1_data')).toBe('from_app1')
      expect(mockStorage.getItem('app2_data')).toBe('from_app2')
    })

    it('prefix can be cleared by setting empty string', async () => {
      engine = await LuaEngineFactory.create(createTestCallbacks())

      await engine.doString(`
        local ls = require('localstorage')
        ls.set_prefix("game_")
        ls.set_item("key1", "value1")
        ls.set_prefix("")
        ls.set_item("key2", "value2")
      `)

      expect(mockStorage.getItem('game_key1')).toBe('value1')
      expect(mockStorage.getItem('key2')).toBe('value2')
    })
  })
})
