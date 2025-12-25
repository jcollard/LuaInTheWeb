# Transformations

Transform the canvas coordinate system to translate, rotate, scale, and apply matrix transformations.

## Basic Transformations

Transformations allow you to translate, rotate, and scale the canvas coordinate system.
All subsequent drawing operations are affected by the current transformation.

### canvas.translate(dx, dy)

Move the canvas origin by the specified amount. All subsequent drawing will be offset.

**Parameters:**
- `dx` (number): Horizontal distance to move
- `dy` (number): Vertical distance to move

```lua
canvas.translate(100, 100)  -- Move origin to (100, 100)
canvas.fill_rect(0, 0, 50, 50)  -- Draws at (100, 100)
```

### canvas.rotate(angle)

Rotate the canvas around the current origin. The angle is in radians.

**Parameters:**
- `angle` (number): Rotation angle in radians

```lua
canvas.rotate(math.pi / 4)  -- Rotate 45 degrees
canvas.fill_rect(0, 0, 50, 50)  -- Draws rotated
```

### canvas.scale(sx, sy)

Scale the canvas from the current origin. Negative values flip/mirror.

**Parameters:**
- `sx` (number): Horizontal scale factor (1.0 = normal, 2.0 = double, -1 = mirror)
- `sy` (number): Vertical scale factor

```lua
canvas.scale(2, 2)   -- Double size
canvas.scale(-1, 1)  -- Flip horizontally (mirror)
```

## State Management

### canvas.save()

Save the current transformation state to a stack. Use with `restore()` to temporarily apply transformations.

```lua
canvas.save()
canvas.translate(100, 100)
canvas.rotate(math.pi / 4)
canvas.fill_rect(-25, -25, 50, 50)  -- Draw rotated square
canvas.restore()  -- Undo translate and rotate
```

### canvas.restore()

Restore the most recently saved transformation state. Undoes all transformations since the last `save()`.

## Matrix Transformations

### canvas.transform(a, b, c, d, e, f)

Apply a custom 2D transformation matrix. Multiplies the current matrix by the specified values.

**Parameters (2x3 matrix):**
- `a` (number): Horizontal scaling
- `b` (number): Vertical skewing
- `c` (number): Horizontal skewing
- `d` (number): Vertical scaling
- `e` (number): Horizontal translation
- `f` (number): Vertical translation

### canvas.set_transform(a, b, c, d, e, f)

Reset to identity matrix, then apply the specified transformation.

**Parameters (2x3 matrix):**
- `a` (number): Horizontal scaling
- `b` (number): Vertical skewing
- `c` (number): Horizontal skewing
- `d` (number): Vertical scaling
- `e` (number): Horizontal translation
- `f` (number): Vertical translation

### canvas.reset_transform()

Reset the transformation matrix to identity (no transformation).

```lua
canvas.reset_transform()  -- Clear all transforms
```

## Example: Rotating Squares

```lua
local canvas = require('canvas')

canvas.set_size(400, 400)

local angle = 0

local function update()
  angle = angle + canvas.get_delta()
end

local function draw()
  canvas.clear()

  -- Draw rotating square at center
  canvas.save()
  canvas.translate(200, 200)  -- Move to center
  canvas.rotate(angle)        -- Apply rotation
  canvas.set_color(255, 0, 0)
  canvas.fill_rect(-50, -50, 100, 100)  -- Draw centered
  canvas.restore()

  -- Draw another square rotating the opposite way
  canvas.save()
  canvas.translate(200, 200)
  canvas.rotate(-angle * 2)
  canvas.set_color(0, 0, 255)
  canvas.fill_rect(-25, -25, 50, 50)
  canvas.restore()
end

local function game()
  update()
  draw()
end

canvas.tick(game)
canvas.start()
```

---

## Related Examples

- [Rotating Square](../../examples/canvas/transforms/rotating-square.lua) - Basic rotation animation
- [Spinning Shapes](../../examples/canvas/transforms/spinning-shapes.lua) - Multiple rotating shapes
- [Mirror Effect](../../examples/canvas/transforms/mirror-effect.lua) - Negative scale for flipping
- [Zoom Effect](../../examples/canvas/transforms/zoom-effect.lua) - Interactive zoom with scale()
- [Analog Clock](../../examples/canvas/transforms/analog-clock.lua) - Practical rotate() usage
- [Transform Reset](../../examples/canvas/transforms/transform-reset.lua) - reset_transform() and set_transform()

---

[← Back to Canvas Library](../canvas.md)
