/**
 * Documentation generators for library and docs workspaces.
 *
 * Extracted from workspaceManagerHelpers to keep file size manageable.
 */

import { LUA_SHELL_CODE, LUA_CANVAS_CODE } from '@lua-learning/lua-runtime'

/**
 * Generate a clean version of the shell library source code for display.
 * This reformats the embedded Lua code for better readability.
 */
export function generateShellLibrarySource(): string {
  // Add a header comment and clean up the source
  return `-- shell.lua - Terminal control library
-- Load with: local shell = require('shell')
--
-- This library provides functions for terminal control including
-- colors, cursor movement, and screen management.

${LUA_SHELL_CODE.trim()}
`
}

/**
 * Generate a clean version of the canvas library source code for display.
 * This reformats the embedded Lua code for better readability.
 */
export function generateCanvasLibrarySource(): string {
  // Add a header comment and clean up the source
  return `-- canvas.lua - Canvas Graphics Library
-- Load with: local canvas = require('canvas')
--
-- This library provides functions for 2D graphics rendering,
-- input handling, and game loop management.
-- Note: The canvas API is only available in canvas mode.

${LUA_CANVAS_CODE.trim()}
`
}

/**
 * Generate the shell library API documentation in Markdown format.
 */
export function generateShellDocumentation(): string {
  return `# Shell Library

The shell library provides functions for terminal control including colors, cursor movement, and screen management.

## Loading the Library

\`\`\`lua
local shell = require('shell')
\`\`\`

## Color Constants

The following color constants are available for use with \`shell.foreground()\` and \`shell.background()\`:

| Constant | Description |
|----------|-------------|
| \`shell.BLACK\` | Black color |
| \`shell.RED\` | Red color |
| \`shell.GREEN\` | Green color |
| \`shell.YELLOW\` | Yellow color |
| \`shell.BLUE\` | Blue color |
| \`shell.MAGENTA\` | Magenta color |
| \`shell.CYAN\` | Cyan color |
| \`shell.WHITE\` | White color |

## Screen Control

### shell.clear()

Clears the terminal screen.

\`\`\`lua
shell.clear()
\`\`\`

## Color Control

### shell.foreground(color)

Sets the text foreground color.

**Parameters:**
- \`color\` (number): One of the color constants (e.g., \`shell.RED\`)

\`\`\`lua
shell.foreground(shell.GREEN)
print("This text is green!")
\`\`\`

### shell.background(color)

Sets the text background color.

**Parameters:**
- \`color\` (number): One of the color constants (e.g., \`shell.BLUE\`)

\`\`\`lua
shell.background(shell.BLUE)
print("This has a blue background!")
\`\`\`

### shell.reset()

Resets all color attributes to their defaults.

\`\`\`lua
shell.reset()
\`\`\`

## Cursor Control

### shell.set_cursor(row, col)

Moves the cursor to the specified position.

**Parameters:**
- \`row\` (number): The row number (1-based)
- \`col\` (number): The column number (1-based)

\`\`\`lua
shell.set_cursor(5, 10)
print("Text at row 5, column 10")
\`\`\`

### shell.cursor_up(n)

Moves the cursor up by \`n\` lines.

**Parameters:**
- \`n\` (number, optional): Number of lines to move (default: 1)

### shell.cursor_down(n)

Moves the cursor down by \`n\` lines.

**Parameters:**
- \`n\` (number, optional): Number of lines to move (default: 1)

### shell.cursor_left(n)

Moves the cursor left by \`n\` columns.

**Parameters:**
- \`n\` (number, optional): Number of columns to move (default: 1)

### shell.cursor_right(n)

Moves the cursor right by \`n\` columns.

**Parameters:**
- \`n\` (number, optional): Number of columns to move (default: 1)

### shell.save_cursor()

Saves the current cursor position.

### shell.restore_cursor()

Restores the cursor to the previously saved position.

### shell.hide_cursor()

Hides the cursor.

### shell.show_cursor()

Shows the cursor.

## Terminal Dimensions

### shell.width()

Returns the width of the terminal in columns.

**Returns:**
- (number): The terminal width

\`\`\`lua
local w = shell.width()
print("Terminal is " .. w .. " columns wide")
\`\`\`

### shell.height()

Returns the height of the terminal in rows.

**Returns:**
- (number): The terminal height

\`\`\`lua
local h = shell.height()
print("Terminal is " .. h .. " rows tall")
\`\`\`

## Example: Colorful Output

\`\`\`lua
local shell = require('shell')

-- Clear the screen
shell.clear()

-- Print colorful text
shell.foreground(shell.RED)
print("Red text")

shell.foreground(shell.GREEN)
print("Green text")

shell.foreground(shell.BLUE)
print("Blue text")

-- Reset to defaults
shell.reset()
print("Normal text")
\`\`\`

## Example: Drawing a Box

\`\`\`lua
local shell = require('shell')

local function draw_box(x, y, width, height)
  -- Top border
  shell.set_cursor(y, x)
  io.write("+" .. string.rep("-", width - 2) .. "+")

  -- Sides
  for i = 1, height - 2 do
    shell.set_cursor(y + i, x)
    io.write("|" .. string.rep(" ", width - 2) .. "|")
  end

  -- Bottom border
  shell.set_cursor(y + height - 1, x)
  io.write("+" .. string.rep("-", width - 2) .. "+")
end

shell.clear()
draw_box(5, 3, 20, 5)
\`\`\`
`
}

