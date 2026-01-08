/**
 * Tests for hot reload table value preservation.
 * Issue #550: Non-function table values should be preserved during hot reload.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { LuaFactory, LuaEngine } from 'wasmoon'

describe('Hot Reload - Table Value Preservation', () => {
  let engine: LuaEngine
  let fileContents: Map<string, string>

  beforeEach(async () => {
    const factory = new LuaFactory()
    engine = await factory.createEngine()
    fileContents = new Map()

    // Set up the mock file system accessor
    engine.global.set('__test_get_file_content', (name: string) => {
      return fileContents.get(name) ?? null
    })

    // Set up minimal require infrastructure that mimics the real implementation
    // This sets up __loaded_modules and a require() that uses our mock file system
    await engine.doString(`
      __loaded_modules = {}
      package.loaded = package.loaded or {}

      -- Override require to use our mock file system
      function require(modname)
        -- Check cache first
        if __loaded_modules[modname] ~= nil then
          return __loaded_modules[modname].module
        end

        -- Get content from mock file system
        local content = __test_get_file_content(modname .. ".lua")
        if not content then
          error("module '" .. modname .. "' not found")
        end

        -- Load and execute the module
        local fn, err = load(content, modname)
        if not fn then
          error("error loading module '" .. modname .. "': " .. (err or "unknown error"))
        end

        local ok, result = pcall(fn)
        if not ok then
          error("error running module '" .. modname .. "': " .. tostring(result))
        end

        -- Cache the result
        __loaded_modules[modname] = {
          module = result or true,
          filepath = modname .. ".lua"
        }
        return __loaded_modules[modname].module
      end
    `)

    // Execute only the __hot_reload function from the canvas core code
    // We extract just the hot reload function to test it in isolation
    await engine.doString(`
      -- Hot reload support
      function __hot_reload(module_name)
        local entry = __loaded_modules[module_name]
        local old = entry and entry.module

        -- Clear from both caches to force re-loading
        __loaded_modules[module_name] = nil
        package.loaded[module_name] = nil

        -- Re-require the module (will re-execute the file)
        local new = require(module_name)

        -- If both old and new are tables, patch functions from new into old
        -- This preserves table identity so existing references see updated functions
        if type(old) == 'table' and type(new) == 'table' then
          -- Update functions and add new non-function fields to the old table
          for key, value in pairs(new) do
            if type(value) == 'function' then
              old[key] = value  -- Always update functions
            elseif old[key] == nil then
              old[key] = value  -- Add new non-function fields only
            end
            -- Else: preserve existing runtime value
          end

          -- Re-cache the OLD table (with updated functions) to preserve identity
          local newEntry = __loaded_modules[module_name]
          newEntry.module = old
          package.loaded[module_name] = old
          return old
        end

        -- If types don't match or not tables, return the new value
        return new
      end
    `)
  })

  afterEach(() => {
    engine.global.close()
  })

  describe('__hot_reload preserves runtime state', () => {
    it('should preserve existing runtime table values after reload', async () => {
      // Initial module: M.score starts at 0
      fileContents.set('game.lua', `
        local M = {}
        M.score = 0
        M.update = function() M.score = M.score + 1 end
        return M
      `)

      // Load the module
      await engine.doString(`game = require("game")`)

      // Modify runtime state: score becomes 100
      await engine.doString(`game.score = 100`)

      // Verify runtime state
      const scoreBefore = await engine.doString('return game.score')
      expect(scoreBefore).toBe(100)

      // Simulate file change: update function changes but M.score default is still 0
      fileContents.set('game.lua', `
        local M = {}
        M.score = 0
        M.update = function() M.score = M.score + 10 end
        return M
      `)

      // Hot reload the module
      await engine.doString(`__hot_reload("game")`)

      // Runtime state (score = 100) should be PRESERVED
      const scoreAfter = await engine.doString('return game.score')
      expect(scoreAfter).toBe(100)
    })

    it('should add new non-function fields from new module code', async () => {
      // Initial module: only has score
      fileContents.set('game.lua', `
        local M = {}
        M.score = 0
        M.get_score = function() return M.score end
        return M
      `)

      // Load the module
      await engine.doString(`game = require("game")`)

      // Verify initial state: lives doesn't exist
      const livesBefore = await engine.doString('return game.lives')
      expect(livesBefore).toBeNull()

      // Update module: add new field "lives"
      fileContents.set('game.lua', `
        local M = {}
        M.score = 0
        M.lives = 3
        M.get_score = function() return M.score end
        return M
      `)

      // Hot reload
      await engine.doString(`__hot_reload("game")`)

      // New field "lives" should be added
      const livesAfter = await engine.doString('return game.lives')
      expect(livesAfter).toBe(3)
    })

    it('should still update functions after reload', async () => {
      // Initial module: get_value returns 1
      fileContents.set('utils.lua', `
        local M = {}
        M.counter = 0
        M.get_value = function() return 1 end
        return M
      `)

      // Load the module
      await engine.doString(`utils = require("utils")`)

      // Verify initial function returns 1
      const valueBefore = await engine.doString('return utils.get_value()')
      expect(valueBefore).toBe(1)

      // Update module: get_value now returns 42
      fileContents.set('utils.lua', `
        local M = {}
        M.counter = 0
        M.get_value = function() return 42 end
        return M
      `)

      // Hot reload
      await engine.doString(`__hot_reload("utils")`)

      // Function should be updated
      const valueAfter = await engine.doString('return utils.get_value()')
      expect(valueAfter).toBe(42)
    })

    it('should preserve table identity so existing references work', async () => {
      fileContents.set('state.lua', `
        local M = {}
        M.value = 0
        M.increment = function() M.value = M.value + 1 end
        return M
      `)

      // Load module and store reference
      await engine.doString(`
        state = require("state")
        local_ref = state
      `)

      // Modify via local reference
      await engine.doString(`local_ref.value = 50`)

      // Update module with new function
      fileContents.set('state.lua', `
        local M = {}
        M.value = 0
        M.increment = function() M.value = M.value + 5 end
        return M
      `)

      // Hot reload
      await engine.doString(`__hot_reload("state")`)

      // Both references should point to same table with preserved value
      const stateValue = await engine.doString('return state.value')
      const refValue = await engine.doString('return local_ref.value')
      expect(stateValue).toBe(50)
      expect(refValue).toBe(50)

      // And they should be the same table
      const sameTable = await engine.doString('return state == local_ref')
      expect(sameTable).toBe(true)
    })
  })
})
