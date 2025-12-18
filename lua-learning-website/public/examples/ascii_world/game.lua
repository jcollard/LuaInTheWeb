-- ascii_world/game.lua
-- Main game loop and state management

local shell = require("shell")
local config = require("examples/ascii_world/config")
local ui = require("examples/ascii_world/ui")
local player_mod = require("examples/ascii_world/player")
local items = require("examples/ascii_world/items")
local maps = require("examples/ascii_world/maps")
local monsters = require("examples/ascii_world/monsters")
local combat = require("examples/ascii_world/combat")

local game = {}

-- Current player state
local player = nil

-- Screen layout constants for buffer rendering
local SCREEN_WIDTH = 50
local SCREEN_HEIGHT = 17
local MAP_START_ROW = 1
local CONTROLS_ROW = 16

-- Vertical stat bars layout (to the right of map)
local BAR_START_COL = 25  -- First bar starts here (after 20-char map + gap)
local BAR_TOP_ROW = 3     -- Align with map grid (row after title + blank)
local BAR_HEIGHT = 12     -- Match map height

-- Initialize new game
function game.init(player_name)
  math.randomseed(os.time())
  player = player_mod.new(player_name)
  -- Give player a starting potion
  player_mod.add_item(player, items.create("potion"))
  -- Initialize screen buffer for flicker-free rendering
  ui.init_buffer(SCREEN_WIDTH, SCREEN_HEIGHT)
  -- Initialize fog of war - reveal starting area
  maps.update_discovered(player)
end

-- Show inventory and allow item use/equip
local function show_inventory_menu()
  ui.clear()
  ui.title("INVENTORY")

  if #player.inventory == 0 then
    ui.print("Your inventory is empty.", config.colors.muted)
    print()
    shell.foreground(config.colors.muted)
    print("Press any key to continue...")
    shell.reset()
    io.read(1)
    return
  end

  local options = {}
  for i, item in ipairs(player.inventory) do
    local desc = item.name
    if item.type == "weapon" then
      desc = desc .. " (+" .. item.str .. " STR)"
    elseif item.type == "armor" then
      desc = desc .. " (+" .. item.def .. " DEF)"
    elseif item.heal then
      desc = desc .. " (+" .. item.heal .. " HP)"
    end
    table.insert(options, desc)
  end

  local choice = ui.menu("Select item:", options)
  if choice and choice >= 1 and choice <= #player.inventory then
    local item = player.inventory[choice]

    if item.type == "weapon" then
      player_mod.remove_item(player, choice)
      player_mod.equip_weapon(player, item)
      ui.print("Equipped " .. item.name .. "!", config.colors.success)
      io.read(1)
    elseif item.type == "armor" then
      player_mod.remove_item(player, choice)
      player_mod.equip_armor(player, item)
      ui.print("Equipped " .. item.name .. "!", config.colors.success)
      io.read(1)
    elseif item.heal then
      if player.hp < player.max_hp then
        player_mod.remove_item(player, choice)
        player_mod.heal(player, item.heal)
        io.read(1)
      else
        ui.print("HP is already full!", config.colors.muted)
        io.read(1)
      end
    end

    show_inventory_menu()  -- Show menu again
  end
end

-- Show the game menu
local function show_game_menu()
  ui.clear()
  ui.title("MENU")

  ui.print("Status:", config.colors.highlight)
  print("  Name: " .. player.name)
  print("  Level: " .. player.level)
  print("  XP: " .. player.xp .. "/" .. player.xp_to_level)
  print("  HP: " .. player.hp .. "/" .. player.max_hp)
  print("  STR: " .. player_mod.get_attack(player) .. " (base: " .. player.str .. ")")
  print("  DEF: " .. player_mod.get_defense(player) .. " (base: " .. player.def .. ")")
  print("  Gold: " .. player.gold)
  -- Thirst with color coding
  local thirst_desc = player_mod.get_thirst_desc(player)
  if player.thirst >= 50 then
    shell.foreground(config.colors.danger)
  elseif player.thirst >= 20 then
    shell.foreground(config.colors.highlight)
  else
    shell.foreground(config.colors.muted)
  end
  print("  Thirst: " .. thirst_desc)
  shell.reset()
  print()

  ui.print("Equipment:", config.colors.highlight)
  if player.weapon then
    print("  Weapon: " .. player.weapon.name .. " (+" .. player.weapon.str .. " STR)")
  else
    print("  Weapon: None")
  end
  if player.armor then
    print("  Armor: " .. player.armor.name .. " (+" .. player.armor.def .. " DEF)")
  else
    print("  Armor: None")
  end
  print()

  local choice = ui.menu("Options:", {
    "View Inventory",
    "Return to Game",
  })

  if choice == 1 then
    show_inventory_menu()
  end
