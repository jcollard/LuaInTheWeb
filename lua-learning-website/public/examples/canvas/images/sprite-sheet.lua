-- canvas/images/sprite-sheet.lua
-- Demonstrates: draw_image with source cropping (9-argument form)
-- Features: draw_image source rect for sprite sheet animation and tile maps
-- Assets: Kenney Tiny Town (CC0) - https://kenney.nl/assets/tiny-town

local canvas = require("canvas")

-- Register the sprite sheet
canvas.assets.image("tiles", "canvas/images/kenney_tinytown_spritesheet.png")

-- Tile size in the sprite sheet
local TILE = 16
local SCALE = 2  -- Draw tiles at 2x size for visibility

-- Helper function to draw a tile from the sprite sheet
-- tx, ty = tile coordinates in the sprite sheet (0-indexed)
-- dx, dy = destination position on canvas
local function draw_tile(tx, ty, dx, dy)
  canvas.draw_image("tiles",
    dx, dy, TILE * SCALE, TILE * SCALE,  -- destination: x, y, width, height
    tx * TILE, ty * TILE, TILE, TILE     -- source: x, y, width, height
  )
end

-- Define tile positions in the sprite sheet (column, row)
local TILES = {
  -- Terrain
  grass = {0, 0},
  grass_flower = {1, 0},
  dirt = {0, 3},
  path_h = {1, 3},      -- horizontal path
  path_v = {0, 4},      -- vertical path
  path_cross = {1, 4},  -- path intersection

  -- Trees
  tree_round = {3, 0},
  tree_pine = {4, 0},
  tree_autumn = {5, 0},
  bush = {2, 1},

  -- House parts
  roof_left = {0, 5},
  roof_mid = {1, 5},
  roof_right = {2, 5},
  wall_left = {0, 6},
  wall_door = {1, 6},
  wall_right = {2, 6},

  -- Stone/castle
  stone = {0, 8},
  gate_top = {1, 8},
  gate_bottom = {1, 9},

  -- Props
  fence_h = {7, 9},
  sign = {9, 9},
  barrel = {10, 9},
  lamp = {11, 9},

  -- Characters
  person_blue = {7, 8},
  person_red = {8, 8},
}

-- Build a simple town scene
local function draw_scene()
  -- Fill background with grass
  for row = 0, 8 do
    for col = 0, 11 do
      local tile = TILES.grass
      -- Add some flower variations
      if (col + row) % 7 == 0 then
        tile = TILES.grass_flower
      end
      draw_tile(tile[1], tile[2], col * TILE * SCALE, row * TILE * SCALE)
    end
  end

  -- Draw a horizontal path
  for col = 0, 11 do
    draw_tile(TILES.path_h[1], TILES.path_h[2], col * TILE * SCALE, 5 * TILE * SCALE)
  end

  -- Draw a vertical path
  for row = 0, 4 do
    draw_tile(TILES.path_v[1], TILES.path_v[2], 5 * TILE * SCALE, row * TILE * SCALE)
  end
  draw_tile(TILES.path_cross[1], TILES.path_cross[2], 5 * TILE * SCALE, 5 * TILE * SCALE)

  -- Draw a house (left side)
  draw_tile(TILES.roof_left[1], TILES.roof_left[2], 1 * TILE * SCALE, 2 * TILE * SCALE)
  draw_tile(TILES.roof_mid[1], TILES.roof_mid[2], 2 * TILE * SCALE, 2 * TILE * SCALE)
  draw_tile(TILES.roof_right[1], TILES.roof_right[2], 3 * TILE * SCALE, 2 * TILE * SCALE)
  draw_tile(TILES.wall_left[1], TILES.wall_left[2], 1 * TILE * SCALE, 3 * TILE * SCALE)
  draw_tile(TILES.wall_door[1], TILES.wall_door[2], 2 * TILE * SCALE, 3 * TILE * SCALE)
  draw_tile(TILES.wall_right[1], TILES.wall_right[2], 3 * TILE * SCALE, 3 * TILE * SCALE)

  -- Draw trees
  draw_tile(TILES.tree_round[1], TILES.tree_round[2], 8 * TILE * SCALE, 1 * TILE * SCALE)
  draw_tile(TILES.tree_pine[1], TILES.tree_pine[2], 9 * TILE * SCALE, 2 * TILE * SCALE)
  draw_tile(TILES.tree_autumn[1], TILES.tree_autumn[2], 10 * TILE * SCALE, 1 * TILE * SCALE)

  -- Draw bushes
  draw_tile(TILES.bush[1], TILES.bush[2], 7 * TILE * SCALE, 3 * TILE * SCALE)
  draw_tile(TILES.bush[1], TILES.bush[2], 0 * TILE * SCALE, 4 * TILE * SCALE)

  -- Draw props along the path
  draw_tile(TILES.lamp[1], TILES.lamp[2], 3 * TILE * SCALE, 4 * TILE * SCALE)
  draw_tile(TILES.sign[1], TILES.sign[2], 7 * TILE * SCALE, 4 * TILE * SCALE)
  draw_tile(TILES.barrel[1], TILES.barrel[2], 4 * TILE * SCALE, 6 * TILE * SCALE)

  -- Draw characters
  draw_tile(TILES.person_blue[1], TILES.person_blue[2], 6 * TILE * SCALE, 4 * TILE * SCALE)
  draw_tile(TILES.person_red[1], TILES.person_red[2], 2 * TILE * SCALE, 4 * TILE * SCALE)
end

local function draw()
  canvas.clear()

  -- Dark background (visible outside the tile area)
  canvas.set_color(20, 20, 30)
  canvas.fill_rect(0, 0, 500, 350)

  -- Draw the town scene
  draw_scene()

  -- Title and explanation
  canvas.set_color(255, 255, 255)
  canvas.set_font_size(12)
  canvas.draw_text(10, 310, "draw_image() 9-arg form: name, dx, dy, dw, dh, sx, sy, sw, sh")
  canvas.set_color(180, 180, 180)
  canvas.set_font_size(10)
  canvas.draw_text(10, 328, "Sprite sheet: Kenney Tiny Town (CC0) - 16x16 tiles scaled 2x")
end

local function game()
  draw()
end

canvas.set_size(500, 350)
canvas.tick(game)
canvas.start()
