-- ascii_world/maps.lua
-- World map definitions and rendering

local shell = require("shell")
local config = require("examples/ascii_world/config")

local maps = {}

-- Map definitions (20 wide x 12 tall)
maps.data = {
  oakvale = {
    name = "Oakvale Village",
    width = 20,
    height = 12,
    grid = {
      "#######^^^^#########",
      "#.###..........###.#",
      "#.#W#..........#P#.#",
      "#.###....~~....###.#",
      "#........~~........#",
      "#.###..........###.#",
      "#.#A#..........#I#.#",
      "#.###..........###.#",
      "#..................#",
      "#..TT..........TT..#",
      "#..TT..........TT..#",
      "####################",
    },
    -- NPCs on this map
    npcs = {
      { x = 3, y = 3, type = "shop", name = "Blade & Edge", shop_type = "weapon" },
      { x = 16, y = 3, type = "shop", name = "Healers' Hut", shop_type = "potion" },
      { x = 3, y = 7, type = "shop", name = "Iron Hide Armory", shop_type = "armor" },
      { x = 16, y = 7, type = "inn", name = "The Rusty Anchor Inn" },
    },
    -- Exits to other maps
    exits = {
      { x = 9, y = 1, dir = "north", dest = "darkwood", dest_x = 10, dest_y = 11 },
      { x = 10, y = 1, dir = "north", dest = "darkwood", dest_x = 11, dest_y = 11 },
      { x = 11, y = 1, dir = "north", dest = "darkwood", dest_x = 12, dest_y = 11 },
      { x = 12, y = 1, dir = "north", dest = "darkwood", dest_x = 13, dest_y = 11 },
    },
    -- No random encounters in town
    encounter_rate = 0,
    monster_pool = {},
    -- Safe zone: thirst doesn't increase here
    safe = true,
  },

  darkwood = {
    name = "Darkwood Forest",
    width = 20,
    height = 12,
    grid = {
      "####################",
      "#T..T....T...T..T..#",
      "#....T.......T.....#",
      "#.T......T.....T...#",
      "#....T.........T...#",
      "#T.......T.....T...#",
      "#....T.......T.....#",
      "#.T....T.......T...#",
      "#......T...T.......#",
      "#T...T.......T..T..#",
      "#.......vvvv.......#",
      "####################",
    },
    npcs = {},
    exits = {
      { x = 9, y = 11, dir = "south", dest = "oakvale", dest_x = 9, dest_y = 2 },
      { x = 10, y = 11, dir = "south", dest = "oakvale", dest_x = 10, dest_y = 2 },
      { x = 11, y = 11, dir = "south", dest = "oakvale", dest_x = 11, dest_y = 2 },
      { x = 12, y = 11, dir = "south", dest = "oakvale", dest_x = 12, dest_y = 2 },
    },
    -- Random encounters in forest
    encounter_rate = 0.15,
    monster_pool = { "slime", "goblin", "wolf" },
    -- Fog of war: visibility range (can see 3 tiles in each direction)
    light = 3,
  },
}

-- Get map data by name
function maps.get(map_name)
  return maps.data[map_name]
end

-- Get tile at position
function maps.get_tile(map_name, x, y)
  local map = maps.data[map_name]
  if not map then return "#" end
  if y < 1 or y > map.height then return "#" end
  if x < 1 or x > map.width then return "#" end
  return map.grid[y]:sub(x, x)
end

-- Check if tile is walkable
function maps.is_walkable(map_name, x, y)
  local tile = maps.get_tile(map_name, x, y)
  return tile == "." or tile == "^" or tile == "v" or tile == "<" or tile == ">"
end

-- Check for NPC at position
function maps.get_npc_at(map_name, x, y)
  local map = maps.data[map_name]
  if not map then return nil end
  for _, npc in ipairs(map.npcs) do
    if npc.x == x and npc.y == y then
      return npc
    end
  end
  return nil
end

-- Check for exit at position
function maps.get_exit_at(map_name, x, y)
  local map = maps.data[map_name]
  if not map then return nil end
  for _, exit in ipairs(map.exits) do
    if exit.x == x and exit.y == y then
      return exit
    end
  end
  return nil
end

-- ============================================================================
-- FOG OF WAR FUNCTIONS
-- ============================================================================

-- Check if a tile is within light range of player
function maps.is_visible(map_name, player_x, player_y, tile_x, tile_y)
  local map = maps.data[map_name]
  if not map or not map.light then return true end  -- No fog = always visible

  local dx = math.abs(tile_x - player_x)
  local dy = math.abs(tile_y - player_y)
  return dx <= map.light and dy <= map.light
end

-- Mark tiles within range as discovered
function maps.update_discovered(p)
  local map = maps.data[p.map]
  if not map or not map.light then return end  -- No fog = nothing to track

  p.discovered[p.map] = p.discovered[p.map] or {}
  local discovered = p.discovered[p.map]

  for dy = -map.light, map.light do
    for dx = -map.light, map.light do
      local tx, ty = p.x + dx, p.y + dy
      if tx >= 1 and tx <= map.width and ty >= 1 and ty <= map.height then
        discovered[tx .. "," .. ty] = true
      end
    end
  end
end

-- Check if tile was previously discovered
function maps.is_discovered(p, map_name, x, y)
  local discovered = p.discovered[map_name]
  if not discovered then return false end
  return discovered[x .. "," .. y] == true
end

