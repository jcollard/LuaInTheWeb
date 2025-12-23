-- canvas/arc-pie-chart.lua
-- Demonstrates the arc API with an animated pie chart

local canvas = require("canvas")

-- Pie chart data
local slices = {
  { value = 30, color = "#FF6B6B", label = "Red" },
  { value = 25, color = "#4ECDC4", label = "Teal" },
  { value = 20, color = "#45B7D1", label = "Blue" },
  { value = 15, color = "#96CEB4", label = "Green" },
  { value = 10, color = "#FFEAA7", label = "Yellow" },
}

-- Chart settings
local cx, cy = 300, 300  -- Center of pie
local radius = 150
local animationProgress = 0

function draw()
  -- Clear the screen
  canvas.clear()

  -- Dark background
  canvas.set_color(30, 30, 50)
  canvas.fill_rect(0, 0, 800, 600)

  -- Calculate total value
  local total = 0
  for _, slice in ipairs(slices) do
    total = total + slice.value
  end

  -- Draw pie slices
  local startAngle = -math.pi / 2  -- Start at top (12 o'clock)
  for i, slice in ipairs(slices) do
    local sweepAngle = (slice.value / total) * math.pi * 2
    local endAngle = startAngle + sweepAngle * math.min(1, animationProgress)

    -- Draw the slice
    canvas.begin_path()
    canvas.move_to(cx, cy)  -- Start at center
    canvas.arc(cx, cy, radius, startAngle, endAngle)
    canvas.close_path()

    canvas.set_color(slice.color)
    canvas.fill()

    -- Draw slice outline
    canvas.set_color(30, 30, 50)
    canvas.set_line_width(2)
    canvas.stroke()

    startAngle = startAngle + sweepAngle
  end

  -- Draw legend
  local legendX = 500
  local legendY = 150
  for i, slice in ipairs(slices) do
    -- Color box
    canvas.set_color(slice.color)
    canvas.fill_rect(legendX, legendY + (i - 1) * 40, 25, 25)

    -- Label
    canvas.set_color(255, 255, 255)
    canvas.draw_text(legendX + 35, legendY + (i - 1) * 40 + 5, slice.label .. " (" .. slice.value .. "%)")
  end

  -- Draw title
  canvas.set_color(255, 255, 255)
  canvas.draw_text(10, 10, "Arc API Demo: Animated Pie Chart")
  canvas.draw_text(10, 30, "Uses: arc() for drawing pie slices")

  -- Animate
  if animationProgress < 1 then
    animationProgress = animationProgress + canvas.get_delta() * 0.5
  end
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
