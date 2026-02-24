-- Animation Playback Demo
-- Demonstrates screen:play(), screen:pause(), and screen:is_playing()
-- with a multi-frame animated layer.

local ansi = require("ansi")

-- Helper: create a full 25x80 grid filled with a character and colors
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

-- Create 4 animation frames showing a simple moving bar
local frames = {}
for f = 1, 4 do
  local grid = make_grid(" ", {170, 170, 170}, {0, 0, 40})
  -- Draw a colored bar that moves down with each frame
  local bar_row = 5 + (f - 1) * 5
  for row = bar_row, math.min(bar_row + 2, 25) do
    for col = 10, 70 do
      local r = math.floor((f - 1) / 3 * 255)
      local g = math.floor(col / 80 * 255)
      local b = math.floor(row / 25 * 255)
      grid[row][col] = { char = "#", fg = {255, 255, 255}, bg = {r, g, b} }
    end
  end
  -- Draw frame number label
  local label = "Frame " .. f
  for i = 1, #label do
    grid[2][35 + i] = { char = label:sub(i, i), fg = {255, 255, 85}, bg = {0, 0, 40} }
  end
  frames[f] = grid
end

-- Build V4 data with an animated drawn layer
local data = {
  version = 4,
  width = 80,
  height = 25,
  activeLayerId = "anim",
  layers = {
    [1] = {
      type = "drawn",
      id = "anim",
      name = "Animation",
      visible = true,
      grid = frames[1],
      frames = frames,
      currentFrameIndex = 0,
      frameDurationMs = 500,
    },
  },
}

local screen = ansi.create_screen(data)
ansi.set_screen(screen) -- auto-plays since it has animated layers

ansi.tick(function()
  -- Draw status overlay
  ansi.set_cursor(24, 2)
  ansi.foreground(255, 255, 255)
  ansi.background(0, 0, 0)
  if screen:is_playing() then
    ansi.print(" PLAYING  | SPACE=pause | ESC=quit ")
  else
    ansi.print(" PAUSED   | SPACE=play  | ESC=quit ")
  end

  -- Toggle play/pause with SPACE
  if ansi.is_key_pressed("space") then
    if screen:is_playing() then
      screen:pause()
    else
      screen:play()
    end
  end

  if ansi.is_key_pressed("escape") then
    ansi.stop()
  end
end)

ansi.start()
