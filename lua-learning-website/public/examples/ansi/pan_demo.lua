-- Viewport Pan Demo
-- Demonstrates: pan, set_viewport, get_viewport, is_panning
-- Two full-screen scenes placed side-by-side using reference layers,
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

-- Scene 1: ocean blue gradient with "SCENE 1" label
local s1 = make_grid(" ", {170, 170, 170}, {0, 0, 0})
for row = 1, 25 do
  for col = 1, 80 do
    local b = math.floor(col / 80 * 180) + 40
    local g = math.floor(row / 25 * 80) + 20
    s1[row][col] = { char = " ", fg = {170, 170, 170}, bg = {10, g, b} }
  end
end
local text1 = "SCENE 1 - OCEAN"
local start1 = math.floor((80 - #text1) / 2) + 1
for i = 1, #text1 do
  s1[12][start1 + i - 1] = { char = text1:sub(i, i), fg = {255, 255, 255}, bg = {30, 60, 180} }
end

-- Scene 2: sunset orange gradient with "SCENE 2" label
local s2 = make_grid(" ", {170, 170, 170}, {0, 0, 0})
for row = 1, 25 do
  for col = 1, 80 do
    local r = math.floor(col / 80 * 200) + 55
    local g = math.floor((25 - row) / 25 * 120) + 30
    s2[row][col] = { char = " ", fg = {170, 170, 170}, bg = {r, g, 20} }
  end
end
local text2 = "SCENE 2 - SUNSET"
local start2 = math.floor((80 - #text2) / 2) + 1
for i = 1, #text2 do
  s2[12][start2 + i - 1] = { char = text2:sub(i, i), fg = {255, 255, 255}, bg = {200, 80, 20} }
end

-- Create screen with two scenes + reference layers to position them side-by-side
local screen = ansi.create_screen({
  version = 4, width = 80, height = 25,
  layers = {
    -- Source layers (hidden, used as reference sources)
    { id = "src1", name = "Source 1", type = "drawn", visible = false,
      grid = s1, frames = { s1 } },
    { id = "src2", name = "Source 2", type = "drawn", visible = false,
      grid = s2, frames = { s2 } },
    -- Reference layers positioned side-by-side
    { id = "ref1", name = "Scene 1 (at col 0)", type = "reference", visible = true,
      sourceLayerId = "src1", offsetRow = 0, offsetCol = 0 },
    { id = "ref2", name = "Scene 2 (at col 80)", type = "reference", visible = true,
      sourceLayerId = "src2", offsetRow = 0, offsetCol = 80 },
  }
})
ansi.set_screen(screen)

local pan_duration = 2.0

ansi.tick(function()
  -- Draw status bar
  ansi.set_cursor(25, 1)
  ansi.foreground(200, 200, 200)
  ansi.background(30, 30, 30)
  local col, row = screen:get_viewport()
  local panning = screen:is_panning() and "YES" or "no"
  local s = string.format(
    " [1]Pan right [2]Pan left [J]Jump right [K]Jump left  VP:(%d,%d) Pan:%s  ESC",
    math.floor(col), math.floor(row), panning
  )
  ansi.print(s .. string.rep(" ", 80 - #s))

  if not screen:is_panning() then
    if ansi.is_key_pressed("1") then
      -- Pan from current position to scene 2
      screen:pan({ col = 80, duration = pan_duration })
    elseif ansi.is_key_pressed("2") then
      -- Pan from current position to scene 1
      screen:pan({ col = 0, duration = pan_duration })
    elseif ansi.is_key_pressed("j") then
      -- Instant jump to scene 2
      screen:set_viewport(80, 0)
    elseif ansi.is_key_pressed("k") then
      -- Instant jump to scene 1
      screen:set_viewport(0, 0)
    end
  end

  if ansi.is_key_pressed("escape") then ansi.stop() end
end)

ansi.start()
print("Pan demo finished!")