-- Check for random encounter
function maps.check_encounter(map_name)
  local map = maps.data[map_name]
  if not map or map.encounter_rate == 0 then
    return nil
  end
  if math.random() < map.encounter_rate then
    -- Pick random monster from pool
    local pool = map.monster_pool
    if #pool > 0 then
      return pool[math.random(#pool)]
    end
  end
  return nil
end

-- Check if map is a safe zone (town)
function maps.is_safe(map_name)
  local map = maps.data[map_name]
  return map and map.safe == true
end

-- Get tile color
local function get_tile_color(tile)
  local colors = config.colors
  local sym = config.symbols

  if tile == sym.wall or tile == "#" then return colors.wall
  elseif tile == sym.floor or tile == "." then return colors.floor
  elseif tile == sym.tree or tile == "T" then return colors.tree
  elseif tile == sym.water or tile == "~" then return colors.water
  elseif tile == "^" or tile == "v" or tile == "<" or tile == ">" then return colors.exit
  elseif tile == sym.shop or tile == "S" then return colors.npc_shop
  elseif tile == sym.healer or tile == "H" then return colors.npc_healer
  else return colors.text
  end
end

-- Draw the map with player (original version for menus/dialogs)
function maps.draw(map_name, player_x, player_y)
  local map = maps.data[map_name]
  if not map then return end

  shell.foreground(config.colors.title)
  print("=== " .. map.name .. " ===")
  shell.reset()
  print()

  for y = 1, map.height do
    for x = 1, map.width do
      -- Check if player is here
      if x == player_x and y == player_y then
        shell.foreground(config.colors.player)
        io.write("@")
      else
        -- Check for NPC
        local npc = maps.get_npc_at(map_name, x, y)
        if npc then
          if npc.type == "shop" then
            -- Different symbols for different shop types
            if npc.shop_type == "weapon" then
              shell.foreground(config.colors.npc_shop)
              io.write("W")
            elseif npc.shop_type == "armor" then
              shell.foreground(config.colors.info)
              io.write("A")
            elseif npc.shop_type == "potion" then
              shell.foreground(config.colors.heal)
              io.write("P")
            else
              shell.foreground(config.colors.npc_shop)
              io.write("S")
            end
          elseif npc.type == "inn" then
            shell.foreground(config.colors.npc_healer)
            io.write("I")
          else
            shell.foreground(config.colors.text)
            io.write("?")
          end
        else
          local tile = map.grid[y]:sub(x, x)
          shell.foreground(get_tile_color(tile))
          io.write(tile)
        end
      end
    end
    print()
  end
  shell.reset()
end

-- Draw the map to screen buffer (flicker-free version)
-- Requires ui module with buffer functions
function maps.draw_to_buffer(map_name, player_x, player_y, ui, start_row, p)
  local map = maps.data[map_name]
  if not map then return end

  start_row = start_row or 1

  -- Row 1: Title
  local title = "=== " .. map.name .. " ==="
  ui.set_string(1, start_row, title, config.colors.title)

  -- Row 2: blank (handled by buffer clear)

  -- Rows 3+: Map grid
  local map_start_row = start_row + 2
  for y = 1, map.height do
    for x = 1, map.width do
      local char, color

      -- Check fog of war state
      local visible = maps.is_visible(map_name, player_x, player_y, x, y)
      local discovered = p and maps.is_discovered(p, map_name, x, y)

      if not map.light then
        -- No fog of war - render normally
        if x == player_x and y == player_y then
          char = "@"
          color = config.colors.player
        else
          local npc = maps.get_npc_at(map_name, x, y)
          if npc then
            if npc.type == "shop" then
              if npc.shop_type == "weapon" then
                char = "W"
                color = config.colors.npc_shop
              elseif npc.shop_type == "armor" then
                char = "A"
                color = config.colors.info
              elseif npc.shop_type == "potion" then
                char = "P"
                color = config.colors.heal
              else
                char = "S"
                color = config.colors.npc_shop
              end
            elseif npc.type == "inn" then
              char = "I"
              color = config.colors.npc_healer
            else
              char = "?"
              color = config.colors.text
            end
          else
            char = map.grid[y]:sub(x, x)
            color = get_tile_color(char)
          end
        end
      elseif visible then
        -- Currently visible - render normally with full colors
        if x == player_x and y == player_y then
          char = "@"
          color = config.colors.player
        else
          local npc = maps.get_npc_at(map_name, x, y)
          if npc then
            if npc.type == "shop" then
              if npc.shop_type == "weapon" then
                char = "W"
                color = config.colors.npc_shop
              elseif npc.shop_type == "armor" then
                char = "A"
                color = config.colors.info
              elseif npc.shop_type == "potion" then
                char = "P"
                color = config.colors.heal
              else
                char = "S"
                color = config.colors.npc_shop
              end
            elseif npc.type == "inn" then
              char = "I"
              color = config.colors.npc_healer
            else
              char = "?"
              color = config.colors.text
            end
          else
            char = map.grid[y]:sub(x, x)
            color = get_tile_color(char)
          end
        end
      elseif discovered then
        -- Explored but not visible - show dimmed terrain only
        char = map.grid[y]:sub(x, x)
        color = config.colors.fog_discovered
      else
        -- Never seen - show fog pattern
        char = "░"
        color = config.colors.fog_hidden
      end

      ui.set_cell(x, map_start_row + y - 1, char, color)
    end
  end

  -- Return the next available row after the map
  return map_start_row + map.height
end

return maps
