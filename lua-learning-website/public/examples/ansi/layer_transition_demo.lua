-- Layer Transition Demo
-- Tests dither_in/dither_out with layers parameter and on_complete callback.
-- Uses load_screen() with a V8 .ansi.lua file (deep group nesting):
--   brick-background (drawn, always visible)
--   view-port (group, tag: "crawler-mode-tag")
--     forest-background (group)
--       trees (drawn, visible)
--     enemies (group)
--       red-cap (drawn, starts hidden, tag: "Enemy")
--
-- Key 5 demonstrates on_complete: swipe in redcap, then automatically
-- show a "DEFEATED!" label via on_complete callback when the transition ends.

local ansi = require("ansi")

local screen = ansi.load_screen("layer_transition_screen.ansi.lua")
ansi.set_screen(screen)

local DURATION = 0.5
local message = nil       -- text shown after on_complete fires
local message_timer = 0   -- auto-clear after 2 seconds

local function draw_status()
  local layers = screen:get_layers()
  local redcap_vis = false
  local viewport_vis = false
  for _, l in ipairs(layers) do
    if l.id == "red-cap" then redcap_vis = l.visible end
    if l.id == "view-port" then viewport_vis = l.visible end
  end

  ansi.set_cursor(25, 1)
  ansi.background(30, 30, 40)
  ansi.foreground(200, 200, 200)
  ansi.print(" 1:In 2:Out 3:VP- 4:VP+ 5:Chain 6:Defeat R:Reset Esc:Quit")

  ansi.set_cursor(24, 1)
  ansi.background(30, 30, 40)
  ansi.foreground(180, 180, 180)
  ansi.print(" Redcap:")
  if redcap_vis then
    ansi.foreground(85, 255, 85)
    ansi.print("ON")
  else
    ansi.foreground(255, 85, 85)
    ansi.print("--")
  end
  ansi.foreground(180, 180, 180)
  ansi.print(" VP:")
  if viewport_vis then
    ansi.foreground(85, 255, 85)
    ansi.print("ON")
  else
    ansi.foreground(255, 85, 85)
    ansi.print("--")
  end

  -- Show on_complete message if active
  if message then
    ansi.foreground(255, 255, 85)
    ansi.print("  " .. message .. "           ")
  else
    ansi.print("                              ")
  end
end

ansi.tick(function()
  draw_status()

  -- Auto-clear message after timer
  if message then
    message_timer = message_timer - ansi.get_delta()
    if message_timer <= 0 then message = nil end
  end

  if screen:is_transitioning() then return end

  -- 1: Dither IN the redcap
  if ansi.is_key_pressed("1") then
    screen:dither_in({ layers = "red-cap", duration = DURATION })
  end

  -- 2: Dither OUT the redcap
  if ansi.is_key_pressed("2") then
    screen:dither_out({ layers = "red-cap", duration = DURATION })
  end

  -- 3: Dither OUT the view-port group via tag
  if ansi.is_key_pressed("3") then
    screen:dither_out({ layers = "crawler-mode-tag", duration = DURATION })
  end

  -- 4: Dither IN the view-port group via tag
  if ansi.is_key_pressed("4") then
    screen:dither_in({ layers = "crawler-mode-tag", duration = DURATION })
  end

  -- 5: on_complete demo — swipe in redcap, then show message when done
  if ansi.is_key_pressed("5") then
    screen:swipe_in({
      layers = "red-cap",
      direction = "up",
      duration = DURATION,
      on_complete = function()
        message = "on_complete fired!"
        message_timer = 2
      end,
    })
  end

  -- 6: on_complete chaining — dither out redcap, then hide viewport after
  if ansi.is_key_pressed("6") then
    screen:dither_out({
      layers = "red-cap",
      duration = DURATION,
      on_complete = function()
        message = "DEFEATED! Hiding viewport..."
        message_timer = 2
        screen:dither_out({ layers = "crawler-mode-tag", duration = DURATION })
      end,
    })
  end

  -- R: Reset to initial state
  if ansi.is_key_pressed("r") then
    screen:layer_off("red-cap")
    screen:layer_on("view-port")
    message = nil
  end

  if ansi.is_key_pressed("escape") then
    ansi.stop()
  end
end)

print("Layer Transition Demo")
print("=====================")
print("V8 screen with deep group nesting + on_complete callback.")
print("")
print("1: Dither IN redcap       2: Dither OUT redcap")
print("3: Dither OUT viewport    4: Dither IN viewport")
print("5: Swipe IN + on_complete 6: Defeat chain (out + on_complete)")
print("R: Reset  ESC: Quit")
print("")
ansi.start()
print("Demo finished!")
