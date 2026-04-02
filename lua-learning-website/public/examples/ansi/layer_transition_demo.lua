-- Layer Transition Bug Demo
-- Demonstrates that dither_out/swipe_out with a `layers` parameter
-- transitions the ENTIRE screen to black instead of just hiding the
-- specified layer. The dither_in/swipe_in variants work correctly.
--
-- Expected: dither_out hides only the targeted layer, revealing layers below.
-- Actual bug: dither_out transitions the whole screen to black.

local ansi = require("ansi")

-- Helper: create a full 25x80 grid filled with a single cell
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

-- Helper: HSV to RGB (for rainbow gradient)
local function hsv_to_rgb(h, s, v)
  local c = v * s
  local x = c * (1 - math.abs((h / 60) % 2 - 1))
  local m = v - c
  local r, g, b
  if h < 60 then r, g, b = c, x, 0
  elseif h < 120 then r, g, b = x, c, 0
  elseif h < 180 then r, g, b = 0, c, x
  elseif h < 240 then r, g, b = 0, x, c
  elseif h < 300 then r, g, b = x, 0, c
  else r, g, b = c, 0, x
  end
  return math.floor((r + m) * 255), math.floor((g + m) * 255), math.floor((b + m) * 255)
end

-----------------------------------------------------------------------
-- Layer 1: Rainbow gradient background (always visible)
-----------------------------------------------------------------------
local bg_grid = make_grid(" ", {170, 170, 170}, {0, 0, 0})
for row = 1, 24 do -- leave row 25 for status
  for col = 1, 80 do
    local hue = (col - 1) / 80 * 360
    -- Darken slightly toward the bottom for visual depth
    local val = 0.9 - (row - 1) / 24 * 0.3
    local r, g, b = hsv_to_rgb(hue, 0.7, val)
    bg_grid[row][col] = { char = " ", fg = {170, 170, 170}, bg = {r, g, b} }
  end
end

-----------------------------------------------------------------------
-- Layer 2: Black rectangle (centered, cols 25-56, rows 6-19)
-----------------------------------------------------------------------
local rect_grid = make_grid(" ", {170, 170, 170}, {0, 0, 0})
for row = 6, 19 do
  for col = 25, 56 do
    rect_grid[row][col] = { char = " ", fg = {200, 200, 200}, bg = {20, 20, 30} }
  end
end
-- Add a subtle border
for col = 25, 56 do
  rect_grid[6][col]  = { char = "-", fg = {100, 100, 120}, bg = {20, 20, 30} }
  rect_grid[19][col] = { char = "-", fg = {100, 100, 120}, bg = {20, 20, 30} }
end
for row = 6, 19 do
  rect_grid[row][25] = { char = "|", fg = {100, 100, 120}, bg = {20, 20, 30} }
  rect_grid[row][56] = { char = "|", fg = {100, 100, 120}, bg = {20, 20, 30} }
end
rect_grid[6][25]  = { char = "+", fg = {100, 100, 120}, bg = {20, 20, 30} }
rect_grid[6][56]  = { char = "+", fg = {100, 100, 120}, bg = {20, 20, 30} }
rect_grid[19][25] = { char = "+", fg = {100, 100, 120}, bg = {20, 20, 30} }
rect_grid[19][56] = { char = "+", fg = {100, 100, 120}, bg = {20, 20, 30} }

-----------------------------------------------------------------------
-- Layer 3: Yellow circle (ellipse centered at col 40, row 12)
-----------------------------------------------------------------------
local circle_grid = make_grid(" ", {170, 170, 170}, {0, 0, 0})
local cx, cy = 40, 12
local rx, ry = 10, 5
for row = 1, 24 do
  for col = 1, 80 do
    local dx = (col - cx) / rx
    local dy = (row - cy) / ry
    if dx * dx + dy * dy <= 1 then
      circle_grid[row][col] = { char = " ", fg = {170, 170, 170}, bg = {220, 200, 40} }
    end
  end
end

-----------------------------------------------------------------------
-- Assemble V4 screen with group nesting:
--   gradient-bg (always visible)
--   box-group (group, visible)
--     black-rect (starts hidden)
--     yellow-circle (starts hidden)
-----------------------------------------------------------------------
local data = {
  version = 4,
  width = 80,
  height = 25,
  layers = {
    { type = "drawn", id = "gradient-bg",    name = "Gradient BG",    visible = true,  grid = bg_grid },
    { type = "group", id = "box-group",      name = "Box Group",      visible = true,  collapsed = false },
    { type = "drawn", id = "black-rect",     name = "Black Rect",     visible = false, grid = rect_grid,   parentId = "box-group" },
    { type = "drawn", id = "yellow-circle",  name = "Yellow Circle",  visible = false, grid = circle_grid, parentId = "box-group" },
  },
}

