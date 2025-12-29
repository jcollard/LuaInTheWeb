-- Audio Demo
-- Demonstrates the canvas audio API with sound effects and music

local canvas = require("canvas")

-- Register asset directory (relative to this script)
canvas.assets.add_path("assets")

-- Register sound effects
local sfx = {
  blade = canvas.assets.load_sound("blade", "sfx/blade_01.ogg"),
  coin = canvas.assets.load_sound("coin", "sfx/item_coins_01.ogg"),
  gem = canvas.assets.load_sound("gem", "sfx/item_gem_01.ogg"),
  spell = canvas.assets.load_sound("spell", "sfx/spell_01.ogg"),
  fire = canvas.assets.load_sound("fire", "sfx/spell_fire_01.ogg"),
  monster = canvas.assets.load_sound("monster", "sfx/creature_monster_01.ogg"),
  roar = canvas.assets.load_sound("roar", "sfx/creature_roar_01.ogg"),
  slime = canvas.assets.load_sound("slime", "sfx/creature_slime_01.ogg"),
  wood = canvas.assets.load_sound("wood", "sfx/wood_01.ogg"),
  stone = canvas.assets.load_sound("stone", "sfx/stones_01.ogg"),
}

-- Register music tracks
local music = {
  title = canvas.assets.load_music("title", "music/title-screen.ogg"),
  level1 = canvas.assets.load_music("level1", "music/level-1.ogg"),
  level2 = canvas.assets.load_music("level2", "music/level-2.ogg"),
  level3 = canvas.assets.load_music("level3", "music/level-3.ogg"),
  ending = canvas.assets.load_music("ending", "music/ending.ogg"),
}

-- Set up canvas
canvas.set_size(600, 500)

-- UI State
local buttons = {}
local currentTrack = "none"
local masterVolume = 1.0
local musicVolume = 1.0

-- Colors
local colors = {
  bg = "#1a1a2e",
  panel = "#16213e",
  button = "#0f3460",
  buttonHover = "#1a5490",
  buttonActive = "#e94560",
  text = "#eaeaea",
  textDim = "#888888",
  accent = "#e94560",
  green = "#4ade80",
  yellow = "#fbbf24",
}

-- Create a button
local function createButton(x, y, w, h, label, onClick)
  return {
    x = x, y = y, w = w, h = h,
    label = label,
    onClick = onClick,
    hovered = false,
    active = false,
  }
end

-- Check if point is in button
local function isPointInButton(btn, px, py)
  return px >= btn.x and px <= btn.x + btn.w and
         py >= btn.y and py <= btn.y + btn.h
end

-- Draw a button
local function drawButton(btn)
  local color = colors.button
  if btn.active then
    color = colors.buttonActive
  elseif btn.hovered then
    color = colors.buttonHover
  end

  canvas.set_color(color)
  canvas.begin_path()
  canvas.round_rect(btn.x, btn.y, btn.w, btn.h, 8)
  canvas.fill()

  canvas.set_color(colors.text)
  canvas.set_font_size(14)
  canvas.set_text_align("center")
  canvas.set_text_baseline("middle")
  canvas.draw_text(btn.x + btn.w/2, btn.y + btn.h/2, btn.label)
end

