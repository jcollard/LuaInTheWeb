-- HC Example: Moving and Rotating Shapes
-- This example demonstrates shape movement, rotation, and scaling

local HC = require('hc')
local canvas = require('canvas')

-- Create shapes
local rect = HC:rectangle(200, 200, 60, 40)
local tri = HC:polygon(400, 200, 450, 280, 350, 280)
local circle = HC:circle(600, 240, 30)

-- Create player-controlled shape
local player = HC:circle(400, 400, 25)
local playerSpeed = 4

-- Animation state
local time = 0
local scale = 1
local scaleDir = 0.005

canvas.tick(function()
  time = time + 0.02

  -- Move player with arrow keys or WASD
  local dx, dy = 0, 0
  if canvas.is_key_down('ArrowLeft') or canvas.is_key_down('a') then dx = -playerSpeed end
  if canvas.is_key_down('ArrowRight') or canvas.is_key_down('d') then dx = playerSpeed end
  if canvas.is_key_down('ArrowUp') or canvas.is_key_down('w') then dy = -playerSpeed end
  if canvas.is_key_down('ArrowDown') or canvas.is_key_down('s') then dy = playerSpeed end
  player:move(dx, dy)

  -- Keep player in bounds
  local px, py = player:center()
  if px < 25 then player:moveTo(25, py) end
  if px > 775 then player:moveTo(775, py) end
  if py < 25 then player:moveTo(px, 25) end
  if py > 575 then player:moveTo(px, 575) end

  -- Rotate shapes
  rect:rotate(0.02)
  tri:rotate(-0.03)

  -- Move circle in a circle pattern
  local cx, cy = circle:center()
  local targetX = 600 + math.cos(time) * 100
  local targetY = 240 + math.sin(time) * 100
  circle:moveTo(targetX, targetY)

  -- Pulse the rectangle scale
  scale = scale + scaleDir
  if scale > 1.5 or scale < 0.7 then
    scaleDir = -scaleDir
  end

  -- Clear and draw background
  canvas.clear()
  canvas.set_color(15, 15, 35)
  canvas.fill_rect(0, 0, canvas.get_width(), canvas.get_height())

  -- Draw title
  canvas.set_color(255, 255, 255)
  canvas.set_font_size(18)
  canvas.draw_text(20, 30, 'Moving and Rotating Shapes')
  canvas.set_font_size(14)
  canvas.draw_text(20, 55, 'Arrow keys or WASD to move player (green circle)')
  canvas.draw_text(20, 75, 'Rectangle: rotating, Triangle: rotating')
  canvas.draw_text(20, 95, 'Yellow circle: following circular path')

  -- Draw rectangle (with rotation visualization)
  canvas.save()
  local rx, ry = rect:center()
  canvas.translate(rx, ry)
  canvas.rotate(rect:rotation())
  canvas.set_color(233, 30, 99)
  local x1, y1, x2, y2 = rect:bbox()
  local w, h = x2 - x1, y2 - y1
  canvas.fill_rect(-w/2, -h/2, w, h)
  canvas.restore()

  -- Draw rectangle outline showing actual bounding box
  canvas.set_color(233, 30, 99, 0.3)
  canvas.draw_rect(x1, y1, x2-x1, y2-y1)

  -- Draw triangle
  canvas.save()
  local tx, ty = tri:center()
  canvas.translate(tx, ty)
  canvas.rotate(tri:rotation())
  canvas.set_color(0, 188, 212)
  canvas.begin_path()
  -- Draw relative to center
  canvas.move_to(0, -40)
  canvas.line_to(50, 40)
  canvas.line_to(-50, 40)
  canvas.close_path()
  canvas.fill()
  canvas.restore()

  -- Draw triangle bounding box
  x1, y1, x2, y2 = tri:bbox()
  canvas.set_color(0, 188, 212, 0.3)
  canvas.draw_rect(x1, y1, x2-x1, y2-y1)

  -- Draw circle
  cx, cy = circle:center()
  canvas.set_color(255, 235, 59)
  canvas.fill_circle(cx, cy, 30)

  -- Draw circle path
  canvas.set_color(255, 235, 59, 0.3)
  canvas.draw_circle(600, 240, 100)

  -- Check player collisions and resolve
  local playerColliding = false
  for shape, sep in pairs(HC:collisions(player)) do
    player:move(sep.x, sep.y)
    playerColliding = true
  end

  -- Draw player
  px, py = player:center()
  if playerColliding then
    canvas.set_color(255, 100, 100)  -- Red when colliding
  else
    canvas.set_color(100, 255, 100)  -- Green normally
  end
  canvas.fill_circle(px, py, 25)

  -- Draw player outline
  canvas.set_color(255, 255, 255)
  canvas.draw_circle(px, py, 25)

  -- Draw collision check between all shapes
  local collisions = 0
  for shape, _ in pairs(HC:collisions(rect)) do
    collisions = collisions + 1
  end
  for shape, _ in pairs(HC:collisions(tri)) do
    collisions = collisions + 1
  end
  for shape, _ in pairs(HC:collisions(player)) do
    collisions = collisions + 1
  end

  canvas.set_color(255, 255, 255)
  canvas.set_font_size(14)
  canvas.draw_text(20, 420, 'Active collisions: ' .. collisions)
  if playerColliding then
    canvas.set_color(255, 100, 100)
    canvas.draw_text(20, 440, 'Player is colliding!')
  end
end)

canvas.start()