local screen = ansi.create_screen(data)
ansi.set_screen(screen)

-- Track whether a transition is running to avoid overlapping
local transitioning = false
local DURATION = 0.5

-- Helper: draw the status/instructions bar on row 25
local function draw_status()
  -- Get current layer states
  local layers = screen:get_layers()
  local rect_vis = false
  local circle_vis = false
  for _, l in ipairs(layers) do
    if l.id == "black-rect" then rect_vis = l.visible end
    if l.id == "yellow-circle" then circle_vis = l.visible end
  end

  -- Row 25: status line
  ansi.set_cursor(25, 1)
  ansi.background(30, 30, 40)
  ansi.foreground(200, 200, 200)
  ansi.print(" 1:Rect ON  2:Circle ON  3:Circle OFF  4:Rect OFF  5:Group ON  6:Group OFF  R:Reset ")

  -- Row 24: layer state display
  ansi.set_cursor(24, 1)
  ansi.background(30, 30, 40)
  ansi.foreground(180, 180, 180)
  ansi.print(" Rect:")
  if rect_vis then
    ansi.foreground(85, 255, 85)
    ansi.print("ON ")
  else
    ansi.foreground(255, 85, 85)
    ansi.print("OFF")
  end
  ansi.foreground(180, 180, 180)
  ansi.print("  Circle:")
  if circle_vis then
    ansi.foreground(85, 255, 85)
    ansi.print("ON ")
  else
    ansi.foreground(255, 85, 85)
    ansi.print("OFF")
  end
  ansi.foreground(180, 180, 180)
  if screen:is_transitioning() then
    ansi.foreground(255, 255, 85)
    ansi.print("  [TRANSITIONING]                              ")
  else
    ansi.print("                                               ")
  end
end

ansi.tick(function()
  transitioning = screen:is_transitioning()

  draw_status()

  -- Only accept input when no transition is running
  if transitioning then return end

  -- 1: Dither IN the black rectangle
  if ansi.is_key_pressed("1") then
    screen:dither_in({ layers = "black-rect", duration = DURATION })
  end

  -- 2: Dither IN the yellow circle
  if ansi.is_key_pressed("2") then
    screen:dither_in({ layers = "yellow-circle", duration = DURATION })
  end

  -- 3: Dither OUT the yellow circle (BUG: expect circle dissolves, rect+gradient stay)
  if ansi.is_key_pressed("3") then
    screen:dither_out({ layers = "yellow-circle", duration = DURATION })
  end

  -- 4: Dither OUT the black rectangle (BUG: expect rect dissolves, gradient stays)
  if ansi.is_key_pressed("4") then
    screen:dither_out({ layers = "black-rect", duration = DURATION })
  end

  -- 5: Dither IN the entire box-group (both rect + circle)
  if ansi.is_key_pressed("5") then
    -- Turn on both children first so they're visible when group shows
    screen:layer_on("black-rect")
    screen:layer_on("yellow-circle")
    screen:dither_in({ layers = "box-group", duration = DURATION })
  end

  -- 6: Dither OUT the entire box-group (BUG: expect both dissolve, gradient stays)
  if ansi.is_key_pressed("6") then
    screen:dither_out({ layers = "box-group", duration = DURATION })
  end

  -- R: Reset all overlay layers to hidden (instant)
  if ansi.is_key_pressed("r") then
    screen:layer_off("black-rect")
    screen:layer_off("yellow-circle")
    screen:layer_on("box-group")
  end

  -- Escape: exit
  if ansi.is_key_pressed("escape") then
    ansi.stop()
  end
end)

print("Layer Transition Bug Demo")
print("=========================")
print("This demo shows dither_in/dither_out with the 'layers' parameter.")
print("dither_in should work correctly. dither_out should ONLY hide the")
print("targeted layer, but instead it transitions the whole screen to black.")
print("")
print("Press keys 1-6 to test. R to reset. ESC to exit.")
print("")
ansi.start()
print("Demo finished!")