end

-- NPC: Shop interaction
local function interact_shop(npc)
  ui.clear()
  shell.foreground(config.colors.npc_shop)
  ui.title(npc.name)
  shell.reset()

  print("Shopkeeper: 'Welcome! What would you like?'")
  print()
  shell.foreground(config.colors.gold)
  print("Your gold: " .. player.gold)
  shell.reset()

  local shop_type = npc.shop_type or "village"

  -- Show current equipment for weapon/armor shops
  if shop_type == "weapon" then
    print()
    shell.foreground(config.colors.highlight)
    io.write("Equipped: ")
    if player.weapon then
      shell.foreground(config.colors.text)
      print(player.weapon.name .. " (+" .. player.weapon.str .. " STR)")
    else
      shell.foreground(config.colors.muted)
      print("None")
    end
    shell.reset()
  elseif shop_type == "armor" then
    print()
    shell.foreground(config.colors.highlight)
    io.write("Equipped: ")
    if player.armor then
      shell.foreground(config.colors.text)
      print(player.armor.name .. " (+" .. player.armor.def .. " DEF)")
    else
      shell.foreground(config.colors.muted)
      print("None")
    end
    shell.reset()
  end
  print()

  local inventory = items.get_shop_inventory(shop_type)

  local options = {}
  for _, item in ipairs(inventory) do
    local desc = item.name .. " - " .. item.price .. "g"
    if item.str then desc = desc .. " (+" .. item.str .. " STR)" end
    if item.def then desc = desc .. " (+" .. item.def .. " DEF)" end
    if item.heal then desc = desc .. " (+" .. item.heal .. " HP)" end
    table.insert(options, desc)
  end

  local choice = ui.menu("Buy:", options)
  if choice and choice >= 1 and choice <= #inventory then
    local item = inventory[choice]
    if player_mod.spend_gold(player, item.price) then
      local new_item = items.create(item.id)
      player_mod.add_item(player, new_item)
      ui.print("Bought " .. item.name .. "!", config.colors.success)

      -- Ask to equip if weapon or armor
      if new_item.str then
        -- It's a weapon
        print()
        shell.foreground(config.colors.highlight)
        print("Equip " .. new_item.name .. " now? [Y/N]")
        shell.reset()
        local equip_choice = io.read(1):lower()
        if equip_choice == "y" then
          -- Find and remove item from inventory by id
          local idx = player_mod.find_item(player, new_item.id)
          if idx then
            player_mod.remove_item(player, idx)
          end
          player_mod.equip_weapon(player, new_item)
          ui.print("Equipped " .. new_item.name .. "!", config.colors.success)
        end
      elseif new_item.def then
        -- It's armor
        print()
        shell.foreground(config.colors.highlight)
        print("Equip " .. new_item.name .. " now? [Y/N]")
        shell.reset()
        local equip_choice = io.read(1):lower()
        if equip_choice == "y" then
          -- Find and remove item from inventory by id
          local idx = player_mod.find_item(player, new_item.id)
          if idx then
            player_mod.remove_item(player, idx)
          end
          player_mod.equip_armor(player, new_item)
          ui.print("Equipped " .. new_item.name .. "!", config.colors.success)
        end
      end

      io.read(1)
      interact_shop(npc)  -- Stay in shop
    else
      ui.print("Not enough gold!", config.colors.danger)
      io.read(1)
      interact_shop(npc)
    end
  end
