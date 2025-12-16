/**
 * Lua code for the shell library.
 * Provides terminal control capabilities (colors, cursor, screen).
 * Loaded via require('shell').
 */
export const LUA_SHELL_CODE = `
---@meta shell
--- shell.lua - Terminal control library
--- Load with: local shell = require('shell')
---
--- This library provides functions for terminal control including
--- colors, cursor movement, and screen management.

---@class shell
---@field BLACK string Black color constant ('#000000')
---@field RED string Red color constant ('#FF0000')
---@field GREEN string Green color constant ('#00FF00')
---@field YELLOW string Yellow color constant ('#FFFF00')
---@field BLUE string Blue color constant ('#0000FF')
---@field MAGENTA string Magenta color constant ('#FF00FF')
---@field CYAN string Cyan color constant ('#00FFFF')
---@field WHITE string White color constant ('#FFFFFF')
---@field ORANGE string Orange color constant ('#FF6400')
---@field PINK string Pink color constant ('#FFC0CB')
---@field GRAY string Gray color constant ('#808080')
local shell = {}

-- Color constants (hex strings)
shell.BLACK = '#000000'
shell.RED = '#FF0000'
shell.GREEN = '#00FF00'
shell.YELLOW = '#FFFF00'
shell.BLUE = '#0000FF'
shell.MAGENTA = '#FF00FF'
shell.CYAN = '#00FFFF'
shell.WHITE = '#FFFFFF'
shell.ORANGE = '#FF6400'
shell.PINK = '#FFC0CB'
shell.GRAY = '#808080'

--- Parse hex color string to RGB values (internal helper)
---@param hex string Hex color string (e.g., '#FF0000' or 'FF0000')
---@return integer r Red component (0-255)
---@return integer g Green component (0-255)
---@return integer b Blue component (0-255)
local function parse_hex(hex)
  -- Remove # prefix if present
  if hex:sub(1, 1) == '#' then
    hex = hex:sub(2)
  end
  local r = tonumber(hex:sub(1, 2), 16) or 0
  local g = tonumber(hex:sub(3, 4), 16) or 0
  local b = tonumber(hex:sub(5, 6), 16) or 0
  return r, g, b
end

--- Clamp value to 0-255 range (internal helper)
---@param value number Value to clamp
---@return integer Clamped value
local function clamp(value)
  if value < 0 then return 0 end
  if value > 255 then return 255 end
  return math.floor(value)
end

--- Parse color arguments (internal helper)
---@param arg1 string|number Hex color string or red component
---@param arg2? number Green component (if arg1 is number)
---@param arg3? number Blue component (if arg1 is number)
---@return integer r Red component (0-255)
---@return integer g Green component (0-255)
---@return integer b Blue component (0-255)
local function parse_color(arg1, arg2, arg3)
  if type(arg1) == 'string' then
    return parse_hex(arg1)
  elseif type(arg1) == 'number' and arg2 and arg3 then
    return clamp(arg1), clamp(arg2), clamp(arg3)
  else
    return 255, 255, 255  -- default to white
  end
end

--- Clear the terminal screen and move cursor to home position.
---@return nil
function shell.clear()
  __js_write('\\x1b[2J\\x1b[H')
end

--- Set the text foreground (text) color.
--- Can be called with a hex string, a color constant, or RGB values.
---@param arg1 string|number Hex color string (e.g., '#FF0000'), color constant (e.g., shell.RED), or red component (0-255)
---@param arg2? number Green component (0-255) when using RGB
---@param arg3? number Blue component (0-255) when using RGB
---@return nil
---@usage shell.foreground(shell.RED) -- Use color constant
---@usage shell.foreground('#FF6400') -- Use hex string
---@usage shell.foreground(255, 100, 0) -- Use RGB values
function shell.foreground(arg1, arg2, arg3)
  local r, g, b = parse_color(arg1, arg2, arg3)
  __js_write(string.format('\\x1b[38;2;%d;%d;%dm', r, g, b))
end

--- Set the text background color.
--- Can be called with a hex string, a color constant, or RGB values.
---@param arg1 string|number Hex color string (e.g., '#0000FF'), color constant (e.g., shell.BLUE), or red component (0-255)
---@param arg2? number Green component (0-255) when using RGB
---@param arg3? number Blue component (0-255) when using RGB
---@return nil
---@usage shell.background(shell.BLUE) -- Use color constant
---@usage shell.background('#000080') -- Use hex string
---@usage shell.background(0, 0, 128) -- Use RGB values
function shell.background(arg1, arg2, arg3)
  local r, g, b = parse_color(arg1, arg2, arg3)
  __js_write(string.format('\\x1b[48;2;%d;%d;%dm', r, g, b))
end

--- Reset all text attributes (colors, styles) to defaults.
---@return nil
function shell.reset()
  __js_write('\\x1b[0m')
end

--- Move the cursor to the specified position.
---@param x number Column number (1-based, left to right)
---@param y number Row number (1-based, top to bottom)
---@return nil
function shell.set_cursor(x, y)
  -- ANSI uses row;col format (y;x)
  __js_write(string.format('\\x1b[%d;%dH', y or 1, x or 1))
end

--- Move the cursor up by n lines.
---@param n? number Number of lines to move (default: 1)
---@return nil
function shell.cursor_up(n)
  n = n or 1
  if n < 0 then n = 0 end
  __js_write(string.format('\\x1b[%dA', n))
end

--- Move the cursor down by n lines.
---@param n? number Number of lines to move (default: 1)
---@return nil
function shell.cursor_down(n)
  n = n or 1
  if n < 0 then n = 0 end
  __js_write(string.format('\\x1b[%dB', n))
end

--- Move the cursor right by n columns.
---@param n? number Number of columns to move (default: 1)
---@return nil
function shell.cursor_right(n)
  n = n or 1
  if n < 0 then n = 0 end
  __js_write(string.format('\\x1b[%dC', n))
end

--- Move the cursor left by n columns.
---@param n? number Number of columns to move (default: 1)
---@return nil
function shell.cursor_left(n)
  n = n or 1
  if n < 0 then n = 0 end
  __js_write(string.format('\\x1b[%dD', n))
end

--- Save the current cursor position.
--- Use restore_cursor() to return to this position later.
---@return nil
---@see shell.restore_cursor
function shell.save_cursor()
  __js_write('\\x1b[s')
end

--- Restore the cursor to the previously saved position.
---@return nil
---@see shell.save_cursor
function shell.restore_cursor()
  __js_write('\\x1b[u')
end

--- Hide the cursor.
---@return nil
---@see shell.show_cursor
function shell.hide_cursor()
  __js_write('\\x1b[?25l')
end

--- Show the cursor (if previously hidden).
---@return nil
---@see shell.hide_cursor
function shell.show_cursor()
  __js_write('\\x1b[?25h')
end

--- Get the terminal width in columns.
---@return integer width The terminal width in columns
function shell.width()
  return __shell_get_width()
end

--- Get the terminal height in rows.
---@return integer height The terminal height in rows
function shell.height()
  return __shell_get_height()
end

return shell
`
