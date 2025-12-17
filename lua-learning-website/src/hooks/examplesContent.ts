/* eslint-disable max-lines */
/**
 * Example Lua programs for the examples workspace.
 * These demonstrate various features of the platform.
 */

/**
 * Simple Hello World program
 */
export const HELLO_LUA = `-- hello.lua
-- A simple Hello World program

print("Hello, World!")
print("Welcome to Lua!")
`

/**
 * Shell library colors demo
 */
export const COLORS_LUA = `-- colors.lua
-- Demonstrates shell library terminal colors

local shell = require("shell")

-- Print text in different foreground colors
shell.foreground(shell.RED)
print("This text is red!")

shell.foreground(shell.GREEN)
print("This text is green!")

shell.foreground(shell.BLUE)
print("This text is blue!")

shell.foreground(shell.YELLOW)
print("This text is yellow!")

shell.foreground(shell.MAGENTA)
print("This text is magenta!")

shell.foreground(shell.CYAN)
print("This text is cyan!")

-- Reset to default colors
shell.reset()
print("Back to normal colors!")

-- You can also set background colors
shell.background(shell.BLUE)
shell.foreground(shell.WHITE)
print("White text on blue background!")

shell.reset()
print("All done!")
`

/**
 * Mad Takes game using io.read and shell colors
 */
export const MAD_TAKES_LUA = `-- mad_takes.lua
-- A Mad Takes game (Old MacDonald Had a Farm)

local shell = require("shell")

-- Get words from user
shell.foreground(shell.YELLOW)
print("Enter an animal:")
shell.reset()
local animal = io.read()

shell.foreground(shell.YELLOW)
print("Enter a sound that animal makes:")
shell.reset()
local sound = io.read()

-- Display the result
print()
shell.foreground(shell.GREEN)
print("Here's your song!")
print()

shell.foreground(shell.WHITE)
print("Old MacDonald had a farm, E-I-E-I-O!")
print("And on his farm he had a " .. animal .. ", E-I-E-I-O!")
print("With a " .. sound .. "-" .. sound .. " here,")
print("And a " .. sound .. "-" .. sound .. " there,")
print("Here a " .. sound .. ", there a " .. sound .. ",")
print("Everywhere a " .. sound .. "-" .. sound .. "!")
print("Old MacDonald had a farm, E-I-E-I-O!")

shell.reset()
`

/**
 * Cave escape room adventure using functions for locations
 * Uses recursion instead of loops, io.read(1) for menu selection
 */
export const ADVENTURE_LUA = `-- adventure.lua
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
`

/**
 * ASCII World RPG - Entry Point
 * A 2D fantasy adventure with turn-based combat and exploration
 */
export const ASCII_WORLD_LUA = `-- ascii_world.lua
-- ASCII World RPG - A 2D Fantasy Adventure
--
-- Explore the world, battle monsters, level up, and become a hero!
--
-- Features:
-- - Turn-based combat with Attack, Defend, Item, and Flee options
-- - Two locations: Oakvale Village and Darkwood Forest
-- - Shop and healer NPCs
-- - Equipment (weapons and armor)
-- - Leveling system with stat increases
--
-- Controls:
-- - W/A/S/D: Move
-- - E: Interact with NPCs
-- - M: Open menu
-- - Q: Quit game

local game = require("examples/ascii_world/game")

-- Start the adventure!
game.start()
`

/**
 * Canvas demo drawing shapes
 */
export const SHAPES_LUA = `-- shapes.lua
-- Demonstrates canvas drawing with shapes and colors

local canvas = require("canvas")

function draw()
  -- Clear the screen
  canvas.clear()

  -- Dark blue background
  canvas.set_color(25, 25, 75)
  canvas.fill_rect(0, 0, 800, 600)

  -- Draw a red filled rectangle
  canvas.set_color(255, 0, 0)
  canvas.fill_rect(50, 50, 100, 80)

  -- Draw a green filled circle
  canvas.set_color(0, 255, 0)
  canvas.fill_circle(300, 150, 60)

  -- Draw a blue outlined rectangle
  canvas.set_color(0, 128, 255)
  canvas.set_line_width(3)
  canvas.draw_rect(150, 200, 120, 100)

  -- Draw a yellow outlined circle
  canvas.set_color(255, 255, 0)
  canvas.set_line_width(2)
  canvas.draw_circle(450, 250, 50)

  -- Draw some magenta lines (X pattern)
  canvas.set_color(255, 0, 255)
  canvas.set_line_width(2)
  canvas.draw_line(400, 50, 550, 150)
  canvas.draw_line(550, 50, 400, 150)

  -- Draw white text
  canvas.set_color(255, 255, 255)
  canvas.draw_text(50, 350, "Canvas Shapes Demo!")

  -- Show the elapsed time
  local time = canvas.get_time()
  canvas.set_color(180, 180, 180)
  canvas.draw_text(50, 380, string.format("Time: %.1f seconds", time))
end

function game()
  draw()
end

function main()
  canvas.set_size(800, 600)
  canvas.tick(game)
  canvas.start()
end

main()
`

/**
 * Comprehensive canvas demo showing all API features
 */
