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

--- Set the drawing color.
--- Accepts either RGBA values (0-255) or hex color strings.
--- All subsequent drawing operations will use this color.
---
--- RGBA format:
---@param r number Red component (0-255)
---@param g number Green component (0-255)
---@param b number Blue component (0-255)
---@param a? number Alpha component (0-255, default: 255)
---
--- Hex format (pass as single string argument):
--- - #RGB - Short form, expands to #RRGGBB (e.g., #F00 = red)
--- - #RRGGBB - Full RGB (e.g., #FF0000 = red)
--- - #RRGGBBAA - Full RGBA with alpha (e.g., #FF000080 = semi-transparent red)
---
---@return nil
---@usage canvas.set_color(255, 0, 0)       -- Red (RGBA)
---@usage canvas.set_color(0, 255, 0, 128)  -- Semi-transparent green (RGBA)
---@usage canvas.set_color("#F00")          -- Red (short hex)
---@usage canvas.set_color("#FF0000")       -- Red (full hex)
---@usage canvas.set_color("#FF000080")     -- Semi-transparent red (hex with alpha)
function canvas.set_color(r, g, b, a) end

--- Set the line width for stroke operations.
---@param width number Line width in pixels
---@return nil
---@usage canvas.set_line_width(3)
function canvas.set_line_width(width) end

-- =============================================================================
-- Font Styling
-- =============================================================================

--- Set the font size for text rendering.
--- All subsequent draw_text() calls will use this size.
---@param size number Font size in pixels (default: 16)
---@return nil
---@usage canvas.set_font_size(24)
function canvas.set_font_size(size) end

--- Set the font family for text rendering.
--- Can be a CSS font family name or a custom font loaded via assets.font().
---@param family string Font family name (default: "monospace")
---@return nil
---@usage canvas.set_font_family("Arial")
---@usage canvas.set_font_family("GameFont")  -- Custom font loaded via assets
function canvas.set_font_family(family) end

--- Measure the width of text with the current font settings.
--- Useful for centering text or calculating text layouts.
---@param text string The text to measure
---@return number width Width of the text in pixels
---@usage local width = canvas.get_text_width("Hello World")
---@usage local x = (canvas.get_width() - width) / 2  -- Center text
function canvas.get_text_width(text) end

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
--- Text is positioned with its top-left corner at (x, y).
--- Optional style overrides can be provided without changing global state.
---@param x number X coordinate of top-left corner
---@param y number Y coordinate of top-left corner
---@param text string Text to draw
---@param options? table Optional style overrides: { font_size?: number, font_family?: string }
---@return nil
---@usage canvas.draw_text(10, 10, "Hello World")  -- Use current font settings
---@usage canvas.draw_text(10, 50, "Big text", { font_size = 48 })  -- Override size
---@usage canvas.draw_text(10, 100, "Custom", { font_family = "Arial", font_size = 32 })
function canvas.draw_text(x, y, text, options) end

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

-- =============================================================================
-- Asset Management
-- =============================================================================

--- Asset management sub-library.
--- Register images and fonts before canvas.start() to preload them.
---@class canvas.assets
canvas.assets = {}

--- Register an image asset for loading.
--- Call this before canvas.start() to preload images.
--- Supported formats: .png, .jpg, .jpeg, .gif, .webp, .bmp
---@param name string Unique name for the asset
---@param path string Path to the image file (relative to script or absolute)
---@usage canvas.assets.image("player", "images/player.png")
---@usage canvas.assets.image("enemy", "/my-files/sprites/enemy.png")
function canvas.assets.image(name, path) end

--- Register a custom font asset for loading.
--- Call this before canvas.start() to preload fonts.
--- After loading, use set_font_family() with the name to use the font.
--- Supported formats: .ttf, .otf, .woff, .woff2
---@param name string Unique name for the font (used with set_font_family)
---@param path string Path to the font file (relative to script or absolute)
---@usage canvas.assets.font("GameFont", "fonts/pixel.ttf")
---@usage canvas.set_font_family("GameFont")  -- Use after canvas.start()
function canvas.assets.font(name, path) end

--- Get the width of a loaded image asset.
--- Must be called after canvas.start() has loaded the assets.
---@param name string The asset name
---@return number width Width in pixels
---@usage local w = canvas.assets.get_width("player")
function canvas.assets.get_width(name) end

--- Get the height of a loaded image asset.
--- Must be called after canvas.start() has loaded the assets.
---@param name string The asset name
---@return number height Height in pixels
---@usage local h = canvas.assets.get_height("player")
function canvas.assets.get_height(name) end

-- =============================================================================
-- Image Drawing
-- =============================================================================

