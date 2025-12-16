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

### canvas.onDraw(callback)

Register the draw callback function. This callback is called once per frame (~60fps).
All drawing operations should be performed inside this callback.

**Parameters:**
- \`callback\` (function): Function to call each frame

\`\`\`lua
canvas.onDraw(function()
  canvas.clear()
  canvas.setColor(255, 0, 0)
  canvas.fillRect(10, 10, 50, 50)
end)
\`\`\`

## Drawing Functions

### canvas.clear()

Clear the canvas with the current background color.

### canvas.setColor(r, g, b, a)

Set the drawing color. All subsequent drawing operations will use this color.

**Parameters:**
- \`r\` (number): Red component (0-255)
- \`g\` (number): Green component (0-255)
- \`b\` (number): Blue component (0-255)
- \`a\` (number, optional): Alpha component (0-255, default: 255)

\`\`\`lua
canvas.setColor(255, 0, 0)       -- Red
canvas.setColor(0, 255, 0, 128)  -- Semi-transparent green
\`\`\`

### canvas.rect(x, y, width, height)

Draw a rectangle outline.

**Parameters:**
- \`x\` (number): X coordinate of top-left corner
- \`y\` (number): Y coordinate of top-left corner
- \`width\` (number): Width of rectangle
- \`height\` (number): Height of rectangle

### canvas.fillRect(x, y, width, height)

Draw a filled rectangle.

**Parameters:**
- \`x\` (number): X coordinate of top-left corner
- \`y\` (number): Y coordinate of top-left corner
- \`width\` (number): Width of rectangle
- \`height\` (number): Height of rectangle

### canvas.circle(x, y, radius)

Draw a circle outline.

**Parameters:**
- \`x\` (number): X coordinate of center
- \`y\` (number): Y coordinate of center
- \`radius\` (number): Radius of circle

### canvas.fillCircle(x, y, radius)

Draw a filled circle.

**Parameters:**
- \`x\` (number): X coordinate of center
- \`y\` (number): Y coordinate of center
- \`radius\` (number): Radius of circle

### canvas.line(x1, y1, x2, y2)

Draw a line between two points.

**Parameters:**
- \`x1\` (number): X coordinate of start point
- \`y1\` (number): Y coordinate of start point
- \`x2\` (number): X coordinate of end point
- \`y2\` (number): Y coordinate of end point

### canvas.text(x, y, text)

Draw text at the specified position.

**Parameters:**
- \`x\` (number): X coordinate
- \`y\` (number): Y coordinate
- \`text\` (string): Text to draw

## Timing Functions

### canvas.getDelta()

Get the time elapsed since the last frame (in seconds).
Use this for frame-rate independent movement.

**Returns:**
- (number): Time since last frame in seconds

\`\`\`lua
local speed = 100 -- pixels per second
x = x + speed * canvas.getDelta()
\`\`\`

### canvas.getTime()

Get the total time since the game started (in seconds).

**Returns:**
- (number): Total elapsed time in seconds

## Keyboard Input

### canvas.isKeyDown(key)

Check if a key is currently held down.

**Parameters:**
- \`key\` (string): Key name (e.g., 'ArrowUp', 'ArrowDown', 'a', 'Space')

**Returns:**
- (boolean): True if key is currently held

\`\`\`lua
if canvas.isKeyDown('ArrowUp') then
  y = y - speed * canvas.getDelta()
end
\`\`\`

### canvas.isKeyPressed(key)

Check if a key was pressed this frame. Returns true only on the frame the key was first pressed.

**Parameters:**
- \`key\` (string): Key name

**Returns:**
- (boolean): True if key was just pressed

\`\`\`lua
if canvas.isKeyPressed('Space') then
  jump()
end
\`\`\`

## Mouse Input

### canvas.getMouseX()

Get the current mouse X position.

**Returns:**
- (number): Mouse X coordinate relative to canvas

### canvas.getMouseY()

Get the current mouse Y position.

**Returns:**
- (number): Mouse Y coordinate relative to canvas

### canvas.isMouseDown(button)

Check if a mouse button is currently held down.

**Parameters:**
- \`button\` (number): Button number (0 = left, 1 = middle, 2 = right)

**Returns:**
- (boolean): True if button is held

\`\`\`lua
if canvas.isMouseDown(0) then
  -- Left mouse button is held
  shootAt(canvas.getMouseX(), canvas.getMouseY())
end
\`\`\`

## Example: Moving Square

\`\`\`lua
local x, y = 100, 100
local speed = 200

canvas.onDraw(function()
  -- Handle input
  local dt = canvas.getDelta()

  if canvas.isKeyDown('ArrowLeft') then
    x = x - speed * dt
  end
  if canvas.isKeyDown('ArrowRight') then
    x = x + speed * dt
  end
  if canvas.isKeyDown('ArrowUp') then
    y = y - speed * dt
  end
  if canvas.isKeyDown('ArrowDown') then
    y = y + speed * dt
  end

  -- Draw
  canvas.clear()
  canvas.setColor(255, 100, 0)
  canvas.fillRect(x, y, 50, 50)
end)
\`\`\`
`
}
