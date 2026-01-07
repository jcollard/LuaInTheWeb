# Input Handling

Handle keyboard, mouse, and gamepad input for interactive applications.

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

## Gamepad Input

Handle gamepad/controller input for console-style gameplay. Supports up to 4 connected gamepads.

### canvas.get_gamepad_count()

Get the number of connected gamepads.

**Returns:**
- (number): Number of connected gamepads (0-4)

```lua
local count = canvas.get_gamepad_count()
if count > 0 then
  -- At least one gamepad is connected
end
```

### canvas.is_gamepad_connected(index)

Check if a gamepad is connected at the given index.

**Parameters:**
- `index` (number): Gamepad index (1-based, so 1 for first gamepad)

**Returns:**
- (boolean): True if gamepad is connected

```lua
if canvas.is_gamepad_connected(1) then
  -- First gamepad is connected
end
```

### canvas.get_gamepad_button(gamepad_index, button)

Get the value of a gamepad button. Returns 0.0-1.0 for pressure-sensitive buttons (like triggers).

**Parameters:**
- `gamepad_index` (number): Gamepad index (1-based)
- `button` (number): Button constant from `canvas.buttons`

**Returns:**
- (number): Button value (0.0 = not pressed, 1.0 = fully pressed)

```lua
-- Check trigger pressure
local trigger = canvas.get_gamepad_button(1, canvas.buttons.RT)
if trigger > 0.5 then
  accelerate(trigger)  -- Use pressure for variable speed
end
```

### canvas.is_gamepad_button_pressed(gamepad_index, button)

Check if a gamepad button was pressed this frame. Returns true only on the frame the button was first pressed.

**Parameters:**
- `gamepad_index` (number): Gamepad index (1-based)
- `button` (number): Button constant from `canvas.buttons`

**Returns:**
- (boolean): True if button was just pressed

```lua
if canvas.is_gamepad_button_pressed(1, canvas.buttons.A) then
  jump()
end
```

### canvas.get_gamepad_axis(gamepad_index, axis)

Get the value of a gamepad analog axis. Left/Up returns negative, Right/Down returns positive.

**Parameters:**
- `gamepad_index` (number): Gamepad index (1-based)
- `axis` (number): Axis constant from `canvas.axes`

**Returns:**
- (number): Axis value (-1.0 to 1.0)

```lua
local move_x = canvas.get_gamepad_axis(1, canvas.axes.LEFT_STICK_X)
local move_y = canvas.get_gamepad_axis(1, canvas.axes.LEFT_STICK_Y)

-- Apply deadzone (ignore small movements)
if math.abs(move_x) < 0.1 then move_x = 0 end
if math.abs(move_y) < 0.1 then move_y = 0 end

x = x + move_x * speed * canvas.get_delta()
y = y + move_y * speed * canvas.get_delta()
```

## Button Constants

The `canvas.buttons` table provides constants for gamepad buttons. Multiple naming conventions are supported:

### Position-Based (Recommended)
Use these for cross-platform compatibility:
- `canvas.buttons.SOUTH` - Bottom face button (Xbox A / PlayStation Cross)
- `canvas.buttons.EAST` - Right face button (Xbox B / PlayStation Circle)
- `canvas.buttons.WEST` - Left face button (Xbox X / PlayStation Square)
- `canvas.buttons.NORTH` - Top face button (Xbox Y / PlayStation Triangle)

### Xbox-Style
- `canvas.buttons.A`, `canvas.buttons.B`, `canvas.buttons.X`, `canvas.buttons.Y`
- `canvas.buttons.LB`, `canvas.buttons.RB` - Bumpers
- `canvas.buttons.LT`, `canvas.buttons.RT` - Triggers
- `canvas.buttons.BACK`, `canvas.buttons.START`

