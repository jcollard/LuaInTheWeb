-- canvas/drawing/sprite-sheet.lua
-- Demonstrates: draw_image with source cropping (9-argument form)
-- Features: draw_image source rect, set_image_smoothing for pixel art
-- Assets: Kenney Tiny Town (CC0) - https://kenney.nl/assets/tiny-town

local canvas = require("canvas")

-- Register the asset directory and load the sprite sheet
canvas.assets.add_path("../assets/images")
canvas.assets.load_image("tiles", "kenney_tinytown_spritesheet.png")

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

-- Define tile positions in the sprite sheet (column, row) - 0-indexed
-- Based on Kenney Tiny Town 16x16 sprite sheet layout
local TILES = {
  -- Grass (row 0, cols 0-2)
  grass1 = {0, 0},
  grass2 = {1, 0},
  grass3 = {2, 0},

  -- Trees are 2 tiles tall (rows 0-1)
  -- Tree at col 3
  tree1_top = {3, 0},
  tree1_bot = {3, 1},
  -- Tree at col 4
  tree2_top = {4, 0},
  tree2_bot = {4, 1},

  -- Dirt path - use (2, 1) aka {1, 2} for all
  path = {1, 2},

  -- House roof (rows 4-5, cols 0-2)
  roof_top_l = {0, 4},
  roof_top_m = {1, 4},
  roof_top_r = {2, 4},
  roof_bot_l = {0, 5},
  roof_bot_m = {1, 5},
  roof_bot_r = {2, 5},

  -- House base/walls (row 6, cols 0-2)
  wall_l = {0, 6},
  wall_door = {1, 6},
  wall_r = {2, 6},
}

local function draw()
  canvas.clear()

  -- Fill background with grass
  for row = 0, 8 do
    for col = 0, 14 do
      local tile = TILES.grass1
      -- Add some grass variations
      if (col + row) % 5 == 0 then
        tile = TILES.grass2
      elseif (col * row) % 7 == 0 then
        tile = TILES.grass3
      end
      draw_tile(tile[1], tile[2], col * TILE * SCALE, row * TILE * SCALE)
    end
  end

  -- Draw a horizontal dirt path
  for col = 0, 14 do
    draw_tile(TILES.path[1], TILES.path[2], col * TILE * SCALE, 5 * TILE * SCALE)
  end

  -- Draw a vertical path
  for row = 0, 4 do
    draw_tile(TILES.path[1], TILES.path[2], 7 * TILE * SCALE, row * TILE * SCALE)
  end

  -- Draw a house (3 rows: roof top, roof bottom, walls)
  -- Roof top (row 4 in spritesheet)
  draw_tile(TILES.roof_top_l[1], TILES.roof_top_l[2], 1 * TILE * SCALE, 1 * TILE * SCALE)
  draw_tile(TILES.roof_top_m[1], TILES.roof_top_m[2], 2 * TILE * SCALE, 1 * TILE * SCALE)
  draw_tile(TILES.roof_top_r[1], TILES.roof_top_r[2], 3 * TILE * SCALE, 1 * TILE * SCALE)
  -- Roof bottom (row 5 in spritesheet)
  draw_tile(TILES.roof_bot_l[1], TILES.roof_bot_l[2], 1 * TILE * SCALE, 2 * TILE * SCALE)
  draw_tile(TILES.roof_bot_m[1], TILES.roof_bot_m[2], 2 * TILE * SCALE, 2 * TILE * SCALE)
  draw_tile(TILES.roof_bot_r[1], TILES.roof_bot_r[2], 3 * TILE * SCALE, 2 * TILE * SCALE)
  -- Walls with door (row 6 in spritesheet)
  draw_tile(TILES.wall_l[1], TILES.wall_l[2], 1 * TILE * SCALE, 3 * TILE * SCALE)
  draw_tile(TILES.wall_door[1], TILES.wall_door[2], 2 * TILE * SCALE, 3 * TILE * SCALE)
  draw_tile(TILES.wall_r[1], TILES.wall_r[2], 3 * TILE * SCALE, 3 * TILE * SCALE)

  -- Draw trees (2 tiles each: top + bottom)
  -- Tree type 1 (col 3 in spritesheet)
  draw_tile(TILES.tree1_top[1], TILES.tree1_top[2], 10 * TILE * SCALE, 0 * TILE * SCALE)
  draw_tile(TILES.tree1_bot[1], TILES.tree1_bot[2], 10 * TILE * SCALE, 1 * TILE * SCALE)
  draw_tile(TILES.tree1_top[1], TILES.tree1_top[2], 13 * TILE * SCALE, 2 * TILE * SCALE)
  draw_tile(TILES.tree1_bot[1], TILES.tree1_bot[2], 13 * TILE * SCALE, 3 * TILE * SCALE)
  -- Tree type 2 (col 4 in spritesheet)
  draw_tile(TILES.tree2_top[1], TILES.tree2_top[2], 11 * TILE * SCALE, 1 * TILE * SCALE)
  draw_tile(TILES.tree2_bot[1], TILES.tree2_bot[2], 11 * TILE * SCALE, 2 * TILE * SCALE)
  draw_tile(TILES.tree2_top[1], TILES.tree2_top[2], 12 * TILE * SCALE, 3 * TILE * SCALE)
  draw_tile(TILES.tree2_bot[1], TILES.tree2_bot[2], 12 * TILE * SCALE, 4 * TILE * SCALE)

  -- Title and explanation
  canvas.set_color(255, 255, 255)
  canvas.set_font_size(12)
  canvas.draw_text(10, 300, "draw_image() 9-arg form: name, dx, dy, dw, dh, sx, sy, sw, sh")
  canvas.set_color(180, 180, 180)
  canvas.set_font_size(10)
  canvas.draw_text(10, 318, "Sprite sheet: Kenney Tiny Town (CC0) - 16x16 tiles scaled 2x")
  canvas.draw_text(10, 333, "set_image_smoothing(false) for crisp pixel art")
end

local function game()
  draw()
end

canvas.set_size(480, 350)

-- Disable image smoothing for crisp pixel art (set once at init)
canvas.set_image_smoothing(false)

canvas.tick(game)
canvas.start()
