-- Audio + ANSI Demo
-- Demonstrates the standalone audio library with ANSI terminal rendering
-- Use arrow keys to select sounds, Enter to play, M to toggle music

local ansi = require("ansi")
local audio = require("ail_audio")

-- Register audio assets
audio.add_path("assets")

-- Sound effects
local sounds = {"blade", "coin", "gem", "spell", "fire", "monster", "roar", "slime", "wood", "stone"}
local sound_files = {
  "sfx/blade_01.ogg", "sfx/item_coins_01.ogg", "sfx/item_gem_01.ogg",
  "sfx/spell_01.ogg", "sfx/spell_fire_01.ogg", "sfx/creature_monster_01.ogg",
  "sfx/creature_roar_01.ogg", "sfx/creature_slime_01.ogg", "sfx/wood_01.ogg",
  "sfx/stones_01.ogg"
}
for i, name in ipairs(sounds) do
  audio.load_sound(name, sound_files[i])
end

-- Music
audio.load_music("theme", "music/title-screen.ogg")
audio.start()

-- State
local selected = 1
local music_playing = false
local volume = 9 -- 0 to 9

ansi.tick(function()
  -- Input
  if ansi.is_key_pressed(ansi.keys.UP) then
    selected = selected - 1
    if selected < 1 then selected = #sounds end
  end
  if ansi.is_key_pressed(ansi.keys.DOWN) then
    selected = selected + 1
    if selected > #sounds then selected = 1 end
  end
  if ansi.is_key_pressed(ansi.keys.ENTER) then
    audio.play_sound(sounds[selected])
  end
  if ansi.is_key_pressed("m") then
    if music_playing then
      audio.stop_music()
      music_playing = false
    else
      audio.play_music("theme", { loop = true })
      music_playing = true
    end
  end
  -- Number keys 0-9 set volume directly
  for i = 0, 9 do
    if ansi.is_key_pressed(tostring(i)) then
      volume = i
      audio.set_master_volume(volume / 9)
    end
  end

  -- Draw
  ansi.clear()

  -- Title
  ansi.set_cursor(1, 1)
  ansi.foreground(255, 200, 50)
  ansi.print("=== Audio + ANSI Demo ===")

  -- Sound list
  ansi.set_cursor(3, 1)
  ansi.foreground(170, 170, 170)
  ansi.print("Sound Effects (Enter to play):")

  for i, name in ipairs(sounds) do
    ansi.set_cursor(4 + i, 3)
    if i == selected then
      ansi.foreground(85, 255, 85)
      ansi.print("> " .. name)
    else
      ansi.foreground(170, 170, 170)
      ansi.print("  " .. name)
    end
  end

  -- Music status
  ansi.set_cursor(16, 1)
  ansi.foreground(100, 150, 255)
  if music_playing then
    ansi.print("Music: Playing")
  else
    ansi.print("Music: Stopped")
  end

  -- Volume bar
  ansi.set_cursor(18, 1)
  ansi.foreground(170, 170, 170)
  ansi.print("Volume: [")
  ansi.foreground(85, 255, 85)
  ansi.print(string.rep("#", volume))
  ansi.foreground(85, 85, 85)
  ansi.print(string.rep("-", 9 - volume))
  ansi.foreground(170, 170, 170)
  ansi.print("] " .. math.floor(audio.get_master_volume() * 100) .. "%")

  -- Controls
  ansi.set_cursor(20, 1)
  ansi.foreground(85, 85, 85)
  ansi.print("Up/Down: Select | Enter: Play | M: Music | 0-9: Volume")
end)

ansi.start()
