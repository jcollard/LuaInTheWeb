-- ansi/crt.lua
-- Interactive CRT shader tuning demo
-- Adjust all 14 CRT parameters in real-time while viewing pixel art scenes

local ansi = require("ansi")

------------------------------------------------------------
-- Parameter definitions
------------------------------------------------------------
local params = {
  {key="scanlineIntensity",  label="scanlineIntensity", min=0,   max=1,    step=0.05, default=0.33},
  {key="scanlineCount",      label="scanlineCount",     min=50,  max=1200, step=25,   default=150},
  {key="adaptiveIntensity",  label="adaptiveIntensity", min=0,   max=1,    step=0.05, default=1},
  {key="brightness",         label="brightness",        min=0.6, max=1.8,  step=0.05, default=1.15},
  {key="contrast",           label="contrast",          min=0.5, max=1.5,  step=0.05, default=1},
  {key="saturation",         label="saturation",        min=0,   max=2,    step=0.05, default=1},
  {key="bloomIntensity",     label="bloomIntensity",    min=0,   max=1.5,  step=0.05, default=0.25},
  {key="bloomThreshold",     label="bloomThreshold",    min=0,   max=1,    step=0.05, default=0},
  {key="rgbShift",           label="rgbShift",          min=0,   max=1,    step=0.05, default=1},
  {key="vignetteStrength",   label="vignetteStrength",  min=0,   max=2,    step=0.1,  default=0.22},
  {key="curvature",          label="curvature",         min=0,   max=0.5,  step=0.01, default=0.05},
  {key="flickerStrength",    label="flickerStrength",   min=0,   max=0.15, step=0.01, default=0},
  {key="phosphor",           label="phosphor",          min=0,   max=1,    step=0.05, default=0},
}
-- smoothing is boolean, handled separately
local smoothing = true

-- Initialize values to defaults
for _, p in ipairs(params) do
  p.value = p.default
end

------------------------------------------------------------
-- State
------------------------------------------------------------
local selected = 1       -- selected parameter index (1-14, 14=smoothing)
local current_scene = 1  -- 1-5
local crt_dirty = true   -- flag to push CRT update

------------------------------------------------------------
-- Build CRT config from current values
------------------------------------------------------------
local function build_config()
  local cfg = {smoothing = smoothing}
  for _, p in ipairs(params) do
    cfg[p.key] = p.value
  end
  return cfg
end

------------------------------------------------------------
-- Clamp helper
------------------------------------------------------------
local function clamp(v, lo, hi)
  if v < lo then return lo end
  if v > hi then return hi end
  return v
end

------------------------------------------------------------
-- Round helper (avoid floating point drift)
------------------------------------------------------------
local function round(v, decimals)
  local mult = 10 ^ (decimals or 2)
  return math.floor(v * mult + 0.5) / mult
end

------------------------------------------------------------
-- Pixel art scene drawing (32x16 viewport, origin ox,oy)
------------------------------------------------------------

-- Helper: draw a filled rect
local function fill_rect(ox, oy, x1, y1, x2, y2, r, g, b)
  for row = y1, y2 do
    for col = x1, x2 do
      ansi.set_cursor(oy + row, ox + col)
      ansi.foreground(r, g, b)
      ansi.background(r, g, b)
      ansi.print("\226\150\136") -- █
    end
  end
end

-- Helper: distance from center
local function dist(cx, cy, x, y)
  return math.sqrt((x - cx)^2 + (y - cy)^2)
end

