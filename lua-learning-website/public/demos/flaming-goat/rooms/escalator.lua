-- rooms/escalator.lua
-- Base of the broken escalator. A [glint] between the steps hides a coin
-- the player must examine to pick up. Transitions to flaming_goat or
-- hungry_goat depending on state.

local shell = require("shell")
local util  = require("util")

return function(s)
  util.header("BROKEN ESCALATOR", shell.GREEN)

  print("The escalator is frozen in place. It leads up, up, up toward the exit.")
  if not s.coin_taken then
    print("Something catches your eye — a tiny " .. util.keyword("glint")
          .. " between two of the steps.")
  end

  if s.goat_gone then
    print("The path is clear. You could " .. util.keyword("climb") .. " the steps and go home.")
  elseif s.fire_out then
    print("A damp, sad-looking " .. util.keyword("goat") .. " sits halfway up the steps.")
    print("You could try to " .. util.keyword("climb") .. " past it, or approach the "
          .. util.keyword("goat") .. ".")
  else
    print("A very-much-on-fire " .. util.keyword("goat") .. " stands halfway up the steps.")
    print("You could try to " .. util.keyword("climb") .. " past it, or approach the "
          .. util.keyword("goat") .. ".")
  end
  print("You can also head " .. util.keyword("back") .. " to the platform.")

  while true do
    local cmd = util.prompt()
    if cmd == "climb" then
      if s.goat_gone then
        print("You climb the broken escalator one creaky step at a time.")
        util.pause()
        s.won = true
        s.game_over = true
        return
      else
        util.bad("The goat lowers its head and HEADBUTTS you back to the bottom.")
      end
    elseif cmd == "goat" then
      if s.fire_out then
        s.current = "hungry_goat"
      else
        s.current = "flaming_goat"
      end
      return
    elseif cmd == "back" then
      s.current = "platform"
      return
    elseif cmd == "glint" then
      if s.coin_taken then
        util.bad("There's nothing left to examine between the steps.")
      else
        print("You crouch down and pry the shiny thing loose. It's a coin!")
        print("You pocket it.")
        s.coin_taken = true
        s.has_coin   = true
      end
    else
      util.bad("You can " .. util.keyword("climb") .. ", approach the "
               .. util.keyword("goat") .. ", or go " .. util.keyword("back") .. ".")
    end
  end
end
