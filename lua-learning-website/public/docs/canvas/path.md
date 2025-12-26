# Path API

Create complex shapes using paths with lines, curves, arcs, and more.

## Path Basics

The path API allows you to create complex shapes by defining paths with multiple segments.

### canvas.begin_path()

Start a new path. Call this before drawing path segments.

### canvas.close_path()

Close the current path by drawing a line back to the starting point.

### canvas.move_to(x, y)

Move the path cursor to (x, y) without drawing.

**Parameters:**
- `x` (number): X coordinate
- `y` (number): Y coordinate

### canvas.line_to(x, y)

Draw a line from the current position to (x, y).

**Parameters:**
- `x` (number): X coordinate
- `y` (number): Y coordinate

### canvas.fill()

Fill the current path with the current color.

### canvas.stroke()

Stroke (outline) the current path with the current color and line width.

```lua
-- Draw a filled triangle
canvas.begin_path()
canvas.move_to(100, 100)
canvas.line_to(150, 50)
canvas.line_to(200, 100)
canvas.close_path()
canvas.set_color("#4ECDC4")
canvas.fill()
canvas.set_color("#000000")
canvas.stroke()
```

## Arcs

### canvas.arc(x, y, radius, startAngle, endAngle, counterclockwise?)

Draw an arc (portion of a circle) on the current path.

