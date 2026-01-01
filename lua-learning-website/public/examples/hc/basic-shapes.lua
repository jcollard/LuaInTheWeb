-- HC Example: Basic Shapes
-- This example demonstrates creating different shape types

local HC = require('hc')
local canvas = require('canvas')

-- Create various shapes
local circle = HC:circle(150, 200, 40)
local rectangle = HC:rectangle(300, 150, 80, 60)
local triangle = HC:polygon(500, 250, 550, 150, 600, 250)
local pentagon = HC:polygon(
  700, 180,
  750, 200,
  730, 260,
  670, 260,
  650, 200
)

-- Track selected shape
local selectedShape = nil

canvas.tick(function()
  -- Check for mouse clicks
  local mouseX = canvas.get_mouse_x()
  local mouseY = canvas.get_mouse_y()

  if canvas.is_mouse_down(0) then
    -- Check which shape contains the mouse
    local shapes = HC:shapesAt(mouseX, mouseY)
    for shape in pairs(shapes) do
      selectedShape = shape
      break
    end
  end

  -- Move selected shape with arrow keys
  if selectedShape then
    local dx, dy = 0, 0
    if canvas.is_key_down('ArrowLeft') then dx = -2 end
    if canvas.is_key_down('ArrowRight') then dx = 2 end
    if canvas.is_key_down('ArrowUp') then dy = -2 end
    if canvas.is_key_down('ArrowDown') then dy = 2 end
    if dx ~= 0 or dy ~= 0 then
      selectedShape:move(dx, dy)
    end
  end

  -- Clear and draw background
  canvas.clear()
  canvas.set_color(42, 42, 58)
  canvas.fill_rect(0, 0, canvas.get_width(), canvas.get_height())

  -- Draw title
  canvas.set_color(255, 255, 255)
  canvas.set_font_size(20)
  canvas.draw_text(20, 30, 'HC Shapes - Click to select, Arrow keys to move')

  -- Draw circle
  local cx, cy = circle:center()
  if selectedShape == circle then
    canvas.set_color(255, 255, 0)
  else
    canvas.set_color(76, 175, 80)
  end
  canvas.fill_circle(cx, cy, 40)
  canvas.set_color(255, 255, 255)
  canvas.set_font_size(12)
  canvas.draw_text(cx - 20, cy + 60, 'Circle')

  -- Draw rectangle
  local x1, y1, x2, y2 = rectangle:bbox()
  if selectedShape == rectangle then
    canvas.set_color(255, 255, 0)
  else
    canvas.set_color(33, 150, 243)
  end
  canvas.fill_rect(x1, y1, x2-x1, y2-y1)
  canvas.set_color(255, 255, 255)
  canvas.draw_text(x1, y2 + 20, 'Rectangle')

  -- Draw triangle
  x1, y1, x2, y2 = triangle:bbox()
  if selectedShape == triangle then
    canvas.set_color(255, 255, 0)
  else
    canvas.set_color(255, 87, 34)
  end
  canvas.begin_path()
  canvas.move_to(500, 250)
  canvas.line_to(550, 150)
  canvas.line_to(600, 250)
  canvas.close_path()
  canvas.fill()
  canvas.set_color(255, 255, 255)
  canvas.draw_text(520, 270, 'Triangle')

  -- Draw pentagon
  if selectedShape == pentagon then
    canvas.set_color(255, 255, 0)
  else
    canvas.set_color(156, 39, 176)
  end
  canvas.begin_path()
  canvas.move_to(700, 180)
  canvas.line_to(750, 200)
  canvas.line_to(730, 260)
  canvas.line_to(670, 260)
  canvas.line_to(650, 200)
  canvas.close_path()
  canvas.fill()
  canvas.set_color(255, 255, 255)
  canvas.draw_text(670, 280, 'Pentagon')
end)

canvas.start()
