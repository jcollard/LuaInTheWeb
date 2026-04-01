-- Swipe Transition Demo
-- Demonstrates: screen:swipe_out(), screen:swipe_in(), screen:is_swiping()
-- Press O to swipe out, I to swipe in scene2, ESC to quit.

local ansi = require("ansi")

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

-- Scene 1: blue gradient (visible by default)
local scene1_grid = make_grid(" ", {170, 170, 170}, {0, 0, 0})
for row = 1, 25 do
  for col = 1, 80 do
    local b = math.floor(col / 80 * 200) + 55
    local g = math.floor(row / 25 * 100)
    scene1_grid[row][col] = { char = " ", fg = {170, 170, 170}, bg = {0, g, b} }
  end
end

-- Scene 2: warm gradient (hidden, used for swipe-in)
local scene2_grid = make_grid(" ", {170, 170, 170}, {0, 0, 0})
for row = 1, 25 do
  for col = 1, 80 do
    local r = math.floor(col / 80 * 200) + 55
    local g = math.floor(row / 25 * 150)
    scene2_grid[row][col] = { char = " ", fg = {170, 170, 170}, bg = {r, g, 30} }
  end
end

-- Title overlay
local title_grid = make_grid(" ", {170, 170, 170}, {0, 0, 0})
local title = "SWIPE DEMO"
local start_col = math.floor((80 - #title) / 2) + 1
for i = 1, #title do
  title_grid[3][start_col + i - 1] = {
    char = title:sub(i, i),
    fg = {255, 255, 255},
    bg = {50, 50, 120}
  }
end

local screen_data = {
  version = 4,
  width = 80,
  height = 25,
  layers = {
    { id = "scene1", name = "Scene 1", type = "drawn", visible = true,
      grid = scene1_grid, frames = { scene1_grid } },
    { id = "scene2", name = "Scene 2", type = "drawn", visible = false,
      grid = scene2_grid, frames = { scene2_grid } },
    { id = "title", name = "Title", type = "drawn", visible = true,
      grid = title_grid, frames = { title_grid } },
  }
}

local screen = ansi.create_screen(screen_data)
ansi.set_screen(screen)

ansi.tick(function()
  -- Show controls when not swiping
  if not screen:is_swiping() then
    ansi.set_cursor(25, 1)
    ansi.foreground(200, 200, 200)
    ansi.background(30, 30, 30)
    local status = "  [O] Swipe Out  [1] Swipe In Scene1  [2] Swipe In Scene2  [ESC] Quit"
    ansi.print(status .. string.rep(" ", 80 - #status))
  end

  if not screen:is_swiping() then
    if ansi.is_key_pressed("o") then
      screen:swipe_out({ duration = 0.8 })
    elseif ansi.is_key_pressed("1") then
      -- Turn off scene2 so only scene1 shows in the preview
      screen:layer_off("scene2")
      screen:swipe_in({ layers = "scene1", duration = 0.8 })
    elseif ansi.is_key_pressed("2") then
      -- Turn off scene1 so only scene2 shows in the preview
      screen:layer_off("scene1")
      screen:swipe_in({ layers = "scene2", duration = 0.8 })
    end
  end

  if ansi.is_key_pressed("escape") then
    ansi.stop()
  end
end)

ansi.start()
print("Swipe demo finished!")