-- Scene 1: Smiley Face
local function draw_smiley(ox, oy)
  local cx, cy = 16, 8
  -- Blue background
  fill_rect(ox, oy, 1, 1, 32, 16, 30, 30, 120)
  -- Yellow circle
  for row = 1, 16 do
    for col = 1, 32 do
      local d = dist(cx, cy, col, row * 1.6)
      if d < 11 then
        ansi.set_cursor(oy + row, ox + col)
        ansi.foreground(255, 220, 50)
        ansi.background(255, 220, 50)
        ansi.print("\226\150\136")
      end
    end
  end
  -- Eyes (black)
  for row = 5, 7 do
    for col = 12, 13 do
      ansi.set_cursor(oy + row, ox + col)
      ansi.foreground(40, 40, 40)
      ansi.background(40, 40, 40)
      ansi.print("\226\150\136")
    end
    for col = 19, 20 do
      ansi.set_cursor(oy + row, ox + col)
      ansi.foreground(40, 40, 40)
      ansi.background(40, 40, 40)
      ansi.print("\226\150\136")
    end
  end
  -- Mouth (curved)
  for col = 11, 21 do
    local mouth_row = 11 + math.floor(0.04 * (col - 16)^2)
    if mouth_row >= 11 and mouth_row <= 13 then
      ansi.set_cursor(oy + mouth_row, ox + col)
      ansi.foreground(40, 40, 40)
      ansi.background(40, 40, 40)
      ansi.print("\226\150\136")
    end
  end
end

-- Scene 2: Apple
local function draw_apple(ox, oy)
  -- Dark background
  fill_rect(ox, oy, 1, 1, 32, 16, 20, 15, 30)
  -- Stem (brown)
  fill_rect(ox, oy, 16, 2, 17, 4, 120, 70, 20)
  -- Leaf (green)
  for col = 18, 22 do
    local leaf_row = 3 - math.floor(0.3 * math.abs(col - 20))
    if leaf_row >= 2 then
      ansi.set_cursor(oy + leaf_row, ox + col)
      ansi.foreground(50, 180, 50)
      ansi.background(50, 180, 50)
      ansi.print("\226\150\136")
    end
  end
  -- Red apple body
  for row = 5, 14 do
    for col = 8, 25 do
      local d = dist(16.5, 10, col, row * 1.3)
      if d < 8 then
        local shade = 200 + math.floor(30 * math.cos((col - 14) * 0.3))
        ansi.set_cursor(oy + row, ox + col)
        ansi.foreground(clamp(shade, 150, 240), 20, 20)
        ansi.background(clamp(shade, 150, 240), 20, 20)
        ansi.print("\226\150\136")
      end
    end
  end
  -- Highlight
  fill_rect(ox, oy, 12, 6, 13, 7, 255, 120, 120)
end

-- Scene 3: Tree
local function draw_tree(ox, oy)
  -- Sky
  fill_rect(ox, oy, 1, 1, 32, 12, 100, 180, 255)
  -- Ground
  fill_rect(ox, oy, 1, 13, 32, 16, 50, 160, 50)
  -- Trunk (brown)
  fill_rect(ox, oy, 15, 9, 18, 16, 110, 70, 30)
  -- Crown (green oval)
  for row = 2, 10 do
    for col = 7, 26 do
      local d = dist(16.5, 6, col, row * 1.5)
      if d < 10 then
        local g = 120 + math.floor(40 * math.sin(col * 0.7 + row))
        ansi.set_cursor(oy + row, ox + col)
        ansi.foreground(30, clamp(g, 100, 200), 30)
        ansi.background(30, clamp(g, 100, 200), 30)
        ansi.print("\226\150\136")
      end
    end
  end
end