end

-- Roll dice (e.g., roll_dice(2, 6) = 2d6)
local function roll_dice(count, sides)
  local total = 0
  for i = 1, count do
    total = total + math.random(1, sides)
  end
  return total
end

-- Inn drink menu
local inn_drinks = {
  { name = "Water", price = 0, dice_count = 1, dice_sides = 4 },
  { name = "Weak Ale", price = 2, dice_count = 1, dice_sides = 6 },
  { name = "Hearty Stew", price = 5, dice_count = 2, dice_sides = 4 },
  { name = "Spiced Mead", price = 8, dice_count = 2, dice_sides = 6 },
  { name = "Dragon's Breath Whiskey", price = 15, dice_count = 3, dice_sides = 6 },
}

-- NPC: Inn/Tavern interaction
local function interact_inn(npc)
  ui.clear()
  shell.foreground(config.colors.npc_healer)
  ui.title(npc.name)
  shell.reset()

  print("Innkeeper: 'Welcome, weary traveler!'")
  print()
  print("HP: " .. player.hp .. "/" .. player.max_hp)
  shell.foreground(config.colors.gold)
  print("Gold: " .. player.gold)
  shell.reset()
  -- Show thirst status
  local thirst_desc = player_mod.get_thirst_desc(player)
  if player.thirst >= 50 then
    shell.foreground(config.colors.danger)
  elseif player.thirst >= 20 then
    shell.foreground(config.colors.highlight)
  else
    shell.foreground(config.colors.muted)
  end
  print("Thirst: " .. thirst_desc)
  shell.reset()
  print()

  local options = {
    "Sleep with the horses (Free)",
    "Buy a drink",
    "Rest at the inn (25% of gold)",
    "Leave"
  }

  local choice = ui.menu("What would you like?", options)

  if choice == 1 then
    -- Sleep with horses - free, heals up to 40 HP
    if player.hp >= player.max_hp then
      ui.print("You're already well rested!", config.colors.muted)
      io.read(1)
      interact_inn(npc)
      return
    end

    local heal_amount = math.min(40, player.max_hp) - player.hp
    if heal_amount <= 0 then
      ui.print("The horses snore loudly. You can't sleep.", config.colors.muted)
      io.read(1)
      interact_inn(npc)
      return
    end

    -- Cap healing at 40 HP total
    local new_hp = math.min(player.hp + heal_amount, 40, player.max_hp)
    local healed = new_hp - player.hp
    if healed > 0 then
      player.hp = new_hp
      print()
      ui.print("You sleep in the stables...", config.colors.muted)
      print("The hay is itchy but warm.")
      ui.print("Recovered " .. healed .. " HP!", config.colors.success)
    else
      ui.print("You're already at 40 HP or more.", config.colors.muted)
    end
    io.read(1)
    interact_inn(npc)

  elseif choice == 2 then
    -- Buy a drink - must be thirsty first
    if not player_mod.is_thirsty(player) then
      print()
      print("Innkeeper: 'You don't look thirsty, friend.'")
      ui.print("You're not thirsty enough to drink.", config.colors.muted)
      io.read(1)
      interact_inn(npc)
      return
    end

    ui.clear()
    shell.foreground(config.colors.npc_healer)
    ui.title("Drink Menu")
    shell.reset()
    print()

    local drink_options = {}
    for _, drink in ipairs(inn_drinks) do
      if drink.price == 0 then
        table.insert(drink_options, drink.name .. " (Free)")
      else
        table.insert(drink_options, drink.name .. " - " .. drink.price .. "g")
      end
    end

    local drink_choice = ui.menu("Order:", drink_options)
    if drink_choice and drink_choice >= 1 and drink_choice <= #inn_drinks then
      local drink = inn_drinks[drink_choice]

      if drink.price > 0 and not player_mod.spend_gold(player, drink.price) then
        ui.print("Not enough gold!", config.colors.danger)
        io.read(1)
        interact_inn(npc)
        return
      end

      -- Roll for healing
      local heal = roll_dice(drink.dice_count, drink.dice_sides)
      local old_hp = player.hp
      player_mod.heal(player, heal)
      local actual_heal = player.hp - old_hp

      -- Quench thirst
      player_mod.quench_thirst(player, 30)

      print()
      if drink.name == "Water" then
        print("You drink the refreshing water.")
      elseif drink.name == "Dragon's Breath Whiskey" then
        print("The whiskey burns going down!")
        print("You feel warmth spread through you.")
      else
        print("You enjoy the " .. drink.name .. ".")
      end

      if actual_heal > 0 then
        ui.print("Recovered " .. actual_heal .. " HP!", config.colors.success)
      else
        ui.print("You feel satisfied.", config.colors.muted)
      end
      ui.print("Your thirst is quenched.", config.colors.info)
      io.read(1)
      interact_inn(npc)
    else
      interact_inn(npc)
    end

  elseif choice == 3 then
    -- Rest at inn - 25% of gold for full heal
    if player.hp >= player.max_hp then
      ui.print("You're already well rested!", config.colors.muted)
      io.read(1)
      interact_inn(npc)
      return
    end

    local cost = math.floor(player.gold * 0.25)
    cost = math.max(1, cost)  -- Minimum 1 gold if they have any

    if player.gold == 0 then
      print()
      print("Innkeeper: 'Sorry, no coin, no room.'")
      ui.print("You have no gold!", config.colors.danger)
      io.read(1)
      interact_inn(npc)
      return
    end

    print()
    shell.foreground(config.colors.gold)
    print("A warm bed costs " .. cost .. " gold.")
    shell.reset()

    local confirm = ui.menu("Rest at the inn?", { "Yes, I need proper rest", "No thanks" })
    if confirm == 1 then
      player_mod.spend_gold(player, cost)
      player_mod.full_heal(player)
      print()
      print("You sleep soundly in a warm bed...")
      ui.print("Fully restored!", config.colors.success)
      io.read(1)
    end
    interact_inn(npc)
  end
  -- choice == 4 or nil: Leave (do nothing, return to game)
