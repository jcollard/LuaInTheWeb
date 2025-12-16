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
--- Use canvas.on_draw() to register your render callback.

---@class canvas
local canvas = {}

-- =============================================================================
-- Game Loop
-- =============================================================================

--- Register the draw callback function.
--- This callback is called once per frame (~60fps).
--- All drawing operations should be performed inside this callback.
---@param callback fun() Function to call each frame
---@return nil
---@usage canvas.on_draw(function()
---   canvas.clear()
---   canvas.set_color(255, 0, 0)
---   canvas.fill_rect(10, 10, 50, 50)
--- end)
function canvas.on_draw(callback) end

-- =============================================================================
-- Canvas Configuration
-- =============================================================================

--- Set the canvas size in pixels.
--- Call this before on_draw() to set the desired canvas dimensions.
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
---@param key string Key name (e.g., 'ArrowUp', 'ArrowDown', 'a', 'Space')
---@return boolean isDown True if key is currently held
---@usage if canvas.is_key_down('ArrowUp') then
---   y = y - speed * canvas.get_delta()
--- end
function canvas.is_key_down(key) end

--- Check if a key was pressed this frame.
--- Returns true only on the frame the key was first pressed.
---@param key string Key name (e.g., 'ArrowUp', 'ArrowDown', 'a', 'Space')
---@return boolean wasPressed True if key was just pressed
---@usage if canvas.is_key_pressed('Space') then
---   jump()
--- end
function canvas.is_key_pressed(key) end

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
