-- HC Example: Collision Detection
-- This example demonstrates collision detection and response

local HC = require('hc')
local canvas = require('canvas')

-- Create player
local player = HC:rectangle(400, 300, 40, 40)

-- Create walls
local walls = {
  HC:rectangle(100, 100, 200, 20),   -- Top wall
  HC:rectangle(100, 100, 20, 200),   -- Left wall
  HC:rectangle(280, 100, 20, 200),   -- Right wall
  HC:rectangle(100, 280, 200, 20),   -- Bottom wall
  HC:rectangle(500, 200, 100, 100),  -- Box obstacle
  HC:circle(650, 350, 50),           -- Circle obstacle
}

-- Player velocity
local vx, vy = 0, 0
local speed = 3
local friction = 0.9

canvas.tick(function()
  -- Get input
  if canvas.is_key_down('ArrowLeft') or canvas.is_key_down('a') then
    vx = vx - speed * 0.2
  end
  if canvas.is_key_down('ArrowRight') or canvas.is_key_down('d') then
    vx = vx + speed * 0.2
  end
  if canvas.is_key_down('ArrowUp') or canvas.is_key_down('w') then
    vy = vy - speed * 0.2
  end
  if canvas.is_key_down('ArrowDown') or canvas.is_key_down('s') then
    vy = vy + speed * 0.2
  end

  -- Apply friction
  vx = vx * friction
  vy = vy * friction

  -- Move player
  player:move(vx, vy)

  -- Check and resolve collisions
  local collisionCount = 0
  for shape, sep in pairs(HC:collisions(player)) do
    player:move(sep.x, sep.y)
    collisionCount = collisionCount + 1

    -- Bounce off walls slightly
    if math.abs(sep.x) > math.abs(sep.y) then
      vx = -vx * 0.3
    else
      vy = -vy * 0.3
    end
  end

  -- Clear and draw
  canvas.clear()
  canvas.set_color(26, 26, 46)
  canvas.fill_rect(0, 0, canvas.get_width(), canvas.get_height())

  -- Draw instructions
  canvas.set_color(255, 255, 255)
  canvas.set_font_size(16)
  canvas.draw_text(20, 30, 'Use Arrow Keys or WASD to move')
  canvas.draw_text(20, 55, 'Collisions: ' .. collisionCount)

  -- Draw walls
  canvas.set_color(74, 74, 106)
  for _, wall in ipairs(walls) do
    local cx, cy = wall:center()
    local _, _, radius = wall:outcircle()

    -- Check if it's a circle (has _center property)
    if wall._center then
      canvas.fill_circle(cx, cy, radius)
    else
      local x1, y1, x2, y2 = wall:bbox()
      canvas.fill_rect(x1, y1, x2-x1, y2-y1)
    end
  end

  -- Draw player (changes color on collision)
  if collisionCount > 0 then
    canvas.set_color(255, 107, 107)
  else
    canvas.set_color(78, 205, 196)
  end
  local x1, y1, x2, y2 = player:bbox()
  canvas.fill_rect(x1, y1, x2-x1, y2-y1)

  -- Draw player center dot
  canvas.set_color(255, 255, 255)
  local cx, cy = player:center()
  canvas.fill_circle(cx, cy, 3)
end)

canvas.start()
