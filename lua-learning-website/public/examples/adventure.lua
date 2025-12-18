-- adventure.lua
-- Cave Escape: An escape room text adventure
-- Select options with number keys (no Enter needed!)

local shell = require("shell")

-- Game state
local has_torch = false
local has_key = false
local has_gem = false
local pedestal_has_gem = false
local door_unlocked = false

-- Forward declarations
local entrance, dark_tunnel, crystal_chamber, locked_door
local underground_pool, hidden_alcove, escape, quit_game

function quit_game()
  shell.clear()
  print("Thanks for playing Cave Escape!")
  print()
end

function show_inventory()
  shell.foreground(shell.CYAN)
  print("Inventory: ", "")
  local items = {}
  if has_torch then table.insert(items, "Torch") end
  if has_key then table.insert(items, "Rusty Key") end
  if has_gem then table.insert(items, "Red Gem") end
  if #items == 0 then
    print("(empty)")
  else
    print(table.concat(items, ", "))
  end
  shell.reset()
  print()
end

function entrance()
  shell.clear()
  shell.foreground(shell.YELLOW)
  print("=== CAVE ENTRANCE ===")
  shell.reset()
  print()
  print("You wake up in a dim cave. Daylight filters")
  print("through a crack far above - too high to reach.")
  print("The only way out is deeper into the cave.")
  print()
  if not has_torch then
    print("An old TORCH lies on the ground nearby.")
    print()
  end
  show_inventory()
  print("What do you do?")
  print()
  if not has_torch then
    print("  [1] Pick up the torch")
  end
  print("  [2] Go deeper into the cave")
  print("  [Q] Quit")
  print()

  local key = io.read(1):lower()
  if key == "q" then
    quit_game()
  elseif key == "1" and not has_torch then
    has_torch = true
    shell.foreground(shell.GREEN)
    print()
    print("You pick up the torch. It flickers to life!")
    shell.reset()
    io.read(1)
    entrance()
  elseif key == "2" then
    dark_tunnel()
  else
    entrance()
  end
end

function dark_tunnel()
  shell.clear()
  shell.foreground(shell.MAGENTA)
  print("=== DARK TUNNEL ===")
  shell.reset()
  print()
  if has_torch then
    print("Your torch illuminates ancient markings on")
    print("the walls. The tunnel splits three ways.")
    print()
    show_inventory()
    print("Where do you go?")
    print()
    print("  [1] Left passage (you hear water)")
    print("  [2] Right passage (a faint glow)")
    print("  [3] Straight ahead (heavy stone door)")
    print("  [4] Back to entrance")
    print("  [Q] Quit")
    print()
    local key = io.read(1):lower()
    if key == "q" then
      quit_game()
    elseif key == "1" then
      underground_pool()
    elseif key == "2" then
      crystal_chamber()
    elseif key == "3" then
      locked_door()
    elseif key == "4" then
      entrance()
    else
      dark_tunnel()
    end
  else
    print("It's pitch black! You stumble around")
    print("and find your way back to the entrance.")
    print()
    print("  [1] Return to entrance")
    print()
    io.read(1)
    entrance()
  end
end

function underground_pool()
  shell.clear()
  shell.foreground(shell.CYAN)
  print("=== UNDERGROUND POOL ===")
  shell.reset()
  print()
  print("A serene pool of crystal-clear water.")
  print("You can see the bottom glittering.")
  print()
  if not has_key then
    print("Something SHINY rests at the bottom...")
    print()
  end
  show_inventory()
  print("What do you do?")
  print()
  if not has_key then
    print("  [1] Reach into the water")
  end
  print("  [2] Return to tunnel")
  print("  [Q] Quit")
  print()

  local key = io.read(1):lower()
  if key == "q" then
    quit_game()
  elseif key == "1" and not has_key then
    has_key = true
    shell.foreground(shell.GREEN)
    print()
    print("You pull out a RUSTY KEY!")
    print("It looks old but still functional.")
    shell.reset()
    io.read(1)
    underground_pool()
  elseif key == "2" then
    dark_tunnel()
  else
    underground_pool()
  end
end

