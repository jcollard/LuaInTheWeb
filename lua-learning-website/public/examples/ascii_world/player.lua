-- ascii_world/player.lua
-- Player state and progression

local config = require("examples/ascii_world/config")
local ui = require("examples/ascii_world/ui")

local player = {}

-- Initialize player state
function player.new(name)
  return {
    name = name or "Hero",
    level = 1,
    xp = 0,
    xp_to_level = config.balance.base_xp,

    -- Stats
    hp = 50,
    max_hp = 50,
    str = 10,
    def = 5,

    -- Thirst (depletes outside of town, needed to drink)
    thirst = 0,       -- Current thirst (0 = not thirsty, 100 = very thirsty)
    max_thirst = 100,

    -- Resources
    gold = 30,

    -- Equipment (nil = nothing equipped)
    weapon = nil,
    armor = nil,

    -- Inventory: list of {id, name, type, ...}
    inventory = {},

    -- Location
    map = "oakvale",
    x = 10,
    y = 6,

    -- Combat state
    is_defending = false,

    -- Fog of war: tracks discovered tiles per map
    -- Format: { map_name = { ["x,y"] = true, ... }, ... }
    discovered = {},
  }
end

-- Get total attack power (base + weapon)
function player.get_attack(p)
  local total = p.str
  if p.weapon then
    total = total + p.weapon.str
  end
  return total
end

-- Get total defense (base + armor)
function player.get_defense(p)
  local total = p.def
  if p.armor then
    total = total + p.armor.def
  end
  return total
end

-- Take damage (returns true if still alive)
function player.take_damage(p, amount)
  -- Apply defense reduction if defending
  if p.is_defending then
    amount = math.floor(amount * config.balance.defend_reduction)
    p.is_defending = false
  end

  -- Apply defense
  local defense = player.get_defense(p)
  amount = math.max(1, amount - math.floor(defense / 2))

  p.hp = math.max(0, p.hp - amount)
  ui.show_damage(p.name, amount, true)

  return p.hp > 0
end

-- Heal HP
function player.heal(p, amount)
  local old_hp = p.hp
  p.hp = math.min(p.max_hp, p.hp + amount)
  local healed = p.hp - old_hp
  if healed > 0 then
    ui.show_heal(healed)
  end
  return healed
end

-- Full heal (at healer NPC)
function player.full_heal(p)
  p.hp = p.max_hp
end

-- Gain XP and check for level up
function player.gain_xp(p, amount)
  p.xp = p.xp + amount
  ui.show_xp(amount)

  -- Check for level up
  while p.xp >= p.xp_to_level and p.level < config.balance.max_level do
    player.level_up(p)
  end
end

-- Level up!
function player.level_up(p)
  p.xp = p.xp - p.xp_to_level
  p.level = p.level + 1
  p.xp_to_level = math.floor(p.xp_to_level * config.balance.xp_multiplier)

  -- Increase stats
  p.max_hp = p.max_hp + config.balance.hp_per_level
  p.hp = p.max_hp  -- Full heal on level up
  p.str = p.str + config.balance.str_per_level
  p.def = p.def + config.balance.def_per_level

  ui.level_up(p)
end

-- Gain gold
function player.gain_gold(p, amount)
  p.gold = p.gold + amount
  ui.show_gold(amount)
end

-- Spend gold (returns true if successful)
function player.spend_gold(p, amount)
  if p.gold >= amount then
    p.gold = p.gold - amount
    return true
  end
  return false
end

-- Add item to inventory
function player.add_item(p, item)
  table.insert(p.inventory, item)
end

-- Remove item from inventory by index
function player.remove_item(p, index)
  if index >= 1 and index <= #p.inventory then
    return table.remove(p.inventory, index)
  end
  return nil
end

-- Find item in inventory by id
function player.find_item(p, item_id)
  for i, item in ipairs(p.inventory) do
    if item.id == item_id then
      return i, item
    end
  end
  return nil, nil
end

-- Count items of a type
function player.count_items(p, item_id)
  local count = 0
  for _, item in ipairs(p.inventory) do
    if item.id == item_id then
      count = count + 1
    end
  end
  return count
end

-- Equip weapon
function player.equip_weapon(p, weapon)
  -- Unequip current weapon first
  if p.weapon then
    player.add_item(p, p.weapon)
  end
  p.weapon = weapon
end

-- Equip armor
function player.equip_armor(p, armor)
  -- Unequip current armor first
  if p.armor then
    player.add_item(p, p.armor)
  end
  p.armor = armor
end

-- Thirst functions

-- Increase thirst (called when moving outside town or in combat)
function player.increase_thirst(p, amount)
  amount = amount or 0.25  -- Default thirst increase per step
  p.thirst = math.min(p.max_thirst, p.thirst + amount)
end

-- Check if player is thirsty enough to drink
function player.is_thirsty(p)
  return p.thirst >= 20  -- Need at least 20 thirst to drink
end

-- Quench thirst (called when drinking)
function player.quench_thirst(p, amount)
  amount = amount or 30  -- Default thirst quench
  p.thirst = math.max(0, p.thirst - amount)
end

-- Get thirst level description
function player.get_thirst_desc(p)
  if p.thirst >= 80 then
    return "Parched"
  elseif p.thirst >= 50 then
    return "Thirsty"
  elseif p.thirst >= 20 then
    return "Slightly thirsty"
  else
    return "Not thirsty"
  end
end

return player
