-- Channel API Test
-- Tests the low-level canvas.channel_* functions directly
-- Including parent/group channel functionality

local canvas = require("canvas")

-- Register asset directory
canvas.assets.add_path("assets")

-- Register a music track
local music = canvas.assets.load_music("test_music", "music/title-screen.ogg")

-- Set up canvas
canvas.set_size(500, 400)

-- State
local group_name = "test_group"
local channel_name = "test_channel"
local group_created = false
local channel_created = false

-- Colors
local colors = {
  bg = "#1a1a2e",
  button = "#0f3460",
  buttonHover = "#1a5490",
  text = "#eaeaea",
  textDim = "#888888",
  accent = "#e94560",
}

-- Simple button
local buttons = {
  -- Row 1: Setup
  { x = 20, y = 60, w = 140, h = 30, label = "Create Group", action = "create_group" },
  { x = 170, y = 60, w = 140, h = 30, label = "Create Channel", action = "create_channel" },
  { x = 320, y = 60, w = 140, h = 30, label = "Play Music", action = "play" },

  -- Row 2: Playback control
  { x = 20, y = 100, w = 100, h = 30, label = "Stop", action = "stop" },
  { x = 130, y = 100, w = 100, h = 30, label = "Pause", action = "pause" },
  { x = 240, y = 100, w = 100, h = 30, label = "Resume", action = "resume" },

  -- Row 3: Channel volume
  { x = 20, y = 150, w = 100, h = 30, label = "Ch Vol 0", action = "ch_vol_0" },
  { x = 130, y = 150, w = 100, h = 30, label = "Ch Vol 0.5", action = "ch_vol_50" },
  { x = 240, y = 150, w = 100, h = 30, label = "Ch Vol 1", action = "ch_vol_100" },

  -- Row 4: Group volume
  { x = 20, y = 200, w = 100, h = 30, label = "Grp Vol 0", action = "grp_vol_0" },
  { x = 130, y = 200, w = 100, h = 30, label = "Grp Vol 0.5", action = "grp_vol_50" },
  { x = 240, y = 200, w = 100, h = 30, label = "Grp Vol 1", action = "grp_vol_100" },

  -- Row 5: Fading
  { x = 20, y = 250, w = 100, h = 30, label = "Ch Fade 0", action = "ch_fade_0" },
  { x = 130, y = 250, w = 100, h = 30, label = "Ch Fade 1", action = "ch_fade_1" },
  { x = 240, y = 250, w = 100, h = 30, label = "Grp Fade 0", action = "grp_fade_0" },
  { x = 350, y = 250, w = 100, h = 30, label = "Grp Fade 1", action = "grp_fade_1" },
}

local function isInside(btn, px, py)
  return px >= btn.x and px <= btn.x + btn.w and
         py >= btn.y and py <= btn.y + btn.h
end

local log_messages = {}

local function log(msg)
  print(msg)
  table.insert(log_messages, msg)
  if #log_messages > 5 then
    table.remove(log_messages, 1)
  end
end

local function handleAction(action)
  if action == "create_group" then
    canvas.channel_create(group_name, { parent = nil })
    group_created = true
    log("Created group: " .. group_name)

  elseif action == "create_channel" then
    canvas.channel_create(channel_name, { parent = group_name })
    channel_created = true
    log("Created channel: " .. channel_name .. " (parent: " .. group_name .. ")")

  elseif action == "play" then
    canvas.channel_play(channel_name, music, { volume = 1.0, loop = true })
    log("Playing on: " .. channel_name)

  elseif action == "stop" then
    canvas.channel_stop(channel_name)
    log("Stopped")

  elseif action == "pause" then
    canvas.channel_pause(channel_name)
    log("Paused")

  elseif action == "resume" then
    canvas.channel_resume(channel_name)
    log("Resumed")

  elseif action == "ch_vol_0" then
    canvas.channel_set_volume(channel_name, 0)
    log("Channel vol -> 0")

  elseif action == "ch_vol_50" then
    canvas.channel_set_volume(channel_name, 0.5)
    log("Channel vol -> 0.5")

  elseif action == "ch_vol_100" then
    canvas.channel_set_volume(channel_name, 1)
    log("Channel vol -> 1")

  elseif action == "grp_vol_0" then
    canvas.channel_set_volume(group_name, 0)
    log("Group vol -> 0")

  elseif action == "grp_vol_50" then
    canvas.channel_set_volume(group_name, 0.5)
    log("Group vol -> 0.5")

  elseif action == "grp_vol_100" then
    canvas.channel_set_volume(group_name, 1)
    log("Group vol -> 1")

  elseif action == "ch_fade_0" then
    canvas.channel_fade_to(channel_name, 0, 1.0)
    log("Channel fading to 0 (1s)")

  elseif action == "ch_fade_1" then
    canvas.channel_fade_to(channel_name, 1, 1.0)
    log("Channel fading to 1 (1s)")

  elseif action == "grp_fade_0" then
    canvas.channel_fade_to(group_name, 0, 1.0)
    log("Group fading to 0 (1s)")

  elseif action == "grp_fade_1" then
    canvas.channel_fade_to(group_name, 1, 1.0)
    log("Group fading to 1 (1s)")
  end