-- Scene 4: House
local function draw_house(ox, oy)
  -- Sky
  fill_rect(ox, oy, 1, 1, 32, 10, 100, 180, 255)
  -- Ground
  fill_rect(ox, oy, 1, 11, 32, 16, 50, 160, 50)
  -- Walls (tan)
  fill_rect(ox, oy, 8, 7, 25, 15, 210, 180, 130)
  -- Roof (red triangle)
  for row = 2, 7 do
    local half = math.floor((7 - row) * 1.5) + 1
    local left = 16 - half
    local right = 17 + half
    fill_rect(ox, oy, clamp(left, 6, 27), row, clamp(right, 6, 27), row, 180, 40, 40)
  end
  -- Door (blue)
  fill_rect(ox, oy, 15, 10, 18, 15, 60, 80, 180)
  -- Doorknob
  ansi.set_cursor(oy + 12, ox + 17)
  ansi.foreground(220, 200, 50)
  ansi.background(220, 200, 50)
  ansi.print("\226\150\136")
  -- Windows (yellow)
  fill_rect(ox, oy, 10, 8, 13, 10, 255, 255, 120)
  fill_rect(ox, oy, 20, 8, 23, 10, 255, 255, 120)
  -- Window crosses
  for r = 8, 10 do
    ansi.set_cursor(oy + r, ox + 11)
    ansi.foreground(100, 80, 60)
    ansi.background(100, 80, 60)
    ansi.print("\226\150\136")
    ansi.set_cursor(oy + r, ox + 21)
    ansi.foreground(100, 80, 60)
    ansi.background(100, 80, 60)
    ansi.print("\226\150\136")
  end
end

-- Scene 5: SMPTE Color Bars
local function draw_bars(ox, oy)
  local colors = {
    {255, 255, 255}, -- white
    {255, 255, 0},   -- yellow
    {0, 255, 255},   -- cyan
    {0, 255, 0},     -- green
    {255, 0, 255},   -- magenta
    {255, 0, 0},     -- red
    {0, 0, 255},     -- blue
    {0, 0, 0},       -- black
  }
  local bar_width = 4 -- 8 bars * 4 = 32
  for i, c in ipairs(colors) do
    local x1 = (i - 1) * bar_width + 1
    local x2 = i * bar_width
    fill_rect(ox, oy, x1, 1, x2, 16, c[1], c[2], c[3])
  end
end

local scenes = {draw_smiley, draw_apple, draw_tree, draw_house, draw_bars}
local scene_names = {"Smiley", "Apple", "Tree", "House", "Bars"}

------------------------------------------------------------
-- Drawing helpers
------------------------------------------------------------

-- Draw the viewport border and scene (cols 1-34, rows 1-18)
local function draw_viewport()
  ansi.reset()
  -- Top border
  ansi.set_cursor(1, 1)
  ansi.foreground(80, 80, 80)
  ansi.print("\226\148\140" .. string.rep("\226\148\128", 32) .. "\226\148\144")
  -- Side borders + scene content
  for row = 1, 16 do
    ansi.set_cursor(row + 1, 1)
    ansi.foreground(80, 80, 80)
    ansi.background(0, 0, 0)
    ansi.print("\226\148\130")
    ansi.set_cursor(row + 1, 34)
    ansi.foreground(80, 80, 80)
    ansi.background(0, 0, 0)
    ansi.print("\226\148\130")
  end
  -- Bottom border
  ansi.set_cursor(18, 1)
  ansi.foreground(80, 80, 80)
  ansi.background(0, 0, 0)
  ansi.print("\226\148\148" .. string.rep("\226\148\128", 32) .. "\226\148\152")
  ansi.reset()
  -- Draw scene inside viewport (origin col 2, row 2)
  scenes[current_scene](2, 1)
  ansi.reset()
end

-- Format value for display
local function fmt_val(p)
  if p.step >= 1 then
    return string.format("%4d", math.floor(p.value + 0.5))
  elseif p.step >= 0.05 then
    return string.format("%4.2f", p.value)
  else
    return string.format("%4.2f", p.value)
  end
end

-- Draw a slider bar (10 chars)
local function slider_bar(p)
  local frac = (p.value - p.min) / (p.max - p.min)
  local filled = math.floor(frac * 10 + 0.5)
  return string.rep("\226\150\136", filled) .. string.rep("\226\150\145", 10 - filled)
end