--- Draw an image at the specified position.
--- Optional width/height parameters enable scaling.
--- The image must be registered via canvas.assets.image() before canvas.start().
---@param name string The asset name (registered via canvas.assets.image())
---@param x number X coordinate of top-left corner
---@param y number Y coordinate of top-left corner
---@param width? number Optional width (scales image if provided)
---@param height? number Optional height (scales image if provided)
---@usage canvas.draw_image("player", 100, 100)  -- Original size
---@usage canvas.draw_image("player", 100, 100, 64, 64)  -- Scaled to 64x64
function canvas.draw_image(name, x, y, width, height) end

-- =============================================================================
-- Transformation Functions
-- =============================================================================

--- Move the canvas origin by (dx, dy).
--- All subsequent drawing will be offset by this amount.
--- Use save() and restore() to manage transformation state.
---@param dx number Horizontal offset in pixels
---@param dy number Vertical offset in pixels
---@return nil
---@usage canvas.translate(100, 50)  -- Move origin right 100, down 50
function canvas.translate(dx, dy) end

--- Rotate subsequent drawing operations.
--- Rotation is applied around the current origin (0, 0).
--- Use translate() first to rotate around a different point.
---@param angle number Rotation angle in radians
---@return nil
---@usage canvas.rotate(math.pi / 4)  -- Rotate 45 degrees
---@usage canvas.translate(100, 100)  -- Move to center of object
---@usage canvas.rotate(angle)        -- Rotate around that point
function canvas.rotate(angle) end

--- Scale subsequent drawing operations.
--- Use negative values to flip/mirror the drawing.
---@param sx number Horizontal scale factor (1.0 = normal, 2.0 = double, -1 = flip)
---@param sy number Vertical scale factor (1.0 = normal, 2.0 = double, -1 = flip)
---@return nil
---@usage canvas.scale(2, 2)    -- Double size
---@usage canvas.scale(-1, 1)   -- Horizontal flip (mirror)
---@usage canvas.scale(1, -1)   -- Vertical flip
---@usage canvas.scale(0.5, 0.5) -- Half size
function canvas.scale(sx, sy) end

--- Save the current transformation state.
--- Push the current transformation matrix onto a stack.
--- Use restore() to return to this saved state.
---@return nil
---@usage canvas.save()
---@usage canvas.translate(100, 100)
---@usage canvas.rotate(angle)
---@usage -- draw something rotated
---@usage canvas.restore()  -- Back to original transform
function canvas.save() end

--- Restore the previously saved transformation state.
--- Pop the transformation matrix from the stack.
--- Must be paired with a previous save() call.
---@return nil
---@usage canvas.save()
---@usage canvas.translate(100, 100)
---@usage canvas.restore()  -- Undo the translate
function canvas.restore() end

--- Apply a 2D transformation matrix.
--- Multiplies the current matrix by the given matrix.
--- Matrix format: [a c e]
---                [b d f]
---                [0 0 1]
---@param a number Horizontal scaling
---@param b number Vertical skewing
---@param c number Horizontal skewing
---@param d number Vertical scaling
---@param e number Horizontal translation
---@param f number Vertical translation
---@return nil
---@usage canvas.transform(1, 0, 0.5, 1, 0, 0)  -- Shear effect
function canvas.transform(a, b, c, d, e, f) end

--- Set an absolute transformation matrix.
--- Replaces the current transformation (does not multiply).
--- Useful for setting a known transform state directly.
---@param a number Horizontal scaling
---@param b number Vertical skewing
---@param c number Horizontal skewing
---@param d number Vertical scaling
---@param e number Horizontal translation
---@param f number Vertical translation
---@return nil
---@usage canvas.set_transform(1, 0, 0, 1, 100, 100)  -- Just translate
function canvas.set_transform(a, b, c, d, e, f) end

--- Reset the transformation to the identity matrix.
--- Clears all transformations (translate, rotate, scale).
--- After calling this, drawing uses screen coordinates directly.
---@return nil
---@usage canvas.reset_transform()  -- Clear all transforms
---@usage canvas.fill_rect(0, 0, 50, 50)  -- Draw at screen origin
function canvas.reset_transform() end

-- =============================================================================
-- Path API
-- =============================================================================

--- Begin a new path.
--- Clears any existing path data and starts a new one.
--- Call this before using move_to(), line_to(), etc.
---@return nil
---@usage canvas.begin_path()
---@usage canvas.move_to(100, 100)
---@usage canvas.line_to(200, 100)
---@usage canvas.stroke()
function canvas.begin_path() end

--- Close the current path.
--- Draws a straight line from the current point back to the start of the path.
--- Creates a closed shape ready for fill() or stroke().
---@return nil
---@usage canvas.begin_path()
---@usage canvas.move_to(100, 100)
---@usage canvas.line_to(150, 50)
---@usage canvas.line_to(200, 100)
---@usage canvas.close_path()  -- Draws line back to (100, 100)
---@usage canvas.fill()
function canvas.close_path() end

