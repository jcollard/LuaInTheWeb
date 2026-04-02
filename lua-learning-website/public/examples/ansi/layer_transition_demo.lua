-- Layer Transition Demo
-- Tests dither_in/dither_out with layers parameter using load_screen()
-- with a V8 .ansi.lua file that mirrors real game structure:
--   brick-background (drawn, always visible)
--   view-port (group, tag: "crawler-mode-tag")
--     forest-background (group)
--       trees (drawn, visible)
--     enemies (group)
--       red-cap (drawn, starts hidden, tag: "Enemy")

local ansi = require("ansi")

-- Load V8 screen file (same code path as real game)
local screen = ansi.load_screen("ansi/layer_transition_screen.ansi.lua")
ansi.set_screen(screen)

local DURATION = 0.5

-- Helper: draw status bar
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
  ansi.print(" 1:Redcap+  2:Redcap-  3:ViewPort-  4:ViewPort+  R:Reset  Esc:Quit  ")

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
  ansi.print("  ViewPort:")
  if viewport_vis then
    ansi.foreground(85, 255, 85)
    ansi.print("ON")
  else
    ansi.foreground(255, 85, 85)
    ansi.print("--")
  end
  ansi.foreground(180, 180, 180)
  if screen:is_transitioning() then
    ansi.foreground(255, 255, 85)
    ansi.print(" [TRANSITIONING]        ")
  else
    ansi.print("                        ")
  end
end

ansi.tick(function()
  draw_status()

  if screen:is_transitioning() then return end

  -- 1: Dither IN the redcap (show enemy over forest/bricks)
  if ansi.is_key_pressed("1") then
    screen:dither_in({ layers = "red-cap", duration = DURATION })
  end

  -- 2: Dither OUT the redcap (BUG: should dissolve redcap, forest+bricks stay)
  if ansi.is_key_pressed("2") then
    screen:dither_out({ layers = "red-cap", duration = DURATION })
  end

  -- 3: Dither OUT the view-port group via tag (BUG: should dissolve all
  --    crawler-mode-tag layers, leaving only brick background)
  if ansi.is_key_pressed("3") then
    screen:dither_out({ layers = "crawler-mode-tag", duration = DURATION })
  end

  -- 4: Dither IN the view-port group via tag
  if ansi.is_key_pressed("4") then
    screen:dither_in({ layers = "crawler-mode-tag", duration = DURATION })
  end

  -- R: Reset to initial state
  if ansi.is_key_pressed("r") then
    screen:layer_off("red-cap")
    screen:layer_on("view-port")
  end

  if ansi.is_key_pressed("escape") then
    ansi.stop()
  end
end)

print("Layer Transition Demo")
print("=====================")
print("V8 screen loaded via load_screen() with deep group nesting.")
print("Tests dither_in/dither_out on individual layers and groups.")
print("")
print("1: Dither IN redcap    2: Dither OUT redcap")
print("3: Dither OUT viewport 4: Dither IN viewport")
print("R: Reset  ESC: Quit")
print("")
ansi.start()
print("Demo finished!")
