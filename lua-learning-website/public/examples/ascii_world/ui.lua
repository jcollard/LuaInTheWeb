-- ascii_world/ui.lua
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
