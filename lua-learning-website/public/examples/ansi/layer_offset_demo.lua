-- Layer Offset Demo
-- Demonstrates: set_layer_offset, get_layer_offset, pan
-- Two scenes placed side-by-side using layer offsets (no reference layers needed),
-- with a smooth cinematic pan between them.

local ansi = require("ansi")

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

-- Scene 1: forest green gradient with label
local s1 = make_grid(" ", {170, 170, 170}, {0, 0, 0})
for row = 1, 25 do
  for col = 1, 80 do
    local g = math.floor(col / 80 * 120) + 60
    local b = math.floor(row / 25 * 40)
    s1[row][col] = { char = " ", fg = {170, 170, 170}, bg = {20, g, b} }
  end
end
local text1 = "SCENE 1 - FOREST"
local start1 = math.floor((80 - #text1) / 2) + 1
for i = 1, #text1 do
  s1[12][start1 + i - 1] = { char = text1:sub(i, i), fg = {255, 255, 255}, bg = {20, 100, 30} }
end

-- Scene 2: desert orange gradient with label
local s2 = make_grid(" ", {170, 170, 170}, {0, 0, 0})
for row = 1, 25 do
  for col = 1, 80 do
    local r = math.floor(col / 80 * 160) + 80
    local g = math.floor((25 - row) / 25 * 100) + 50
    s2[row][col] = { char = " ", fg = {170, 170, 170}, bg = {r, g, 30} }
  end
end
local text2 = "SCENE 2 - DESERT"
local start2 = math.floor((80 - #text2) / 2) + 1
for i = 1, #text2 do
  s2[12][start2 + i - 1] = { char = text2:sub(i, i), fg = {255, 255, 255}, bg = {180, 100, 30} }
end

-- Create screen with two visible drawn layers (both at default position)
local screen = ansi.create_screen({
  version = 4, width = 80, height = 25,
  layers = {
    { id = "forest", name = "Forest", type = "drawn", visible = true,
      grid = s1, frames = { s1 } },
    { id = "desert", name = "Desert", type = "drawn", visible = true,
      grid = s2, frames = { s2 } },
  }
})

-- Use set_layer_offset to position the desert scene at column 80
-- This creates a 160-column virtual canvas without needing reference layers
screen:set_layer_offset("desert", 80, 0)

ansi.set_screen(screen)

local pan_duration = 2.0

ansi.tick(function()
  -- Draw status bar
  ansi.set_cursor(25, 1)
  ansi.foreground(200, 200, 200)
  ansi.background(30, 30, 30)
  local vp_col, vp_row = screen:get_viewport()
  local off_col, off_row = screen:get_layer_offset("desert")
  local panning = screen:is_panning() and "YES" or "no"
  local s = string.format(
    " [1]Pan right [2]Pan left  VP:(%d,%d) Desert offset:(%d,%d) Pan:%s  ESC",
    math.floor(vp_col), math.floor(vp_row), off_col, off_row, panning
  )
  ansi.print(s .. string.rep(" ", 80 - #s))

  if not screen:is_panning() then
    if ansi.is_key_pressed("1") then
      screen:pan({ col = 80, duration = pan_duration })
    elseif ansi.is_key_pressed("2") then
      screen:pan({ col = 0, duration = pan_duration })
    end
  end

  if ansi.is_key_pressed("escape") then ansi.stop() end
end)

ansi.start()
print("Layer offset demo finished!")