end

-- Handle NPC interaction
local function interact_with_npc(npc)
  if npc.type == "shop" then
    interact_shop(npc)
  elseif npc.type == "inn" then
    interact_inn(npc)
  end
end

-- Try to move player
local function try_move(dx, dy)
  local new_x = player.x + dx
  local new_y = player.y + dy

  -- Check for NPC at target
  local npc = maps.get_npc_at(player.map, new_x, new_y)
  if npc then
    interact_with_npc(npc)
    ui.invalidate()  -- Force full redraw after NPC interaction
    return
  end

  -- Check if walkable
  if not maps.is_walkable(player.map, new_x, new_y) then
    return
  end

  -- Move player
  player.x = new_x
  player.y = new_y

  -- Update fog of war - reveal tiles around player
  maps.update_discovered(player)

  -- Increase thirst when moving outside safe zones (0.25 per step)
  if not maps.is_safe(player.map) then
    player_mod.increase_thirst(player, 0.25)
  end

  -- Check for exit
  local exit = maps.get_exit_at(player.map, new_x, new_y)
  if exit then
    player.map = exit.dest
    player.x = exit.dest_x
    player.y = exit.dest_y
    -- Update fog of war for new map
    maps.update_discovered(player)
    ui.clear()
    shell.foreground(config.colors.highlight)
    local map_data = maps.get(player.map)
    print("Entering " .. map_data.name .. "...")
    shell.reset()
    io.read(1)
    ui.invalidate()  -- Force full redraw after map transition
    return
  end

  -- Check for random encounter
  local monster_id = maps.check_encounter(player.map)
  if monster_id then
    local map_data = maps.get(player.map)
    local monster = monsters.spawn_for_area(
      map_data.monster_pool,
      player.level
    )
    if monster then
      ui.clear()
      shell.foreground(config.colors.danger)
      print("A " .. monster.name .. " appears!")
      shell.reset()
      io.read(1)
      combat.start_battle(player, monster)
      ui.invalidate()  -- Force full redraw after combat
    end
  end
end

