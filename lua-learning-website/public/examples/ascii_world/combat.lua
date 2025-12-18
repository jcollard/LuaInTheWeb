-- ascii_world/combat.lua
-- Turn-based battle system

local shell = require("shell")
local config = require("examples/ascii_world/config")
local ui = require("examples/ascii_world/ui")
local player_mod = require("examples/ascii_world/player")
local monsters_mod = require("examples/ascii_world/monsters")

local combat = {}

-- Battle state
local current_monster = nil
local battle_over = false
local battle_result = nil  -- "victory", "defeat", "fled"
local battle_thirst = 0    -- Thirst accumulated this fight (max 20)

-- Calculate player attack damage
local function calc_player_damage(p)
  local base = player_mod.get_attack(p)
  local variance = math.floor(base * config.balance.base_damage_variance)
  return base + math.random(-variance, variance)
end

-- Player attacks monster
local function player_attack(p, monster)
  local damage = calc_player_damage(p)
  local actual = monsters_mod.take_damage(monster, damage)
  ui.show_damage(monster.name, actual, false)
  io.read(1)

  if not monsters_mod.is_alive(monster) then
    return true  -- Monster defeated
  end
  return false
end

-- Player defends (sets flag for damage reduction)
local function player_defend(p)
  p.is_defending = true
  shell.foreground(config.colors.highlight)
  print("  You brace yourself for the attack!")
  shell.reset()
  io.read(1)
end

-- Use item in combat
local function use_combat_item(p)
  -- Find healing items in inventory
  local healing_items = {}
  for i, item in ipairs(p.inventory) do
    if item.type == "consumable" and item.heal then
      table.insert(healing_items, { index = i, item = item })
    end
  end

  if #healing_items == 0 then
    shell.foreground(config.colors.danger)
    print("  You have no items to use!")
    shell.reset()
    io.read(1)
    return false  -- No item used, don't end turn
  end

  -- Show item menu
  print()
  ui.print("Use which item?", config.colors.highlight)
  for i, entry in ipairs(healing_items) do
    shell.foreground(config.colors.highlight)
    io.write("  [" .. i .. "] ")
    shell.foreground(config.colors.text)
    print(entry.item.name .. " (+" .. entry.item.heal .. " HP)")
  end
  shell.foreground(config.colors.muted)
  print("  [Q] Cancel")
  shell.reset()

  local key = io.read(1):lower()
  if key == "q" then
    return false  -- Cancelled
  end

  local num = tonumber(key)
  if num and num >= 1 and num <= #healing_items then
    local entry = healing_items[num]
    -- Use the item
    player_mod.heal(p, entry.item.heal)
    player_mod.remove_item(p, entry.index)
    io.read(1)
    return true  -- Item used, end turn
  end

  return false  -- Invalid selection
end

-- Try to flee from battle
local function try_flee(p, monster)
  -- Base flee chance, modified by speed difference
  local chance = config.balance.flee_chance
  -- Higher level monsters are harder to flee from
  local level_diff = (monster.str / 10) - (p.level / 2)
  chance = chance - (level_diff * 0.05)
  chance = math.max(0.1, math.min(0.9, chance))

  if math.random() < chance then
    shell.foreground(config.colors.success)
    print("  You escaped successfully!")
    shell.reset()
    io.read(1)
    return true
  else
    shell.foreground(config.colors.danger)
    print("  Couldn't escape!")
    shell.reset()
    io.read(1)
    return false
  end
end

-- Monster's turn
local function monster_turn(p, monster)
  shell.foreground(config.colors.monster)
  print()
  print("  " .. monster.name .. " attacks!")
  shell.reset()

  local damage = monsters_mod.calculate_attack(monster)
  local alive = player_mod.take_damage(p, damage)
  io.read(1)

  return alive
end

-- Show battle menu and get choice
local function battle_menu()
  print()
  ui.print("What will you do?", config.colors.highlight)
  shell.foreground(config.colors.highlight)
  print("  [1] Attack")
  print("  [2] Defend")
  print("  [3] Item")
  print("  [4] Flee")
  shell.reset()
  print()

  local key = io.read(1)
  return tonumber(key)
end

-- Main battle loop (one turn)
local function battle_turn(p, monster)
  -- Increase thirst each combat round (3 per round, max 20 per fight)
  if battle_thirst < 20 then
    local thirst_gain = math.min(3, 20 - battle_thirst)
    player_mod.increase_thirst(p, thirst_gain)
    battle_thirst = battle_thirst + thirst_gain
  end

  -- Show battle status
  ui.combat_status(p, monster)

  -- Player turn
  local choice = battle_menu()
  local turn_used = true

  if choice == 1 then
    -- Attack
    if player_attack(p, monster) then
      battle_result = "victory"
      battle_over = true
      return
    end
  elseif choice == 2 then
    -- Defend
    player_defend(p)
  elseif choice == 3 then
    -- Item
    turn_used = use_combat_item(p)
    if not turn_used then
      -- Item cancelled, redo turn
      battle_turn(p, monster)
      return
    end
  elseif choice == 4 then
    -- Flee
    if try_flee(p, monster) then
      battle_result = "fled"
      battle_over = true
      return
    end
  else
    -- Invalid choice, redo turn
    battle_turn(p, monster)
    return
  end

  -- Monster's turn (if player used their turn)
  if turn_used and not battle_over then
    if not monster_turn(p, monster) then
      battle_result = "defeat"
      battle_over = true
      return
    end
  end

  -- Continue battle
  if not battle_over then
    battle_turn(p, monster)
  end
end

-- Handle victory rewards
local function handle_victory(p, monster)
  ui.clear()
  shell.foreground(config.colors.success)
  print()
  print("  *** VICTORY! ***")
  print()
  print("  You defeated the " .. monster.name .. "!")
  shell.reset()
  print()

  -- Award XP and gold
  player_mod.gain_xp(p, monster.xp)
  player_mod.gain_gold(p, monster.gold)

  print()
  shell.foreground(config.colors.muted)
  print("Press any key to continue...")
  shell.reset()
  io.read(1)
end

-- Handle defeat
local function handle_defeat(p)
  ui.clear()
  shell.foreground(config.colors.danger)
  print()
  print("  *** DEFEATED! ***")
  print()
  print("  You have fallen in battle...")
  print()
  print("  You wake up back in Oakvale,")
  print("  having lost half your gold.")
  shell.reset()

  -- Lose half gold, restore to town
  p.gold = math.floor(p.gold / 2)
  p.hp = p.max_hp
  p.map = "oakvale"
  p.x = 10
  p.y = 6

  print()
  shell.foreground(config.colors.muted)
  print("Press any key to continue...")
  shell.reset()
  io.read(1)
end

-- Start a battle with a monster
function combat.start_battle(p, monster)
  current_monster = monster
  battle_over = false
  battle_result = nil
  battle_thirst = 0  -- Reset thirst counter for this fight

  -- Run the battle
  battle_turn(p, monster)

  -- Handle result
  if battle_result == "victory" then
    handle_victory(p, monster)
    return "victory"
  elseif battle_result == "defeat" then
    handle_defeat(p)
    return "defeat"
  else
    return "fled"
  end
end

return combat
