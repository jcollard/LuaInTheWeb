# HC Collision Detection Library

The HC library provides collision detection for 2D games. It supports circles, rectangles, and polygons (both convex and concave), using spatial hashing for efficient broad-phase detection and the GJK algorithm for precise narrow-phase detection.

> **License:** HC is licensed under the MIT License. Copyright (c) 2010-2012 Matthias Richter.
> Source: https://github.com/vrld/HC

## Loading the Library

```lua
local HC = require('hc')
```

## Quick Start

```lua
local HC = require('hc')

-- Create some shapes
local player = HC:rectangle(100, 100, 32, 32)
local enemy = HC:circle(200, 150, 20)

-- Check for collisions
for shape, sep in pairs(HC:collisions(player)) do
  -- sep.x and sep.y give the separation vector
  player:move(sep.x, sep.y)
end
```

## Creating Shapes

### HC:circle(x, y, radius)

Creates and registers a circle shape.

**Parameters:**
- `x` (number): Center x coordinate
- `y` (number): Center y coordinate
- `radius` (number): Circle radius

**Returns:**
- (Shape): The created circle shape

```lua
local ball = HC:circle(100, 100, 25)
```

### HC:rectangle(x, y, width, height)

Creates and registers a rectangle shape.

**Parameters:**
- `x` (number): Left edge x coordinate
- `y` (number): Top edge y coordinate
- `width` (number): Rectangle width
- `height` (number): Rectangle height

**Returns:**
- (Shape): The created rectangle shape

```lua
local box = HC:rectangle(50, 50, 100, 60)
```

### HC:polygon(x1, y1, x2, y2, ...)

Creates and registers a polygon shape from vertex coordinates.

**Parameters:**
- `x1, y1, x2, y2, ...` (numbers): Vertex coordinates in order

**Returns:**
- (Shape): The created polygon shape

```lua
-- Create a triangle
local triangle = HC:polygon(0, 0, 50, 0, 25, 50)

-- Create a pentagon
local pentagon = HC:polygon(
  50, 0,
  100, 38,
  80, 100,
  20, 100,
  0, 38
)
```

### HC:point(x, y)

Creates and registers a point shape.

**Parameters:**
- `x` (number): X coordinate
- `y` (number): Y coordinate

**Returns:**
- (Shape): The created point shape

```lua
local marker = HC:point(200, 150)
```

## Collision Detection

### HC:collisions(shape)

Gets all shapes colliding with the given shape, along with separation vectors.

**Parameters:**
- `shape` (Shape): The shape to check collisions for

**Returns:**
- (table): A table mapping colliding shapes to separation vectors `{x=dx, y=dy}`

The separation vector indicates how much to move the shape to resolve the collision.

```lua
local player = HC:rectangle(100, 100, 32, 32)

-- Check and resolve collisions
for other, sep in pairs(HC:collisions(player)) do
  -- Move player out of collision
  player:move(sep.x, sep.y)
end
```

### HC:neighbors(shape)

Gets shapes that might collide with the given shape (broad phase only). This is faster than `collisions()` but may include false positives.

**Parameters:**
- `shape` (Shape): The shape to check

**Returns:**
- (table): A table of potential collision candidates

```lua
local nearby = HC:neighbors(player)
for shape in pairs(nearby) do
  -- These shapes are close enough to potentially collide
end
```

### HC:shapesAt(x, y)

Gets all shapes that contain the specified point.

**Parameters:**
- `x` (number): X coordinate
- `y` (number): Y coordinate

**Returns:**
- (table): A table of shapes containing the point

```lua
-- Check what shapes are under the mouse
local shapes = HC:shapesAt(mouseX, mouseY)
for shape in pairs(shapes) do
  -- This shape contains the point
end
```

## Shape Methods

All shapes support the following methods:

### shape:move(dx, dy)

Moves the shape by the given offset.

**Parameters:**
- `dx` (number): X offset
- `dy` (number): Y offset

**Returns:**
- (Shape): The shape (for chaining)

```lua
player:move(5, 0)  -- Move right by 5 pixels
```

### shape:moveTo(x, y)

Moves the shape's center to the specified position.

**Parameters:**
- `x` (number): Target x coordinate
- `y` (number): Target y coordinate

```lua
player:moveTo(100, 100)
```

### shape:rotate(angle, cx, cy)

Rotates the shape around a point.

**Parameters:**
- `angle` (number): Rotation angle in radians
- `cx` (number, optional): Center x coordinate (defaults to shape center)
- `cy` (number, optional): Center y coordinate (defaults to shape center)

**Returns:**
- (Shape): The shape (for chaining)

```lua
-- Rotate 45 degrees around center
player:rotate(math.pi / 4)

-- Rotate around a specific point
player:rotate(math.pi / 2, 100, 100)
```

### shape:scale(factor)

Scales the shape by the given factor.

**Parameters:**
- `factor` (number): Scale factor (must be > 0)

**Returns:**
- (Shape): The shape (for chaining)

```lua
player:scale(2)    -- Double the size
player:scale(0.5)  -- Half the size
```

### shape:center()

