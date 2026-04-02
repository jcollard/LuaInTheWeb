-- Minimal V8 screen file that mirrors the dungeon-layout.ansi.lua structure:
--   brick-background (drawn, visible, full grid) — colorful background
--   view-port (group, visible, tag: "crawler-mode-tag")
--     forest-background (group, visible, parentId: view-port)
--       trees (drawn, visible, parentId: forest-background) — green trees
--     enemies (group, visible, parentId: view-port)
--       red-cap (drawn, hidden, parentId: enemies, tag: "Enemy") — red figure
--
-- This uses V8 format with palette + sparse cell encoding, loaded via load_screen().

-- Build palette
local PAL = {
  [1] = {170, 170, 170},  -- default fg (gray)
  [2] = {0, 0, 0},        -- default bg (black)
  [3] = {40, 120, 60},    -- forest green
  [4] = {20, 80, 30},     -- dark green
  [5] = {200, 60, 40},    -- red (redcap body)
  [6] = {180, 140, 80},   -- tan/skin
  [7] = {100, 60, 30},    -- brown
  [8] = {60, 40, 20},     -- dark brown
  [9] = {-1, -1, -1},     -- transparent half
  [10] = {30, 30, 50},    -- dark blue-gray (brick)
  [11] = {50, 50, 70},    -- lighter brick
  [12] = {70, 70, 90},    -- brick highlight
  [13] = {255, 220, 50},  -- yellow
  [14] = {0, 100, 0},     -- tree trunk green
  [15] = {80, 160, 80},   -- light leaf green
}

-- Build brick background grid: full 25x80 with a brick pattern
local bg_cells = {}
local ci = 1
for row = 1, 25 do
  for col = 1, 80 do
    -- Alternating brick pattern
    local is_mortar_row = (row % 3 == 0)
    local is_mortar_col = ((col + (math.floor(row / 3) % 2) * 4) % 8 == 0)
    local bg_idx
    if is_mortar_row or is_mortar_col then
      bg_idx = 10  -- mortar (dark)
    elseif (row + col) % 5 == 0 then
      bg_idx = 12  -- highlight
    else
      bg_idx = 11  -- normal brick
    end
    bg_cells[ci] = {row, col, 1, " ", 1, bg_idx}
    ci = ci + 1
  end
end

-- Build forest trees: scattered tree shapes in the upper portion
local tree_cells = {}
ci = 1
-- Draw several simple trees
local tree_cols = {10, 25, 40, 55, 70}
for _, tc in ipairs(tree_cols) do
  -- Canopy (rows 4-8)
  for row = 4, 8 do
    local width = 7 - math.abs(row - 6) * 2
    for dc = -width, width do
      local c = tc + dc
      if c >= 1 and c <= 80 then
        local leaf = (row + c) % 3 == 0 and 15 or 3
        tree_cells[ci] = {row, c, 1, " ", 1, leaf}
        ci = ci + 1
      end
    end
  end
  -- Trunk (rows 9-11)
  for row = 9, 11 do
    for dc = -1, 1 do
      local c = tc + dc
      if c >= 1 and c <= 80 then
        tree_cells[ci] = {row, c, 1, " ", 1, 7}
        ci = ci + 1
      end
    end
  end
end

-- Build red-cap creature: a small figure in center-ish area
local redcap_cells = {}
ci = 1
-- Red cap/hat (rows 8-9)
for col = 37, 43 do
  redcap_cells[ci] = {8, col, 1, " ", 1, 5}; ci = ci + 1
end
for col = 36, 44 do
  redcap_cells[ci] = {9, col, 1, " ", 1, 5}; ci = ci + 1
end
-- Face (rows 10-11)
for col = 37, 43 do
  redcap_cells[ci] = {10, col, 1, " ", 1, 6}; ci = ci + 1
end
-- Eyes
redcap_cells[ci] = {10, 38, 1, "*", 2, 6}; ci = ci + 1
redcap_cells[ci] = {10, 42, 1, "*", 2, 6}; ci = ci + 1
-- Mouth
redcap_cells[ci] = {11, 39, 1, "\\", 2, 6}; ci = ci + 1
redcap_cells[ci] = {11, 40, 1, "_", 2, 6}; ci = ci + 1
redcap_cells[ci] = {11, 41, 1, "/", 2, 6}; ci = ci + 1
for col = 37, 43 do
  if col < 39 or col > 41 then
    redcap_cells[ci] = {11, col, 1, " ", 1, 6}; ci = ci + 1
  end
end
-- Body (rows 12-15)
for row = 12, 15 do
  for col = 36, 44 do
    redcap_cells[ci] = {row, col, 1, " ", 1, 7}; ci = ci + 1
  end
end
-- Feet (row 16)
for col = 36, 38 do
  redcap_cells[ci] = {16, col, 1, " ", 1, 8}; ci = ci + 1
end
for col = 42, 44 do
  redcap_cells[ci] = {16, col, 1, " ", 1, 8}; ci = ci + 1
end

-- Convert cell arrays to V8 sparse format
-- V8 cells: {row, col, count, char, fg_palette_idx, bg_palette_idx}
-- We already built them in that format above.

return {
  ["version"] = 8,
  ["width"] = 80,
  ["height"] = 25,
  ["defaultFg"] = 1,
  ["defaultBg"] = 2,
  ["palette"] = PAL,
  ["layers"] = {
    [1] = {
      ["type"] = "drawn",
      ["id"] = "brick-background",
      ["name"] = "Brick Background",
      ["visible"] = true,
      ["cells"] = bg_cells,
    },
    [2] = {
      ["type"] = "group",
      ["id"] = "view-port",
      ["name"] = "View Port",
      ["visible"] = true,
      ["collapsed"] = false,
      ["tags"] = {
        [1] = "crawler-mode-tag",
      },
    },
    [3] = {
      ["type"] = "group",
      ["id"] = "forest-background",
      ["name"] = "Forest Background",
      ["visible"] = true,
      ["collapsed"] = false,
      ["parentId"] = "view-port",
    },
    [4] = {
      ["type"] = "drawn",
      ["id"] = "trees",
      ["name"] = "Trees",
      ["visible"] = true,
      ["cells"] = tree_cells,
      ["parentId"] = "forest-background",
    },
    [5] = {
      ["type"] = "group",
      ["id"] = "enemies",
      ["name"] = "Enemies",
      ["visible"] = true,
      ["collapsed"] = false,
      ["parentId"] = "view-port",
    },
    [6] = {
      ["type"] = "drawn",
      ["id"] = "red-cap",
      ["name"] = "Redcap",
      ["visible"] = false,
      ["cells"] = redcap_cells,
      ["parentId"] = "enemies",
      ["tags"] = {
        [1] = "Enemy",
      },
    },
  },
  ["availableTags"] = {
    [1] = "Enemy",
    [2] = "crawler-mode-tag",
  },
}
