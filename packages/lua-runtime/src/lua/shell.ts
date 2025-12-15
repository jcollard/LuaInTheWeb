/**
 * Lua code for the shell library.
 * Provides terminal control capabilities (colors, cursor, screen).
 * Loaded via require('shell').
 */
export const LUA_SHELL_CODE = `
-- shell.lua - Terminal control library
-- Load with: local shell = require('shell')
--
-- This library provides functions for terminal control including
-- colors, cursor movement, and screen management.

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

-- Helper: parse hex color string to RGB values
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

-- Helper: clamp value to 0-255 range
local function clamp(value)
  if value < 0 then return 0 end
  if value > 255 then return 255 end
  return math.floor(value)
end

-- Helper: parse color arguments (hex string, named constant, or r,g,b)
local function parse_color(arg1, arg2, arg3)
  if type(arg1) == 'string' then
    return parse_hex(arg1)
  elseif type(arg1) == 'number' and arg2 and arg3 then
    return clamp(arg1), clamp(arg2), clamp(arg3)
  else
    return 255, 255, 255  -- default to white
  end
end

-- Screen control
function shell.clear()
  __js_write('\\x1b[2J\\x1b[H')
end

-- Color control
function shell.foreground(arg1, arg2, arg3)
  local r, g, b = parse_color(arg1, arg2, arg3)
  __js_write(string.format('\\x1b[38;2;%d;%d;%dm', r, g, b))
end

function shell.background(arg1, arg2, arg3)
  local r, g, b = parse_color(arg1, arg2, arg3)
  __js_write(string.format('\\x1b[48;2;%d;%d;%dm', r, g, b))
end

function shell.reset()
  __js_write('\\x1b[0m')
end

-- Cursor control
function shell.set_cursor(x, y)
  -- ANSI uses row;col format (y;x)
  __js_write(string.format('\\x1b[%d;%dH', y or 1, x or 1))
end

function shell.cursor_up(n)
  n = n or 1
  if n < 0 then n = 0 end
  __js_write(string.format('\\x1b[%dA', n))
end

function shell.cursor_down(n)
  n = n or 1
  if n < 0 then n = 0 end
  __js_write(string.format('\\x1b[%dB', n))
end

function shell.cursor_right(n)
  n = n or 1
  if n < 0 then n = 0 end
  __js_write(string.format('\\x1b[%dC', n))
end

function shell.cursor_left(n)
  n = n or 1
  if n < 0 then n = 0 end
  __js_write(string.format('\\x1b[%dD', n))
end

function shell.save_cursor()
  __js_write('\\x1b[s')
end

function shell.restore_cursor()
  __js_write('\\x1b[u')
end

function shell.hide_cursor()
  __js_write('\\x1b[?25l')
end

function shell.show_cursor()
  __js_write('\\x1b[?25h')
end

-- Terminal dimensions (calls JS bridge)
function shell.width()
  return __shell_get_width()
end

function shell.height()
  return __shell_get_height()
end

return shell
`