end

canvas.tick(function()
  -- Handle input
  local mx, my = canvas.get_mouse_x(), canvas.get_mouse_y()
  local clicked = canvas.is_mouse_pressed(0)

  -- Draw background
  canvas.set_fill_style(colors.bg)
  canvas.fill_rect(0, 0, 500, 400)

  -- Draw title
  canvas.set_fill_style(colors.accent)
  canvas.set_font_size(20)
  canvas.set_text_align("left")
  canvas.set_text_baseline("top")
  canvas.draw_text(20, 15, "Channel API Test (with Groups)")

  -- Draw section labels
  canvas.set_fill_style(colors.textDim)
  canvas.set_font_size(11)
  canvas.draw_text(350, 150, "Channel Vol")
  canvas.draw_text(350, 200, "Group Vol")

  -- Draw buttons
  for _, btn in ipairs(buttons) do
    local hover = isInside(btn, mx, my)
    canvas.set_fill_style(hover and colors.buttonHover or colors.button)
    canvas.fill_rect(btn.x, btn.y, btn.w, btn.h)

    canvas.set_fill_style(colors.text)
    canvas.set_font_size(11)
    canvas.set_text_align("center")
    canvas.set_text_baseline("middle")
    canvas.draw_text(btn.x + btn.w/2, btn.y + btn.h/2, btn.label)

    if hover and clicked then
      handleAction(btn.action)
    end
  end

  -- Draw status panel
  canvas.set_fill_style("#16213e")
  canvas.fill_rect(20, 295, 460, 90)

  canvas.set_text_align("left")
  canvas.set_text_baseline("top")
  canvas.set_font_size(12)

  local y = 300

  -- Group status (only query if created)
  canvas.set_fill_style(colors.textDim)
  canvas.draw_text(30, y, "Group:")
  canvas.set_fill_style(colors.text)
  if group_created then
    canvas.draw_text(80, y, string.format("%s | vol=%.2f | fading=%s",
      group_name,
      canvas.channel_get_volume(group_name),
      tostring(canvas.channel_is_fading(group_name))))
  else
    canvas.draw_text(80, y, "(not created yet)")
  end

  y = y + 18

  -- Channel status (only query if created)
  canvas.set_fill_style(colors.textDim)
  canvas.draw_text(30, y, "Channel:")
  canvas.set_fill_style(colors.text)
  if channel_created then
    local parent = canvas.channel_get_parent(channel_name) or "nil"
    canvas.draw_text(80, y, string.format("%s | vol=%.2f | parent=%s",
      channel_name,
      canvas.channel_get_volume(channel_name),
      parent))
  else
    canvas.draw_text(80, y, "(not created yet)")
  end

  y = y + 18

  -- Playback status (only query if channel created)
  canvas.set_fill_style(colors.textDim)
  canvas.draw_text(30, y, "Playback:")
  canvas.set_fill_style(colors.text)
  if channel_created then
    canvas.draw_text(80, y, string.format("playing=%s | time=%.1fs | fading=%s",
      tostring(canvas.channel_is_playing(channel_name)),
      canvas.channel_get_time(channel_name),
      tostring(canvas.channel_is_fading(channel_name))))
  else
    canvas.draw_text(80, y, "(channel not created)")
  end

  y = y + 18

  -- Log
  canvas.set_fill_style(colors.textDim)
  canvas.draw_text(30, y, "Log:")
  canvas.set_fill_style("#aaffaa")
  local lastLog = log_messages[#log_messages] or "(none)"
  canvas.draw_text(80, y, lastLog)
end)

canvas.start()
