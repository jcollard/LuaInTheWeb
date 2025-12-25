# Hit Testing

Detect clicks and hovers on complex shapes using path-based hit testing.

## Overview

Hit testing allows you to check if a point (such as mouse coordinates) is inside or on a path. This is useful for detecting clicks on complex shapes like triangles, polygons, or custom paths.

## Functions

### canvas.is_point_in_path(x, y, fillRule?)

Check if a point is inside the current path. Must be called after building a path with `begin_path()`, `move_to()`, etc.

**Parameters:**
- `x` (number): X coordinate of the point to test
- `y` (number): Y coordinate of the point to test
- `fillRule` (string, optional): "nonzero" (default) or "evenodd"

**Returns:** `boolean` - true if the point is inside the path

```lua
-- Interactive triangle that changes color on hover
canvas.begin_path()
canvas.move_to(200, 100)
canvas.line_to(100, 300)
canvas.line_to(300, 300)
canvas.close_path()

local mx, my = canvas.get_mouse_x(), canvas.get_mouse_y()
if canvas.is_point_in_path(mx, my) then
  canvas.set_color(255, 0, 0)  -- Red when hovered
else
  canvas.set_color(100, 100, 100)  -- Gray otherwise
end
canvas.fill()
```

### canvas.is_point_in_stroke(x, y)

Check if a point is on the stroke of the current path. The hit detection uses the current line width - wider lines are easier to click.

**Parameters:**
- `x` (number): X coordinate of the point to test
- `y` (number): Y coordinate of the point to test

**Returns:** `boolean` - true if the point is on the path's stroke

```lua
-- Interactive line that highlights on hover
canvas.set_line_width(5)  -- 5px wide stroke for easier clicking
canvas.begin_path()
canvas.move_to(50, 50)
canvas.line_to(350, 350)

local mx, my = canvas.get_mouse_x(), canvas.get_mouse_y()
if canvas.is_point_in_stroke(mx, my) then
  canvas.set_color(255, 0, 0)  -- Red when hovered
else
  canvas.set_color(0, 0, 0)  -- Black otherwise
end
canvas.stroke()
```

## Fill Rules

The `fillRule` parameter controls how the "inside" of a shape is determined:

### "nonzero" (default)
Standard winding rule - a point is inside if a ray from it crosses more left-to-right edges than right-to-left. This is the default and works for most shapes.

### "evenodd"
A point is inside if a ray from it crosses an odd number of edges. This is useful for shapes with holes.

```lua
-- Shape with a hole using "evenodd"
canvas.begin_path()
-- Outer square
canvas.move_to(50, 50)
canvas.line_to(250, 50)
canvas.line_to(250, 250)
canvas.line_to(50, 250)
canvas.close_path()
-- Inner square (hole)
canvas.move_to(100, 100)
canvas.line_to(200, 100)
canvas.line_to(200, 200)
canvas.line_to(100, 200)
canvas.close_path()

local mx, my = canvas.get_mouse_x(), canvas.get_mouse_y()
-- With "evenodd", the inner square is NOT part of the shape
if canvas.is_point_in_path(mx, my, "evenodd") then
  canvas.set_color(0, 255, 0)  -- Green when in the ring
else
  canvas.set_color(100, 100, 100)
end
canvas.fill("evenodd")
```

## Example: Clickable Buttons

```lua
local canvas = require('canvas')

canvas.set_size(400, 300)

-- Button definitions
local buttons = {
  {x = 50, y = 50, w = 120, h = 40, text = "Start", color = "#4CAF50"},
  {x = 50, y = 110, w = 120, h = 40, text = "Options", color = "#2196F3"},
  {x = 50, y = 170, w = 120, h = 40, text = "Quit", color = "#f44336"},
}

canvas.tick(function()
  canvas.clear()

  local mx, my = canvas.get_mouse_x(), canvas.get_mouse_y()
  local clicked = canvas.is_mouse_pressed(0)

  for _, btn in ipairs(buttons) do
    -- Build path for hit testing
    canvas.begin_path()
    canvas.round_rect(btn.x, btn.y, btn.w, btn.h, 8)

    local hovered = canvas.is_point_in_path(mx, my)

    -- Handle click
    if hovered and clicked then
      print("Clicked: " .. btn.text)
    end

    -- Draw button (lighter when hovered)
    if hovered then
      canvas.set_fill_style(btn.color .. "CC")  -- Lighter
    else
      canvas.set_fill_style(btn.color)
    end
    canvas.fill()

    -- Draw text
    canvas.set_fill_style("#FFFFFF")
    canvas.draw_label(btn.x, btn.y, btn.w, btn.h, btn.text)
  end
end)

canvas.start()
```

## Example: Interactive Polygon

```lua
local canvas = require('canvas')

canvas.set_size(400, 400)

-- Pentagon vertices
local function pentagon(cx, cy, r)
  local points = {}
  for i = 0, 4 do
    local angle = (i / 5) * math.pi * 2 - math.pi / 2
    table.insert(points, {
      x = cx + math.cos(angle) * r,
      y = cy + math.sin(angle) * r
    })
  end
  return points
end

local pts = pentagon(200, 200, 100)

canvas.tick(function()
  canvas.clear()

  -- Build pentagon path
  canvas.begin_path()
  canvas.move_to(pts[1].x, pts[1].y)
  for i = 2, #pts do
    canvas.line_to(pts[i].x, pts[i].y)
  end
  canvas.close_path()

  -- Hit test
  local mx, my = canvas.get_mouse_x(), canvas.get_mouse_y()
  local inside = canvas.is_point_in_path(mx, my)

  -- Draw with hover effect
  if inside then
    canvas.set_fill_style("#667EEA")
  else
    canvas.set_fill_style("#333333")
  end
  canvas.fill()

  canvas.set_stroke_style("#FFFFFF")
  canvas.set_line_width(2)
  canvas.stroke()
end)

canvas.start()
```

---

[← Back to Canvas Library](../canvas.md)
