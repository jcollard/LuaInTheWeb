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

--- Set the line cap style for stroke endpoints.
--- Controls how the ends of lines are drawn.
---@param cap string Line cap style: "butt" (default), "round", or "square"
---@return nil
---@usage canvas.set_line_cap("butt")    -- Flat end at the endpoint
---@usage canvas.set_line_cap("round")   -- Rounded end extending past endpoint
---@usage canvas.set_line_cap("square")  -- Square end extending past endpoint
function canvas.set_line_cap(cap) end

--- Set the line join style for stroke corners.
--- Controls how corners are drawn when two lines meet.
---@param join string Line join style: "miter" (default), "round", or "bevel"
---@return nil
---@usage canvas.set_line_join("miter")  -- Sharp corner (may be limited by miter_limit)
---@usage canvas.set_line_join("round")  -- Rounded corner
---@usage canvas.set_line_join("bevel")  -- Flat corner (chamfered)
function canvas.set_line_join(join) end

--- Set the miter limit for sharp corners.
--- When line_join is "miter", this limits how far the corner can extend.
--- If the miter length exceeds this limit, the corner is drawn as a bevel instead.
---@param limit number Miter limit value (default: 10)
---@return nil
---@usage canvas.set_line_join("miter")
---@usage canvas.set_miter_limit(5)   -- Tighter limit, more bevels on sharp angles
---@usage canvas.set_miter_limit(20)  -- Allow sharper corners before beveling
function canvas.set_miter_limit(limit) end

--- Set the line dash pattern for strokes.
--- Creates dashed or dotted lines. Use an empty table to reset to solid line.
---@param segments number[] Array of dash and gap lengths
---@return nil
---@usage canvas.set_line_dash({10, 5})      -- 10px dash, 5px gap
---@usage canvas.set_line_dash({2, 4})       -- Dotted line
---@usage canvas.set_line_dash({15, 5, 5, 5}) -- Long dash, gap, short dash, gap
---@usage canvas.set_line_dash({})           -- Reset to solid line
function canvas.set_line_dash(segments) end

--- Get the current line dash pattern.
---@return number[] Current dash pattern array (empty for solid line)
---@usage local pattern = canvas.get_line_dash()
function canvas.get_line_dash() end

--- Set the line dash offset for animating dashed lines.
--- Useful for creating "marching ants" selection effects.
---@param offset number Offset to shift the dash pattern
---@return nil
---@usage canvas.set_line_dash_offset(offset) -- Shift pattern for animation
function canvas.set_line_dash_offset(offset) end

-- =============================================================================
-- Gradient API
-- =============================================================================

--- Gradient object for creating smooth color transitions.
--- Create with create_linear_gradient(), create_radial_gradient(), or create_conic_gradient(),
--- then add color stops and apply with set_fill_style() or set_stroke_style().
---@class Gradient
---@field type string Gradient type: "linear", "radial", or "conic"
---@field stops table[] Array of color stops

--- Add a color stop to the gradient.
--- Color stops define where colors appear along the gradient.
---@param offset number Position along gradient (0.0 to 1.0)
---@param color string CSS color string (hex, named, rgb, rgba)
---@return Gradient self Returns self for method chaining
---@usage local gradient = canvas.create_linear_gradient(0, 0, 200, 0)
---@usage gradient:add_color_stop(0, "#FF0000")   -- Red at start
---@usage gradient:add_color_stop(0.5, "yellow") -- Yellow in middle
---@usage gradient:add_color_stop(1, "#0000FF")  -- Blue at end
function Gradient:add_color_stop(offset, color) end

