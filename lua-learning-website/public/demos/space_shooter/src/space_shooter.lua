-- canvas/space_shooter.lua
-- Space shooter demo showing canvas image support
-- Images by Kenney (www.kenney.nl) - CC0 License

local canvas = require("canvas")

-- Register image assets (loaded when canvas.start() is called)
-- Register the images directory and load assets
canvas.assets.add_path("images")
canvas.assets.load_image("ship", "blue_ship.png")
canvas.assets.load_image("enemy", "enemy_ship.png")
canvas.assets.load_image("meteor", "meteor.png")
canvas.assets.load_image("laser", "laser.png")

-- Game state
local player = { x = 400, y = 500 }
local speed = 300
local lasers = {}
local enemies = {}
local meteors = {}
local score = 0
local game_over = false

-- Spawn timers
local enemy_timer = 0
local meteor_timer = 0

local function spawn_enemy()
  table.insert(enemies, {
    x = math.random(50, 750),
    y = -50,
    speed = math.random(100, 200)
  })
end

local function spawn_meteor()
  table.insert(meteors, {
    x = math.random(50, 750),
    y = -50,
    speed = math.random(50, 150)
  })
end

local function check_collision(x1, y1, w1, h1, x2, y2, w2, h2)
  return x1 < x2 + w2 and x1 + w1 > x2 and
         y1 < y2 + h2 and y1 + h1 > y2
end

local function update(dt)
  if game_over then
    if canvas.is_key_pressed(canvas.keys.SPACE) then
      -- Reset game
      player = { x = 400, y = 500 }
      lasers = {}
      enemies = {}
      meteors = {}
      score = 0
      game_over = false
    end
    return
  end

  -- Player movement
  if canvas.is_key_down(canvas.keys.LEFT) or canvas.is_key_down(canvas.keys.A) then
    player.x = player.x - speed * dt
  end
  if canvas.is_key_down(canvas.keys.RIGHT) or canvas.is_key_down(canvas.keys.D) then
    player.x = player.x + speed * dt
  end

  -- Keep player in bounds
  local ship_w = canvas.assets.get_width("ship")
  if player.x < ship_w/2 then player.x = ship_w/2 end
  if player.x > 800 - ship_w/2 then player.x = 800 - ship_w/2 end

  -- Fire laser
  if canvas.is_key_pressed(canvas.keys.SPACE) then
    table.insert(lasers, { x = player.x, y = player.y - 30 })
  end

  -- Update lasers
  for i = #lasers, 1, -1 do
    lasers[i].y = lasers[i].y - 500 * dt
    if lasers[i].y < -20 then
      table.remove(lasers, i)
    end
  end

  -- Spawn enemies and meteors
  enemy_timer = enemy_timer + dt
  meteor_timer = meteor_timer + dt

  if enemy_timer > 1.5 then
    spawn_enemy()
    enemy_timer = 0
  end

  if meteor_timer > 2.0 then
    spawn_meteor()
    meteor_timer = 0
  end

  -- Update enemies
  for i = #enemies, 1, -1 do
    enemies[i].y = enemies[i].y + enemies[i].speed * dt
    if enemies[i].y > 650 then
      table.remove(enemies, i)
    end
  end

  -- Update meteors
  for i = #meteors, 1, -1 do
    meteors[i].y = meteors[i].y + meteors[i].speed * dt
    if meteors[i].y > 650 then
      table.remove(meteors, i)
    end
  end

  -- Check laser vs enemy collisions
  for li = #lasers, 1, -1 do
    local laser = lasers[li]
    for ei = #enemies, 1, -1 do
      local enemy = enemies[ei]
      if check_collision(laser.x - 3, laser.y - 10, 6, 20,
                         enemy.x - 25, enemy.y - 25, 50, 50) then
        table.remove(lasers, li)
        table.remove(enemies, ei)
        score = score + 100
        break
      end
    end
  end

  -- Check player vs enemy/meteor collisions
  local pw, ph = canvas.assets.get_width("ship"), canvas.assets.get_height("ship")
  local px, py = player.x - pw/2, player.y - ph/2

  for _, enemy in ipairs(enemies) do
    if check_collision(px, py, pw, ph, enemy.x - 25, enemy.y - 25, 50, 50) then
      game_over = true
      return
    end
  end

  for _, meteor in ipairs(meteors) do
    if check_collision(px, py, pw, ph, meteor.x - 25, meteor.y - 25, 50, 50) then
      game_over = true
      return
    end
  end
end

local function draw()
  canvas.clear()

  -- Background (dark space)
  canvas.set_color(10, 10, 30)
  canvas.fill_rect(0, 0, 800, 600)

  -- Animated stars
  canvas.set_color(255, 255, 255)
  for i = 1, 50 do
    local sx = (i * 137) % 800
    local sy = ((i * 73) + canvas.get_time() * 50) % 600
    canvas.fill_rect(sx, sy, 2, 2)
  end

  -- Draw meteors
  for _, m in ipairs(meteors) do
    canvas.draw_image("meteor", m.x - 25, m.y - 25, 50, 50)
  end

  -- Draw enemies
  for _, e in ipairs(enemies) do
    canvas.draw_image("enemy", e.x - 25, e.y - 25, 50, 50)
  end

  -- Draw lasers
  for _, l in ipairs(lasers) do
    canvas.draw_image("laser", l.x - 3, l.y - 10, 6, 20)
  end

  -- Draw player
  local ship_w = canvas.assets.get_width("ship")
  local ship_h = canvas.assets.get_height("ship")
  canvas.draw_image("ship", player.x - ship_w/2, player.y - ship_h/2)

  -- HUD
  canvas.set_color(255, 255, 255)
  canvas.draw_text(10, 10, "Score: " .. score)
  canvas.draw_text(10, 30, "Arrow keys/A-D: Move | SPACE: Shoot")

  -- Game over screen
  if game_over then
    canvas.set_color(0, 0, 0, 180)
    canvas.fill_rect(200, 200, 400, 200)
    canvas.set_color(255, 0, 0)
    canvas.draw_text(320, 260, "GAME OVER")
    canvas.set_color(255, 255, 255)
    canvas.draw_text(280, 300, "Final Score: " .. score)
    canvas.draw_text(270, 340, "Press SPACE to restart")
  end
end

local function game()
  local dt = canvas.get_delta()
  update(dt)
  draw()
end

-- Setup and start
canvas.set_size(800, 600)
canvas.tick(game)
canvas.start()
