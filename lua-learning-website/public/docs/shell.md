# Shell Library

The shell library provides functions for terminal control including colors, cursor movement, and screen management.

## Loading the Library

```lua
local shell = require('shell')
```

## Color Constants

The following color constants are available for use with `shell.foreground()` and `shell.background()`:

| Constant | Description |
|----------|-------------|
| `shell.BLACK` | Black color |
| `shell.RED` | Red color |
| `shell.GREEN` | Green color |
| `shell.YELLOW` | Yellow color |
| `shell.BLUE` | Blue color |
| `shell.MAGENTA` | Magenta color |
| `shell.CYAN` | Cyan color |
| `shell.WHITE` | White color |

## Screen Control

### shell.clear()

Clears the terminal screen.

```lua
shell.clear()
```

## Color Control

### shell.foreground(color)

Sets the text foreground color.

**Parameters:**
- `color` (number): One of the color constants (e.g., `shell.RED`)

```lua
shell.foreground(shell.GREEN)
print("This text is green!")
```

### shell.background(color)

Sets the text background color.

**Parameters:**
- `color` (number): One of the color constants (e.g., `shell.BLUE`)

```lua
shell.background(shell.BLUE)
print("This has a blue background!")
```

### shell.reset()

Resets all color attributes to their defaults.

```lua
shell.reset()
```

## Cursor Control

### shell.set_cursor(row, col)

Moves the cursor to the specified position.

**Parameters:**
- `row` (number): The row number (1-based)
- `col` (number): The column number (1-based)

```lua
shell.set_cursor(5, 10)
print("Text at row 5, column 10")
```

### shell.cursor_up(n)

Moves the cursor up by `n` lines.

**Parameters:**
- `n` (number, optional): Number of lines to move (default: 1)

### shell.cursor_down(n)

Moves the cursor down by `n` lines.

**Parameters:**
- `n` (number, optional): Number of lines to move (default: 1)

### shell.cursor_left(n)

Moves the cursor left by `n` columns.

**Parameters:**
- `n` (number, optional): Number of columns to move (default: 1)

### shell.cursor_right(n)

Moves the cursor right by `n` columns.

**Parameters:**
- `n` (number, optional): Number of columns to move (default: 1)

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

```lua
local w = shell.width()
print("Terminal is " .. w .. " columns wide")
```

### shell.height()

Returns the height of the terminal in rows.

**Returns:**
- (number): The terminal height

```lua
local h = shell.height()
print("Terminal is " .. h .. " rows tall")
```

## Example: Colorful Output

```lua
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
```

## Example: Drawing a Box

```lua
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
```
