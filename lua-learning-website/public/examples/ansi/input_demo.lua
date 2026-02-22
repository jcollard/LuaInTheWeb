-- ansi/input_demo.lua
-- Demonstrates: Keyboard input handling in ANSI terminal
-- Features: is_key_down, is_key_pressed, get_keys_pressed, keys constants

local ansi = require("ansi")

local x = 40
local y = 12
local trail = {}
local max_trail = 20
local speed = 20

ansi.tick(function()
  local dt = ansi.get_delta()

  -- Move with arrow keys
  if ansi.is_key_down(ansi.keys.UP) or ansi.is_key_down("w") then
    y = y - speed * dt
  end
  if ansi.is_key_down(ansi.keys.DOWN) or ansi.is_key_down("s") then
    y = y + speed * dt
  end
  if ansi.is_key_down(ansi.keys.LEFT) or ansi.is_key_down("a") then
    x = x - speed * dt
  end
  if ansi.is_key_down(ansi.keys.RIGHT) or ansi.is_key_down("d") then
    x = x + speed * dt
  end

  -- Clamp to terminal bounds
  x = math.max(1, math.min(ansi.COLS, x))
  y = math.max(2, math.min(ansi.ROWS - 1, y))

  -- Add to trail
  table.insert(trail, {math.floor(x), math.floor(y)})
  if #trail > max_trail then
    table.remove(trail, 1)
  end

  -- Draw
  ansi.clear()

  -- Header
  ansi.set_cursor(1, 1)
  ansi.foreground(255, 255, 85)
  ansi.print("Arrow keys or WASD to move | ")
  ansi.foreground(170, 170, 170)
  ansi.print(string.format("Pos: %d, %d", math.floor(x), math.floor(y)))

  -- Draw trail
  for i, pos in ipairs(trail) do
    local brightness = math.floor(i / #trail * 200) + 55
    ansi.set_cursor(pos[2], pos[1])
    ansi.foreground(0, brightness, brightness)
    ansi.print(".")
  end

  -- Draw player
  ansi.set_cursor(math.floor(y), math.floor(x))
  ansi.foreground(85, 255, 85)
  ansi.print("@")

  -- Show pressed keys
  ansi.set_cursor(ansi.ROWS, 1)
  ansi.foreground(85, 85, 85)
  local pressed = ansi.get_keys_pressed()
  if #pressed > 0 then
    ansi.print("Pressed: " .. table.concat(pressed, ", "))
  else
    ansi.print("Press Ctrl+C to exit")
  end
end)

ansi.start()
