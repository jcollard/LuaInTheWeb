/**
 * Factory for creating and managing Lua engines with standard callbacks.
 * Provides consistent engine setup for REPL and script execution.
 */

import { LuaFactory, type LuaEngine } from 'wasmoon'

/**
 * Callbacks for Lua engine output and input.
 */
export interface LuaEngineCallbacks {
  /** Called when Lua produces output (print, io.write) */
  onOutput: (text: string) => void
  /** Called when Lua produces an error */
  onError: (text: string) => void
  /** Called when Lua needs input (io.read) - optional */
  onReadInput?: () => Promise<string>
}

/**
 * Lua code that defines the __format_value function.
 * Formats Lua values into readable string representations.
 */
const LUA_FORMATTER_CODE = `
-- Format a Lua value into a human-readable string
-- Options: maxDepth (default 3), maxItems (default 5)
function __format_value(v, seen, depth)
  seen = seen or {}
  depth = depth or 0
  local maxDepth = 3
  local maxItems = 5

  local t = type(v)

  -- Handle nil
  if v == nil then
    return "nil"
  end

  -- Handle booleans
  if t == "boolean" then
    return tostring(v)
  end

  -- Handle numbers
  if t == "number" then
    return tostring(v)
  end

  -- Handle strings (with quotes)
  if t == "string" then
    return string.format("%q", v)
  end

  -- Handle functions
  if t == "function" then
    local info = debug.getinfo(v, "Su")
    if info.what == "C" then
      return "function: [C]"
    else
      -- Build parameter list
      local params = {}
      for i = 1, info.nparams do
        table.insert(params, "arg" .. i)
      end
      if info.isvararg then
        table.insert(params, "...")
      end
      local paramStr = table.concat(params, ", ")

      -- Format source location - truncate multi-line sources
      local source = info.source or "?"
      local line = info.linedefined or 0

      -- If source contains newlines or is too long, use abbreviated form
      if source:find("\\n") or #source > 40 then
        source = '[string "..."]'
      end

      return string.format("function(%s) [%s:%d]", paramStr, source, line)
    end
  end

  -- Handle threads (coroutines)
  if t == "thread" then
    local threadId = tostring(v):match("thread: (.+)")
    return "thread: " .. (threadId or tostring(v))
  end

  -- Handle userdata
  if t == "userdata" then
    local mt = getmetatable(v)
    if mt and mt.__tostring then
      return tostring(v)
    end
    local userdataId = tostring(v):match("userdata: (.+)")
    return "userdata: " .. (userdataId or tostring(v))
  end

  -- Handle tables
  if t == "table" then
    -- Check for custom __tostring
    local mt = getmetatable(v)
    if mt and mt.__tostring then
      return tostring(v)
    end

    -- Check for circular reference
    if seen[v] then
      return "<circular ref>"
    end
    seen[v] = true

    -- Check depth limit
    if depth >= maxDepth then
      return "{...}"
    end

    local parts = {}
    local count = 0
    local isArray = true
    local arrayLen = 0

    -- Check if it's an array-like table
    for k, _ in pairs(v) do
      if type(k) ~= "number" or k < 1 or math.floor(k) ~= k then
        isArray = false
        break
      end
      if k > arrayLen then
        arrayLen = k
      end
    end

    -- Verify array is contiguous
    if isArray then
      for i = 1, arrayLen do
        if v[i] == nil then
          isArray = false
          break
        end
      end
    end

    if isArray and arrayLen > 0 then
      -- Format as array
      for i = 1, arrayLen do
        if count >= maxItems then
          table.insert(parts, "...")
          break
        end
        table.insert(parts, __format_value(v[i], seen, depth + 1))
        count = count + 1
      end
    else
      -- Format as key-value pairs
      for k, val in pairs(v) do
        if count >= maxItems then
          table.insert(parts, "...")
          break
        end
        local keyStr
        if type(k) == "string" and k:match("^[%a_][%w_]*$") then
          keyStr = k
        else
          keyStr = "[" .. __format_value(k, seen, depth + 1) .. "]"
        end
        table.insert(parts, keyStr .. " = " .. __format_value(val, seen, depth + 1))
        count = count + 1
      end
    end

    return "{" .. table.concat(parts, ", ") .. "}"
  end

  -- Fallback
  return tostring(v)
end
`

/**
 * Lua code for io.write and io.read setup.
 */
const LUA_IO_CODE = `
io = io or {}
io.write = function(...)
  local args = {...}
  local output = ""
  for i, v in ipairs(args) do
    output = output .. tostring(v)
  end
  -- Use __js_write for io.write (no automatic newline)
  __js_write(output)
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
`

/**
 * Factory for creating Lua engines with standard setup.
 */
export class LuaEngineFactory {
  /**
   * Create a new Lua engine with callbacks configured.
   * @param callbacks - Output/error/input handlers
   * @returns Configured Lua engine
   */
  static async create(callbacks: LuaEngineCallbacks): Promise<LuaEngine> {
    const factory = new LuaFactory()
    const engine = await factory.createEngine()

    // Setup print function (adds newline like standard Lua print)
    engine.global.set('print', (...args: unknown[]) => {
      const message = args
        .map((arg) => {
          if (arg === null) return 'nil'
          if (arg === undefined) return 'nil'
          return String(arg)
        })
        .join('\t')
      callbacks.onOutput(message + '\n')
    })

    // Setup io.write output (no newline, unlike print)
    engine.global.set('__js_write', (text: string) => {
      callbacks.onOutput(text)
    })

    // Setup io.read input handler if provided
    if (callbacks.onReadInput) {
      engine.global.set('__js_read_input', async () => {
        return await callbacks.onReadInput!()
      })
    } else {
      // Default handler returns empty string
      engine.global.set('__js_read_input', async () => '')
    }

    // Setup formatter and io functions
    await engine.doString(LUA_FORMATTER_CODE)
    await engine.doString(LUA_IO_CODE)

    return engine
  }

  /**
   * Execute Lua code in the engine.
   * For statements, executes directly.
   * For expressions, returns the formatted result.
   *
   * @param engine - The Lua engine
   * @param code - Lua code to execute
   * @param callbacks - Callbacks for error handling
   * @returns Formatted expression result, or undefined for statements
   */
  static async executeCode(
    engine: LuaEngine,
    code: string,
    callbacks: LuaEngineCallbacks
  ): Promise<string | undefined> {
    if (!code.trim()) return undefined

    try {
      // Try to execute as a statement first
      await engine.doString(code)
      return undefined
    } catch {
      // If it fails, try to evaluate as an expression
      try {
        const formatted = await engine.doString(`return __format_value((${code}))`)
        return String(formatted)
      } catch (exprError: unknown) {
        // Both statement and expression parsing failed - report error
        const errorMsg = exprError instanceof Error ? exprError.message : String(exprError)
        callbacks.onError(errorMsg)
        return undefined
      }
    }
  }

  /**
   * Close the Lua engine and release resources.
   * @param engine - The engine to close
   */
  static close(engine: LuaEngine): void {
    engine.global.close()
  }
}
