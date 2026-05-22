-- ansi/typed_input_demo.lua
-- Demonstrates: Typed-character input and modifier-state helpers.
-- Features: get_keys_typed (with shifted symbols + modifier state),
--           is_shift_down, is_ctrl_down, is_alt_down, is_meta_down.
--
-- Type into the buffer using any keys you like — Shift+1 actually gives you "!",
-- AZERTY/Dvorak users get the correct character for their layout, and you can
-- backspace, hit Enter to submit, or use Ctrl+L to clear.

local ansi = require("ansi")

local buffer = ""
local history = {}
local max_history = 8
local last_shortcut = ""
local last_shortcut_time = -1

ansi.tick(function()
  local now = ansi.get_time()

  -- Consume typed-character events for this frame
  for _, ev in ipairs(ansi.get_keys_typed()) do
    -- Shortcuts: Ctrl+L clears, Ctrl+Q quits
    if ev.ctrl and ev.key == "l" then
      buffer = ""
      last_shortcut = "Ctrl+L (clear)"
      last_shortcut_time = now
    elseif ev.ctrl and ev.key == "q" then
      ansi.stop()
      return

    -- Editing keys
    elseif ev.key == "Backspace" then
      buffer = buffer:sub(1, -2)
    elseif ev.key == "Enter" then
      if #buffer > 0 then
        table.insert(history, 1, buffer)
        if #history > max_history then
          table.remove(history)
        end
        buffer = ""
      end

    -- Printable single-character keys (covers all shifted symbols too).
    -- Skip when Ctrl or Meta is held so shortcuts above don't also type.
    elseif #ev.key == 1 and not ev.ctrl and not ev.meta then
      buffer = buffer .. ev.key
    end
  end

  -- Render
  ansi.clear()

  ansi.set_cursor(1, 1)
  ansi.foreground(255, 255, 85)
  ansi.print("Typed-character + modifier demo")
  ansi.foreground(170, 170, 170)
  ansi.set_cursor(2, 1)
  ansi.print("Try: Shift+1 (! not 1), Shift+/ (?), AltGr/Option combos,")
  ansi.set_cursor(3, 1)
  ansi.print("Ctrl+L (clear), Ctrl+Q (quit), Enter (submit), Backspace.")

  -- Blinking cursor
  local cursor = (math.floor(now * 2) % 2 == 0) and "_" or " "

  ansi.set_cursor(5, 1)
  ansi.foreground(85, 255, 85)
  ansi.print("> ")
  ansi.foreground(255, 255, 255)
  ansi.print(buffer .. cursor)

  -- Modifier-state strip
  ansi.set_cursor(7, 1)
  ansi.foreground(170, 170, 170)
  ansi.print("Modifiers held: ")
  local function badge(label, on)
    if on then ansi.foreground(85, 255, 85) else ansi.foreground(85, 85, 85) end
    ansi.print("[" .. label .. "] ")
  end
  badge("SHIFT", ansi.is_shift_down())
  badge("CTRL",  ansi.is_ctrl_down())
  badge("ALT",   ansi.is_alt_down())
  badge("META",  ansi.is_meta_down())

  -- Last shortcut indicator (fades after 1.5s)
  if last_shortcut_time >= 0 and (now - last_shortcut_time) < 1.5 then
    ansi.set_cursor(8, 1)
    ansi.foreground(255, 170, 85)
    ansi.print("Shortcut: " .. last_shortcut)
  end

  -- History
  ansi.set_cursor(10, 1)
  ansi.foreground(85, 170, 255)
  ansi.print("Submitted history (newest first):")
  for i, line in ipairs(history) do
    ansi.set_cursor(10 + i, 3)
    ansi.foreground(200, 200, 200)
    ansi.print(string.format("%d. %s", i, line))
  end
end)

ansi.start()
