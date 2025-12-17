/**
 * Lua code for io.write and io.read setup.
 * Implements Lua 5.4 io.read() argument handling.
 */
export const LUA_IO_CODE = `
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

-- Helper to normalize format string (remove * prefix if present)
local function __normalize_format(fmt)
  if type(fmt) == "string" and fmt:sub(1, 1) == "*" then
    return fmt:sub(2)
  end
  return fmt
end

-- Helper to read a single value based on format
local function __read_one(fmt)
  -- Flush output buffer before blocking for input
  __js_flush()
  -- Reset instruction count - user interaction means not an infinite loop
  __reset_instruction_count()

  -- Handle numeric argument: io.read(n) reads n characters
  if type(fmt) == "number" then
    if fmt == 0 then
      return ""
    end
    local input = __js_read_input(fmt):await()
    -- Return nil at EOF (empty input)
    if input == "" then
      return nil
    end
    -- Truncate to exactly n characters (defensive: in case callback returns more)
    return input:sub(1, fmt)
  end

  -- Normalize string format (remove * prefix)
  local normalized = __normalize_format(fmt)

  -- "n" or "*n" - read and parse number
  if normalized == "n" or normalized == "number" then
    local input = __js_read_input():await()
    -- Return nil at EOF
    if input == "" then
      return nil
    end
    -- tonumber handles leading whitespace and Lua number syntax
    local num = tonumber(input)
    return num  -- Returns nil if parsing fails
  end

  -- "a" or "*a" - read all remaining input
  if normalized == "a" or normalized == "all" then
    local input = __js_read_input():await()
    -- "a" format returns empty string at EOF, never nil
    return input
  end

  -- "L" or "*L" - read line, keep newline
  if normalized == "L" then
    local input = __js_read_input():await()
    -- Return nil at EOF
    if input == "" then
      return nil
    end
    return input .. "\\n"
  end

  -- Default: "l" or "*l" or nil - read line, strip newline
  local input = __js_read_input():await()
  -- Return nil at EOF
  if input == "" then
    return nil
  end
  return input
end

io.read = function(...)
  local args = {...}

  -- No arguments: default to "l" (line without newline)
  if #args == 0 then
    return __read_one("l")
  end

  -- Single argument
  if #args == 1 then
    return __read_one(args[1])
  end

  -- Multiple arguments: return multiple values
  local results = {}
  for i, fmt in ipairs(args) do
    results[i] = __read_one(fmt)
  end
  return table.unpack(results)
end
`