-- Draw parameter panel (cols 36-80, rows 2-15)
local function draw_panel()
  local total_params = #params + 1 -- +1 for smoothing
  for i = 1, total_params do
    local row = i + 1 -- rows 2-15
    ansi.set_cursor(row, 36)
    local is_selected = (i == selected)
    -- Selection indicator
    if is_selected then
      ansi.foreground(255, 255, 100)
      ansi.background(40, 40, 60)
      ansi.print("> ")
    else
      ansi.foreground(160, 160, 160)
      ansi.background(0, 0, 0)
      ansi.print("  ")
    end

    if i <= #params then
      -- Numeric parameter
      local p = params[i]
      local name = string.format("%-19s", p.label)
      local val = fmt_val(p)
      local bar = slider_bar(p)
      if is_selected then
        ansi.foreground(255, 255, 100)
      else
        ansi.foreground(160, 160, 160)
      end
      ansi.print(name .. val .. "  [" .. bar .. "]")
    else
      -- Smoothing toggle
      local name = string.format("%-19s", "smoothing")
      local val = smoothing and " ON" or "OFF"
      if is_selected then
        ansi.foreground(255, 255, 100)
      else
        ansi.foreground(160, 160, 160)
      end
      ansi.print(name .. " " .. val .. "                ")
    end
    ansi.reset()
  end
end

-- Draw scene selector (row 19)
local function draw_scene_selector()
  ansi.set_cursor(19, 2)
  ansi.reset()
  for i, name in ipairs(scene_names) do
    if i == current_scene then
      ansi.foreground(255, 255, 100)
      ansi.background(60, 60, 80)
    else
      ansi.foreground(120, 120, 120)
      ansi.background(0, 0, 0)
    end
    ansi.print("[" .. i .. "]" .. name)
    ansi.reset()
    ansi.print("  ")
  end
end

-- Draw footer (row 25)
local function draw_footer()
  ansi.set_cursor(25, 1)
  ansi.foreground(100, 100, 100)
  ansi.background(0, 0, 0)
  local footer = " \226\134\145\226\134\147 Select  \226\134\144\226\134\146 Adjust  1-5 Scene  R Reset  Ctrl+C Exit"
  ansi.print(footer .. string.rep(" ", 80 - #footer))
  ansi.reset()
end

------------------------------------------------------------
-- Input handling
------------------------------------------------------------
local function handle_input()
  local total_params = #params + 1

  if ansi.is_key_pressed("up") then
    selected = selected - 1
    if selected < 1 then selected = total_params end
  end

  if ansi.is_key_pressed("down") then
    selected = selected + 1
    if selected > total_params then selected = 1 end
  end

  if ansi.is_key_pressed("left") then
    if selected <= #params then
      local p = params[selected]
      p.value = round(clamp(p.value - p.step, p.min, p.max), 2)
      crt_dirty = true
    else
      smoothing = not smoothing
      crt_dirty = true
    end
  end

  if ansi.is_key_pressed("right") then
    if selected <= #params then
      local p = params[selected]
      p.value = round(clamp(p.value + p.step, p.min, p.max), 2)
      crt_dirty = true
    else
      smoothing = not smoothing
      crt_dirty = true
    end
  end

  -- Scene selection
  for i = 1, 5 do
    if ansi.is_key_pressed(tostring(i)) then
      current_scene = i
    end
  end

  -- Reset
  if ansi.is_key_pressed("r") then
    for _, p in ipairs(params) do
      p.value = p.default
    end
    smoothing = true
    crt_dirty = true
  end
end

------------------------------------------------------------
-- Enable CRT with defaults
------------------------------------------------------------
ansi.crt(build_config())

------------------------------------------------------------
-- Main loop
------------------------------------------------------------
ansi.tick(function()
  ansi.clear()
  handle_input()

  draw_viewport()
  draw_panel()
  draw_scene_selector()
  draw_footer()

  if crt_dirty then
    ansi.crt(build_config())
    crt_dirty = false
  end
end)

ansi.start()
