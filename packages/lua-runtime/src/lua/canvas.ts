/**
 * Lua code for the canvas library.
 * Provides canvas graphics and game loop capabilities.
 * Loaded via require('canvas').
 *
 * Note: This is documentation only - the actual API is injected
 * by the Web Worker runtime (LuaCanvasRuntime).
 */
export const LUA_CANVAS_CODE = `
---@meta canvas
--- canvas.lua - Canvas Graphics Library
--- Load with: local canvas = require('canvas')
---
--- This library provides functions for 2D graphics rendering,
--- input handling, and game loop management.
---
--- Note: The canvas API is only available in canvas mode.
--- Use canvas.tick() to register your render callback.

---@class canvas
local canvas = {}

-- =============================================================================
-- Canvas Lifecycle
-- =============================================================================

--- Start the canvas and block until canvas.stop() is called or Ctrl+C.
--- This opens a canvas tab and runs the game loop.
--- Call canvas.tick() before this to register your render callback.
---@return nil
---@usage canvas.tick(function()
---   canvas.clear()
---   canvas.set_color(255, 0, 0)
---   canvas.fill_rect(10, 10, 50, 50)
--- end)
--- canvas.start()  -- Blocks until stop
function canvas.start() end

--- Stop the canvas and close the canvas tab.
--- This unblocks the canvas.start() call and returns control to the script.
---@return nil
---@usage -- Stop after 5 seconds
--- if canvas.get_time() > 5 then
---   canvas.stop()
--- end
function canvas.stop() end

-- =============================================================================
-- Game Loop
-- =============================================================================

--- Register the tick callback function.
--- This callback is called once per frame (~60fps).
--- All game logic and drawing should be performed inside this callback.
---@param callback fun() Function to call each frame
---@return nil
---@usage canvas.tick(function()
---   canvas.clear()
---   canvas.set_color(255, 0, 0)
---   canvas.fill_rect(10, 10, 50, 50)
--- end)
function canvas.tick(callback) end

-- =============================================================================
-- Canvas Configuration
-- =============================================================================

--- Set the canvas size in pixels.
--- Call this before tick() to set the desired canvas dimensions.
---@param width number Canvas width in pixels
---@param height number Canvas height in pixels
---@return nil
---@usage canvas.set_size(800, 600)
function canvas.set_size(width, height) end

--- Get the canvas width in pixels.
---@return number width Canvas width
---@usage local w = canvas.get_width()
function canvas.get_width() end

--- Get the canvas height in pixels.
---@return number height Canvas height
---@usage local h = canvas.get_height()
function canvas.get_height() end

-- =============================================================================
-- Drawing State
-- =============================================================================

--- Clear the canvas with the current background color.
---@return nil
function canvas.clear() end

--- Set the drawing color (RGBA values 0-255).
--- All subsequent drawing operations will use this color.
---@param r number Red component (0-255)
---@param g number Green component (0-255)
---@param b number Blue component (0-255)
---@param a? number Alpha component (0-255, default: 255)
---@return nil
---@usage canvas.set_color(255, 0, 0)       -- Red
---@usage canvas.set_color(0, 255, 0, 128)  -- Semi-transparent green
function canvas.set_color(r, g, b, a) end

--- Set the line width for stroke operations.
---@param width number Line width in pixels
---@return nil
---@usage canvas.set_line_width(3)
function canvas.set_line_width(width) end

-- =============================================================================
-- Drawing Functions
-- =============================================================================

--- Draw a rectangle outline.
---@param x number X coordinate of top-left corner
---@param y number Y coordinate of top-left corner
---@param width number Width of rectangle
---@param height number Height of rectangle
---@return nil
function canvas.draw_rect(x, y, width, height) end

--- Draw a filled rectangle.
---@param x number X coordinate of top-left corner
---@param y number Y coordinate of top-left corner
---@param width number Width of rectangle
---@param height number Height of rectangle
---@return nil
function canvas.fill_rect(x, y, width, height) end

--- Draw a circle outline.
---@param x number X coordinate of center
---@param y number Y coordinate of center
---@param radius number Radius of circle
---@return nil
function canvas.draw_circle(x, y, radius) end

--- Draw a filled circle.
---@param x number X coordinate of center
---@param y number Y coordinate of center
---@param radius number Radius of circle
---@return nil
function canvas.fill_circle(x, y, radius) end

--- Draw a line between two points.
---@param x1 number X coordinate of start point
---@param y1 number Y coordinate of start point
---@param x2 number X coordinate of end point
---@param y2 number Y coordinate of end point
---@return nil
function canvas.draw_line(x1, y1, x2, y2) end

--- Draw text at the specified position.
---@param x number X coordinate
---@param y number Y coordinate
---@param text string Text to draw
---@return nil
function canvas.draw_text(x, y, text) end

-- =============================================================================
-- Timing Functions
-- =============================================================================

--- Get the time elapsed since the last frame (in seconds).
--- Use this for frame-rate independent movement.
---@return number deltaTime Time since last frame in seconds
---@usage local x = x + speed * canvas.get_delta()
function canvas.get_delta() end

--- Get the total time since the game started (in seconds).
---@return number totalTime Total elapsed time in seconds
function canvas.get_time() end

-- =============================================================================
-- Keyboard Input
-- =============================================================================

--- Check if a key is currently held down.
---@param key string Key name (e.g., 'w', 'ArrowUp', canvas.keys.SPACE)
---@return boolean isDown True if key is currently held
---@usage if canvas.is_key_down('w') then
---   y = y - speed * canvas.get_delta()
--- end
function canvas.is_key_down(key) end

--- Check if a key was pressed this frame.
--- Returns true only on the frame the key was first pressed.
---@param key string Key name (e.g., 'w', 'ArrowUp', canvas.keys.SPACE)
---@return boolean wasPressed True if key was just pressed
---@usage if canvas.is_key_pressed('space') then
---   jump()
--- end
function canvas.is_key_pressed(key) end

--- Get all keys currently held down.
---@return table keys Array of key codes (KeyboardEvent.code format)
---@usage local keys = canvas.get_keys_down()
--- for _, key in ipairs(keys) do print(key) end
function canvas.get_keys_down() end

--- Get all keys pressed this frame.
---@return table keys Array of key codes pressed this frame
---@usage local keys = canvas.get_keys_pressed()
--- for _, key in ipairs(keys) do print(key) end
function canvas.get_keys_pressed() end

-- =============================================================================
-- Key Constants
-- =============================================================================

--- Key constants for use with is_key_down() and is_key_pressed().
--- Use these for more readable code than raw key codes.
---@class canvas.keys
---@field A string KeyA
---@field B string KeyB
---@field C string KeyC
---@field D string KeyD
---@field E string KeyE
---@field F string KeyF (also function key F)
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
---@field DIGIT_0 string Digit0 (number row)
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
canvas.keys = {}

-- =============================================================================
-- Mouse Input
-- =============================================================================

--- Get the current mouse X position.
---@return number x Mouse X coordinate relative to canvas
function canvas.get_mouse_x() end

--- Get the current mouse Y position.
---@return number y Mouse Y coordinate relative to canvas
function canvas.get_mouse_y() end

--- Check if a mouse button is currently held down.
---@param button number Button number (0 = left, 1 = middle, 2 = right)
---@return boolean isDown True if button is held
---@usage if canvas.is_mouse_down(0) then
---   -- Left mouse button is held
--- end
function canvas.is_mouse_down(button) end

--- Check if a mouse button was pressed this frame.
--- Returns true only on the frame the button was first pressed.
---@param button number Button number (0 = left, 1 = middle, 2 = right)
---@return boolean wasPressed True if button was just pressed
---@usage if canvas.is_mouse_pressed(0) then
---   -- Left mouse button was just clicked
--- end
function canvas.is_mouse_pressed(button) end

return canvas
`
