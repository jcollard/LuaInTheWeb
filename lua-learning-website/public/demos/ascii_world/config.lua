-- ascii_world/config.lua
-- Game configuration and constants

local shell = require("shell")

local config = {}

-- Color scheme for consistent UI
config.colors = {
  -- UI colors
  title = shell.CYAN,
  text = shell.WHITE,
  highlight = shell.YELLOW,
  success = shell.GREEN,
  danger = shell.RED,
  muted = shell.GRAY,

  -- Map colors
  player = shell.GREEN,
  wall = shell.WHITE,
  floor = shell.GRAY,
  door = shell.YELLOW,
  npc_shop = shell.MAGENTA,
  npc_healer = shell.CYAN,
  exit = shell.GREEN,
  tree = shell.GREEN,
  water = shell.BLUE,

  -- Combat colors
  monster = shell.RED,
  damage = shell.RED,
  heal = shell.GREEN,
  gold = shell.YELLOW,
  xp = shell.CYAN,

  -- Fog of war colors
  fog_discovered = shell.GRAY,   -- Explored but not visible
  fog_hidden = shell.BLACK,      -- Never seen
}

-- Game balance
config.balance = {
  max_level = 20,
  base_xp = 50,
  xp_multiplier = 1.5,

  -- Stat gains per level
  hp_per_level = 10,
  str_per_level = 2,
  def_per_level = 2,

  -- Combat formulas
  base_damage_variance = 0.2,  -- +/- 20% damage
  defend_reduction = 0.5,      -- 50% damage when defending
  flee_chance = 0.4,           -- 40% base flee chance
}

-- Map symbols
config.symbols = {
  player = "@",
  wall = "#",
  floor = ".",
  door = "D",
  shop = "S",
  healer = "H",
  exit_north = "^",
  exit_south = "v",
  exit_east = ">",
  exit_west = "<",
  tree = "T",
  water = "~",
  chest = "C",
  monster_spawn = "!",
}

return config