export const CANVAS_DEMO_LUA = `-- canvas_demo.lua
-- Comprehensive canvas API demo

local canvas = require("canvas")

local player_x, player_y = 400, 300
local speed = 200
local clicks = 0
local key_presses = 0
local last_keys_pressed = {}

local function handle_input()
    local dt = canvas.get_delta()
    -- Keyboard: WASD movement (using canvas.keys constants)
    if
        canvas.is_key_down(canvas.keys.W) or canvas.is_key_down(canvas.keys.UP)
    then
        player_y = player_y - speed * dt
    end
    if
        canvas.is_key_down(canvas.keys.S) or canvas.is_key_down(canvas.keys.DOWN)
    then
        player_y = player_y + speed * dt
    end
    if
        canvas.is_key_down(canvas.keys.A) or canvas.is_key_down(canvas.keys.LEFT)
    then
        player_x = player_x - speed * dt
    end
    if
        canvas.is_key_down(canvas.keys.D) or canvas.is_key_down(canvas.keys.RIGHT)
    then
        player_x = player_x + speed * dt
    end

    -- Track all keys pressed this frame using get_keys_pressed()
    local pressed = canvas.get_keys_pressed()
    if #pressed > 0 then
        last_keys_pressed = pressed
        key_presses = key_presses + 1
    end

    -- Track clicks
    if canvas.is_mouse_pressed(0) then
        clicks = clicks + 1
    end
end

local function update()
    local width = canvas.get_width()
    local height = canvas.get_height()

    -- Keep player in bounds
    player_x = math.max(25, math.min(width - 25, player_x))
    player_y = math.max(25, math.min(height - 25, player_y))
end

local function draw()
    local dt = canvas.get_delta()
    local width = canvas.get_width()
    local height = canvas.get_height()
    local time = canvas.get_time()

    -- Clear screen
    canvas.clear()

    -- === Drawing Tests ===

    -- Test set_color and fill_rect
    canvas.set_color(50, 50, 80)
    canvas.fill_rect(0, 0, width, height) -- Background

    -- Test draw_rect (stroked rectangle)
    canvas.set_color(255, 255, 0)
    canvas.set_line_width(2)
    canvas.draw_rect(10, 10, 150, 100)

    -- Test fill_rect
    canvas.set_color(0, 100, 255)
    canvas.fill_rect(20, 20, 130, 80)

    -- Test draw_circle (stroked)
    canvas.set_color(255, 0, 255)
    canvas.set_line_width(3)
    canvas.draw_circle(250, 60, 40)

    -- Test fill_circle
    canvas.set_color(0, 255, 100)
    canvas.fill_circle(350, 60, 40)

    -- Test draw_line
    canvas.set_color(255, 100, 0)
    canvas.set_line_width(2)
    canvas.draw_line(400, 20, 500, 100)
    canvas.draw_line(400, 100, 500, 20)

    -- Test alpha (RGBA)
    canvas.set_color(255, 0, 0, 0.5)
    canvas.fill_rect(520, 20, 80, 80)
    canvas.set_color(0, 0, 255, 0.5)
    canvas.fill_rect(560, 40, 80, 80)

    -- Draw player
    canvas.set_color(255, 200, 0)
    canvas.fill_rect(player_x - 25, player_y - 25, 50, 50)
    canvas.set_color(255, 255, 255)
    canvas.draw_rect(player_x - 25, player_y - 25, 50, 50)

    -- === Text Tests ===
    canvas.set_color(255, 255, 255)
    canvas.draw_text(10, 140, "Canvas API Test")
    canvas.draw_text(10, 160, "Width: " .. width .. " Height: " .. height)
    canvas.draw_text(10, 180, "Time: " .. string.format("%.2f", time) .. "s")
    canvas.draw_text(10, 200, "Delta: " .. string.format("%.4f", dt) .. "s")
    canvas.draw_text(10, 220, "FPS: " .. string.format("%.0f", 1 / dt))

    -- Mouse tracking
    local mx = canvas.get_mouse_x()
    local my = canvas.get_mouse_y()

    -- Draw crosshair at mouse position
    canvas.set_color(255, 0, 0)
    canvas.set_line_width(1)
    canvas.draw_line(mx - 10, my, mx + 10, my)
    canvas.draw_line(mx, my - 10, mx, my + 10)

    -- Draw circle when mouse button held
    if canvas.is_mouse_down(0) then
        canvas.set_color(255, 0, 0, 0.5)
        canvas.fill_circle(mx, my, 20)
    end
    if canvas.is_mouse_down(2) then
        canvas.set_color(0, 255, 0, 0.5)
        canvas.fill_circle(mx, my, 20)
    end

    -- === Info Panel ===
    canvas.set_color(0, 0, 0, 0.7)
    canvas.fill_rect(10, height - 170, 320, 160)

    canvas.set_color(255, 255, 255)
    canvas.draw_text(20, height - 150, "=== Controls ===")
    canvas.draw_text(20, height - 130, "WASD/Arrows: Move yellow square")
    canvas.draw_text(20, height - 110, "Mouse: Red crosshair follows")
    canvas.draw_text(20, height - 90, "Left click: Red circle + count")
    canvas.draw_text(20, height - 70, "Right click: Green circle")
    canvas.draw_text(20, height - 50, "Clicks: " .. clicks)
    canvas.draw_text(20, height - 20, "Key Presses: " .. key_presses)

    -- Show keys currently held (using get_keys_down)
    local keys_down = canvas.get_keys_down()
    local keys_str = #keys_down > 0 and table.concat(keys_down, ", ") or "none"
    canvas.draw_text(20, height - 30, "Keys held: " .. keys_str)

    -- Show last keys pressed
    local last_str = #last_keys_pressed > 0
            and table.concat(last_keys_pressed, ", ")
        or "none"
    canvas.draw_text(350, height - 30, "Last pressed: " .. last_str)

    -- Mouse position display
    canvas.draw_text(
        350,
        height - 50,
        "Mouse: " .. math.floor(mx) .. ", " .. math.floor(my)
    )
end

function game()
    handle_input()
    update()
    draw()
end

function main()
    canvas.set_size(800, 600)
    canvas.tick(game)
    canvas.start()
end

main()
`

