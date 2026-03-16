-- Collection Browser: Browse and play individual patterns from a .wcol file
-- Demonstrates chip.parse_collection(), chip.play_pattern(), pattern metadata

local ansi = require("ansi")
local chip = require("chip")

chip.init()

-- Read the collection file
local f = io.open("assets/dc-example.wcol", "r")
if not f then
  print("Error: could not open assets/dc-example.wcol")
  return
end
local wcol_content = f:read("*a")
f:close()

local col = nil
local selected = 1
local playing = false
local current_row = 0
local ready = false

ansi.tick(function()
  -- Deferred init: wait until player is ready
  if not ready then
    if not chip.ready() then
      ansi.clear()
      ansi.set_cursor(1, 1)
      ansi.foreground(255, 200, 50)
      ansi.print("Loading...")
      return
    end
    chip.on_row_change(function(row)
      current_row = row
    end)
    -- Parse collection to get individual patterns
    col = chip.parse_collection(wcol_content)
    if not col then
      ansi.clear()
      ansi.set_cursor(1, 1)
      ansi.foreground(255, 80, 80)
      ansi.print("Error: failed to parse collection")
      return
    end
    ready = true
  end

  -- Controls
  if ansi.is_key_pressed(ansi.keys.UP) then
    selected = selected - 1
    if selected < 1 then selected = #col.patterns end
  end
  if ansi.is_key_pressed(ansi.keys.DOWN) then
    selected = selected + 1
    if selected > #col.patterns then selected = 1 end
  end

  if ansi.is_key_pressed(" ") or ansi.is_key_pressed(ansi.keys.ENTER) then
    chip.stop()
    chip.play_pattern(col, selected)
    chip.play({ loop = true })
    playing = true
    current_row = 0
  end

  if ansi.is_key_pressed("s") then
    chip.stop()
    playing = false
    current_row = 0
  end

  -- Number keys 1-9 for quick selection
  for i = 1, math.min(9, #col.patterns) do
    if ansi.is_key_pressed(tostring(i)) then
      selected = i
      chip.stop()
      chip.play_pattern(col, selected)
      chip.play({ loop = true })
      playing = true
      current_row = 0
    end
  end

  if ansi.is_key_pressed("q") or ansi.is_key_pressed(ansi.keys.ESCAPE) then
    chip.stop()
    chip.free_collection(col)
    chip.destroy()
    ansi.stop()
    return
  end

  -- Draw
  ansi.clear()

  ansi.set_cursor(1, 1)
  ansi.foreground(255, 200, 50)
  ansi.print("=== Collection Browser ===")

  ansi.set_cursor(3, 1)
  ansi.foreground(100, 150, 255)
  local status = playing and "Playing" or "Stopped"
  ansi.print("Status: " .. status .. "  |  Row: " .. current_row)

  ansi.set_cursor(5, 1)
  ansi.foreground(170, 170, 170)
  ansi.print("Patterns (Up/Down to select, Space to play):")

  for i, pat in ipairs(col.patterns) do
    ansi.set_cursor(6 + i, 3)
    if i == selected then
      if playing then
        ansi.foreground(85, 255, 85)
        ansi.print("> " .. i .. ": " .. pat.name .. "  [playing]")
      else
        ansi.foreground(200, 200, 255)
        ansi.print("> " .. i .. ": " .. pat.name)
      end
    else
      ansi.foreground(170, 170, 170)
      ansi.print("  " .. i .. ": " .. pat.name)
    end

    -- Show pattern info
    ansi.foreground(100, 100, 100)
    ansi.print("  (" .. pat.tracks .. "ch, " .. pat.rows .. " rows, " .. pat.bpm .. " bpm)")
  end

  -- Progress bar
  if playing then
    local bar_y = 7 + #col.patterns + 1
    ansi.set_cursor(bar_y, 1)
    local bar_width = 40
    local filled = current_row % bar_width
    ansi.foreground(85, 255, 85)
    ansi.print("[")
    ansi.print(string.rep("#", filled))
    ansi.foreground(85, 85, 85)
    ansi.print(string.rep("-", bar_width - filled))
    ansi.foreground(85, 255, 85)
    ansi.print("]")
  end

  -- Controls help
  local help_y = 7 + #col.patterns + 3
  ansi.set_cursor(help_y, 1)
  ansi.foreground(85, 85, 85)
  ansi.print("Up/Down: Select | Space/Enter: Play | S: Stop | 1-9: Quick select | Q: Quit")
end)

ansi.start()