--- Create a linear gradient.
--- Linear gradients transition colors along a straight line from (x0, y0) to (x1, y1).
--- After creating, add color stops with :add_color_stop() and apply with set_fill_style().
---@param x0 number Start X coordinate
---@param y0 number Start Y coordinate
---@param x1 number End X coordinate
---@param y1 number End Y coordinate
---@return Gradient gradient The gradient object
---@usage -- Horizontal gradient from red to blue
---@usage local gradient = canvas.create_linear_gradient(0, 0, 200, 0)
---@usage gradient:add_color_stop(0, "#FF0000")  -- Red at start
---@usage gradient:add_color_stop(1, "#0000FF")  -- Blue at end
---@usage canvas.set_fill_style(gradient)
---@usage canvas.fill_rect(0, 0, 200, 100)
---@usage
---@usage -- Vertical gradient for sky effect
---@usage local sky = canvas.create_linear_gradient(0, 0, 0, 400)
---@usage sky:add_color_stop(0, "#87CEEB")  -- Light blue at top
---@usage sky:add_color_stop(1, "#1E90FF")  -- Darker blue at bottom
---@usage canvas.set_fill_style(sky)
---@usage canvas.fill_rect(0, 0, 400, 400)
function canvas.create_linear_gradient(x0, y0, x1, y1) end

--- Create a radial gradient.
--- Radial gradients transition colors between two circles.
--- The first circle (x0, y0, r0) is the inner circle, the second (x1, y1, r1) is the outer.
--- Use same center with different radii for spotlight effects.
--- Use offset centers for 3D sphere effects.
---@param x0 number Center X of start circle
---@param y0 number Center Y of start circle
---@param r0 number Radius of start circle (0 for point)
---@param x1 number Center X of end circle
---@param y1 number Center Y of end circle
---@param r1 number Radius of end circle
---@return Gradient gradient The gradient object
---@usage -- Spotlight effect (same center)
---@usage local light = canvas.create_radial_gradient(200, 200, 0, 200, 200, 150)
---@usage light:add_color_stop(0, "#FFFFFF")         -- White center
---@usage light:add_color_stop(1, "rgba(0,0,0,0)")   -- Transparent edge
---@usage canvas.set_fill_style(light)
---@usage canvas.fill_circle(200, 200, 150)
---@usage
---@usage -- 3D sphere effect (offset center for highlight)
---@usage local sphere = canvas.create_radial_gradient(180, 180, 10, 200, 200, 80)
---@usage sphere:add_color_stop(0, "#FFFFFF")  -- Highlight
---@usage sphere:add_color_stop(0.3, "#4dabf7") -- Light blue
---@usage sphere:add_color_stop(1, "#1864ab")   -- Dark blue
---@usage canvas.set_fill_style(sphere)
---@usage canvas.fill_circle(200, 200, 80)
function canvas.create_radial_gradient(x0, y0, r0, x1, y1, r1) end

--- Create a conic (angular) gradient.
--- Conic gradients transition colors around a center point, sweeping like a radar.
--- Perfect for color wheels, pie charts, and circular progress indicators.
--- The gradient starts at startAngle and rotates clockwise.
---@param startAngle number Starting angle in radians (0 = right, PI/2 = down, PI = left)
---@param x number Center X coordinate
---@param y number Center Y coordinate
---@return Gradient gradient The gradient object
---@usage -- Color wheel (full spectrum)
---@usage local wheel = canvas.create_conic_gradient(0, 200, 200)
---@usage wheel:add_color_stop(0, "#FF0000")     -- Red
---@usage wheel:add_color_stop(0.17, "#FFFF00")  -- Yellow
---@usage wheel:add_color_stop(0.33, "#00FF00")  -- Green
---@usage wheel:add_color_stop(0.5, "#00FFFF")   -- Cyan
---@usage wheel:add_color_stop(0.67, "#0000FF")  -- Blue
---@usage wheel:add_color_stop(0.83, "#FF00FF")  -- Magenta
---@usage wheel:add_color_stop(1, "#FF0000")     -- Back to red
---@usage canvas.set_fill_style(wheel)
---@usage canvas.begin_path()
---@usage canvas.arc(200, 200, 100, 0, math.pi * 2)
---@usage canvas.fill()
---@usage
---@usage -- Pie chart (start from top with -PI/2)
---@usage local pie = canvas.create_conic_gradient(-math.pi/2, 200, 200)
---@usage pie:add_color_stop(0, "#4dabf7")    -- Blue (30%)
---@usage pie:add_color_stop(0.3, "#4dabf7")
---@usage pie:add_color_stop(0.3, "#ff6b6b")  -- Red (50%)
---@usage pie:add_color_stop(0.8, "#ff6b6b")
---@usage pie:add_color_stop(0.8, "#51cf66")  -- Green (20%)
---@usage pie:add_color_stop(1, "#51cf66")
---@usage canvas.set_fill_style(pie)
---@usage canvas.fill_circle(200, 200, 80)
function canvas.create_conic_gradient(startAngle, x, y) end