// ============================================================================
// ASCII WORLD RPG - Multi-file game modules
// ============================================================================

/**
 * ASCII World RPG - Configuration module
 */
export const ASCII_WORLD_CONFIG_LUA = `-- ascii_world/config.lua
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
`

/**
 * ASCII World RPG - UI module
 */
export const ASCII_WORLD_UI_LUA = `-- ascii_world/ui.lua
-- UI rendering helpers

local shell = require("shell")
local config = require("examples/ascii_world/config")

local ui = {}

-- Clear screen and reset colors
function ui.clear()
  shell.clear()
  shell.reset()
end

-- Print colored text
function ui.print(text, color)
  if color then
    shell.foreground(color)
  end
  print(text)
  shell.reset()
end

-- Print a title bar
function ui.title(text)
  shell.foreground(config.colors.title)
  print("=" .. string.rep("=", #text + 2) .. "=")
  print("| " .. text .. " |")
  print("=" .. string.rep("=", #text + 2) .. "=")
  shell.reset()
  print()
end

-- Print a horizontal line
function ui.line(width)
  width = width or 40
  shell.foreground(config.colors.muted)
  print(string.rep("-", width))
  shell.reset()
end

-- Show a message and wait for keypress
function ui.message(text, color)
  print()
  ui.print(text, color or config.colors.text)
  print()
  shell.foreground(config.colors.muted)
  print("Press any key to continue...")
  shell.reset()
  io.read(1)
end

-- Show a numbered menu and get selection
function ui.menu(title_text, options)
  if title_text then
    ui.print(title_text, config.colors.highlight)
    print()
  end

  for i, option in ipairs(options) do
    shell.foreground(config.colors.highlight)
    io.write("  [" .. i .. "] ")
    shell.foreground(config.colors.text)
    print(option)
  end
  shell.foreground(config.colors.muted)
  print("  [Q] Back/Cancel")
  shell.reset()
  print()

  local key = io.read(1):lower()
  if key == "q" then
    return nil
  end

  local num = tonumber(key)
  if num and num >= 1 and num <= #options then
    return num
  end
  return nil
end

-- Display player status bar
function ui.status_bar(player)
  shell.foreground(config.colors.muted)
  print(string.rep("-", 50))
  shell.reset()

  -- Name and level
  shell.foreground(config.colors.highlight)
  io.write(player.name)
  shell.foreground(config.colors.muted)
  io.write(" Lv." .. player.level)

  -- HP bar
  io.write("  ")
  shell.foreground(config.colors.danger)
  io.write("HP:")
  local hp_pct = player.hp / player.max_hp
  if hp_pct > 0.5 then
    shell.foreground(config.colors.success)
  elseif hp_pct > 0.25 then
    shell.foreground(config.colors.highlight)
  else
    shell.foreground(config.colors.danger)
  end
  io.write(player.hp .. "/" .. player.max_hp)

  -- Gold
  io.write("  ")
  shell.foreground(config.colors.gold)
  io.write("Gold:" .. player.gold)

  -- Thirst
  io.write("  ")
  if player.thirst >= 50 then
    shell.foreground(config.colors.danger)
  elseif player.thirst >= 20 then
    shell.foreground(config.colors.highlight)
  else
    shell.foreground(config.colors.muted)
  end
  io.write("Thirst:" .. math.floor(player.thirst))

  shell.reset()
  print()

  shell.foreground(config.colors.muted)
  print(string.rep("-", 50))
  shell.reset()
end

-- Display combat status
function ui.combat_status(player, monster)
  ui.clear()
  shell.foreground(config.colors.danger)
  ui.title("BATTLE!")

  -- Monster info
  shell.foreground(config.colors.monster)
  print("  " .. monster.name)
  shell.foreground(config.colors.text)
  print("  HP: " .. monster.hp .. "/" .. monster.max_hp)
  print()

  ui.line(30)

  -- Player info
  shell.foreground(config.colors.player)
  print("  " .. player.name .. " (Lv." .. player.level .. ")")
  shell.foreground(config.colors.text)
  print("  HP: " .. player.hp .. "/" .. player.max_hp)
  print()
end

-- Show damage text
function ui.show_damage(target, amount, is_player)
  shell.foreground(config.colors.damage)
  if is_player then
    print("  You take " .. amount .. " damage!")
  else
    print("  " .. target .. " takes " .. amount .. " damage!")
  end
  shell.reset()
end

-- Show healing text
function ui.show_heal(amount)
  shell.foreground(config.colors.heal)
  print("  You recover " .. amount .. " HP!")
  shell.reset()
end

-- Show XP gain
function ui.show_xp(amount)
  shell.foreground(config.colors.xp)
  print("  +" .. amount .. " XP")
  shell.reset()
end

-- Show gold gain
function ui.show_gold(amount)
  shell.foreground(config.colors.gold)
  print("  +" .. amount .. " Gold")
  shell.reset()
end

-- Show level up
function ui.level_up(player)
  print()
  shell.foreground(config.colors.success)
  print("  *** LEVEL UP! ***")
  print("  You are now level " .. player.level .. "!")
  print("  Max HP: " .. player.max_hp)
  print("  STR: " .. player.str .. "  DEF: " .. player.def)
  shell.reset()
end

-- ============================================================================
-- SCREEN BUFFER SYSTEM (eliminates flickering during map rendering)
-- ============================================================================

-- Screen buffer state (double buffering)
local current_buffer = {}   -- What's currently on screen
local next_buffer = {}      -- What we want to draw
local buffer_width = 0
local buffer_height = 0
local needs_full_redraw = true

-- Initialize buffers with given dimensions
function ui.init_buffer(width, height)
  buffer_width = width
  buffer_height = height
  current_buffer = {}
  next_buffer = {}
  for y = 1, height do
    current_buffer[y] = {}
    next_buffer[y] = {}
    for x = 1, width do
      current_buffer[y][x] = { char = " ", color = nil }
      next_buffer[y][x] = { char = " ", color = nil }
    end
  end
  needs_full_redraw = true
end

-- Clear the next buffer (fill with spaces)
function ui.clear_buffer()
  for y = 1, buffer_height do
    for x = 1, buffer_width do
      next_buffer[y][x] = { char = " ", color = nil }
    end
  end
end

-- Set a cell in the next buffer
function ui.set_cell(x, y, char, color)
  if y >= 1 and y <= buffer_height and x >= 1 and x <= buffer_width then
    next_buffer[y][x] = { char = char, color = color }
  end
end

-- Draw a string to next buffer starting at position
function ui.set_string(x, y, str, color)
  for i = 1, #str do
    ui.set_cell(x + i - 1, y, str:sub(i, i), color)
  end
end

-- Render: compare buffers and only draw changed cells
function ui.render()
  shell.hide_cursor()

  if needs_full_redraw then
    -- Full redraw: draw everything
    shell.clear()
    for y = 1, buffer_height do
      shell.set_cursor(1, y)
      for x = 1, buffer_width do
        local cell = next_buffer[y][x]
        if cell.color then
          shell.foreground(cell.color)
        else
          shell.reset()
        end
        io.write(cell.char)
        -- Update current buffer
        current_buffer[y][x] = { char = cell.char, color = cell.color }
      end
    end
    needs_full_redraw = false
  else
    -- Incremental update: only changed cells
    local last_color = nil
    for y = 1, buffer_height do
      for x = 1, buffer_width do
        local curr = current_buffer[y][x]
        local next_cell = next_buffer[y][x]

        -- Check if cell changed
        if curr.char ~= next_cell.char or curr.color ~= next_cell.color then
          shell.set_cursor(x, y)
          if next_cell.color ~= last_color then
            if next_cell.color then
              shell.foreground(next_cell.color)
            else
              shell.reset()
            end
            last_color = next_cell.color
          end
          io.write(next_cell.char)
          -- Update current buffer
          current_buffer[y][x] = { char = next_cell.char, color = next_cell.color }
        end
      end
    end
  end

  shell.reset()
  -- Move cursor to bottom left so it doesn't appear on the map
  shell.set_cursor(1, buffer_height)
  shell.show_cursor()
end

-- Force full redraw on next render
function ui.invalidate()
  needs_full_redraw = true
end

-- Check if buffer is initialized
function ui.is_buffer_ready()
  return buffer_width > 0 and buffer_height > 0
end

-- Get buffer dimensions
function ui.get_buffer_width()
  return buffer_width
end

function ui.get_buffer_height()
  return buffer_height
end

-- Display player status bar to buffer (flicker-free version)
function ui.status_bar_to_buffer(player, start_row)
  local col = 1

  -- Row 1: Separator line
  ui.set_string(1, start_row, string.rep("-", 50), config.colors.muted)

  -- Row 2: Stats line
  local stats_row = start_row + 1

  -- Name
  ui.set_string(col, stats_row, player.name, config.colors.highlight)
  col = col + #player.name + 1

  -- Level
  local level_str = "Lv." .. player.level
  ui.set_string(col, stats_row, level_str, config.colors.muted)
  col = col + #level_str + 2

  -- HP label
  ui.set_string(col, stats_row, "HP:", config.colors.danger)
  col = col + 3

  -- HP value with color based on percentage
  local hp_str = player.hp .. "/" .. player.max_hp
  local hp_pct = player.hp / player.max_hp
  local hp_color
  if hp_pct > 0.5 then
    hp_color = config.colors.success
  elseif hp_pct > 0.25 then
    hp_color = config.colors.highlight
  else
    hp_color = config.colors.danger
  end
  ui.set_string(col, stats_row, hp_str, hp_color)
  col = col + #hp_str + 2

  -- Gold
  local gold_str = "Gold:" .. player.gold
  ui.set_string(col, stats_row, gold_str, config.colors.gold)
  col = col + #gold_str + 2

  -- Thirst
  local thirst_str = "Thirst:" .. math.floor(player.thirst)
  local thirst_color
  if player.thirst >= 50 then
    thirst_color = config.colors.danger
  elseif player.thirst >= 20 then
    thirst_color = config.colors.highlight
  else
    thirst_color = config.colors.muted
  end
  ui.set_string(col, stats_row, thirst_str, thirst_color)

  -- Row 3: Separator line
  ui.set_string(1, start_row + 2, string.rep("-", 50), config.colors.muted)

  -- Return the next available row
  return start_row + 3
end

-- Draw horizontal stat bars to the right of the map
-- bar_start_col: column where bars start
-- bar_start_row: first row for bars
function ui.draw_bars_to_buffer(player, bar_start_col, bar_start_row, bar_height)
  -- Bar width in characters
  local bar_width = 10

  -- Block characters for beautiful bars
  local FULL_BLOCK = "█"
  local LIGHT_SHADE = "░"
  local MED_SHADE = "▒"
  local DARK_SHADE = "▓"

  -- Helper to draw a single horizontal bar
  local function draw_horizontal_bar(row, col, width, current, max, fill_color, empty_color, label, value_str)
    -- Draw label
    ui.set_string(col, row, label, fill_color)
    local bar_col = col + 3  -- After "HP " or "TH " or "XP "

    -- Calculate filled width
    local pct = current / max
    local filled = math.floor(pct * width + 0.5)
    if current > 0 and filled == 0 then filled = 1 end

    -- Draw bar with gradient effect
    for i = 1, width do
      local char, color
      if i <= filled then
        -- Filled portion - use gradient near the edge
        if i == filled and filled < width then
          -- Edge of fill - use medium shade for smooth transition
          char = DARK_SHADE
        else
          char = FULL_BLOCK
        end
        color = fill_color
      else
        -- Empty portion
        if i == filled + 1 and filled > 0 then
          -- Just after fill - lighter transition
          char = LIGHT_SHADE
        else
          char = LIGHT_SHADE
        end
        color = empty_color
      end
      ui.set_cell(bar_col + i - 1, row, char, color)
    end

    -- Draw value after bar
    ui.set_string(bar_col + width + 1, row, value_str, config.colors.text)
  end

  -- Row positions (spaced out on the right side of map)
  local name_row = bar_start_row + 1
  local hp_row = bar_start_row + 3
  local th_row = bar_start_row + 5
  local xp_row = bar_start_row + 7
  local gold_row = bar_start_row + 9

  -- Character name and level
  local name_str = player.name .. " Lv." .. player.level
  ui.set_string(bar_start_col, name_row, name_str, config.colors.highlight)

  -- HP Bar (green filled, red empty)
  local hp_pct = player.hp / player.max_hp
  local hp_fill_color = config.colors.success
  if hp_pct <= 0.25 then
    hp_fill_color = config.colors.danger
  elseif hp_pct <= 0.5 then
    hp_fill_color = config.colors.highlight
  end
  draw_horizontal_bar(hp_row, bar_start_col, bar_width,
                      player.hp, player.max_hp,
                      hp_fill_color, config.colors.danger,
                      "HP", player.hp .. "/" .. player.max_hp)

  -- Thirst Bar (blue filled = hydrated, red empty = dehydrated)
  local hydration = player.max_thirst - player.thirst
  local th_fill_color = config.colors.info
  if player.thirst >= 50 then
    th_fill_color = config.colors.danger
  elseif player.thirst >= 20 then
    th_fill_color = config.colors.highlight
  end
  draw_horizontal_bar(th_row, bar_start_col, bar_width,
                      hydration, player.max_thirst,
                      th_fill_color, config.colors.danger,
                      "TH", math.floor(100 - player.thirst) .. "%")

  -- XP Bar (yellow filled, gray empty)
  draw_horizontal_bar(xp_row, bar_start_col, bar_width,
                      player.xp, player.xp_to_level,
                      config.colors.gold, config.colors.muted,
                      "XP", player.xp .. "/" .. player.xp_to_level)

  -- Gold display (no bar, just value with coin symbol)
  ui.set_string(bar_start_col, gold_row, "◆", config.colors.gold)
  ui.set_string(bar_start_col + 2, gold_row, player.gold .. "g", config.colors.gold)
end

return ui
`

