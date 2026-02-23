-- ANSI Screen Display Demo
-- Demonstrates ansi.create_screen() and ansi.set_screen()
-- This creates a simple gradient image programmatically
-- and displays it as a terminal background.

local ansi = require("ansi")

-- Build a simple gradient image as a V1 format data table.
-- In real usage, you would load a .ansi.lua file:
--   local data = require("my_art.ansi")
local grid = {}
for row = 1, 25 do
  grid[row] = {}
  for col = 1, 80 do
    -- Create a gradient from blue to red across the screen
    local r = math.floor(col / 80 * 255)
    local g = math.floor(row / 25 * 100)
    local b = 255 - math.floor(col / 80 * 255)
    grid[row][col] = {
      char = " ",
      fg = {170, 170, 170},
      bg = {r, g, b},
    }
  end
end

local data = { version = 1, width = 80, height = 25, grid = grid }

-- Create the screen from our data
local screen = ansi.create_screen(data)

-- Set it as the active background
ansi.set_screen(screen)

-- Track time for animation
local blink_timer = 0
local show_text = true

ansi.tick(function()
  -- The background renders automatically each frame!
  -- We just draw text on top of it.

  blink_timer = blink_timer + ansi.get_delta()
  if blink_timer > 0.5 then
    blink_timer = 0
    show_text = not show_text
  end

  -- Draw a title bar
  ansi.set_cursor(1, 1)
  ansi.foreground(255, 255, 0)
  ansi.print("  ANSI Screen Display Demo")

  -- Draw instructions
  ansi.set_cursor(12, 25)
  ansi.foreground(255, 255, 255)
  if show_text then
    ansi.print("Press ESC to exit")
  else
    ansi.print("                 ")
  end

  -- Draw footer
  ansi.set_cursor(25, 1)
  ansi.foreground(200, 200, 200)
  ansi.print("  Background rendered via ansi.set_screen()")

  -- Check for exit
  if ansi.is_key_pressed("escape") then
    ansi.stop()
  end
end)

ansi.start()
print("Demo finished!")