-- =============================================================================
-- Pattern API
-- =============================================================================

--- Pattern repetition modes.
---@alias PatternRepetition "repeat"|"repeat-x"|"repeat-y"|"no-repeat"

--- Pattern object for image-based fills.
--- Create with create_pattern() using a registered image asset.
---@class Pattern
---@field type string Pattern type: "pattern"
---@field imageName string Name of the registered image asset
---@field repetition PatternRepetition How the pattern tiles

--- Create a pattern from a registered image for textured fills and strokes.
--- Patterns repeat an image to fill shapes, similar to CSS background patterns.
--- The image must first be registered via canvas.assets.image().
---@param imageName string Name of image registered via canvas.assets.image()
---@param repetition? PatternRepetition How the pattern tiles (default: "repeat")
---@return Pattern pattern Pattern object for use with set_fill_style/set_stroke_style
---@usage -- Register an image asset
---@usage canvas.assets.image("tiles", "canvas/images/meteor.png")
---@usage
---@usage -- Create a repeating pattern
---@usage local pattern = canvas.create_pattern("tiles", "repeat")
---@usage canvas.set_fill_style(pattern)
---@usage canvas.fill_rect(0, 0, 400, 300)
---@usage
---@usage -- Horizontal repeat only
---@usage local stripes = canvas.create_pattern("tiles", "repeat-x")
---@usage canvas.set_fill_style(stripes)
---@usage canvas.fill_rect(0, 0, 400, 100)
function canvas.create_pattern(imageName, repetition) end

--- Set the fill style (color, gradient, or pattern).
--- Affects all subsequent fill operations (fill_rect, fill_circle, fill).
--- Can be a CSS color string, a gradient created with create_*_gradient,
--- or a pattern created with create_pattern.
---@param style string|Gradient|Pattern CSS color string, gradient, or pattern object
---@return nil
---@usage -- Simple color
---@usage canvas.set_fill_style("#FF0000")
---@usage canvas.set_fill_style("red")
---@usage canvas.set_fill_style("rgb(255, 0, 0)")
---@usage canvas.set_fill_style("rgba(255, 0, 0, 0.5)")
---@usage
---@usage -- Gradient
---@usage local gradient = canvas.create_linear_gradient(0, 0, 200, 0)
---@usage gradient:add_color_stop(0, "red"):add_color_stop(1, "blue")
---@usage canvas.set_fill_style(gradient)
---@usage canvas.fill_rect(0, 0, 200, 100)
function canvas.set_fill_style(style) end

--- Set the stroke style (color, gradient, or pattern).
--- Affects all subsequent stroke operations (stroke, draw_rect, draw_circle, draw_line).
--- Can be a CSS color string, a gradient created with create_*_gradient,
--- or a pattern created with create_pattern.
---@param style string|Gradient|Pattern CSS color string, gradient, or pattern object
---@return nil
---@usage -- Simple color
---@usage canvas.set_stroke_style("#00FF00")
---@usage canvas.set_stroke_style("green")
---@usage
---@usage -- Rainbow stroke
---@usage local rainbow = canvas.create_linear_gradient(0, 0, 400, 0)
---@usage rainbow:add_color_stop(0, "red")
---@usage rainbow:add_color_stop(0.17, "orange")
---@usage rainbow:add_color_stop(0.33, "yellow")
---@usage rainbow:add_color_stop(0.5, "green")
---@usage rainbow:add_color_stop(0.67, "blue")
---@usage rainbow:add_color_stop(0.83, "indigo")
---@usage rainbow:add_color_stop(1, "violet")
---@usage canvas.set_line_width(10)
---@usage canvas.set_stroke_style(rainbow)
---@usage canvas.begin_path()
---@usage canvas.move_to(50, 200)
---@usage canvas.line_to(350, 200)
---@usage canvas.stroke()
function canvas.set_stroke_style(style) end

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

