-- canvas/path/path2d-demo.lua
-- Demonstrates the Path2D API for creating reusable path objects

local canvas = require("canvas")

-- Create reusable path objects
local starPath = nil
local heartPath = nil
local hexagonPath = nil

-- Animation state
local rotation = 0
local pulse = 0

-- Create a star path using chainable methods
function createStarPath()
  local path = canvas.create_path()
  local cx, cy = 0, 0
  local outer, inner = 50, 20
  local points = 5
  local step = math.pi / points

  for i = 0, points * 2 - 1 do
    local r = (i % 2 == 0) and outer or inner
    local a = i * step - math.pi / 2
    local px = cx + r * math.cos(a)
    local py = cy + r * math.sin(a)

    if i == 0 then
      path:move_to(px, py)
    else
      path:line_to(px, py)
    end
  end
  path:close_path()
  return path
end

-- Create a heart using SVG path string
function createHeartPath()
  -- Heart shape defined using SVG path commands
  -- M = moveto, C = cubic bezier curve, Z = close path
  return canvas.create_path(
    "M 0,-20 " ..
    "C -30,-50 -60,-20 -60,10 " ..
    "C -60,40 -30,60 0,80 " ..
    "C 30,60 60,40 60,10 " ..
    "C 60,-20 30,-50 0,-20 Z"
  )
end

-- Create a hexagon path using rect and arc methods
function createHexagonPath()
  local path = canvas.create_path()
  local radius = 40

  for i = 0, 5 do
    local angle = i * math.pi / 3 - math.pi / 6
    local x = radius * math.cos(angle)
    local y = radius * math.sin(angle)
    if i == 0 then
      path:move_to(x, y)
    else
      path:line_to(x, y)
    end
  end
  path:close_path()
  return path
end

function init()
  starPath = createStarPath()
  heartPath = createHeartPath()
  hexagonPath = createHexagonPath()
end

function draw()
  -- Clear with dark background
  canvas.set_color(25, 25, 35)
  canvas.fill_rect(0, 0, 800, 600)

  -- Update animation
  rotation = rotation + canvas.get_delta() * 1.5
  pulse = pulse + canvas.get_delta() * 3

  -- Draw title
  canvas.set_color(255, 255, 255)
  canvas.draw_text(10, 10, "Path2D API Demo - Reusable Path Objects")
  canvas.draw_text(10, 30, "Paths are created once and reused for efficient rendering")

  -- Draw multiple stars using the same path object
  drawStars()

  -- Draw heart with pulsing effect
  drawHeart()

  -- Draw hexagon grid
  drawHexagonGrid()

  -- Show feature labels
  canvas.set_color(200, 200, 200)
  canvas.draw_text(100, 180, "Chainable Methods")
  canvas.draw_text(350, 180, "SVG Path String")
  canvas.draw_text(600, 180, "Reusable Shapes")
end

function drawStars()
  -- Draw 3 rotating stars at different positions
  local positions = {{150, 120}, {250, 130}, {200, 100}}
  local colors = {{255, 215, 0}, {255, 165, 0}, {255, 100, 50}}

  for i, pos in ipairs(positions) do
    canvas.save()
    canvas.translate(pos[1], pos[2])
    canvas.rotate(rotation + i * 0.5)

    -- Fill the star
    canvas.set_color(colors[i][1], colors[i][2], colors[i][3])
    canvas.fill(starPath)

    -- Stroke outline
    canvas.set_color(255, 255, 255, 180)
    canvas.set_line_width(1)
    canvas.stroke(starPath)

    canvas.restore()
  end
end

function drawHeart()
  local scale = 0.8 + 0.1 * math.sin(pulse)

  canvas.save()
  canvas.translate(400, 110)
  canvas.scale(scale, scale)

  -- Fill with red
  canvas.set_color(220, 50, 50)
  canvas.fill(heartPath)

  -- Add pink highlight
  canvas.set_color(255, 150, 150, 100)
  canvas.set_line_width(3)
  canvas.stroke(heartPath)

  canvas.restore()
end

function drawHexagonGrid()
  local startX = 560
  local startY = 100
  local spacing = 50
  local cols = 3
  local rows = 2

  for row = 0, rows - 1 do
    for col = 0, cols - 1 do
      local offsetX = (row % 2) * (spacing / 2)
      local x = startX + col * spacing + offsetX
      local y = startY + row * (spacing * 0.85)

      canvas.save()
      canvas.translate(x, y)
      canvas.scale(0.5, 0.5)

      -- Alternate colors
      if (row + col) % 2 == 0 then
        canvas.set_color(100, 200, 150)
      else
        canvas.set_color(80, 160, 220)
      end
      canvas.fill(hexagonPath)

      canvas.set_color(255, 255, 255, 100)
      canvas.set_line_width(2)
      canvas.stroke(hexagonPath)

      canvas.restore()
    end
  end
end

-- Demo path cloning and hit testing
local buttonPath = nil
local buttonHover = false

function createButtonPath()
  return canvas.create_path():round_rect(-60, -20, 120, 40, 10)
end

function drawInteractiveButton()
  if not buttonPath then
    buttonPath = createButtonPath()
  end

  local bx, by = 400, 450
  local mx, my = canvas.get_mouse_x(), canvas.get_mouse_y()

  -- Transform mouse to button local space for hit testing
  local localX = mx - bx
  local localY = my - by

  canvas.save()
  canvas.translate(bx, by)

  -- Check if mouse is in button path
  buttonHover = canvas.is_point_in_path(buttonPath, localX, localY)

  if buttonHover then
    canvas.set_color(100, 180, 255)
  else
    canvas.set_color(60, 120, 200)
  end
  canvas.fill(buttonPath)

  canvas.set_color(255, 255, 255)
  canvas.set_line_width(2)
  canvas.stroke(buttonPath)

  -- Button text
  canvas.draw_text(-40, -8, "Path2D Hit Test")

  canvas.restore()

  -- Instructions
  canvas.set_color(150, 150, 150)
  canvas.draw_text(300, 500, "Move mouse over button to test hit detection")
end

-- Combined paths demo
function drawCombinedPaths()
  canvas.save()
  canvas.translate(400, 340)

  -- Create a combined path from multiple shapes
  local combinedPath = canvas.create_path()

  -- Add a rectangle
  combinedPath:rect(-100, -30, 60, 60)

  -- Add a circle (using arc)
  combinedPath:move_to(50, 0)
  combinedPath:arc(10, 0, 40, 0, math.pi * 2)

  -- Fill the combined path
  canvas.set_color(150, 100, 200)
  canvas.fill(combinedPath)

  canvas.set_color(255, 255, 255)
  canvas.set_line_width(2)
  canvas.stroke(combinedPath)

  -- Clean up
  combinedPath:dispose()

  canvas.restore()

  canvas.set_color(200, 200, 200)
  canvas.draw_text(280, 380, "Combined Path (rect + arc in one path)")
end

function game()
  draw()
  drawInteractiveButton()
  drawCombinedPaths()
end

function main()
  canvas.set_size(800, 600)
  init()
  canvas.tick(game)
  canvas.start()
end

main()
