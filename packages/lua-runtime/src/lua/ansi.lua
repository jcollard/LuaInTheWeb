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
-- 8.  Mouse Input (is_mouse_down, is_mouse_pressed, get_mouse_col, get_mouse_row, etc.)
-- 9.  Key Constants (ansi.keys.*)
-- 10. Terminal Dimensions (COLS, ROWS)
-- 11. Screen Display (load_screen, create_screen, set_screen)
-- 12. Layer Visibility Control (Screen:get_layers, layer_on, layer_off, layer_toggle)
-- 13. Animation Playback (Screen:play, Screen:pause, Screen:is_playing)
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
-- Mouse Input
-- =============================================================================

--- Check if a mouse button is currently held down.
---@param button? number Button index (0 = left, 1 = middle, 2 = right). Defaults to 0.
---@return boolean down True if the button is currently held down
function ansi.is_mouse_down(button) end

--- Check if a mouse button was just pressed this frame.
---@param button? number Button index (0 = left, 1 = middle, 2 = right). Defaults to 0.
---@return boolean pressed True if the button was pressed this frame
function ansi.is_mouse_pressed(button) end

--- Get the mouse column in cell coordinates (1-based, clamped to 1–80).
---@return number col Column number (1 = leftmost)
function ansi.get_mouse_col() end

--- Get the mouse row in cell coordinates (1-based, clamped to 1–25).
---@return number row Row number (1 = topmost)
function ansi.get_mouse_row() end

--- Check if the mouse cursor is in the top half of the current cell.
--- Useful for half-block rendering at effective 80x50 resolution.
---@return boolean top True if cursor is in the top half of the cell
function ansi.is_mouse_top_half() end

--- Get the raw unscaled pixel X coordinate of the mouse.
---@return number x Pixel X coordinate (0 to terminal width)
function ansi.get_mouse_x() end

--- Get the raw unscaled pixel Y coordinate of the mouse.
---@return number y Pixel Y coordinate (0 to terminal height)
function ansi.get_mouse_y() end

-- =============================================================================
-- Screen Display
-- =============================================================================

---@class Screen
---@field id number The numeric screen ID
local Screen = {}

--- Get information about all layers in this screen.
--- Returns a table of layer info objects with id, name, type, visible, and tags fields.
---@return table[] layers Array of {id, name, type, visible, tags} tables
---@usage local layers = screen:get_layers()
---@usage for i, layer in ipairs(layers) do
---@usage   print(layer.name, layer.visible)
---@usage end
function Screen:get_layers() end

--- Show layer(s) matching the identifier.
--- Resolves by layer ID first, then by name, then by tag.
---@param identifier string|number Layer ID, name, or tag
---@return nil
---@usage screen:layer_on("Background")
function Screen:layer_on(identifier) end

--- Hide layer(s) matching the identifier.
--- Resolves by layer ID first, then by name, then by tag.
---@param identifier string|number Layer ID, name, or tag
---@return nil
---@usage screen:layer_off("Background")
function Screen:layer_off(identifier) end

--- Toggle visibility of layer(s) matching the identifier.
--- Resolves by layer ID first, then by name, then by tag.
---@param identifier string|number Layer ID, name, or tag
---@return nil
---@usage screen:layer_toggle("Background")
function Screen:layer_toggle(identifier) end

--- Start or resume animation playback for this screen.
--- Animated layers (drawn layers with multiple frames) will advance automatically.
---@return nil
---@usage screen:play()
function Screen:play() end

--- Pause animation playback for this screen.
--- Animated layers will freeze on their current frame.
---@return nil
---@usage screen:pause()
function Screen:pause() end

--- Check if animation is currently playing for this screen.
---@return boolean playing True if animation is playing
---@usage if screen:is_playing() then screen:pause() end
function Screen:is_playing() end

--- Load a .ansi.lua file by path and return a screen object.
--- This is the recommended way to load ANSI screen files created with the editor.
--- Relative paths are resolved from the current working directory, with root fallback.
---@param path string Path to the .ansi.lua file (e.g., "my_art.ansi.lua")
---@return Screen screen A screen object with layer control methods
---@usage local screen = ansi.load_screen("my_art.ansi.lua")
---@usage ansi.set_screen(screen)
function ansi.load_screen(path) end

--- Create a screen from a data table programmatically.
--- Use this when building screen data in code rather than loading from a file.
--- The returned screen object can be passed to ansi.set_screen() to display it,
--- and provides methods for controlling layer visibility.
---@param data table A table matching the .ansi.lua file format (version, grid/layers)
---@return Screen screen A screen object with layer control methods
---@usage local screen = ansi.create_screen({ version = 1, width = 80, height = 25, grid = my_grid })
function ansi.create_screen(data) end

--- Set the active background screen.
--- When a screen is active, it is rendered as the terminal background each frame,
--- before the tick callback runs. Use ansi.print() to draw on top of it.
--- Pass nil to clear the active screen.
---@param screen Screen|number|nil A screen object, screen ID, or nil to clear
---@return nil
---@usage ansi.set_screen(screen)   -- display the screen
---@usage ansi.set_screen(nil)      -- clear the background
function ansi.set_screen(screen) end

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