-- Initialize buttons
local function initButtons()
  buttons = {}

  -- Sound effect buttons (2 rows of 5)
  local sfxNames = {"blade", "coin", "gem", "spell", "fire", "monster", "roar", "slime", "wood", "stone"}
  local sfxLabels = {"Blade", "Coin", "Gem", "Spell", "Fire", "Monster", "Roar", "Slime", "Wood", "Stone"}

  for i, name in ipairs(sfxNames) do
    local row = math.floor((i-1) / 5)
    local col = (i-1) % 5
    local btn = createButton(
      30 + col * 110, 100 + row * 50,
      100, 40,
      sfxLabels[i],
      function() canvas.play_sound(name) end
    )
    table.insert(buttons, btn)
  end

  -- Music track buttons
  local musicNames = {"title", "level1", "level2", "level3", "ending"}
  local musicLabels = {"Title", "Level 1", "Level 2", "Level 3", "Ending"}

  for i, name in ipairs(musicNames) do
    local btn = createButton(
      30 + (i-1) * 110, 280,
      100, 40,
      musicLabels[i],
      function()
        currentTrack = name
        canvas.play_music(name, { loop = true, volume = musicVolume })
      end
    )
    table.insert(buttons, btn)
  end

  -- Music control buttons
  table.insert(buttons, createButton(30, 340, 80, 35, "Stop", function()
    canvas.stop_music()
    currentTrack = "none"
  end))

  table.insert(buttons, createButton(120, 340, 80, 35, "Pause", function()
    canvas.pause_music()
  end))

  table.insert(buttons, createButton(210, 340, 80, 35, "Resume", function()
    canvas.resume_music()
  end))

  -- Volume control buttons
  table.insert(buttons, createButton(30, 440, 40, 35, "-", function()
    masterVolume = math.max(0, masterVolume - 0.1)
    canvas.set_master_volume(masterVolume)
  end))

  table.insert(buttons, createButton(180, 440, 40, 35, "+", function()
    masterVolume = math.min(1, masterVolume + 0.1)
    canvas.set_master_volume(masterVolume)
  end))

  -- Mute button
  table.insert(buttons, createButton(320, 440, 80, 35, "Mute", function()
    if canvas.is_muted() then
      canvas.unmute()
    else
      canvas.mute()
    end
  end))
end

initButtons()

-- Main game loop
canvas.tick(function()
  local mx, my = canvas.get_mouse_x(), canvas.get_mouse_y()
  local mousePressed = canvas.is_mouse_pressed(0)

  -- Update button states
  for _, btn in ipairs(buttons) do
    btn.hovered = isPointInButton(btn, mx, my)
    if btn.hovered and mousePressed then
      btn.onClick()
    end
  end

  -- Update active state for music buttons
  local musicNames = {"title", "level1", "level2", "level3", "ending"}
  for i, btn in ipairs(buttons) do
    if i >= 11 and i <= 15 then
      btn.active = (currentTrack == musicNames[i - 10])
    end
  end

  -- Draw background
  canvas.set_color(colors.bg)
  canvas.fill_rect(0, 0, 600, 500)

  -- Draw title
  canvas.set_color(colors.accent)
  canvas.set_font_size(32)
  canvas.set_text_align("center")
  canvas.set_text_baseline("top")
  canvas.draw_text(300, 20, "Audio Demo")

  -- Draw section labels
  canvas.set_color(colors.text)
  canvas.set_font_size(18)
  canvas.set_text_align("left")
  canvas.draw_text(30, 70, "Sound Effects (click to play)")

  canvas.draw_text(30, 250, "Music Tracks")

  canvas.draw_text(30, 400, "Master Volume")

  -- Draw all buttons
  for _, btn in ipairs(buttons) do
    drawButton(btn)
  end

  -- Draw volume bar
  canvas.set_color(colors.panel)
  canvas.fill_rect(80, 448, 90, 20)
  canvas.set_color(colors.green)
  canvas.fill_rect(80, 448, 90 * masterVolume, 20)
  canvas.set_color(colors.text)
  canvas.set_font_size(12)
  canvas.set_text_align("center")
  canvas.draw_text(125, 458, string.format("%d%%", math.floor(masterVolume * 100)))

  -- Update mute button label
  local muteBtn = buttons[#buttons]
  if canvas.is_muted() then
    muteBtn.label = "Unmute"
    muteBtn.active = true
  else
    muteBtn.label = "Mute"
    muteBtn.active = false
  end

  -- Draw music info
  canvas.set_color(colors.textDim)
  canvas.set_font_size(14)
  canvas.set_text_align("left")

  local trackLabel = currentTrack == "none" and "No track playing" or ("Now playing: " .. currentTrack)
  if canvas.is_music_playing() then
    local time = canvas.get_music_time()
    local duration = canvas.get_music_duration()
    trackLabel = trackLabel .. string.format(" (%.1fs / %.1fs)", time, duration)
  elseif currentTrack ~= "none" then
    trackLabel = trackLabel .. " (paused)"
  end
  canvas.draw_text(310, 348, trackLabel)

  -- Draw instructions
  canvas.set_color(colors.textDim)
  canvas.set_font_size(12)
  canvas.set_text_align("center")
  canvas.draw_text(300, 480, "Click buttons to play sounds and music. Press ESC to exit.")

  -- Exit on ESC
  if canvas.is_key_pressed(canvas.keys.ESCAPE) then
    canvas.stop()
  end
end)

canvas.start()