/**
 * ASCII World RPG - Player module
 */
export const ASCII_WORLD_PLAYER_LUA = `-- ascii_world/player.lua
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
`

/**
 * ASCII World RPG - Items module
 */
export const ASCII_WORLD_ITEMS_LUA = `-- ascii_world/items.lua
-- Item and equipment definitions

local items = {}

-- Weapons (increase STR/attack)
items.weapons = {
  wooden_sword = {
    id = "wooden_sword",
    name = "Wooden Sword",
    type = "weapon",
    str = 3,
    price = 25,
    description = "A basic training sword.",
  },
  rusty_dagger = {
    id = "rusty_dagger",
    name = "Rusty Dagger",
    type = "weapon",
    str = 2,
    price = 10,
    description = "A worn but functional dagger.",
  },
  iron_sword = {
    id = "iron_sword",
    name = "Iron Sword",
    type = "weapon",
    str = 8,
    price = 80,
    description = "A sturdy iron blade.",
  },
  battle_axe = {
    id = "battle_axe",
    name = "Battle Axe",
    type = "weapon",
    str = 12,
    price = 120,
    description = "A heavy two-handed axe.",
  },
  steel_blade = {
    id = "steel_blade",
    name = "Steel Blade",
    type = "weapon",
    str = 15,
    price = 200,
    description = "A finely crafted steel sword.",
  },
  war_hammer = {
    id = "war_hammer",
    name = "War Hammer",
    type = "weapon",
    str = 18,
    price = 280,
    description = "Crushes armor with ease.",
  },
  hero_sword = {
    id = "hero_sword",
    name = "Hero's Sword",
    type = "weapon",
    str = 25,
    price = 500,
    description = "A legendary blade of heroes.",
  },
  dragon_slayer = {
    id = "dragon_slayer",
    name = "Dragon Slayer",
    type = "weapon",
    str = 35,
    price = 1000,
    description = "Forged to slay dragons.",
  },
}

-- Armor (increase DEF)
items.armors = {
  tattered_robe = {
    id = "tattered_robe",
    name = "Tattered Robe",
    type = "armor",
    def = 1,
    price = 8,
    description = "Better than nothing.",
  },
  cloth_armor = {
    id = "cloth_armor",
    name = "Cloth Armor",
    type = "armor",
    def = 2,
    price = 20,
    description = "Simple cloth garments.",
  },
  leather_armor = {
    id = "leather_armor",
    name = "Leather Armor",
    type = "armor",
    def = 5,
    price = 60,
    description = "Toughened leather protection.",
  },
  studded_leather = {
    id = "studded_leather",
    name = "Studded Leather",
    type = "armor",
    def = 7,
    price = 100,
    description = "Leather reinforced with studs.",
  },
  chain_mail = {
    id = "chain_mail",
    name = "Chain Mail",
    type = "armor",
    def = 10,
    price = 150,
    description = "Interlocking metal rings.",
  },
  scale_mail = {
    id = "scale_mail",
    name = "Scale Mail",
    type = "armor",
    def = 14,
    price = 250,
    description = "Overlapping metal scales.",
  },
  plate_armor = {
    id = "plate_armor",
    name = "Plate Armor",
    type = "armor",
    def = 18,
    price = 400,
    description = "Heavy steel plates.",
  },
  dragon_scale = {
    id = "dragon_scale",
    name = "Dragon Scale",
    type = "armor",
    def = 28,
    price = 1200,
    description = "Armor from dragon scales.",
  },
}

-- Consumables
items.consumables = {
  herb = {
    id = "herb",
    name = "Herb",
    type = "consumable",
    heal = 10,
    price = 5,
    description = "A healing herb. Restores 10 HP.",
  },
  potion = {
    id = "potion",
    name = "Potion",
    type = "consumable",
    heal = 30,
    price = 15,
    description = "Restores 30 HP.",
  },
  hi_potion = {
    id = "hi_potion",
    name = "Hi-Potion",
    type = "consumable",
    heal = 80,
    price = 40,
    description = "Restores 80 HP.",
  },
  super_potion = {
    id = "super_potion",
    name = "Super Potion",
    type = "consumable",
    heal = 150,
    price = 75,
    description = "Restores 150 HP.",
  },
  max_potion = {
    id = "max_potion",
    name = "Max Potion",
    type = "consumable",
    heal = 9999,
    price = 100,
    description = "Fully restores HP.",
  },
  elixir = {
    id = "elixir",
    name = "Elixir",
    type = "consumable",
    heal = 9999,
    price = 250,
    description = "A rare healing elixir.",
  },
}

-- Create a copy of an item (for inventory)
function items.create(item_id)
  -- Search all categories
  local item = items.weapons[item_id]
    or items.armors[item_id]
    or items.consumables[item_id]

  if item then
    -- Return a copy
    local copy = {}
    for k, v in pairs(item) do
      copy[k] = v
    end
    return copy
  end
  return nil
end

-- Get item by ID (reference, not copy)
function items.get(item_id)
  return items.weapons[item_id]
    or items.armors[item_id]
    or items.consumables[item_id]
end

-- Get shop inventory for a shop type
function items.get_shop_inventory(shop_type)
  if shop_type == "weapon" then
    return {
      items.weapons.rusty_dagger,
      items.weapons.wooden_sword,
      items.weapons.iron_sword,
      items.weapons.battle_axe,
      items.weapons.steel_blade,
      items.weapons.war_hammer,
      items.weapons.hero_sword,
      items.weapons.dragon_slayer,
    }
  elseif shop_type == "armor" then
    return {
      items.armors.tattered_robe,
      items.armors.cloth_armor,
      items.armors.leather_armor,
      items.armors.studded_leather,
      items.armors.chain_mail,
      items.armors.scale_mail,
      items.armors.plate_armor,
      items.armors.dragon_scale,
    }
  elseif shop_type == "potion" then
    return {
      items.consumables.herb,
      items.consumables.potion,
      items.consumables.hi_potion,
      items.consumables.super_potion,
      items.consumables.max_potion,
      items.consumables.elixir,
    }
  elseif shop_type == "village" then
    -- Legacy mixed shop
    return {
      items.weapons.wooden_sword,
      items.weapons.iron_sword,
      items.armors.cloth_armor,
      items.armors.leather_armor,
      items.consumables.potion,
      items.consumables.hi_potion,
    }
  elseif shop_type == "town" then
    -- Legacy mixed shop
    return {
      items.weapons.iron_sword,
      items.weapons.steel_blade,
      items.weapons.hero_sword,
      items.armors.leather_armor,
      items.armors.chain_mail,
      items.armors.plate_armor,
      items.consumables.potion,
      items.consumables.hi_potion,
      items.consumables.max_potion,
    }
  end
  return {}
end

return items
`

