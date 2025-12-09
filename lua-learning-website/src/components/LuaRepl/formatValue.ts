import type { LuaEngine } from 'wasmoon'

/**
 * Lua code that defines the __format_value function.
 * This function formats Lua values into readable string representations.
 */
export const LUA_FORMATTER_CODE = `
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

      -- Format source location
      local source = info.source or "?"
      local line = info.linedefined or 0
      return string.format("function(%s) [%s:%d]", paramStr, source, line)
    end
  end

  -- Handle threads (coroutines)
  if t == "thread" then
    return "thread: " .. tostring(v):match("thread: (.+)") or tostring(v)
  end

  -- Handle userdata
  if t == "userdata" then
    local mt = getmetatable(v)
    if mt and mt.__tostring then
      return tostring(v)
    end
    return "userdata: " .. tostring(v):match("userdata: (.+)") or tostring(v)
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
 * Sets up the Lua formatter function in the given Lua engine.
 * Must be called before using formatLuaValue.
 */
export async function setupLuaFormatter(lua: LuaEngine): Promise<void> {
  await lua.doString(LUA_FORMATTER_CODE)
}

/**
 * Formats a Lua value using the Lua-side formatter.
 * Returns a human-readable string representation of the value.
 */
export async function formatLuaValue(lua: LuaEngine, value: unknown): Promise<string> {
  // Handle null/undefined as nil
  if (value === null || value === undefined) {
    return 'nil'
  }

  // For primitive JS types, we can format directly
  if (typeof value === 'boolean') {
    return String(value)
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (typeof value === 'string') {
    return `"${value}"`
  }

  // For complex types (functions, tables, etc.), use the Lua formatter
  // We need to pass the value to Lua and call __format_value on it
  lua.global.set('__temp_value', value)
  const result = await lua.doString('return __format_value(__temp_value)')
  lua.global.set('__temp_value', null)

  return String(result)
}
