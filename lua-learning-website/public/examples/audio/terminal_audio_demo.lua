-- Audio + Terminal Demo
-- Demonstrates the standalone audio library with simple terminal output
-- Type sound names to play them, or use commands to control music

local audio = require("ail_audio")

-- Register audio assets
audio.add_path("assets")

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

audio.load_music("theme", "music/title-screen.ogg")
audio.load_music("battle", "music/level-1.ogg")
audio.start()

-- Print help
print("=== Audio Terminal Demo ===")
print()
print("Available sounds: " .. table.concat(sounds, ", "))
print()
print("Commands:")
print("  <sound name>    - Play a sound effect")
print("  play <track>    - Play music (theme, battle)")
print("  stop            - Stop music")
print("  pause / resume  - Pause/resume music")
print("  volume <0-100>  - Set master volume")
print("  mute / unmute   - Toggle mute")
print("  status          - Show audio status")
print("  quit            - Exit")
print()

local running = true
while running do
  io.write("> ")
  local input = io.read()
  if not input then break end
  input = input:lower():match("^%s*(.-)%s*$") -- trim

  -- Check if it's a sound name
  local is_sound = false
  for _, name in ipairs(sounds) do
    if input == name then
      audio.play_sound(name)
      print("Playing sound: " .. name)
      is_sound = true
      break
    end
  end

  if not is_sound then
    -- Parse commands
    local cmd, arg = input:match("^(%S+)%s*(.*)$")

    if cmd == "play" then
      if arg == "theme" or arg == "battle" then
        audio.play_music(arg, { loop = true })
        print("Playing music: " .. arg)
      else
        print("Unknown track. Available: theme, battle")
      end
    elseif cmd == "stop" then
      audio.stop_music()
      print("Music stopped.")
    elseif cmd == "pause" then
      audio.pause_music()
      print("Music paused.")
    elseif cmd == "resume" then
      audio.resume_music()
      print("Music resumed.")
    elseif cmd == "volume" then
      local vol = tonumber(arg)
      if vol and vol >= 0 and vol <= 100 then
        audio.set_master_volume(vol / 100)
        print("Volume set to " .. vol .. "%")
      else
        print("Usage: volume <0-100>")
      end
    elseif cmd == "mute" then
      audio.mute()
      print("Audio muted.")
    elseif cmd == "unmute" then
      audio.unmute()
      print("Audio unmuted.")
    elseif cmd == "status" then
      print("  Master volume: " .. math.floor(audio.get_master_volume() * 100) .. "%")
      print("  Muted: " .. tostring(audio.is_muted()))
      print("  Music playing: " .. tostring(audio.is_music_playing()))
      if audio.is_music_playing() then
        print("  Music time: " .. string.format("%.1fs / %.1fs",
          audio.get_music_time(), audio.get_music_duration()))
      end
    elseif cmd == "quit" or cmd == "exit" then
      running = false
      print("Goodbye!")
    elseif cmd then
      print("Unknown command: " .. cmd)
    end
  end
end
