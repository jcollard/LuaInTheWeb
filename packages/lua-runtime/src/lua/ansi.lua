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
-- 13. Label Text (Screen:set_label, ansi.create_label)
-- 14. Animation Playback (Screen:play, Screen:pause, Screen:is_playing)
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

--- Enable or disable the CRT monitor effect on the terminal.
--- When called with no arguments, enables CRT with default settings.
--- Can accept a table of per-effect parameters for fine-grained control.
---@param enabled_or_config? boolean|table Enable/disable, or a config table
---@param intensity? number Legacy intensity 0-1 (scales all defaults). Only used with boolean first arg.
---@return nil
---@usage ansi.crt()                            -- enable with defaults
---@usage ansi.crt(true, 0.5)                   -- enable, scale all effects to 50%
---@usage ansi.crt(false)                        -- disable
---@usage ansi.crt({ scanlines = 0.8, curvature = 0.3 })  -- per-effect config
--- Available config keys: curvature, scanlines, phosphor, vignette, bloom, chromatic, flicker, brightness
function ansi.crt(enabled_or_config, intensity) end

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

--- Set the text of text layer(s) matching an identifier.
--- Resolves by layer ID first, then by name, then by tag.
--- Non-text layers are silently skipped. Errors if zero text layers match.
---@param identifier string|number Layer ID, name, or tag
---@param value string|Label Plain text string or label table from ansi.create_label()
---@return nil
---@usage screen:set_label("direction", "NORTH")
---@usage screen:set_label("description", ansi.create_label("[color=RED]Fire[/color] burns!"))
function Screen:set_label(identifier, value) end

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
-- Label Text
-- =============================================================================

---@class Label
---@field text string The plain text content
---@field colors table Per-character RGB color array
---@field default_color number[] Default RGB color {r, g, b}

--- Parse color markup into a label table for use with screen:set_label().
--- Supports [color=X]...[/color] tags where X is a hex color (#RGB or #RRGGBB),
--- a CGA color name (RED, BRIGHT_GREEN), CGA-prefixed (CGA_RED), or
--- alternating (CGA_ALT_RED). Tags can be nested.
---@param markup string Text with optional [color=X]...[/color] markup
---@param default_color? number[]|string Default color as {r,g,b} table or hex string (default: LIGHT_GRAY)
---@return Label label A label table with text, colors, and default_color fields
---@usage local label = ansi.create_label("Plain text")
---@usage local label = ansi.create_label("[color=RED]danger[/color] zone")
---@usage local label = ansi.create_label("[color=CGA_ALT_GREEN]shimmering[/color]")
function ansi.create_label(markup, default_color) end

-- =============================================================================
-- Key Constants
-- =============================================================================

--- Key constants for use with input functions.
---@class AnsiKeys
---@field A string KeyA
---@field B string KeyB
---@field C string KeyC
---@field D string KeyD
---@field E string KeyE
---@field F string KeyF
---@field G string KeyG
---@field H string KeyH
---@field I string KeyI
---@field J string KeyJ
---@field K string KeyK
---@field L string KeyL
---@field M string KeyM
---@field N string KeyN
---@field O string KeyO
---@field P string KeyP
---@field Q string KeyQ
---@field R string KeyR
---@field S string KeyS
---@field T string KeyT
---@field U string KeyU
---@field V string KeyV
---@field W string KeyW
---@field X string KeyX
---@field Y string KeyY
---@field Z string KeyZ
---@field DIGIT_0 string Digit0
---@field DIGIT_1 string Digit1
---@field DIGIT_2 string Digit2
---@field DIGIT_3 string Digit3
---@field DIGIT_4 string Digit4
---@field DIGIT_5 string Digit5
---@field DIGIT_6 string Digit6
---@field DIGIT_7 string Digit7
---@field DIGIT_8 string Digit8
---@field DIGIT_9 string Digit9
---@field UP string ArrowUp
---@field DOWN string ArrowDown
---@field LEFT string ArrowLeft
---@field RIGHT string ArrowRight
---@field ARROW_UP string ArrowUp
---@field ARROW_DOWN string ArrowDown
---@field ARROW_LEFT string ArrowLeft
---@field ARROW_RIGHT string ArrowRight
---@field F1 string F1
---@field F2 string F2
---@field F3 string F3
---@field F4 string F4
---@field F5 string F5
---@field F6 string F6
---@field F7 string F7
---@field F8 string F8
---@field F9 string F9
---@field F10 string F10
---@field F11 string F11
---@field F12 string F12
---@field SHIFT string ShiftLeft
---@field SHIFT_LEFT string ShiftLeft
---@field SHIFT_RIGHT string ShiftRight
---@field CTRL string ControlLeft
---@field CTRL_LEFT string ControlLeft
---@field CTRL_RIGHT string ControlRight
---@field ALT string AltLeft
---@field ALT_LEFT string AltLeft
---@field ALT_RIGHT string AltRight
---@field META string MetaLeft (Windows/Command key)
---@field CAPS_LOCK string CapsLock
---@field SPACE string Space
---@field ENTER string Enter
---@field ESCAPE string Escape
---@field TAB string Tab
---@field BACKSPACE string Backspace
---@field DELETE string Delete
---@field INSERT string Insert
---@field HOME string Home
---@field END string End
---@field PAGE_UP string PageUp
---@field PAGE_DOWN string PageDown
---@field NUMPAD_0 string Numpad0
---@field NUMPAD_1 string Numpad1
---@field NUMPAD_2 string Numpad2
---@field NUMPAD_3 string Numpad3
---@field NUMPAD_4 string Numpad4
---@field NUMPAD_5 string Numpad5
---@field NUMPAD_6 string Numpad6
---@field NUMPAD_7 string Numpad7
---@field NUMPAD_8 string Numpad8
---@field NUMPAD_9 string Numpad9
---@field NUMPAD_ADD string NumpadAdd
---@field NUMPAD_SUBTRACT string NumpadSubtract
---@field NUMPAD_MULTIPLY string NumpadMultiply
---@field NUMPAD_DIVIDE string NumpadDivide
---@field NUMPAD_DECIMAL string NumpadDecimal
---@field NUMPAD_ENTER string NumpadEnter
---@field MINUS string Minus
---@field EQUAL string Equal
---@field BRACKET_LEFT string BracketLeft
---@field BRACKET_RIGHT string BracketRight
---@field BACKSLASH string Backslash
---@field SEMICOLON string Semicolon
---@field QUOTE string Quote
---@field BACKQUOTE string Backquote
---@field COMMA string Comma
---@field PERIOD string Period
---@field SLASH string Slash
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
