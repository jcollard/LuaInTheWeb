-- Frame Control Demo
-- Demonstrates screen:set_layer_frame() and screen:get_layer_frame()
-- by stepping through an animation manually with the arrow keys.
--
-- Controls:
--   LEFT / RIGHT  step one frame backward / forward (wraps past the ends)
--   1..6          jump directly to that frame
--   9             jump out of range (demonstrates the wrap warning)
--   SPACE         toggle automatic playback
--   ESC           quit

local ansi = require("ansi")

local FRAME_COUNT = 6

local function make_grid(bg)
  local grid = {}
  for row = 1, 25 do
    grid[row] = {}
    for col = 1, 80 do
      grid[row][col] = { char = " ", fg = {200, 200, 200}, bg = bg }
    end
  end
  return grid
end

local function draw_text(grid, row, col, text, fg, bg)
  for i = 1, #text do
    grid[row][col + i - 1] = { char = text:sub(i, i), fg = fg, bg = bg }
  end
end

-- Build a clear, readable animation: a single digit (1..N) on a colored
-- background that shifts hue per frame. The frame number is also drawn
-- as large text so it's obvious which frame is currently displayed.
local frames = {}
for f = 1, FRAME_COUNT do
  local hue = math.floor((f - 1) / FRAME_COUNT * 200)
  local grid = make_grid({0, hue, 60})
  draw_text(grid, 2, 28, "FRAME CONTROL DEMO", {255, 255, 85}, {0, hue, 60})
  -- Giant frame number block in the middle.
  local label = "FRAME " .. f
  for i = 1, #label do
    grid[12][36 + i] = { char = label:sub(i, i), fg = {255, 255, 255}, bg = {hue, 40, 40} }
  end
  -- A bar that grows with the frame number to give visual motion.
  for col = 10, 10 + math.floor(60 * f / FRAME_COUNT) do
    for row = 14, 16 do
      grid[row][col] = { char = "#", fg = {255, 255, 255}, bg = {hue, hue, 200} }
    end
  end
  frames[f] = grid
end

local screen = ansi.create_screen({
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
      frameDurationMs = 250,
    },
  },
})

ansi.set_screen(screen)
screen:pause() -- start in manual-step mode

local function handle_input()
  if ansi.is_key_pressed("escape") then
    ansi.stop()
    return
  end

  if ansi.is_key_pressed("space") then
    if screen:is_playing() then screen:pause() else screen:play() end
    return
  end

  local frame, total = screen:get_layer_frame("anim")

  if ansi.is_key_pressed("right") then
    screen:set_layer_frame("anim", frame + 1) -- wraps past the end
  elseif ansi.is_key_pressed("left") then
    screen:set_layer_frame("anim", frame - 1) -- wraps below 1
  elseif ansi.is_key_pressed("9") then
    -- Intentionally out of range — emits a console.warn and wraps.
    screen:set_layer_frame("anim", total + 3)
  else
    for i = 1, FRAME_COUNT do
      if ansi.is_key_pressed(tostring(i)) then
        screen:set_layer_frame("anim", i)
      end
    end
  end
end

ansi.tick(function()
  handle_input()

  local frame, total = screen:get_layer_frame("anim")
  ansi.set_cursor(24, 2)
  ansi.foreground(255, 255, 255)
  ansi.background(0, 0, 0)
  local mode = screen:is_playing() and "PLAYING" or "PAUSED "
  ansi.print(string.format(" %s | frame %d/%d | LEFT/RIGHT step | 1-6 jump | 9 wrap | SPACE play | ESC quit ", mode, frame, total))
end)

ansi.start()
