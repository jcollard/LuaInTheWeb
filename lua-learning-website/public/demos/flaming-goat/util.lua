-- util.lua
-- Small shared helpers for THE FLAMING GOAT.
-- Each helper does one obvious thing so room files can stay focused on
-- print() statements and if/else logic.

local shell = require("shell")

local util = {}

-- Raw ANSI escape codes used by util.keyword. We hard-code them here
-- (instead of calling shell.foreground, which prints directly) so that
-- keyword() can return a STRING that slots into print() with ".." .
local CYAN_ON   = "\x1b[38;2;0;255;255m"
local COLOR_OFF = "\x1b[0m"

-- Wrap a word in [brackets] and color it cyan. Returns a string, so you
-- use it inside a normal print() with string concatenation:
--
--   print("You see a " .. util.keyword("shelf") .. " and a door to the "
--         .. util.keyword("west") .. ".")
function util.keyword(word)
  return CYAN_ON .. "[" .. word .. "]" .. COLOR_OFF
end

-- Clear the screen and print a colored banner for the current room.
function util.header(title, color)
  shell.clear()
  shell.foreground(color or shell.WHITE)
  local bar = string.rep("=", #title + 4)
  print(bar)
  print("  " .. title)
  print(bar)
  shell.reset()
  print("")
end

-- Prompt the player for input. Returns a lowercased, trimmed string.
function util.prompt()
  shell.foreground(shell.YELLOW)
  io.write("> ")
  shell.reset()
  local line = io.read()
  if not line then return "" end
  return line:lower():gsub("^%s+", ""):gsub("%s+$", "")
end

-- Print an error message in red. Used when the player types something
-- the current room doesn't understand.
function util.bad(msg)
  shell.foreground(shell.RED)
  print(msg)
  shell.reset()
end

-- Pause for dramatic effect. Waits for the player to press enter.
function util.pause()
  shell.foreground(shell.GRAY)
  io.write("(press enter to continue)")
  shell.reset()
  io.read()
end

-- Title screen for main.lua.
function util.title()
  shell.clear()
  shell.foreground(shell.MAGENTA)
  print("=========================================")
  print("   THE FLAMING GOAT")
  print("=========================================")
  shell.reset()
  shell.foreground(shell.GRAY)
  print("   An Adventures in Lua demo")
  print("")
  shell.reset()
  print("All you wanted was to go home. Type the "
        .. util.keyword("word") .. " in brackets to act.")
  print("")
  util.pause()
end

-- Win banner.
function util.win()
  shell.clear()
  shell.foreground(shell.GREEN)
  print("=========================================")
  print("   YOU ESCAPED! Welcome home.")
  print("=========================================")
  shell.reset()
end

-- Game over banner.
function util.game_over(reason)
  shell.clear()
  shell.foreground(shell.RED)
  print("=========================================")
  print("   GAME OVER")
  print("=========================================")
  shell.reset()
  if reason then
    print("")
    print(reason)
  end
end

return util