### PlayStation-Style
- `canvas.buttons.CROSS`, `canvas.buttons.CIRCLE`, `canvas.buttons.SQUARE`, `canvas.buttons.TRIANGLE`
- `canvas.buttons.L1`, `canvas.buttons.R1` - Bumpers
- `canvas.buttons.L2`, `canvas.buttons.R2` - Triggers
- `canvas.buttons.L3`, `canvas.buttons.R3` - Stick clicks
- `canvas.buttons.SELECT`, `canvas.buttons.OPTIONS`, `canvas.buttons.SHARE`

### Generic Names
- `canvas.buttons.LEFT_BUMPER`, `canvas.buttons.RIGHT_BUMPER`
- `canvas.buttons.LEFT_TRIGGER`, `canvas.buttons.RIGHT_TRIGGER`
- `canvas.buttons.LEFT_STICK`, `canvas.buttons.RIGHT_STICK` (stick click buttons)
- `canvas.buttons.LS`, `canvas.buttons.RS` (stick click aliases)

### D-Pad
- `canvas.buttons.DPAD_UP`, `canvas.buttons.DPAD_DOWN`
- `canvas.buttons.DPAD_LEFT`, `canvas.buttons.DPAD_RIGHT`

### System Buttons
- `canvas.buttons.HOME`, `canvas.buttons.GUIDE`

## Axis Constants

The `canvas.axes` table provides constants for analog sticks:

- `canvas.axes.LEFT_STICK_X` - Left stick horizontal (-1 left, +1 right)
- `canvas.axes.LEFT_STICK_Y` - Left stick vertical (-1 up, +1 down)
- `canvas.axes.RIGHT_STICK_X` - Right stick horizontal (-1 left, +1 right)
- `canvas.axes.RIGHT_STICK_Y` - Right stick vertical (-1 up, +1 down)

## Example: Gamepad Movement

```lua
local canvas = require('canvas')

canvas.set_size(800, 600)

local x, y = 400, 300
local speed = 200
local deadzone = 0.15

local function user_input()
  local dt = canvas.get_delta()

  -- Check if gamepad is connected
  if canvas.is_gamepad_connected(1) then
    -- Analog stick movement
    local move_x = canvas.get_gamepad_axis(1, canvas.axes.LEFT_STICK_X)
    local move_y = canvas.get_gamepad_axis(1, canvas.axes.LEFT_STICK_Y)

    -- Apply deadzone
    if math.abs(move_x) < deadzone then move_x = 0 end
    if math.abs(move_y) < deadzone then move_y = 0 end

    x = x + move_x * speed * dt
    y = y + move_y * speed * dt

    -- D-pad movement (alternative)
    if canvas.get_gamepad_button(1, canvas.buttons.DPAD_LEFT) > 0 then
      x = x - speed * dt
    end
    if canvas.get_gamepad_button(1, canvas.buttons.DPAD_RIGHT) > 0 then
      x = x + speed * dt
    end
    if canvas.get_gamepad_button(1, canvas.buttons.DPAD_UP) > 0 then
      y = y - speed * dt
    end
    if canvas.get_gamepad_button(1, canvas.buttons.DPAD_DOWN) > 0 then
      y = y + speed * dt
    end
  end

  -- Keep in bounds
  x = math.max(25, math.min(canvas.get_width() - 25, x))
  y = math.max(25, math.min(canvas.get_height() - 25, y))
end

local function draw()
  canvas.clear()

  -- Show connection status
  if canvas.is_gamepad_connected(1) then
    canvas.set_color(0, 255, 0)
    canvas.draw_text(10, 20, "Gamepad Connected")
  else
    canvas.set_color(255, 100, 0)
    canvas.draw_text(10, 20, "Connect a gamepad to play")
  end

  -- Draw player
  canvas.set_color(100, 150, 255)
  canvas.fill_circle(x, y, 25)
end

local function game()
  user_input()
  draw()
end

canvas.tick(game)
canvas.start()
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

## Related Examples

- [Input Demo](../../examples/canvas/input/demo.lua) - Keyboard and mouse input handling

---

[← Back to Canvas Library](../canvas.md)
