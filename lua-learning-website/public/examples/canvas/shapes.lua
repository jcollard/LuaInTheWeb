-- canvas/shapes.lua
-- Demonstrates canvas drawing with shapes and colors

local canvas = require("canvas")

function draw()
  -- Clear the screen
  canvas.clear()

  -- Dark blue background
  canvas.set_color(25, 25, 75)
  canvas.fill_rect(0, 0, 800, 600)

  -- Draw a red filled rectangle
  canvas.set_color(255, 0, 0)
  canvas.fill_rect(50, 50, 100, 80)

  -- Draw a green filled circle
  canvas.set_color(0, 255, 0)
  canvas.fill_circle(300, 150, 60)

  -- Draw a blue outlined rectangle
  canvas.set_color(0, 128, 255)
  canvas.set_line_width(3)
  canvas.draw_rect(150, 200, 120, 100)

  -- Draw a yellow outlined circle
  canvas.set_color(255, 255, 0)
  canvas.set_line_width(2)
  canvas.draw_circle(450, 250, 50)

  -- Draw some magenta lines (X pattern)
  canvas.set_color(255, 0, 255)
  canvas.set_line_width(2)
  canvas.draw_line(400, 50, 550, 150)
  canvas.draw_line(550, 50, 400, 150)

  -- Draw white text
  canvas.set_color(255, 255, 255)
  canvas.draw_text(50, 350, "Canvas Shapes Demo!")

  -- Show the elapsed time
  local time = canvas.get_time()
  canvas.set_color(180, 180, 180)
  canvas.draw_text(50, 380, string.format("Time: %.1f seconds", time))
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
