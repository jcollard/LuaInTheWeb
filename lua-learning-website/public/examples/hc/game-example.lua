-- HC Example: Simple Game
-- A simple game demonstrating HC collision detection in action

local HC = require('hc')
local canvas = require('canvas')

-- Game state
local score = 0
local gameOver = false

-- Create player
local player = HC:circle(400, 500, 20)
local playerSpeed = 4

-- Create collectibles
local collectibles = {}
local function spawnCollectible()
  local x = math.random(50, 750)
  local y = math.random(50, 350)
  local c = {
    shape = HC:circle(x, y, 15),
    collected = false
  }
  table.insert(collectibles, c)
end

-- Spawn initial collectibles
for i = 1, 5 do
  spawnCollectible()
end

-- Create obstacles (moving enemies)
local obstacles = {}
local function spawnObstacle()
  local side = math.random(1, 2)
  local x, y, vx, vy

  if side == 1 then  -- From left or right
    x = math.random(1, 2) == 1 and -30 or 830
    y = math.random(100, 400)
    vx = x < 0 and 2 or -2
    vy = math.random(-1, 1) * 0.5
  else  -- From top
    x = math.random(100, 700)
    y = -30
    vx = math.random(-1, 1) * 0.5
    vy = 2
  end

  local o = {
    shape = HC:rectangle(x - 20, y - 20, 40, 40),
    vx = vx,
    vy = vy
  }
  table.insert(obstacles, o)
end

-- Spawn initial obstacles
for i = 1, 3 do
  spawnObstacle()
end

local spawnTimer = 0

canvas.tick(function()
  if gameOver then
    -- Draw game over screen
    canvas.clear()
    canvas.set_color(26, 26, 46)
    canvas.fill_rect(0, 0, canvas.get_width(), canvas.get_height())

    canvas.set_color(255, 107, 107)
    canvas.set_font_size(48)
    canvas.draw_text(280, 280, 'GAME OVER')

    canvas.set_color(255, 255, 255)
    canvas.set_font_size(24)
    canvas.draw_text(340, 330, 'Final Score: ' .. score)
    canvas.draw_text(320, 380, 'Press R to restart')

    if canvas.is_key_down('r') then
      -- Reset game
      score = 0
      gameOver = false
      player:moveTo(400, 500)

      -- Clear and respawn
      for _, c in ipairs(collectibles) do
        HC:remove(c.shape)
      end
      for _, o in ipairs(obstacles) do
        HC:remove(o.shape)
      end
      collectibles = {}
      obstacles = {}
      for i = 1, 5 do spawnCollectible() end
      for i = 1, 3 do spawnObstacle() end
    end
    return
  end

  -- Move player
  local dx, dy = 0, 0
  if canvas.is_key_down('ArrowLeft') or canvas.is_key_down('a') then dx = -playerSpeed end
  if canvas.is_key_down('ArrowRight') or canvas.is_key_down('d') then dx = playerSpeed end
  if canvas.is_key_down('ArrowUp') or canvas.is_key_down('w') then dy = -playerSpeed end
  if canvas.is_key_down('ArrowDown') or canvas.is_key_down('s') then dy = playerSpeed end
  player:move(dx, dy)

  -- Keep player in bounds
  local px, py = player:center()
  if px < 20 then player:moveTo(20, py) end
  if px > 780 then player:moveTo(780, py) end
  if py < 20 then player:moveTo(px, 20) end
  if py > 580 then player:moveTo(px, 580) end

  -- Move obstacles
  for i = #obstacles, 1, -1 do
    local o = obstacles[i]
    o.shape:move(o.vx, o.vy)

    -- Remove off-screen obstacles
    local ox, oy = o.shape:center()
    if ox < -50 or ox > 850 or oy < -50 or oy > 650 then
      HC:remove(o.shape)
      table.remove(obstacles, i)
    end
  end

  -- Spawn new obstacles periodically
  spawnTimer = spawnTimer + 1
  if spawnTimer > 60 then
    spawnTimer = 0
    spawnObstacle()
  end

  -- Check collectible collisions
  for i = #collectibles, 1, -1 do
    local c = collectibles[i]
    local collides = player:collidesWith(c.shape)
    if collides then
      score = score + 10
      HC:remove(c.shape)
      table.remove(collectibles, i)
      spawnCollectible()  -- Respawn a new one
    end
  end

  -- Check obstacle collisions
  for _, o in ipairs(obstacles) do
    local collides = player:collidesWith(o.shape)
    if collides then
      gameOver = true
    end
  end

  -- Draw
  canvas.clear()
  canvas.set_color(22, 33, 62)
  canvas.fill_rect(0, 0, canvas.get_width(), canvas.get_height())

  -- Draw collectibles
  canvas.set_color(76, 175, 80)
  for _, c in ipairs(collectibles) do
    local cx, cy = c.shape:center()
    canvas.fill_circle(cx, cy, 15)

    -- Draw sparkle
    canvas.set_color(129, 199, 132)
    canvas.fill_circle(cx - 5, cy - 5, 4)
    canvas.set_color(76, 175, 80)
  end

  -- Draw obstacles
  canvas.set_color(244, 67, 54)
  for _, o in ipairs(obstacles) do
    local x1, y1, x2, y2 = o.shape:bbox()
    canvas.fill_rect(x1, y1, x2-x1, y2-y1)

    -- Draw angry face
    canvas.set_color(183, 28, 28)
    local cx, cy = o.shape:center()
    canvas.fill_circle(cx - 8, cy - 5, 4)
    canvas.fill_circle(cx + 8, cy - 5, 4)
    canvas.fill_rect(cx - 10, cy + 5, 20, 4)
    canvas.set_color(244, 67, 54)
  end

  -- Draw player
  canvas.set_color(33, 150, 243)
  px, py = player:center()
  canvas.fill_circle(px, py, 20)

  -- Draw player face
  canvas.set_color(255, 255, 255)
  canvas.fill_circle(px - 6, py - 4, 4)
  canvas.fill_circle(px + 6, py - 4, 4)
  canvas.begin_path()
  canvas.arc(px, py + 5, 8, 0, math.pi)
  canvas.stroke()

  -- Draw UI
  canvas.set_color(255, 255, 255)
  canvas.set_font_size(24)
  canvas.draw_text(20, 35, 'Score: ' .. score)

  canvas.set_font_size(14)
  canvas.draw_text(600, 580, 'Arrow keys or WASD to move')
  canvas.draw_text(610, 560, 'Collect green, avoid red!')
end)

canvas.start()