Gets the center coordinates of the shape.

**Returns:**
- `x` (number): Center x coordinate
- `y` (number): Center y coordinate

```lua
local cx, cy = player:center()
```

### shape:bbox()

Gets the axis-aligned bounding box of the shape.

**Returns:**
- `x1` (number): Left edge
- `y1` (number): Top edge
- `x2` (number): Right edge
- `y2` (number): Bottom edge

```lua
local x1, y1, x2, y2 = player:bbox()
local width = x2 - x1
local height = y2 - y1
```

### shape:contains(x, y)

Checks if the shape contains a point.

**Parameters:**
- `x` (number): X coordinate
- `y` (number): Y coordinate

**Returns:**
- (boolean): True if the point is inside the shape

```lua
if player:contains(mouseX, mouseY) then
  print("Mouse is over player!")
end
```

### shape:collidesWith(other)

Checks if this shape collides with another shape.

**Parameters:**
- `other` (Shape): The other shape to check

**Returns:**
- `collides` (boolean): True if the shapes collide
- `dx` (number): X component of separation vector (or nil)
- `dy` (number): Y component of separation vector (or nil)

```lua
local collides, dx, dy = player:collidesWith(enemy)
if collides then
  player:move(dx, dy)
end
```

## Managing Shapes

### HC:remove(shape)

Removes a shape from the collision detection system.

**Parameters:**
- `shape` (Shape): The shape to remove

```lua
-- Remove enemy when destroyed
HC:remove(enemy)
```

### HC:register(shape)

Manually registers a shape with the collision system. Shapes created with `HC:circle()`, `HC:rectangle()`, etc. are automatically registered.

**Parameters:**
- `shape` (Shape): The shape to register

**Returns:**
- (Shape): The registered shape

### HC.new(cell_size)

Creates a new, separate HC instance. Useful when you need multiple independent collision worlds.

**Parameters:**
- `cell_size` (number, optional): Size of spatial hash cells (default: 100)

**Returns:**
- (HC): A new HC instance

```lua
-- Create separate collision worlds
local worldA = HC.new(100)
local worldB = HC.new(50)

local shapeA = worldA:circle(100, 100, 25)
local shapeB = worldB:circle(100, 100, 25)
-- These shapes won't detect collisions with each other
```

## Example: Platformer Collision

```lua
local HC = require('hc')
local canvas = require('canvas')

-- Create player and platforms
local player = HC:rectangle(100, 100, 32, 48)
local ground = HC:rectangle(0, 400, 800, 50)
local platform = HC:rectangle(200, 300, 100, 20)

local velocityY = 0
local gravity = 0.5

canvas.tick(function()
  -- Apply gravity
  velocityY = velocityY + gravity
  player:move(0, velocityY)

  -- Check collisions and resolve
  for shape, sep in pairs(HC:collisions(player)) do
    player:move(sep.x, sep.y)

    -- If we hit something below, stop falling
    if sep.y < 0 then
      velocityY = 0
    end
  end

  -- Draw shapes
  canvas.clear()
  canvas.set_color(0, 255, 0)
  local x1, y1, x2, y2 = player:bbox()
  canvas.fill_rect(x1, y1, x2-x1, y2-y1)

  canvas.set_color(139, 69, 19)
  x1, y1, x2, y2 = ground:bbox()
  canvas.fill_rect(x1, y1, x2-x1, y2-y1)

  x1, y1, x2, y2 = platform:bbox()
  canvas.fill_rect(x1, y1, x2-x1, y2-y1)
end)

canvas.start()
```

## Example: Circle Collision Game

```lua
local HC = require('hc')
local canvas = require('canvas')

-- Create player circle
local player = HC:circle(400, 300, 20)

-- Create some obstacles
local obstacles = {}
for i = 1, 5 do
  local x = math.random(100, 700)
  local y = math.random(100, 500)
  local r = math.random(30, 60)
  obstacles[#obstacles + 1] = HC:circle(x, y, r)
end

canvas.tick(function()
  -- Move player with arrow keys
  local dx, dy = 0, 0
  if canvas.is_key_down('ArrowLeft') then dx = -3 end
  if canvas.is_key_down('ArrowRight') then dx = 3 end
  if canvas.is_key_down('ArrowUp') then dy = -3 end
  if canvas.is_key_down('ArrowDown') then dy = 3 end

  player:move(dx, dy)

  -- Check collisions
  local colliding = false
  for shape, sep in pairs(HC:collisions(player)) do
    player:move(sep.x, sep.y)
    colliding = true
  end

  -- Draw
  canvas.clear()

  -- Draw obstacles
  canvas.set_color(255, 0, 0)
  for _, obs in ipairs(obstacles) do
    local cx, cy = obs:center()
    local _, _, r = obs:outcircle()
    canvas.fill_circle(cx, cy, r)
  end

  -- Draw player
  if colliding then
    canvas.set_color(255, 255, 0)
  else
    canvas.set_color(0, 255, 0)
  end
  local cx, cy = player:center()
  canvas.fill_circle(cx, cy, 20)
end)

canvas.start()
```
