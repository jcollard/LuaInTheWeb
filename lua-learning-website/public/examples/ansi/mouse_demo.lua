-- ansi/mouse_demo.lua
-- Demonstrates: Mouse input handling in ANSI terminal
-- Features: is_mouse_down, is_mouse_pressed, get_mouse_col, get_mouse_row,
--           is_mouse_top_half, get_mouse_x, get_mouse_y

local ansi = require("ansi")

-- Paint canvas state
local canvas = {}
for r = 1, ansi.ROWS do
  canvas[r] = {}
end

-- Current brush color
local colors = {
  {255, 85, 85},    -- red
  {85, 255, 85},    -- green
  {85, 85, 255},    -- blue
  {255, 255, 85},   -- yellow
  {255, 85, 255},   -- magenta
  {85, 255, 255},   -- cyan
  {255, 255, 255},  -- white
}
local color_ix = 1
local click_count = 0

ansi.tick(function()
  local col = ansi.get_mouse_col()
  local row = ansi.get_mouse_row()
  local top = ansi.is_mouse_top_half()

  -- Right click cycles brush color
  if ansi.is_mouse_pressed(2) then
    color_ix = color_ix % #colors + 1
  end

  -- Left click paints
  if ansi.is_mouse_down(0) and row > 2 and row < ansi.ROWS then
    canvas[row][col] = color_ix
  end

  -- Middle click erases
  if ansi.is_mouse_down(1) and row > 2 and row < ansi.ROWS then
    canvas[row][col] = nil
  end

  -- Track clicks
  if ansi.is_mouse_pressed(0) then
    click_count = click_count + 1
  end

  -- Draw
  ansi.clear()

  -- Header line 1
  ansi.set_cursor(1, 1)
  ansi.foreground(255, 255, 85)
  ansi.print("Mouse Paint")
  ansi.foreground(170, 170, 170)
  ansi.print(string.format("  Cell: %d,%d (%s half)", col, row, top and "top" or "btm"))
  ansi.print(string.format("  Pixel: %.0f,%.0f", ansi.get_mouse_x(), ansi.get_mouse_y()))

  -- Header line 2: brush + instructions
  ansi.set_cursor(2, 1)
  ansi.foreground(85, 85, 85)
  ansi.print("LMB=paint  MMB=erase  RMB=color  ")
  ansi.print("Brush: ")
  local c = colors[color_ix]
  ansi.foreground(c[1], c[2], c[3])
  ansi.print("\xe2\x96\x88\xe2\x96\x88")
  ansi.foreground(85, 85, 85)
  ansi.print(string.format("  Clicks: %d", click_count))

  -- Draw canvas
  for r = 3, ansi.ROWS - 1 do
    for k, ci in pairs(canvas[r]) do
      ansi.set_cursor(r, k)
      local pc = colors[ci]
      ansi.foreground(pc[1], pc[2], pc[3])
      ansi.print("\xe2\x96\x88")
    end
  end

  -- Draw cursor crosshair
  if row > 2 and row < ansi.ROWS then
    ansi.set_cursor(row, col)
    ansi.foreground(255, 255, 255)
    if top then
      ansi.print("\xe2\x96\x80") -- upper half block
    else
      ansi.print("\xe2\x96\x84") -- lower half block
    end
  end

  -- Status bar
  ansi.set_cursor(ansi.ROWS, 1)
  ansi.foreground(85, 85, 85)
  local btns = {}
  if ansi.is_mouse_down(0) then table.insert(btns, "LEFT") end
  if ansi.is_mouse_down(1) then table.insert(btns, "MID") end
  if ansi.is_mouse_down(2) then table.insert(btns, "RIGHT") end
  if #btns > 0 then
    ansi.print("Buttons: " .. table.concat(btns, "+"))
  else
    ansi.print("Press Ctrl+C to exit")
  end
end)

ansi.start()
