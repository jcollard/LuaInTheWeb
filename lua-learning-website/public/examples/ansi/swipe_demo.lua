-- Screen Transitions Demo
-- Demonstrates: swipe_out, swipe_in, dither_out, dither_in with directions,
-- multi-layer transitions, and per-layer swipe/dither out.
-- Controls shown at bottom of screen.

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

-- Scene 1: cool blue gradient
local s1 = make_grid(" ", {170, 170, 170}, {0, 0, 0})
for row = 1, 25 do
  for col = 1, 80 do
    local b = math.floor(col / 80 * 200) + 55
    local g = math.floor(row / 25 * 100)
    s1[row][col] = { char = " ", fg = {170, 170, 170}, bg = {0, g, b} }
  end
end

-- Scene 2: warm orange gradient
local s2 = make_grid(" ", {170, 170, 170}, {0, 0, 0})
for row = 1, 25 do
  for col = 1, 80 do
    local r = math.floor(col / 80 * 200) + 55
    local g = math.floor(row / 25 * 150)
    s2[row][col] = { char = " ", fg = {170, 170, 170}, bg = {r, g, 30} }
  end
end

-- Title overlay (used to demonstrate multi-layer transitions)
local title = make_grid(" ", {170, 170, 170}, {0, 0, 0})
local text = "TRANSITIONS DEMO"
local col0 = math.floor((80 - #text) / 2) + 1
for i = 1, #text do
  title[3][col0 + i - 1] = { char = text:sub(i, i), fg = {255, 255, 255}, bg = {50, 50, 120} }
end

local screen = ansi.create_screen({
  version = 4, width = 80, height = 25,
  layers = {
    { id = "scene1", name = "Scene 1", type = "drawn", visible = true,
      grid = s1, frames = { s1 } },
    { id = "scene2", name = "Scene 2", type = "drawn", visible = false,
      grid = s2, frames = { s2 } },
    { id = "title", name = "Title", type = "drawn", visible = true,
      grid = title, frames = { title } },
  }
})
ansi.set_screen(screen)

local dirs = { "right", "left", "down", "up", "down-right", "down-left", "up-right", "up-left" }
local dir_i = 1

ansi.tick(function()
  if not screen:is_transitioning() then
    ansi.set_cursor(25, 1)
    ansi.foreground(200, 200, 200)
    ansi.background(30, 30, 30)
    local s = string.format(
      " [O]ut [H]ideS1 [1]S1 [2]S2+Title [D]out [5]DhideTitle [Dir:%s] ESC",
      dirs[dir_i]
    )
    ansi.print(s .. string.rep(" ", 80 - #s))
  end

  if not screen:is_transitioning() then
    if ansi.is_key_pressed("o") then
      -- Full-screen swipe out to black
      screen:swipe_out({ duration = 0.8, direction = dirs[dir_i] })
    elseif ansi.is_key_pressed("h") then
      -- Per-layer swipe out: hide scene1 with transition
      screen:swipe_out({ layers = "scene1", duration = 0.8, direction = dirs[dir_i] })
    elseif ansi.is_key_pressed("1") then
      screen:layer_off("scene2")
      screen:layer_off("title")
      screen:swipe_in({ layers = "scene1", duration = 0.8, direction = dirs[dir_i] })
    elseif ansi.is_key_pressed("2") then
      screen:layer_off("scene1")
      screen:layer_off("title")
      -- Multi-layer: swipe in scene2 + title together
      screen:swipe_in({ layers = {"scene2", "title"}, duration = 0.8, direction = dirs[dir_i] })
    elseif ansi.is_key_pressed("d") then
      -- Full-screen dither out to black
      screen:dither_out({ duration = 1.5 })
    elseif ansi.is_key_pressed("5") then
      -- Per-layer dither out: dissolve away the title overlay
      screen:dither_out({ layers = "title", duration = 1.0 })
    elseif ansi.is_key_pressed("right") then
      dir_i = (dir_i % #dirs) + 1
    elseif ansi.is_key_pressed("left") then
      dir_i = ((dir_i - 2) % #dirs) + 1
    end
  end

  if ansi.is_key_pressed("escape") then ansi.stop() end
end)

ansi.start()
print("Transitions demo finished!")