/**
 * ASCII World RPG - Maps module
 */
export const ASCII_WORLD_MAPS_LUA = `-- ascii_world/maps.lua
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
function maps.draw_to_buffer(map_name, player_x, player_y, ui, start_row)
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

      if x == player_x and y == player_y then
        char = "@"
        color = config.colors.player
      else
        local npc = maps.get_npc_at(map_name, x, y)
        if npc then
          if npc.type == "shop" then
            -- Different symbols for different shop types
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

      ui.set_cell(x, map_start_row + y - 1, char, color)
    end
  end

  -- Return the next available row after the map
  return map_start_row + map.height
end

return maps
`

/**
 * ASCII World RPG - Monsters module
 */
export const ASCII_WORLD_MONSTERS_LUA = `-- ascii_world/monsters.lua
-- Monster definitions and spawning

local monsters = {}

-- Monster templates
monsters.templates = {
  slime = {
    id = "slime",
    name = "Green Slime",
    max_hp = 20,
    str = 6,
    def = 2,
    xp = 15,
    gold = 5,
    description = "A wobbling blob of green goo.",
  },
  goblin = {
    id = "goblin",
    name = "Goblin",
    max_hp = 35,
    str = 10,
    def = 4,
    xp = 30,
    gold = 12,
    description = "A small but vicious creature.",
  },
  wolf = {
    id = "wolf",
    name = "Dire Wolf",
    max_hp = 50,
    str = 14,
    def = 6,
    xp = 50,
    gold = 18,
    description = "A fierce predator of the forest.",
  },
  troll = {
    id = "troll",
    name = "Forest Troll",
    max_hp = 80,
    str = 20,
    def = 10,
    xp = 100,
    gold = 40,
    description = "A hulking brute with thick hide.",
  },
}

-- Create a monster instance from template
function monsters.create(monster_id)
  local template = monsters.templates[monster_id]
  if not template then
    return nil
  end

  -- Create a copy with current HP
  return {
    id = template.id,
    name = template.name,
    hp = template.max_hp,
    max_hp = template.max_hp,
    str = template.str,
    def = template.def,
    xp = template.xp,
    gold = template.gold,
    description = template.description,
  }
end

-- Get monster template (read-only reference)
function monsters.get_template(monster_id)
  return monsters.templates[monster_id]
end

-- Check if monster is alive
function monsters.is_alive(monster)
  return monster and monster.hp > 0
end

-- Monster takes damage
function monsters.take_damage(monster, amount)
  -- Apply defense
  amount = math.max(1, amount - math.floor(monster.def / 2))
  monster.hp = math.max(0, monster.hp - amount)
  return amount
end

-- Calculate monster attack damage
function monsters.calculate_attack(monster)
  local base = monster.str
  -- Add some variance (+/- 20%)
  local variance = math.floor(base * 0.2)
  return base + math.random(-variance, variance)
end

-- Get a random monster for an area (scaled by player level)
function monsters.spawn_for_area(monster_pool, player_level)
  if not monster_pool or #monster_pool == 0 then
    return nil
  end

  -- Pick random monster from pool
  local monster_id = monster_pool[math.random(#monster_pool)]
  local monster = monsters.create(monster_id)

  if monster and player_level > 1 then
    -- Scale monster slightly based on player level
    local scale = 1 + (player_level - 1) * 0.1
    monster.max_hp = math.floor(monster.max_hp * scale)
    monster.hp = monster.max_hp
    monster.str = math.floor(monster.str * scale)
    monster.xp = math.floor(monster.xp * scale)
    monster.gold = math.floor(monster.gold * scale)
  end

  return monster
end

return monsters
`