**Parameters:**
- `x` (number): X coordinate of arc center
- `y` (number): Y coordinate of arc center
- `radius` (number): Arc radius in pixels
- `startAngle` (number): Start angle in radians (0 = 3 o'clock)
- `endAngle` (number): End angle in radians
- `counterclockwise` (boolean, optional): Draw counterclockwise (default: false)

```lua
-- Draw a pie chart slice
canvas.begin_path()
canvas.move_to(200, 200)  -- center
canvas.arc(200, 200, 100, 0, math.pi / 2)  -- quarter circle
canvas.close_path()
canvas.set_color("#FF6B6B")
canvas.fill()
```

### canvas.arc_to(x1, y1, x2, y2, radius)

Draw an arc using tangent control points. Useful for creating rounded corners.

**Parameters:**
- `x1` (number): X coordinate of first control point
- `y1` (number): Y coordinate of first control point
- `x2` (number): X coordinate of second control point
- `y2` (number): Y coordinate of second control point
- `radius` (number): Arc radius in pixels

```lua
-- Draw a rounded corner
canvas.begin_path()
canvas.move_to(50, 100)
canvas.arc_to(100, 100, 100, 50, 20)
canvas.stroke()
```

## Bezier Curves

### canvas.quadratic_curve_to(cpx, cpy, x, y)

Draw a quadratic Bezier curve from the current point. Uses a single control point for a simple curve.

**Parameters:**
- `cpx` (number): X coordinate of the control point
- `cpy` (number): Y coordinate of the control point
- `x` (number): X coordinate of the end point
- `y` (number): Y coordinate of the end point

```lua
-- Draw a simple curved arc
canvas.begin_path()
canvas.move_to(50, 200)
canvas.quadratic_curve_to(150, 50, 250, 200)
canvas.stroke()
```

### canvas.bezier_curve_to(cp1x, cp1y, cp2x, cp2y, x, y)

Draw a cubic Bezier curve from the current point. Uses two control points for complex S-curves and smooth shapes.

**Parameters:**
- `cp1x` (number): X coordinate of the first control point
- `cp1y` (number): Y coordinate of the first control point
- `cp2x` (number): X coordinate of the second control point
- `cp2y` (number): Y coordinate of the second control point
- `x` (number): X coordinate of the end point
- `y` (number): Y coordinate of the end point

```lua
-- Draw an S-curve
canvas.begin_path()
canvas.move_to(50, 200)
canvas.bezier_curve_to(150, 50, 250, 350, 350, 200)
canvas.set_line_width(3)
canvas.stroke()
```

## Ellipse

### canvas.ellipse(x, y, radiusX, radiusY, rotation?, startAngle?, endAngle?, counterclockwise?)

Draw an ellipse (oval) on the current path. An ellipse has separate horizontal and vertical radii.

**Parameters:**
- `x` (number): X coordinate of the ellipse's center
- `y` (number): Y coordinate of the ellipse's center
- `radiusX` (number): Horizontal radius (half-width)
- `radiusY` (number): Vertical radius (half-height)
- `rotation` (number, optional): Rotation in radians (default: 0)
- `startAngle` (number, optional): Start angle in radians (default: 0)
- `endAngle` (number, optional): End angle in radians (default: 2*PI for full ellipse)
- `counterclockwise` (boolean, optional): Draw counterclockwise (default: false)

```lua
-- Draw a full oval
canvas.begin_path()
canvas.ellipse(200, 150, 100, 50)  -- Wide oval
canvas.set_color("#4ECDC4")
canvas.fill()

-- Draw a rotated ellipse
canvas.begin_path()
canvas.ellipse(200, 200, 80, 40, math.pi / 4)  -- 45-degree rotation
canvas.stroke()
```

## Rounded Rectangle

### canvas.round_rect(x, y, width, height, radii)

Draw a rounded rectangle on the current path. Great for buttons and UI elements.

**Parameters:**
- `x` (number): X coordinate of top-left corner
- `y` (number): Y coordinate of top-left corner
- `width` (number): Rectangle width
- `height` (number): Rectangle height
- `radii` (number or table): Corner radius/radii

**Radii formats:**
- Single number: Same radius for all corners
- `{r}`: Same radius for all corners
- `{r1, r2}`: r1 for top-left/bottom-right, r2 for top-right/bottom-left
- `{r1, r2, r3}`: r1=top-left, r2=top-right/bottom-left, r3=bottom-right
- `{r1, r2, r3, r4}`: top-left, top-right, bottom-right, bottom-left

```lua
-- Draw a button with uniform rounded corners
canvas.begin_path()
canvas.round_rect(50, 50, 200, 60, 15)
canvas.set_color("#667EEA")
canvas.fill()

-- Draw with different corner radii
canvas.begin_path()
canvas.round_rect(50, 150, 200, 60, {20, 0, 20, 0})  -- Alternating corners
canvas.fill()
```

## Clipping

### canvas.clip(fillRule?)

Clip all future drawing to the current path. Creates a clipping region from the current path - all subsequent drawing is constrained to this region.

**Parameters:**
- `fillRule` (string, optional): "nonzero" (default) or "evenodd"

**Important:** Clipping can only shrink the region, not expand it. Use `save()` before clipping and `restore()` to remove the clipping region.

```lua
-- Create a circular viewport
canvas.save()
canvas.begin_path()
canvas.arc(200, 200, 80, 0, math.pi * 2)
canvas.clip()

-- Draw a pattern (clipped to circle)
canvas.set_color(255, 100, 100)
for i = 0, 400, 20 do
  canvas.fill_rect(0, i, 400, 10)
end

canvas.restore()  -- Remove clipping
```

---

## Related Examples

- [Triangle](../../examples/canvas/path/triangle.lua) - Simple path with fill
- [Star](../../examples/canvas/path/star.lua) - Complex multi-point path
- [House](../../examples/canvas/path/house.lua) - Compound shapes with paths
- [Pie Chart](../../examples/canvas/path/arc-pie-chart.lua) - Using arc() for charts
- [Smiley Face](../../examples/canvas/path/arc-smiley.lua) - Arcs for curved shapes
- [Bezier Curves](../../examples/canvas/path/bezier-curves.lua) - Cubic bezier curves
- [Quadratic Curves](../../examples/canvas/path/quadratic-curves.lua) - Quadratic bezier curves
- [Ellipse Shapes](../../examples/canvas/path/ellipse-shapes.lua) - Ellipse drawing
- [Rounded Buttons](../../examples/canvas/path/rounded-buttons.lua) - round_rect() for UI elements
- [Clipping Demo](../../examples/canvas/path/clipping-demo.lua) - clip() for masks

---

[← Back to Canvas Library](../canvas.md)