-- Confirm quit dialog
local function confirm_quit()
  ui.clear()
  print()
  shell.foreground(config.colors.warning)
  print("  ╔════════════════════════════════╗")
  print("  ║                                ║")
  print("  ║      Are you sure you want     ║")
  print("  ║         to quit the game?      ║")
  print("  ║                                ║")
  print("  ║   All progress will be lost!   ║")
  print("  ║                                ║")
  print("  ╚════════════════════════════════╝")
  shell.reset()
  print()
  print()
  shell.foreground(config.colors.info)
  print("  [Y] Yes, quit the game")
  print("  [N] No, continue playing")
  shell.reset()
  print()

  while true do
    local key = io.read(1):lower()
    if key == "y" then
      return true  -- Confirmed quit
    elseif key == "n" then
      return false  -- Cancelled
    end
    -- Ignore other keys
  end
end

-- Main game loop (one frame) - uses screen buffer for flicker-free rendering
local function game_frame()
  -- Clear buffer (not screen!)
  ui.clear_buffer()

  -- Draw map to buffer (with fog of war support)
  maps.draw_to_buffer(player.map, player.x, player.y, ui, MAP_START_ROW, player)

  -- Draw stat bars to the right of map (includes name/level)
  ui.draw_bars_to_buffer(player, BAR_START_COL, BAR_TOP_ROW, BAR_HEIGHT)

  -- Draw controls to buffer
  ui.set_string(1, CONTROLS_ROW, "WASD: Move  E: Interact  M: Menu  Q: Quit", config.colors.muted)

  -- Render buffer to screen (only changed cells are drawn)
  ui.render()

  -- Get input
  local key = io.read(1):lower()

  if key == "w" then
    try_move(0, -1)
  elseif key == "s" then
    try_move(0, 1)
  elseif key == "a" then
    try_move(-1, 0)
  elseif key == "d" then
    try_move(1, 0)
  elseif key == "e" then
    -- Check for adjacent NPC to interact with
    local dirs = {{0,-1}, {0,1}, {-1,0}, {1,0}}
    for _, dir in ipairs(dirs) do
      local npc = maps.get_npc_at(player.map, player.x + dir[1], player.y + dir[2])
      if npc then
        interact_with_npc(npc)
        ui.invalidate()  -- Force full redraw after NPC interaction
        break
      end
    end
  elseif key == "m" then
    show_game_menu()
    ui.invalidate()  -- Force full redraw after menu
  elseif key == "q" then
    if confirm_quit() then
      ui.clear()
      print("Thanks for playing ASCII World!")
      print()
      return false  -- Quit game
    end
    ui.invalidate()  -- Force full redraw if quit cancelled
  end

  return true  -- Continue game
end

-- Main game loop
function game.run()
  local running = true
  while running do
    running = game_frame()
  end
end

-- Start new game with title screen
function game.start()
  ui.clear()
  shell.foreground(config.colors.title)
  print("========================================")
  print("         ASCII WORLD RPG")
  print("========================================")
  shell.reset()
  print()
  print("A fantasy adventure awaits!")
  print()
  print("Features:")
  print("  - Explore Oakvale Village")
  print("  - Battle monsters in Darkwood Forest")
  print("  - Buy equipment and items")
  print("  - Level up and grow stronger!")
  print()
  shell.foreground(config.colors.muted)
  print("Press any key to begin...")
  shell.reset()
  io.read(1)

  -- Get player name
  ui.clear()
  ui.print("Enter your name:", config.colors.highlight)
  shell.foreground(config.colors.text)
  io.write("> ")
  local name = io.read()
  if not name or name == "" then
    name = "Hero"
  end
  shell.reset()

  -- Initialize and run
  game.init(name)

  ui.clear()
  shell.foreground(config.colors.success)
  print("Welcome, " .. name .. "!")
  print()
  print("You awaken in Oakvale Village.")
  print("Explore the world and grow stronger!")
  shell.reset()
  print()
  shell.foreground(config.colors.muted)
  print("Press any key to continue...")
  shell.reset()
  io.read(1)

  game.run()
end

return game
