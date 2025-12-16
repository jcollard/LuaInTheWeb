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
--- Use canvas.onDraw() to register your render callback.

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
---@usage canvas.onDraw(function()
---   canvas.clear()
---   canvas.setColor(255, 0, 0)
---   canvas.fillRect(10, 10, 50, 50)
--- end)
function canvas.onDraw(callback) end

-- =============================================================================
-- Drawing Functions
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
---@usage canvas.setColor(255, 0, 0)       -- Red
---@usage canvas.setColor(0, 255, 0, 128)  -- Semi-transparent green
function canvas.setColor(r, g, b, a) end

--- Draw a rectangle outline.
---@param x number X coordinate of top-left corner
---@param y number Y coordinate of top-left corner
---@param width number Width of rectangle
---@param height number Height of rectangle
---@return nil
function canvas.rect(x, y, width, height) end

--- Draw a filled rectangle.
---@param x number X coordinate of top-left corner
---@param y number Y coordinate of top-left corner
---@param width number Width of rectangle
---@param height number Height of rectangle
---@return nil
function canvas.fillRect(x, y, width, height) end

--- Draw a circle outline.
---@param x number X coordinate of center
---@param y number Y coordinate of center
---@param radius number Radius of circle
---@return nil
function canvas.circle(x, y, radius) end

--- Draw a filled circle.
---@param x number X coordinate of center
---@param y number Y coordinate of center
---@param radius number Radius of circle
---@return nil
function canvas.fillCircle(x, y, radius) end

--- Draw a line between two points.
---@param x1 number X coordinate of start point
---@param y1 number Y coordinate of start point
---@param x2 number X coordinate of end point
---@param y2 number Y coordinate of end point
---@return nil
function canvas.line(x1, y1, x2, y2) end

--- Draw text at the specified position.
---@param x number X coordinate
---@param y number Y coordinate
---@param text string Text to draw
---@return nil
function canvas.text(x, y, text) end

-- =============================================================================
-- Timing Functions
-- =============================================================================

--- Get the time elapsed since the last frame (in seconds).
--- Use this for frame-rate independent movement.
---@return number deltaTime Time since last frame in seconds
---@usage local x = x + speed * canvas.getDelta()
function canvas.getDelta() end

--- Get the total time since the game started (in seconds).
---@return number totalTime Total elapsed time in seconds
function canvas.getTime() end

-- =============================================================================
-- Keyboard Input
-- =============================================================================

--- Check if a key is currently held down.
---@param key string Key name (e.g., 'ArrowUp', 'ArrowDown', 'a', 'Space')
---@return boolean isDown True if key is currently held
---@usage if canvas.isKeyDown('ArrowUp') then
---   y = y - speed * canvas.getDelta()
--- end
function canvas.isKeyDown(key) end

--- Check if a key was pressed this frame.
--- Returns true only on the frame the key was first pressed.
---@param key string Key name (e.g., 'ArrowUp', 'ArrowDown', 'a', 'Space')
---@return boolean wasPressed True if key was just pressed
---@usage if canvas.isKeyPressed('Space') then
---   jump()
--- end
function canvas.isKeyPressed(key) end

-- =============================================================================
-- Mouse Input
-- =============================================================================

--- Get the current mouse X position.
---@return number x Mouse X coordinate relative to canvas
function canvas.getMouseX() end

--- Get the current mouse Y position.
---@return number y Mouse Y coordinate relative to canvas
function canvas.getMouseY() end

--- Check if a mouse button is currently held down.
---@param button number Button number (0 = left, 1 = middle, 2 = right)
---@return boolean isDown True if button is held
---@usage if canvas.isMouseDown(0) then
---   -- Left mouse button is held
--- end
function canvas.isMouseDown(button) end

return canvas
`