/**
 * ASCII World RPG - Combat module
 */
export const ASCII_WORLD_COMBAT_LUA = `-- ascii_world/combat.lua
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
`

/**
 * ASCII World RPG - Main Game module
 */
export const ASCII_WORLD_GAME_LUA = `-- ascii_world/game.lua
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

  -- Draw map to buffer
  maps.draw_to_buffer(player.map, player.x, player.y, ui, MAP_START_ROW)

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
`

/**
 * ASCII World RPG - Extension Documentation
 * Documents how to extend the game with new features
 */
export const ASCII_WORLD_EXTENSIONS_MD = `# ASCII World RPG - Extension Guide

This document outlines how to extend ASCII World with new features.
The current MVP includes basic exploration, combat, and progression.

## Current Features (MVP)

- **Two Locations**: Oakvale Village (safe) and Darkwood Forest (encounters)
- **Turn-based Combat**: Attack, Defend, Item, Flee
- **Progression**: XP-based leveling with stat increases
- **Equipment**: Weapon and armor slots
- **NPCs**: Shop and healer in village
- **Monsters**: Slime, Goblin, Wolf, Troll

---

## Extension Ideas

### 1. Magic System

Add MP (Magic Points) and spells to combat.

**Files to modify:**
- \`config.lua\`: Add spell definitions and costs
- \`player.lua\`: Add \`mp\` and \`max_mp\` to player state
- \`combat.lua\`: Add "Magic" option to battle menu
- \`ui.lua\`: Update status displays to show MP

**Implementation:**
\`\`\`lua
-- In config.lua
config.spells = {
  fire = { name = "Fire", damage = 25, mp_cost = 8 },
  ice = { name = "Ice", damage = 20, mp_cost = 6, effect = "slow" },
  heal = { name = "Heal", restore = 40, mp_cost = 12 },
  thunder = { name = "Thunder", damage = 35, mp_cost = 15 },
}

-- In combat.lua battle menu
-- Add option 5: "Magic" -> submenu of available spells
\`\`\`

### 2. More Locations

Add new areas with unique monsters and challenges.

**Suggested locations:**
- **Ironhold Town**: Larger town with better shop, quest givers
- **Crystal Cave**: Underground dungeon with stronger monsters
- **Shadow Castle**: Final dungeon with boss fight
- **Mountain Pass**: Bridge between regions

**Files to modify:**
- \`maps.lua\`: Add new map definitions
- \`monsters.lua\`: Add area-specific monster pools

**Map template:**
\`\`\`lua
maps.data.crystal_cave = {
  name = "Crystal Cave",
  grid = {
    "####################",
    "#......##..........#",
    "#.####.##.########.#",
    -- ... (20x12)
  },
  exits = {
    { x = 10, y = 1, to = "darkwood", spawn_x = 10, spawn_y = 10 }
  },
  encounter_rate = 0.25,
  monster_pool = { "bat", "spider", "golem" },
}
\`\`\`

### 3. Boss Fights

Add special boss monsters with unique abilities.

**Implementation:**
\`\`\`lua
-- In monsters.lua
monsters.bosses = {
  dragon = {
    name = "Shadow Dragon",
    max_hp = 300,
    str = 40,
    def = 25,
    xp = 500,
    gold = 300,
    abilities = { "fire_breath", "tail_sweep", "roar" },
    is_boss = true,
  },
}

-- In combat.lua
-- Check monster.is_boss to enable special attack patterns
\`\`\`

### 4. Quest System

Add trackable objectives with rewards.

**New file: \`quests.lua\`**
\`\`\`lua
local quests = {}

quests.data = {
  slay_goblins = {
    name = "Goblin Trouble",
    description = "Defeat 5 goblins in Darkwood Forest",
    giver = "village_elder",
    type = "kill",
    target = "goblin",
    required = 5,
    progress = 0,
    reward_gold = 100,
    reward_xp = 200,
  },
}

function quests.update_progress(quest_id, amount)
  -- Track kill counts, item collection, etc.
end

function quests.check_complete(quest_id)
  local q = quests.data[quest_id]
  return q.progress >= q.required
end

return quests
\`\`\`

### 5. Status Effects

Add buffs, debuffs, and damage-over-time effects.

**Effects to implement:**
- **Poison**: Damage each turn
- **Burn**: Damage + reduced defense
- **Stun**: Skip turn
- **Defend**: Reduced damage (already implemented!)
- **Berserk**: Increased attack, cannot defend

**Implementation:**
\`\`\`lua
-- In combat.lua
function combat.apply_effects(target)
  if target.effects.poison then
    local damage = math.floor(target.max_hp * 0.05)
    target.hp = target.hp - damage
    ui.print("Poison deals " .. damage .. " damage!", config.colors.danger)
    target.effects.poison = target.effects.poison - 1
    if target.effects.poison <= 0 then
      target.effects.poison = nil
    end
  end
end
\`\`\`

### 6. Party System

Allow multiple party members with turn-based combat order.

**Changes needed:**
- \`player.lua\`: Support multiple characters in party table
- \`combat.lua\`: Turn order based on speed stat
- \`ui.lua\`: Party status display

**Example:**
\`\`\`lua
-- Party structure
party = {
  { name = "Hero", class = "warrior", ... },
  { name = "Mira", class = "mage", ... },
  { name = "Rex", class = "rogue", ... },
}

-- Turn order calculation
function combat.get_turn_order(party, monsters)
  local all = {}
  for _, p in ipairs(party) do table.insert(all, p) end
  for _, m in ipairs(monsters) do table.insert(all, m) end
  table.sort(all, function(a, b) return a.spd > b.spd end)
  return all
end
\`\`\`

### 7. Saving and Loading

**Note:** The current environment doesn't support file I/O.
For persistence, consider:
- Displaying a "save code" (encoded game state) player can copy
- Using browser localStorage if available

**Save code approach:**
\`\`\`lua
function game.generate_save_code()
  -- Encode player level, gold, equipment, location
  -- Example: "L5G150WISCIA" = Level 5, 150 gold, Wood+Iron, Cave, pos A
  local code = string.format("L%dG%d...", player.level, player.gold)
  return code
end
\`\`\`

---

## Adding New Monsters

1. Add template to \`monsters.lua\`:
\`\`\`lua
monsters.templates.skeleton = {
  name = "Skeleton",
  max_hp = 55,
  str = 16,
  def = 8,
  xp = 65,
  gold = 25,
}
\`\`\`

2. Add to area's monster_pool in \`maps.lua\`:
\`\`\`lua
maps.data.crystal_cave.monster_pool = { "bat", "skeleton", "spider" }
\`\`\`

## Adding New Items

1. Add to appropriate table in \`items.lua\`:
\`\`\`lua
items.weapons.silver_sword = {
  name = "Silver Sword",
  str = 12,
  price = 200,
}
\`\`\`

2. Add to shop inventory:
\`\`\`lua
function items.get_shop_inventory(shop_type)
  if shop_type == "ironhold" then
    return {
      { type = "weapon", id = "silver_sword" },
      -- ...
    }
  end
end
\`\`\`

---

## Color Scheme Reference

Current colors (from \`config.lua\`):
- **Player**: shell.GREEN
- **Monster**: shell.RED
- **NPC**: shell.CYAN
- **Gold/Treasure**: shell.YELLOW
- **Walls**: shell.WHITE
- **Danger/Damage**: shell.RED
- **Healing**: shell.GREEN
- **Info**: shell.CYAN
- **Muted text**: (128, 128, 128)

---

## Tips for Extension

1. **Test incrementally**: Add one feature at a time
2. **Keep modules focused**: Each file should have one responsibility
3. **Use config.lua**: Centralize constants for easy balancing
4. **Balance carefully**: XP and gold rewards affect progression speed
5. **Add variety**: Different monsters and items keep gameplay fresh

Happy coding! 🎮
`

