-- Song Player: Load and play a .wcol collection file
-- Demonstrates file-based song loading, song switching, and playback controls

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

-- Song list (matches the collection)
local songs = {
  {name = "Dungeon Theme", index = 0},
  {name = "Battle Theme", index = 1},
}
local current_song = 1
local playing = false
local current_row = 0
local ready = false

chip.on_row_change(function(row)
  current_row = row
end)

local function load_song(index)
  chip.stop()
  playing = false
  current_row = 0
  current_song = index
  __chip_loadCollection(wcol_content, songs[index].index)
end

ansi.tick(function()
  -- Deferred init: wait until player is ready
  if not ready then
    local ok, err = pcall(__chip_loadCollection, wcol_content, songs[current_song].index)
    if not ok then
      ansi.clear()
      ansi.set_cursor(1, 1)
      ansi.foreground(255, 200, 50)
      ansi.print("Loading...")
      return
    end
    ready = true
  end

  -- Controls
  if ansi.is_key_pressed(" ") then
    if playing then chip.pause(); playing = false
    else chip.play({loop = true}); playing = true end
  end
  if ansi.is_key_pressed("s") then
    chip.stop(); playing = false; current_row = 0
  end

  -- Song switching: left/right arrows
  if ansi.is_key_pressed(ansi.keys.LEFT) or ansi.is_key_pressed("[") then
    local prev = current_song - 1
    if prev < 1 then prev = #songs end
    load_song(prev)
  end
  if ansi.is_key_pressed(ansi.keys.RIGHT) or ansi.is_key_pressed("]") then
    local next_s = current_song + 1
    if next_s > #songs then next_s = 1 end
    load_song(next_s)
  end

  -- Number keys to select song directly
  for i = 1, #songs do
    if ansi.is_key_pressed(tostring(i)) then
      load_song(i)
    end
  end

  if ansi.is_key_pressed("q") or ansi.is_key_pressed(ansi.keys.ESCAPE) then
    chip.stop(); chip.destroy(); ansi.stop(); return
  end

  -- Draw
  ansi.clear()

  ansi.set_cursor(1, 1)
  ansi.foreground(255, 200, 50)
  ansi.print("=== Song Player ===")

  -- Now playing
  ansi.set_cursor(3, 1)
  ansi.foreground(100, 150, 255)
  local status = playing and "Playing" or "Stopped"
  ansi.print("Status: " .. status .. "  |  Row: " .. current_row)

  -- Song list
  ansi.set_cursor(5, 1)
  ansi.foreground(170, 170, 170)
  ansi.print("Songs (press 1-" .. #songs .. " or Left/Right):")

  for i, song in ipairs(songs) do
    ansi.set_cursor(6 + i, 3)
    if i == current_song then
      ansi.foreground(85, 255, 85)
      if playing then
        ansi.print("> " .. i .. ": " .. song.name .. "  [playing]")
      else
        ansi.print("> " .. i .. ": " .. song.name)
      end
    else
      ansi.foreground(170, 170, 170)
      ansi.print("  " .. i .. ": " .. song.name)
    end
  end

  -- Progress indicator
  ansi.set_cursor(6 + #songs + 2, 1)
  ansi.foreground(170, 170, 170)
  ansi.print("Row: " .. current_row)

  if playing then
    ansi.set_cursor(6 + #songs + 3, 1)
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

  -- Controls
  ansi.set_cursor(6 + #songs + 5, 1)
  ansi.foreground(85, 85, 85)
  ansi.print("Space: Play/Pause | S: Stop | Left/Right: Switch Song | Q: Quit")
end)

ansi.start()
