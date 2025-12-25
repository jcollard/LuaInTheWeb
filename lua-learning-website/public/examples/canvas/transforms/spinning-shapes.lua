-- canvas/transforms/spinning-shapes.lua
-- Demonstrates: save/restore with multiple rotating objects
-- Features: save, restore, translate, rotate, fill_rect, fill_circle, draw_line
--
-- Each shape has its own rotation using save/restore
-- to isolate transformations between shapes.

local canvas = require('canvas')

local time = 0

local function update()
  time = time + canvas.get_delta()
end

local function draw()
  canvas.clear()

  -- Shape 1: Red square rotating clockwise
  canvas.save()
  canvas.translate(150, 200)
  canvas.rotate(time * 2)
  canvas.set_color(255, 80, 80)
  canvas.fill_rect(-40, -40, 80, 80)
  canvas.restore()

  -- Shape 2: Green circle orbiting
  canvas.save()
  canvas.translate(300, 200)
  canvas.rotate(time)
  canvas.translate(60, 0)  -- Offset from center
  canvas.set_color(80, 255, 80)
  canvas.fill_circle(0, 0, 25)
  canvas.restore()

  -- Shape 3: Blue triangle rotating counter-clockwise
  canvas.save()
  canvas.translate(450, 200)
  canvas.rotate(-time * 1.5)
  canvas.set_color(80, 80, 255)
  -- Draw triangle using three lines
  canvas.set_line_width(3)
  canvas.draw_line(0, -40, 35, 30)
  canvas.draw_line(35, 30, -35, 30)
  canvas.draw_line(-35, 30, 0, -40)
  canvas.restore()

  -- Draw labels
  canvas.set_color(200, 200, 200)
  canvas.draw_text(120, 350, "Square")
  canvas.draw_text(265, 350, "Orbiting")
  canvas.draw_text(415, 350, "Triangle")

  canvas.draw_text(10, 20, "Multiple shapes with independent rotations")
  canvas.draw_text(10, 40, "Each uses save() and restore()")
end

local function game()
  update()
  draw()
end

canvas.set_size(600, 400)
canvas.tick(game)
canvas.start()
