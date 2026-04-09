-- rooms/flaming_goat.lua
-- Up close with the flaming goat. Needs a SPRYTE to extinguish.

local shell = require("shell")
local util  = require("util")

local function draw_flames()
  -- Flame tip (cool red) at top, hot yellow base touching the goat's head.
  -- Hex colors work because shell.foreground accepts hex strings.
  local flames = {
    { "#FF0000", "          ( ~ )"    },
    { "#FF6400", "         ( ~~~ )"   },
    { "#FFFF00", "        ( ~~~~~ )"  },
  }
  for _, row in ipairs(flames) do
    shell.foreground(row[1])
    print(row[2])
  end
  shell.reset()
  shell.foreground(shell.WHITE)
  print("          /|__|\\")
  print("         ( o  o )")
  print("          \\ ^^ /")
  print('          "baa!"')
  shell.reset()
end

return function(s)
  util.header("FLAMING GOAT", shell.RED)
  draw_flames()
  print("")

  print("The goat is absolutely on fire. Not metaphorically. Literally.")
  print("It glares at you. Steam rises from its beard.")
  if s.has_spryte then
    print("You could " .. util.keyword("pour") .. " your SPRYTE on the flames.")
  end
  print("You could try to " .. util.keyword("pass") .. " it, or step "
        .. util.keyword("back") .. " down the escalator.")

  while true do
    local cmd = util.prompt()
    if cmd == "pour" then
      if s.has_spryte then
        print("You crack the SPRYTE and upend it over the goat. FIZZZZZZZZ!")
        print("The flames sputter out. The goat looks almost offended, then hungry.")
        s.has_spryte    = false
        s.has_empty_can = true
        s.fire_out      = true
        util.pause()
        s.current = "hungry_goat"
        return
      else
        util.bad("You have nothing to pour.")
      end
    elseif cmd == "pass" then
      print("You try to squeeze past. The goat HEADBUTTS you back down the escalator.")
      util.pause()
      s.current = "escalator"
      return
    elseif cmd == "back" then
      s.current = "escalator"
      return
    else
      util.bad("You can " .. util.keyword("pour") .. " (if you have a SPRYTE), try to "
               .. util.keyword("pass") .. ", or go " .. util.keyword("back") .. ".")
    end
  end
end
