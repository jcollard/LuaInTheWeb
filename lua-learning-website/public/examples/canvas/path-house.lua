-- canvas/path-house.lua
-- Demonstrates the path API with a house shape (fill and stroke)

local canvas = require("canvas")

-- House position
local houseX, houseY = 300, 250

function drawHouse(x, y, width, height)
  local roofHeight = height * 0.4
  local bodyHeight = height * 0.6

  -- Draw the house body using path API
  canvas.begin_path()
  canvas.move_to(x, y + roofHeight)              -- Top-left of body
  canvas.line_to(x + width, y + roofHeight)      -- Top-right of body
  canvas.line_to(x + width, y + height)          -- Bottom-right
  canvas.line_to(x, y + height)                  -- Bottom-left
  canvas.close_path()

  -- Fill house body with light tan color
  canvas.set_color(222, 184, 135)
  canvas.fill()

  -- Stroke with dark brown
  canvas.set_color(139, 90, 43)
  canvas.set_line_width(3)
  canvas.stroke()

  -- Draw the roof using path API
  canvas.begin_path()
  canvas.move_to(x - 20, y + roofHeight)         -- Left overhang
  canvas.line_to(x + width/2, y)                  -- Roof peak
  canvas.line_to(x + width + 20, y + roofHeight) -- Right overhang
  canvas.close_path()

  -- Fill roof with red
  canvas.set_color(178, 34, 34)
  canvas.fill()

  -- Stroke roof with dark red
  canvas.set_color(100, 20, 20)
  canvas.set_line_width(3)
  canvas.stroke()

  -- Draw door using path API
  local doorWidth = width * 0.25
  local doorHeight = bodyHeight * 0.6
  local doorX = x + width/2 - doorWidth/2
  local doorY = y + height - doorHeight

  canvas.begin_path()
  canvas.move_to(doorX, doorY + doorHeight)
  canvas.line_to(doorX, doorY)
  canvas.line_to(doorX + doorWidth, doorY)
  canvas.line_to(doorX + doorWidth, doorY + doorHeight)
  -- Note: don't close_path to leave bottom open (on ground)

  -- Fill door with brown
  canvas.set_color(101, 67, 33)
  canvas.fill()

  -- Stroke door
  canvas.set_color(60, 40, 20)
  canvas.set_line_width(2)
  canvas.stroke()

  -- Draw window using path API
  local winSize = width * 0.2
  local winX = x + width * 0.15
  local winY = y + roofHeight + bodyHeight * 0.2

  canvas.begin_path()
  canvas.move_to(winX, winY)
  canvas.line_to(winX + winSize, winY)
  canvas.line_to(winX + winSize, winY + winSize)
  canvas.line_to(winX, winY + winSize)
  canvas.close_path()

  -- Fill window with light blue
  canvas.set_color(173, 216, 230)
  canvas.fill()

  -- Stroke window
  canvas.set_color(100, 100, 100)
  canvas.set_line_width(2)
  canvas.stroke()
end

function draw()
  -- Clear the screen
  canvas.clear()

  -- Sky background
  canvas.set_color(135, 206, 235)
  canvas.fill_rect(0, 0, 800, 400)

  -- Grass
  canvas.set_color(34, 139, 34)
  canvas.fill_rect(0, 400, 800, 200)

  -- Draw the house
  drawHouse(houseX, houseY, 200, 200)

  -- Draw instruction text
  canvas.set_color(0, 0, 0)
  canvas.draw_text(10, 10, "Path API Demo: House")
  canvas.draw_text(10, 30, "Shows fill and stroke on separate path elements")
end

function game()
  draw()
end

function main()
  canvas.set_size(800, 600)
  canvas.tick(game)
  canvas.start()
end

main()