/**
 * Generate the canvas library API documentation in Markdown format.
 */
export function generateCanvasDocumentation(): string {
  return `# Canvas Library

The canvas library provides functions for 2D graphics rendering, input handling, and game loop management.

**Note**: The canvas API is only available in canvas mode.

## Loading the Library

\`\`\`lua
local canvas = require('canvas')
\`\`\`

## Game Loop

### canvas.on_draw(callback)

Register the draw callback function. This callback is called once per frame (~60fps).
All drawing operations should be performed inside this callback.

**Parameters:**
- \`callback\` (function): Function to call each frame

\`\`\`lua
canvas.on_draw(function()
  canvas.clear()
  canvas.set_color(255, 0, 0)
  canvas.fill_rect(10, 10, 50, 50)
end)
\`\`\`

## Canvas Configuration

### canvas.set_size(width, height)

Set the canvas size in pixels. Call this before on_draw() to set the desired canvas dimensions.

**Parameters:**
- \`width\` (number): Canvas width in pixels
- \`height\` (number): Canvas height in pixels

\`\`\`lua
canvas.set_size(800, 600)
\`\`\`

### canvas.get_width()

Get the canvas width in pixels.

**Returns:**
- (number): Canvas width

### canvas.get_height()

Get the canvas height in pixels.

**Returns:**
- (number): Canvas height

\`\`\`lua
local center_x = canvas.get_width() / 2
local center_y = canvas.get_height() / 2
\`\`\`

## Drawing State

### canvas.clear()

Clear the canvas.

### canvas.set_color(r, g, b, a)

Set the drawing color. All subsequent drawing operations will use this color.

**Parameters:**
- \`r\` (number): Red component (0-255)
- \`g\` (number): Green component (0-255)
- \`b\` (number): Blue component (0-255)
- \`a\` (number, optional): Alpha component (0-255, default: 255)

\`\`\`lua
canvas.set_color(255, 0, 0)       -- Red
canvas.set_color(0, 255, 0, 128)  -- Semi-transparent green
\`\`\`

### canvas.set_line_width(width)

Set the line width for stroke operations (draw_rect, draw_circle, draw_line).

**Parameters:**
- \`width\` (number): Line width in pixels

\`\`\`lua
canvas.set_line_width(3)
canvas.draw_rect(10, 10, 100, 100)  -- 3px thick outline
\`\`\`

## Drawing Functions

### canvas.draw_rect(x, y, width, height)

Draw a rectangle outline.

**Parameters:**
- \`x\` (number): X coordinate of top-left corner
- \`y\` (number): Y coordinate of top-left corner
- \`width\` (number): Width of rectangle
- \`height\` (number): Height of rectangle

### canvas.fill_rect(x, y, width, height)

Draw a filled rectangle.

**Parameters:**
- \`x\` (number): X coordinate of top-left corner
- \`y\` (number): Y coordinate of top-left corner
- \`width\` (number): Width of rectangle
- \`height\` (number): Height of rectangle

### canvas.draw_circle(x, y, radius)

Draw a circle outline.

**Parameters:**
- \`x\` (number): X coordinate of center
- \`y\` (number): Y coordinate of center
- \`radius\` (number): Radius of circle

### canvas.fill_circle(x, y, radius)

Draw a filled circle.

**Parameters:**
- \`x\` (number): X coordinate of center
- \`y\` (number): Y coordinate of center
- \`radius\` (number): Radius of circle

### canvas.draw_line(x1, y1, x2, y2)

Draw a line between two points.

**Parameters:**
- \`x1\` (number): X coordinate of start point
- \`y1\` (number): Y coordinate of start point
- \`x2\` (number): X coordinate of end point
- \`y2\` (number): Y coordinate of end point

### canvas.draw_text(x, y, text)

Draw text at the specified position.

**Parameters:**
- \`x\` (number): X coordinate
- \`y\` (number): Y coordinate
- \`text\` (string): Text to draw

## Timing Functions

### canvas.get_delta()

Get the time elapsed since the last frame (in seconds).
Use this for frame-rate independent movement.

**Returns:**
- (number): Time since last frame in seconds

\`\`\`lua
local speed = 100 -- pixels per second
x = x + speed * canvas.get_delta()
\`\`\`

### canvas.get_time()

Get the total time since the game started (in seconds).

**Returns:**
- (number): Total elapsed time in seconds

## Keyboard Input

### canvas.is_key_down(key)

Check if a key is currently held down.

**Parameters:**
- \`key\` (string): Key name (e.g., 'w', 'ArrowUp', or use \`canvas.keys.W\`)

**Returns:**
- (boolean): True if key is currently held

\`\`\`lua
if canvas.is_key_down('w') then
  y = y - speed * canvas.get_delta()
end

-- Or use key constants
if canvas.is_key_down(canvas.keys.W) then
  y = y - speed * canvas.get_delta()
end
\`\`\`

### canvas.is_key_pressed(key)

Check if a key was pressed this frame. Returns true only on the frame the key was first pressed.

**Parameters:**
- \`key\` (string): Key name

**Returns:**
- (boolean): True if key was just pressed

\`\`\`lua
if canvas.is_key_pressed('space') then
  jump()
end
\`\`\`

### canvas.get_keys_down()

Get all keys currently held down.

**Returns:**
- (table): Array of key codes in KeyboardEvent.code format

\`\`\`lua
local keys = canvas.get_keys_down()
for _, key in ipairs(keys) do
  print("Holding: " .. key)
end
\`\`\`

### canvas.get_keys_pressed()

Get all keys pressed this frame.

**Returns:**
- (table): Array of key codes pressed this frame

\`\`\`lua
local keys = canvas.get_keys_pressed()
for _, key in ipairs(keys) do
  print("Just pressed: " .. key)
end
\`\`\`

## Key Constants

The \`canvas.keys\` table provides named constants for all keyboard keys.
These can be used with \`is_key_down()\` and \`is_key_pressed()\`.

### Letters

| Constant | Key Code |
|----------|----------|
| \`canvas.keys.A\` - \`canvas.keys.Z\` | KeyA - KeyZ |

### Number Row

| Constant | Key Code |
|----------|----------|
| \`canvas.keys.DIGIT_0\` - \`canvas.keys.DIGIT_9\` | Digit0 - Digit9 |
| \`canvas.keys['0']\` - \`canvas.keys['9']\` | Digit0 - Digit9 |

### Arrow Keys

| Constant | Key Code |
|----------|----------|
| \`canvas.keys.UP\` / \`canvas.keys.ARROW_UP\` | ArrowUp |
| \`canvas.keys.DOWN\` / \`canvas.keys.ARROW_DOWN\` | ArrowDown |
| \`canvas.keys.LEFT\` / \`canvas.keys.ARROW_LEFT\` | ArrowLeft |
| \`canvas.keys.RIGHT\` / \`canvas.keys.ARROW_RIGHT\` | ArrowRight |

### Function Keys

| Constant | Key Code |
|----------|----------|
| \`canvas.keys.F1\` - \`canvas.keys.F12\` | F1 - F12 |

### Modifier Keys

| Constant | Key Code |
|----------|----------|
| \`canvas.keys.SHIFT\` / \`canvas.keys.SHIFT_LEFT\` | ShiftLeft |
| \`canvas.keys.SHIFT_RIGHT\` | ShiftRight |
| \`canvas.keys.CTRL\` / \`canvas.keys.CTRL_LEFT\` | ControlLeft |
| \`canvas.keys.CTRL_RIGHT\` | ControlRight |
| \`canvas.keys.ALT\` / \`canvas.keys.ALT_LEFT\` | AltLeft |
| \`canvas.keys.ALT_RIGHT\` | AltRight |
| \`canvas.keys.META\` | MetaLeft (Windows/Cmd) |
| \`canvas.keys.CAPS_LOCK\` | CapsLock |

### Special Keys

| Constant | Key Code |
|----------|----------|
| \`canvas.keys.SPACE\` | Space |
| \`canvas.keys.ENTER\` | Enter |
| \`canvas.keys.ESCAPE\` | Escape |
| \`canvas.keys.TAB\` | Tab |
| \`canvas.keys.BACKSPACE\` | Backspace |
| \`canvas.keys.DELETE\` | Delete |
| \`canvas.keys.INSERT\` | Insert |
| \`canvas.keys.HOME\` | Home |
| \`canvas.keys.END\` | End |
| \`canvas.keys.PAGE_UP\` | PageUp |
| \`canvas.keys.PAGE_DOWN\` | PageDown |

### Numpad Keys

| Constant | Key Code |
|----------|----------|
| \`canvas.keys.NUMPAD_0\` - \`canvas.keys.NUMPAD_9\` | Numpad0 - Numpad9 |
| \`canvas.keys.NUMPAD_ADD\` | NumpadAdd |
| \`canvas.keys.NUMPAD_SUBTRACT\` | NumpadSubtract |
| \`canvas.keys.NUMPAD_MULTIPLY\` | NumpadMultiply |
| \`canvas.keys.NUMPAD_DIVIDE\` | NumpadDivide |
| \`canvas.keys.NUMPAD_DECIMAL\` | NumpadDecimal |
| \`canvas.keys.NUMPAD_ENTER\` | NumpadEnter |

### Punctuation

| Constant | Key Code |
|----------|----------|
| \`canvas.keys.MINUS\` | Minus (-) |
| \`canvas.keys.EQUAL\` | Equal (=) |
| \`canvas.keys.BRACKET_LEFT\` | BracketLeft ([) |
| \`canvas.keys.BRACKET_RIGHT\` | BracketRight (]) |
| \`canvas.keys.BACKSLASH\` | Backslash (\\) |
| \`canvas.keys.SEMICOLON\` | Semicolon (;) |
| \`canvas.keys.QUOTE\` | Quote (') |
| \`canvas.keys.BACKQUOTE\` | Backquote (\`) |
| \`canvas.keys.COMMA\` | Comma (,) |
| \`canvas.keys.PERIOD\` | Period (.) |
| \`canvas.keys.SLASH\` | Slash (/) |

## Mouse Input

### canvas.get_mouse_x()

Get the current mouse X position.

**Returns:**
- (number): Mouse X coordinate relative to canvas

### canvas.get_mouse_y()

Get the current mouse Y position.

**Returns:**
- (number): Mouse Y coordinate relative to canvas

### canvas.is_mouse_down(button)

Check if a mouse button is currently held down.

**Parameters:**
- \`button\` (number): Button number (0 = left, 1 = middle, 2 = right)

**Returns:**
- (boolean): True if button is held

### canvas.is_mouse_pressed(button)

Check if a mouse button was pressed this frame. Returns true only on the frame the button was first pressed.

**Parameters:**
- \`button\` (number): Button number (0 = left, 1 = middle, 2 = right)

**Returns:**
- (boolean): True if button was just pressed

\`\`\`lua
if canvas.is_mouse_pressed(0) then
  -- Left mouse button was just clicked
  shoot_at(canvas.get_mouse_x(), canvas.get_mouse_y())
end
\`\`\`

## Example: Moving Square

\`\`\`lua
local canvas = require('canvas')

-- Set canvas size
canvas.set_size(800, 600)

local x, y = 100, 100
local speed = 200

canvas.on_draw(function()
  -- Handle input
  local dt = canvas.get_delta()

  if canvas.is_key_down('ArrowLeft') then
    x = x - speed * dt
  end
  if canvas.is_key_down('ArrowRight') then
    x = x + speed * dt
  end
  if canvas.is_key_down('ArrowUp') then
    y = y - speed * dt
  end
  if canvas.is_key_down('ArrowDown') then
    y = y + speed * dt
  end

  -- Keep player in bounds
  if x < 0 then x = 0 end
  if x > canvas.get_width() - 50 then x = canvas.get_width() - 50 end
  if y < 0 then y = 0 end
  if y > canvas.get_height() - 50 then y = canvas.get_height() - 50 end

  -- Draw
  canvas.clear()
  canvas.set_color(255, 100, 0)
  canvas.fill_rect(x, y, 50, 50)
end)
\`\`\`
`
}
