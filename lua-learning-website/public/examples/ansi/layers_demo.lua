-- Layer Visibility Demo
-- Demonstrates screen:get_layers(), layer_on(), layer_off(), and layer_toggle()
-- This creates a multi-layer image programmatically and lets you toggle layers.

local ansi = require("ansi")

-- Build a V4 multi-layer image with a background and foreground layer.
-- In real usage, you'd load a .ansi.lua file created in the editor.

-- Helper: create a full 25x80 grid filled with a single color
local function make_grid(char, fg, bg)
  local grid = {}
  for row = 1, 25 do
    grid[row] = {}
    for col = 1, 80 do
      grid[row][col] = { char = char, fg = fg, bg = bg }
    end
  end
  return grid
end

-- Background layer: blue gradient
local bg_grid = make_grid(" ", {170, 170, 170}, {0, 0, 0})
for row = 1, 25 do
  for col = 1, 80 do
    local b = math.floor(col / 80 * 200) + 55
    bg_grid[row][col] = { char = " ", fg = {170, 170, 170}, bg = {0, 0, b} }
  end
end

-- Foreground layer: a box in the center
local fg_grid = make_grid(" ", {170, 170, 170}, {0, 0, 0})
for row = 8, 18 do
  for col = 20, 60 do
    fg_grid[row][col] = { char = " ", fg = {255, 255, 255}, bg = {80, 40, 120} }
  end
end
-- Add border
for col = 20, 60 do
  fg_grid[8][col] = { char = "=", fg = {255, 255, 0}, bg = {80, 40, 120} }
  fg_grid[18][col] = { char = "=", fg = {255, 255, 0}, bg = {80, 40, 120} }
end
for row = 8, 18 do
  fg_grid[row][20] = { char = "|", fg = {255, 255, 0}, bg = {80, 40, 120} }
  fg_grid[row][60] = { char = "|", fg = {255, 255, 0}, bg = {80, 40, 120} }
end

-- Assemble as V4 format data
local data = {
  version = 4,
  width = 80,
  height = 25,
  activeLayerId = "bg",
  layers = {
    { type = "drawn", id = "bg", name = "Background", visible = true, grid = bg_grid },
    { type = "drawn", id = "fg", name = "Foreground", visible = true, grid = fg_grid },
  },
}

-- Create the screen
local screen = ansi.create_screen(data)
ansi.set_screen(screen)

-- Show layer info
local layers = screen:get_layers()
print("Layers in this screen:")
for i, layer in ipairs(layers) do
  print("  " .. i .. ". " .. layer.name .. " (" .. layer.type .. ") visible=" .. tostring(layer.visible))
end

ansi.tick(function()
  -- Draw instructions on top
  ansi.set_cursor(1, 1)
  ansi.foreground(255, 255, 255)
  ansi.print("  Layer Visibility Demo")

  ansi.set_cursor(3, 1)
  ansi.foreground(200, 200, 200)
  ansi.print("  Press 1 to toggle Background")

  ansi.set_cursor(4, 1)
  ansi.print("  Press 2 to toggle Foreground")

  ansi.set_cursor(5, 1)
  ansi.print("  Press ESC to exit")

  -- Show current layer states
  local current = screen:get_layers()
  for i, layer in ipairs(current) do
    ansi.set_cursor(20 + i, 3)
    if layer.visible then
      ansi.foreground(85, 255, 85)
      ansi.print("[ON]  " .. layer.name)
    else
      ansi.foreground(255, 85, 85)
      ansi.print("[OFF] " .. layer.name)
    end
  end

  -- Handle input
  if ansi.is_key_pressed("1") then
    screen:layer_toggle("Background")
  end
  if ansi.is_key_pressed("2") then
    screen:layer_toggle("Foreground")
  end
  if ansi.is_key_pressed("escape") then
    ansi.stop()
  end
end)

ansi.start()
print("Demo finished!")