/**
 * Get all example files as a record
 */
export function getExamplesContent(): Record<string, string> {
  return {
    'hello.lua': HELLO_LUA,
    'colors.lua': COLORS_LUA,
    'mad_takes.lua': MAD_TAKES_LUA,
    'adventure.lua': ADVENTURE_LUA,
    'ascii_world.lua': ASCII_WORLD_LUA,
    'ascii_world/config.lua': ASCII_WORLD_CONFIG_LUA,
    'ascii_world/ui.lua': ASCII_WORLD_UI_LUA,
    'ascii_world/player.lua': ASCII_WORLD_PLAYER_LUA,
    'ascii_world/items.lua': ASCII_WORLD_ITEMS_LUA,
    'ascii_world/maps.lua': ASCII_WORLD_MAPS_LUA,
    'ascii_world/monsters.lua': ASCII_WORLD_MONSTERS_LUA,
    'ascii_world/combat.lua': ASCII_WORLD_COMBAT_LUA,
    'ascii_world/game.lua': ASCII_WORLD_GAME_LUA,
    'ascii_world/EXTENSIONS.md': ASCII_WORLD_EXTENSIONS_MD,
    'shapes.lua': SHAPES_LUA,
    'canvas_demo.lua': CANVAS_DEMO_LUA,
  }
}
