---@meta ansi
--- ansi.lua - ANSI Terminal Library
--- Load with: local ansi = require('ansi')
---
--- This library provides an 80x25 text terminal for DOS-style ANSI games.
--- It uses xterm.js as the renderer and supports true color (24-bit) output.
---
--- Note: The ANSI API is available in both script and REPL mode.
--- Use ansi.tick() to register your per-frame callback.

---@class ansi
local ansi = {}

-- =============================================================================
-- Table of Contents
-- =============================================================================
-- 1.  Terminal Lifecycle (start, stop)
-- 2.  Game Loop (tick)
-- 3.  Terminal Output (print, set_cursor, clear)
-- 4.  Color Functions (foreground, background, reset)
-- 5.  Color Constants (ansi.colors.*)
-- 6.  Timing Functions (get_delta, get_time)
-- 7.  Keyboard Input (is_key_down, is_key_pressed, get_keys_down, get_keys_pressed)
-- 8.  Key Constants (ansi.keys.*)
-- 9.  Terminal Dimensions (COLS, ROWS)
-- =============================================================================

-- =============================================================================
-- Terminal Lifecycle
-- =============================================================================

--- Start the ANSI terminal and block until ansi.stop() is called or Ctrl+C.
--- This opens an ANSI tab and runs the game loop.
--- Call ansi.tick() before this to register your render callback.
---@return nil
function ansi.start() end

--- Stop the ANSI terminal and close the tab.
--- Resolves the blocking ansi.start() call.
---@return nil
function ansi.stop() end

-- =============================================================================
-- Game Loop
-- =============================================================================

--- Register a callback function to be called every frame.
--- The callback is called approximately 60 times per second.
---@param callback function The function to call each frame
---@return nil
---@usage ansi.tick(function()
---   ansi.clear()
---   ansi.set_cursor(1, 1)
---   ansi.foreground(0, 255, 0)
---   ansi.print("Hello ANSI!")
--- end)
function ansi.tick(callback) end

-- =============================================================================
-- Terminal Output
-- =============================================================================

--- Write text at the current cursor position.
--- Does not add a newline automatically.
---@param text string The text to write
---@return nil
function ansi.print(text) end

--- Set the cursor position (1-based).
---@param row number Row (1 = top)
---@param col number Column (1 = left)
---@return nil
function ansi.set_cursor(row, col) end

--- Clear the entire terminal and reset cursor to top-left.
---@return nil
function ansi.clear() end

-- =============================================================================
-- Color Functions
-- =============================================================================

--- Set the foreground (text) color.
--- Accepts either RGB values (0-255) or a hex color string.
---@param r number|string Red component (0-255) or hex string like "#FF0000"
---@param g number|nil Green component (0-255), omit if using hex
---@param b number|nil Blue component (0-255), omit if using hex
---@return nil
---@usage ansi.foreground(255, 0, 0)       -- Red via RGB
---@usage ansi.foreground("#FF0000")        -- Red via hex
function ansi.foreground(r, g, b) end

--- Set the background color.
--- Accepts either RGB values (0-255) or a hex color string.
---@param r number|string Red component (0-255) or hex string like "#0000FF"
---@param g number|nil Green component (0-255), omit if using hex
---@param b number|nil Blue component (0-255), omit if using hex
---@return nil
function ansi.background(r, g, b) end

--- Reset all terminal attributes (colors, styles) to defaults.
---@return nil
function ansi.reset() end

-- =============================================================================
-- Color Constants
-- =============================================================================

--- Named color constants (standard CGA/VGA palette).
--- Each color is a table of {r, g, b} values.
---@type table<string, number[]>
---@usage local c = ansi.colors.BRIGHT_GREEN
---@usage ansi.foreground(c[1], c[2], c[3])
ansi.colors = {}

-- =============================================================================
-- Timing Functions
-- =============================================================================

--- Get the time elapsed since the last frame in seconds.
---@return number delta Delta time in seconds
function ansi.get_delta() end

--- Get the total elapsed time since start() in seconds.
---@return number time Total time in seconds
function ansi.get_time() end

-- =============================================================================
-- Keyboard Input
-- =============================================================================

--- Check if a key is currently held down.
---@param key string Key name (e.g., "a", "up", "space") or key code (e.g., "KeyA")
---@return boolean down True if the key is currently held down
function ansi.is_key_down(key) end

--- Check if a key was just pressed this frame.
---@param key string Key name or key code
---@return boolean pressed True if the key was pressed this frame
function ansi.is_key_pressed(key) end

--- Get all keys currently held down.
---@return string[] keys Array of key codes
function ansi.get_keys_down() end

--- Get all keys pressed this frame.
---@return string[] keys Array of key codes
function ansi.get_keys_pressed() end

-- =============================================================================
-- Key Constants
-- =============================================================================

--- Key constants for use with input functions.
---@type table<string, string>
---@usage if ansi.is_key_down(ansi.keys.UP) then ... end
ansi.keys = {}

-- =============================================================================
-- Terminal Dimensions
-- =============================================================================

--- Number of columns in the terminal (80).
---@type number
ansi.COLS = 80

--- Number of rows in the terminal (25).
---@type number
ansi.ROWS = 25

return ansi