--- Move to a point without drawing.
--- Sets the starting point for a new sub-path.
---@param x number X coordinate to move to
---@param y number Y coordinate to move to
---@return nil
---@usage canvas.begin_path()
---@usage canvas.move_to(50, 50)   -- Start here
---@usage canvas.line_to(100, 100) -- Draw line from (50,50) to (100,100)
function canvas.move_to(x, y) end

--- Draw a line to a point.
--- Draws a straight line from the current point to the specified point.
---@param x number X coordinate to draw line to
---@param y number Y coordinate to draw line to
---@return nil
---@usage canvas.begin_path()
---@usage canvas.move_to(0, 0)
---@usage canvas.line_to(100, 100)
---@usage canvas.stroke()
function canvas.line_to(x, y) end

--- Fill the current path.
--- Fills the interior of the path with the current fill color.
--- The path does not need to be closed - it will be implicitly closed for fill.
---@return nil
---@usage canvas.set_color(255, 0, 0)  -- Red fill
---@usage canvas.begin_path()
---@usage canvas.move_to(100, 100)
---@usage canvas.line_to(150, 50)
---@usage canvas.line_to(200, 100)
---@usage canvas.fill()  -- Fills the triangle
function canvas.fill() end

--- Stroke the current path.
--- Draws the outline of the path with the current stroke color and line width.
---@return nil
---@usage canvas.set_color(0, 0, 0)     -- Black outline
---@usage canvas.set_line_width(2)
---@usage canvas.begin_path()
---@usage canvas.move_to(100, 100)
---@usage canvas.line_to(150, 50)
---@usage canvas.line_to(200, 100)
---@usage canvas.close_path()
---@usage canvas.stroke()  -- Draws triangle outline
function canvas.stroke() end

--- Draw an arc (portion of a circle) on the current path.
--- Angles are in radians. Use math.pi for convenience.
---@param x number X coordinate of the arc's center
---@param y number Y coordinate of the arc's center
---@param radius number Arc radius in pixels
---@param startAngle number Start angle in radians (0 = 3 o'clock position)
---@param endAngle number End angle in radians
---@param counterclockwise? boolean Draw counterclockwise (default: false)
---@return nil
---@usage -- Draw a pie chart slice
---@usage canvas.begin_path()
---@usage canvas.move_to(200, 200)  -- center
---@usage canvas.arc(200, 200, 100, 0, math.pi / 2)  -- quarter circle
---@usage canvas.close_path()
---@usage canvas.fill()
function canvas.arc(x, y, radius, startAngle, endAngle, counterclockwise) end

--- Draw an arc using tangent control points.
--- Creates a smooth arc that connects to the current path position,
--- tangent to the lines from the current position to (x1, y1) and from (x1, y1) to (x2, y2).
--- Useful for creating rounded corners.
---@param x1 number X coordinate of first control point
---@param y1 number Y coordinate of first control point
---@param x2 number X coordinate of second control point
---@param y2 number Y coordinate of second control point
---@param radius number Arc radius in pixels
---@return nil
---@usage -- Draw a rounded corner
---@usage canvas.begin_path()
---@usage canvas.move_to(50, 100)
---@usage canvas.arc_to(100, 100, 100, 50, 20)  -- rounded corner with radius 20
---@usage canvas.stroke()
function canvas.arc_to(x1, y1, x2, y2, radius) end

--- Draw a quadratic Bézier curve from the current point.
--- A quadratic curve uses a single control point to define the curve shape.
--- The curve starts at the current path position and ends at (x, y).
---@param cpx number X coordinate of the control point
---@param cpy number Y coordinate of the control point
---@param x number X coordinate of the end point
---@param y number Y coordinate of the end point
---@return nil
---@usage -- Draw a simple curved line
---@usage canvas.begin_path()
---@usage canvas.move_to(50, 200)
---@usage canvas.quadratic_curve_to(150, 50, 250, 200)  -- curve with control point at top
---@usage canvas.stroke()
function canvas.quadratic_curve_to(cpx, cpy, x, y) end

--- Draw a cubic Bézier curve from the current point.
--- A cubic curve uses two control points for more complex curve shapes.
--- The curve starts at the current path position and ends at (x, y).
--- Great for drawing S-curves, smooth paths, and complex shapes.
---@param cp1x number X coordinate of the first control point
---@param cp1y number Y coordinate of the first control point
---@param cp2x number X coordinate of the second control point
---@param cp2y number Y coordinate of the second control point
---@param x number X coordinate of the end point
---@param y number Y coordinate of the end point
---@return nil
---@usage -- Draw an S-curve
---@usage canvas.begin_path()
---@usage canvas.move_to(50, 200)
---@usage canvas.bezier_curve_to(150, 50, 250, 350, 350, 200)  -- S-curve shape
---@usage canvas.set_line_width(3)
---@usage canvas.stroke()
function canvas.bezier_curve_to(cp1x, cp1y, cp2x, cp2y, x, y) end

return canvas