function crystal_chamber()
  shell.clear()
  shell.foreground(shell.MAGENTA)
  print("=== CRYSTAL CHAMBER ===")
  shell.reset()
  print()
  print("Crystals cover every surface, casting")
  print("rainbow light throughout the chamber.")
  print()
  if not has_gem then
    print("A loose RED GEM catches your eye.")
    print()
  end
  print("A stone PEDESTAL stands in the center.")
  if pedestal_has_gem then
    shell.foreground(shell.GREEN)
    print("The gem on the pedestal GLOWS brightly!")
    shell.reset()
  else
    print("There's a gem-shaped indent on top.")
  end
  print()
  if not has_gem and not pedestal_has_gem then
    print("A narrow crack leads to a HIDDEN ALCOVE.")
    print()
  end
  show_inventory()
  print("What do you do?")
  print()
  local opt = 1
  if not has_gem and not pedestal_has_gem then
    print("  [" .. opt .. "] Take the red gem")
    opt = opt + 1
  end
  if has_gem and not pedestal_has_gem then
    print("  [" .. opt .. "] Place gem on pedestal")
    opt = opt + 1
  end
  if not has_gem and not pedestal_has_gem then
    print("  [" .. opt .. "] Squeeze into the alcove")
    opt = opt + 1
  end
  print("  [" .. opt .. "] Return to tunnel")
  print("  [Q] Quit")
  print()

  local key = io.read(1):lower()
  if key == "q" then
    quit_game()
  elseif not has_gem and not pedestal_has_gem then
    if key == "1" then
      has_gem = true
      shell.foreground(shell.GREEN)
      print()
      print("You take the RED GEM. It's warm to touch.")
      shell.reset()
      io.read(1)
      crystal_chamber()
    elseif key == "2" then
      hidden_alcove()
    elseif key == "3" then
      dark_tunnel()
    else
      crystal_chamber()
    end
  elseif has_gem and not pedestal_has_gem then
    if key == "1" then
      has_gem = false
      pedestal_has_gem = true
      door_unlocked = true
      shell.foreground(shell.YELLOW)
      print()
      print("The gem fits perfectly! It begins to glow!")
      print("You hear a RUMBLING from the tunnel...")
      print("Something has unlocked!")
      shell.reset()
      io.read(1)
      crystal_chamber()
    elseif key == "2" then
      dark_tunnel()
    else
      crystal_chamber()
    end
  else
    if key == "1" then
      dark_tunnel()
    else
      crystal_chamber()
    end
  end
end

function hidden_alcove()
  shell.clear()
  shell.foreground(shell.WHITE)
  print("=== HIDDEN ALCOVE ===")
  shell.reset()
  print()
  print("A tiny space behind the crystals.")
  print("Ancient text is carved into the wall:")
  print()
  shell.foreground(shell.YELLOW)
  print('  "The gem reveals the path.')
  print('   Place it where light gathers')
  print('   to unlock what was sealed."')
  shell.reset()
  print()
  print("  [1] Return to crystal chamber")
  print("  [Q] Quit")
  print()
  local key = io.read(1):lower()
  if key == "q" then
    quit_game()
  else
    crystal_chamber()
  end
end

function locked_door()
  shell.clear()
  shell.foreground(shell.RED)
  print("=== SEALED DOOR ===")
  shell.reset()
  print()
  print("A massive stone door blocks the passage.")
  print()
  if door_unlocked then
    shell.foreground(shell.GREEN)
    print("The door stands OPEN! Fresh air flows through!")
    shell.reset()
    print()
    show_inventory()
    print("What do you do?")
    print()
    print("  [1] Step through to freedom!")
    print("  [2] Return to tunnel")
    print("  [Q] Quit")
    print()
    local key = io.read(1):lower()
    if key == "q" then
      quit_game()
    elseif key == "1" then
      escape()
    elseif key == "2" then
      dark_tunnel()
    else
      locked_door()
    end
  else
    print("Strange symbols surround a glowing indent.")
    print("The door won't budge no matter how hard")
    print("you push. There must be another way...")
    print()
    show_inventory()
    print("What do you do?")
    print()
    if has_key then
      print("  [1] Try the rusty key")
    end
    print("  [2] Examine the symbols")
    print("  [3] Return to tunnel")
    print("  [Q] Quit")
    print()
    local key = io.read(1):lower()
    if key == "q" then
      quit_game()
    elseif key == "1" and has_key then
      shell.foreground(shell.RED)
      print()
      print("The key doesn't fit. This door needs")
      print("something else to open it...")
      shell.reset()
      io.read(1)
      locked_door()
    elseif key == "2" then
      shell.foreground(shell.CYAN)
      print()
      print("The symbols show a gem being placed")
      print("on a pedestal, with light radiating out.")
      shell.reset()
      io.read(1)
      locked_door()
    elseif key == "3" then
      dark_tunnel()
    else
      locked_door()
    end
  end
end

function escape()
  shell.clear()
  shell.foreground(shell.GREEN)
  print("========================================")
  print("          YOU ESCAPED!")
  print("========================================")
  shell.reset()
  print()
  print("You step through the door into daylight!")
  print("The cave was an ancient temple, and you")
  print("solved its puzzle to earn your freedom.")
  print()
  shell.foreground(shell.YELLOW)
  print("Congratulations, adventurer!")
  shell.reset()
  print()
  print("  [1] Play again")
  print("  [Q] Quit")
  print()
  local key = io.read(1):lower()
  if key == "1" then
    -- Reset game state
    has_torch = false
    has_key = false
    has_gem = false
    pedestal_has_gem = false
    door_unlocked = false
    entrance()
  else
    quit_game()
  end
end

-- Start the game
shell.clear()
shell.foreground(shell.CYAN)
print("========================================")
print("         CAVE ESCAPE")
print("========================================")
shell.reset()
print()
print("You fell into a mysterious cave!")
print("Find a way to escape...")
print()
print("Press number keys to select options.")
print("Press Q to quit at any time.")
print()
print("Press any key to begin...")
io.read(1)

entrance()