--- Draw an ellipse (oval) on the current path.
--- An ellipse is like a stretched circle with separate horizontal and vertical radii.
--- Can also draw partial ellipse arcs by specifying start and end angles.
---@param x number X coordinate of the ellipse's center
---@param y number Y coordinate of the ellipse's center
---@param radiusX number Horizontal radius (half-width) of the ellipse
---@param radiusY number Vertical radius (half-height) of the ellipse
---@param rotation? number Rotation of the ellipse in radians (default: 0)
---@param startAngle? number Start angle in radians (default: 0)
---@param endAngle? number End angle in radians (default: 2*PI for full ellipse)
---@param counterclockwise? boolean Draw counterclockwise (default: false)
---@return nil
---@usage -- Draw a full oval
---@usage canvas.begin_path()
---@usage canvas.ellipse(200, 150, 100, 50)  -- Wide oval
---@usage canvas.set_color("#4ECDC4")
---@usage canvas.fill()
---@usage
---@usage -- Draw a rotated ellipse
---@usage canvas.begin_path()
---@usage canvas.ellipse(200, 200, 80, 40, math.pi / 4)  -- 45-degree rotation
---@usage canvas.stroke()
function canvas.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise) end

--- Draw a rounded rectangle on the current path.
--- Creates a rectangle with rounded corners, useful for buttons and UI elements.
--- The radii parameter can be a single number for uniform corners, or a table
--- of 1-4 values for different corner radii.
---@param x number X coordinate of the rectangle's top-left corner
---@param y number Y coordinate of the rectangle's top-left corner
---@param width number Width of the rectangle
---@param height number Height of the rectangle
---@param radii number|table Corner radii - single value or table of 1-4 values
---@return nil
---@usage -- Draw a button with uniform rounded corners
---@usage canvas.begin_path()
---@usage canvas.round_rect(50, 50, 200, 60, 15)  -- 15px radius on all corners
---@usage canvas.set_color("#667EEA")
---@usage canvas.fill()
---@usage
---@usage -- Draw with different corner radii
---@usage canvas.begin_path()
---@usage canvas.round_rect(50, 150, 200, 60, {20, 0, 20, 0})  -- Alternating corners
---@usage canvas.fill()
---@usage
---@usage -- Radii table formats:
---@usage -- {r}       - Same radius for all corners
---@usage -- {r1, r2}  - r1=top-left/bottom-right, r2=top-right/bottom-left
---@usage -- {r1, r2, r3} - r1=top-left, r2=top-right/bottom-left, r3=bottom-right
---@usage -- {r1, r2, r3, r4} - top-left, top-right, bottom-right, bottom-left
function canvas.round_rect(x, y, width, height, radii) end

--- Clip all future drawing to the current path.
--- Creates a clipping region from the current path. All subsequent drawing
--- operations will be constrained to this region. Use save()/restore()
--- to manage clipping regions - clipping can only shrink, not expand.
---@param fillRule? string Fill rule: "nonzero" (default) or "evenodd"
---@return nil
---@usage -- Create a circular viewport
---@usage canvas.save()
---@usage canvas.begin_path()
---@usage canvas.arc(200, 200, 100, 0, math.pi * 2)
---@usage canvas.clip()
---@usage -- All drawing now clipped to the circle
---@usage canvas.fill_rect(0, 0, 400, 400)  -- Only circle area is filled
---@usage canvas.restore()  -- Remove clipping
function canvas.clip(fillRule) end

return canvas
