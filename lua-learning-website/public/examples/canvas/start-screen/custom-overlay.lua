-- canvas/start-screen/custom-overlay.lua
-- Demonstrates custom start screen overlay for games with audio
-- Run with: lua --start-screen canvas/start-screen/custom-overlay.lua

local canvas = require("canvas")

-- Colors
local BG_COLOR = "#1a1a2e"
local TEXT_COLOR = "#FFFFFF"
local ACCENT_COLOR = "#4ECDC4"
local PULSE_COLOR = "#FF6B6B"

canvas.set_size(500, 350)

-- Animation state for start screen
local pulse = 0
local stars = {}

-- Initialize decorative stars
for i = 1, 20 do
  stars[i] = {
    x = math.random(0, 500),
    y = math.random(0, 350),
    size = math.random(1, 3),
    speed = math.random(50, 150) / 100
  }
end

-- Custom start screen callback
-- This is called each frame while waiting for user interaction
canvas.set_start_screen(function()
  local w, h = canvas.get_width(), canvas.get_height()
  local dt = canvas.get_delta()

  -- Update animation
  pulse = pulse + dt * 3

  -- Background
  canvas.clear()
  canvas.set_color(BG_COLOR)
  canvas.fill_rect(0, 0, w, h)

  -- Animated stars
  canvas.set_color(255, 255, 255)
  for _, star in ipairs(stars) do
    star.y = star.y + star.speed
    if star.y > h then
      star.y = 0
      star.x = math.random(0, w)
    end
    local alpha = 100 + math.sin(pulse + star.x) * 50
    canvas.set_color(255, 255, 255, alpha)
    canvas.fill_circle(star.x, star.y, star.size)
  end

  -- Title with glow effect
  canvas.set_font_size(36)
  canvas.set_text_align("center")
  canvas.set_text_baseline("middle")

  -- Glow layers
  for i = 3, 1, -1 do
    local glow_alpha = 50 / i
    canvas.set_color(78, 205, 196, glow_alpha)
    canvas.draw_text(w/2, h/2 - 40, "SPACE ADVENTURE")
  end

  canvas.set_color(ACCENT_COLOR)
  canvas.draw_text(w/2, h/2 - 40, "SPACE ADVENTURE")

  -- Pulsing "Click to Start" text
  local alpha = math.floor(128 + math.sin(pulse) * 127)
  canvas.set_color(255, 107, 107, alpha)
  canvas.set_font_size(24)
  canvas.draw_text(w/2, h/2 + 20, "Click to Start")

  -- Subtitle
  canvas.set_color(150, 150, 150)
  canvas.set_font_size(14)
  canvas.draw_text(w/2, h/2 + 60, "Audio requires user interaction to play")

  -- Decorative border
  canvas.set_color(ACCENT_COLOR)
  canvas.set_line_width(2)
  canvas.draw_rect(20, 20, w - 40, h - 40)

  -- Corner decorations
  local corner_size = 15
  canvas.set_color(PULSE_COLOR)
  -- Top-left
  canvas.draw_line(20, 20 + corner_size, 20, 20)
  canvas.draw_line(20, 20, 20 + corner_size, 20)
  -- Top-right
  canvas.draw_line(w - 20 - corner_size, 20, w - 20, 20)
  canvas.draw_line(w - 20, 20, w - 20, 20 + corner_size)
  -- Bottom-left
  canvas.draw_line(20, h - 20 - corner_size, 20, h - 20)
  canvas.draw_line(20, h - 20, 20 + corner_size, h - 20)
  -- Bottom-right
  canvas.draw_line(w - 20 - corner_size, h - 20, w - 20, h - 20)
  canvas.draw_line(w - 20, h - 20 - corner_size, w - 20, h - 20)

  -- Instructions at bottom
  canvas.set_color(100, 100, 100)
  canvas.set_font_size(12)
  canvas.draw_text(w/2, h - 35, "Press any key or click anywhere")
end)

-- Game state
local player_x = 250
local player_y = 280
local player_speed = 200
local score = 0
local game_time = 0

-- Main game loop (runs after user clicks)
canvas.tick(function()
  local w, h = canvas.get_width(), canvas.get_height()
  local dt = canvas.get_delta()

  game_time = game_time + dt

  -- Player movement
  if canvas.is_key_down("left") or canvas.is_key_down("a") then
    player_x = player_x - player_speed * dt
  end
  if canvas.is_key_down("right") or canvas.is_key_down("d") then
    player_x = player_x + player_speed * dt
  end

  -- Keep player in bounds
  player_x = math.max(25, math.min(w - 25, player_x))

  -- Scoring (demo)
  score = math.floor(game_time * 10)

  -- Clear and draw background
  canvas.clear()
  canvas.set_color(BG_COLOR)
  canvas.fill_rect(0, 0, w, h)

  -- Draw stars (now scrolling faster)
  for _, star in ipairs(stars) do
    star.y = star.y + star.speed * 2
    if star.y > h then
      star.y = 0
      star.x = math.random(0, w)
    end
    canvas.set_color(255, 255, 255)
    canvas.fill_circle(star.x, star.y, star.size)
  end

  -- Draw player (simple spaceship)
  canvas.set_color(ACCENT_COLOR)
  canvas.begin_path()
  canvas.move_to(player_x, player_y - 20)
  canvas.line_to(player_x + 15, player_y + 15)
  canvas.line_to(player_x, player_y + 5)
  canvas.line_to(player_x - 15, player_y + 15)
  canvas.close_path()
  canvas.fill()

  -- Engine glow
  local glow = math.sin(game_time * 20) * 0.3 + 0.7
  canvas.set_color(255, 107, 107, 200 * glow)
  canvas.fill_circle(player_x, player_y + 18, 5 * glow)

  -- HUD
  canvas.set_color(TEXT_COLOR)
  canvas.set_font_size(18)
  canvas.set_text_align("left")
  canvas.set_text_baseline("top")
  canvas.draw_text(20, 20, "Score: " .. score)

  canvas.set_text_align("right")
  canvas.draw_text(w - 20, 20, "Time: " .. string.format("%.1f", game_time))

  -- Instructions
  canvas.set_color(100, 100, 100)
  canvas.set_font_size(12)
  canvas.set_text_align("center")
  canvas.draw_text(w/2, h - 20, "Use LEFT/RIGHT or A/D to move")
end)

canvas.start()
