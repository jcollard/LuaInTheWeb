/**
 * Lua code for io.write and io.read setup.
 * Implements Lua 5.4 io.read() argument handling.
 * Also implements io.open(), file handles, and io.lines() when fileOperations is provided.
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

-- Helper to read a single value based on format (for stdin)
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

-- File handle metatable for io.open()
local __file_handle_mt = {
  __index = {
    read = function(self, fmt)
      if self.__closed then
        return nil, "attempt to use a closed file"
      end
      -- Default to line format
      fmt = fmt or "l"
      -- Normalize format
      local normalized = __normalize_format(fmt)

      local success = __js_file_read(self.__handle, normalized)
      if not success then
        return nil, __js_file_get_error()
      end
      -- Check for EOF (null data from JS side)
      if __js_file_is_eof() then
        return nil
      end
      return __js_file_get_data()
    end,

    write = function(self, ...)
      if self.__closed then
        return nil, "attempt to use a closed file"
      end
      local args = {...}
      for i, v in ipairs(args) do
        local content = tostring(v)
        local success = __js_file_write(self.__handle, content)
        if not success then
          return nil, __js_file_get_error()
        end
      end
      return self  -- Return file handle for chaining
    end,

    close = function(self)
      if self.__closed then
        return nil, "attempt to use a closed file"
      end
      -- Await the async close to ensure file is flushed to disk before returning
      local success = __js_file_close(self.__handle):await()
      self.__closed = true
      if not success then
        return nil, __js_file_get_error()
      end
      return true
    end,

    lines = function(self, fmt)
      fmt = fmt or "l"
      return function()
        if self.__closed then
          return nil
        end
        return self:read(fmt)
      end
    end
  },

  __tostring = function(self)
    if self.__closed then
      return "file (closed)"
    end
    return "file (" .. tostring(self.__handle) .. ")"
  end
}

-- io.open() implementation - only available when __js_file_open exists
if __js_file_open then
  io.open = function(filename, mode)
    mode = mode or "r"
    local success = __js_file_open(filename, mode)
    if not success then
      return nil, __js_file_get_error()
    end

    local handle = __js_file_get_handle()
    local file = {
      __handle = handle,
      __closed = false,
      __mode = mode
    }
    setmetatable(file, __file_handle_mt)
    return file
  end

  -- io.close() implementation
  local original_io_close = io.close
  io.close = function(file)
    if file then
      -- Close the provided file handle
      return file:close()
    elseif original_io_close then
      -- Close default output (original behavior)
      return original_io_close()
    end
  end

  -- io.lines() implementation
  io.lines = function(filename, fmt)
    fmt = fmt or "l"
    local file, err = io.open(filename, "r")
    if not file then
      error("cannot open file '" .. filename .. "' (" .. (err or "unknown error") .. ")")
    end

    -- Return iterator that closes file when done
    return function()
      local line = file:read(fmt)
      if line == nil then
        file:close()
        return nil
      end
      return line
    end
  end
end
`
