# Input Handling

Handle keyboard and mouse input for interactive applications.

## Keyboard Input

### canvas.is_key_down(key)

Check if a key is currently held down.

**Parameters:**
- `key` (string): Key name (e.g., 'w', 'ArrowUp', or use `canvas.keys.W`)

**Returns:**
- (boolean): True if key is currently held

```lua
if canvas.is_key_down('w') then
  y = y - speed * canvas.get_delta()
end

-- Or use key constants
if canvas.is_key_down(canvas.keys.W) then
  y = y - speed * canvas.get_delta()
end
```

### canvas.is_key_pressed(key)

Check if a key was pressed this frame. Returns true only on the frame the key was first pressed.

**Parameters:**
- `key` (string): Key name

**Returns:**
- (boolean): True if key was just pressed this frame

### canvas.get_keys_down()

Get all keys currently held down.

**Returns:**
- (table): Array of key codes in KeyboardEvent.code format

### canvas.get_keys_pressed()

Get all keys pressed this frame.

**Returns:**
- (table): Array of key codes pressed this frame

## Key Constants

The `canvas.keys` table provides named constants for all keyboard keys.
These can be used with `is_key_down()` and `is_key_pressed()`.

### Letters
`canvas.keys.A` through `canvas.keys.Z` (maps to KeyA-KeyZ)

### Number Row
`canvas.keys.DIGIT_0` through `canvas.keys.DIGIT_9`
(or `canvas.keys['0']` through `canvas.keys['9']`)

### Arrow Keys
- `canvas.keys.UP`, `canvas.keys.DOWN`, `canvas.keys.LEFT`, `canvas.keys.RIGHT`
- Also: `canvas.keys.ARROW_UP`, `canvas.keys.ARROW_DOWN`, etc.

### Function Keys
`canvas.keys.F1` through `canvas.keys.F12`

### Modifier Keys
- `canvas.keys.SHIFT`, `canvas.keys.CTRL`, `canvas.keys.ALT`, `canvas.keys.META`
- `canvas.keys.CAPS_LOCK`
- With _LEFT/_RIGHT variants: `canvas.keys.SHIFT_LEFT`, `canvas.keys.SHIFT_RIGHT`

### Special Keys
- `canvas.keys.SPACE`
- `canvas.keys.ENTER`
- `canvas.keys.ESCAPE`
- `canvas.keys.TAB`
- `canvas.keys.BACKSPACE`
- `canvas.keys.DELETE`
- `canvas.keys.INSERT`
- `canvas.keys.HOME`, `canvas.keys.END`
- `canvas.keys.PAGE_UP`, `canvas.keys.PAGE_DOWN`

### Numpad
- `canvas.keys.NUMPAD_0` through `canvas.keys.NUMPAD_9`
- `canvas.keys.NUMPAD_ADD`, `canvas.keys.NUMPAD_SUBTRACT`
- `canvas.keys.NUMPAD_MULTIPLY`, `canvas.keys.NUMPAD_DIVIDE`
- `canvas.keys.NUMPAD_DECIMAL`, `canvas.keys.NUMPAD_ENTER`

### Punctuation
- `canvas.keys.MINUS`, `canvas.keys.EQUAL`
- `canvas.keys.BRACKET_LEFT`, `canvas.keys.BRACKET_RIGHT`
- `canvas.keys.BACKSLASH`, `canvas.keys.SEMICOLON`
- `canvas.keys.QUOTE`, `canvas.keys.BACKQUOTE`
- `canvas.keys.COMMA`, `canvas.keys.PERIOD`, `canvas.keys.SLASH`

## Mouse Input

### canvas.get_mouse_x()

Get the current mouse X position relative to canvas.

**Returns:**
- (number): X coordinate of mouse

### canvas.get_mouse_y()

Get the current mouse Y position relative to canvas.

**Returns:**
- (number): Y coordinate of mouse

### canvas.is_mouse_down(button)

Check if a mouse button is currently held down.

**Parameters:**
- `button` (number): Button number (0 = left, 1 = middle, 2 = right)

**Returns:**
- (boolean): True if button is held

### canvas.is_mouse_pressed(button)

Check if a mouse button was pressed this frame.

**Parameters:**
- `button` (number): Button number (0 = left, 1 = middle, 2 = right)

**Returns:**
- (boolean): True if button was just pressed

```lua
if canvas.is_mouse_pressed(0) then
  -- Left mouse button was just clicked
  shoot_at(canvas.get_mouse_x(), canvas.get_mouse_y())
end
```

## Example: WASD Movement

```lua
local canvas = require('canvas')

canvas.set_size(800, 600)

local x, y = 100, 100
local speed = 200

local function user_input()
  local dt = canvas.get_delta()

  if canvas.is_key_down(canvas.keys.A) or canvas.is_key_down(canvas.keys.LEFT) then
    x = x - speed * dt
  end
  if canvas.is_key_down(canvas.keys.D) or canvas.is_key_down(canvas.keys.RIGHT) then
    x = x + speed * dt
  end
  if canvas.is_key_down(canvas.keys.W) or canvas.is_key_down(canvas.keys.UP) then
    y = y - speed * dt
  end
  if canvas.is_key_down(canvas.keys.S) or canvas.is_key_down(canvas.keys.DOWN) then
    y = y + speed * dt
  end
end

local function update()
  -- Keep player in bounds
  x = math.max(25, math.min(canvas.get_width() - 25, x))
  y = math.max(25, math.min(canvas.get_height() - 25, y))
end

local function draw()
  canvas.clear()
  canvas.set_color(255, 100, 0)
  canvas.fill_circle(x, y, 25)
end

local function game()
  user_input()
  update()
  draw()
end

canvas.tick(game)
canvas.start()
```

---

[← Back to Canvas Library](../canvas.md)
