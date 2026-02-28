-- Load Screen Demo
-- Demonstrates ansi.load_screen() for loading .ansi.lua art files.
-- This is the recommended way to display pre-made ANSI art.

local ansi = require("ansi")

-- Load the art file using ansi.load_screen()
-- This reads and executes the .ansi.lua file, then creates a screen object.
local screen = ansi.load_screen("sample_art.ansi.lua")

-- Set it as the active background
ansi.set_screen(screen)

-- Show layer info
local layers = screen:get_layers()
print("Loaded screen with " .. #layers .. " layer(s):")
for i, layer in ipairs(layers) do
  print("  " .. i .. ". " .. layer.name .. " (visible=" .. tostring(layer.visible) .. ")")
end

-- Track time for blinking text
local blink_timer = 0
local show_text = true

ansi.tick(function()
  -- The loaded art renders automatically as the background.
  -- We draw overlay text on top.

  blink_timer = blink_timer + ansi.get_delta()
  if blink_timer > 0.5 then
    blink_timer = 0
    show_text = not show_text
  end

  -- Draw a title bar
  ansi.set_cursor(1, 1)
  ansi.foreground(255, 255, 0)
  ansi.print("  Load Screen Demo")

  -- Draw info text
  ansi.set_cursor(3, 1)
  ansi.foreground(200, 200, 200)
  ansi.print("  Art loaded via ansi.load_screen(\"sample_art.ansi.lua\")")

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
  ansi.print("  Background loaded from .ansi.lua file")

  -- Check for exit
  if ansi.is_key_pressed("escape") then
    ansi.stop()
  end
end)

ansi.start()
print("Demo finished!")
