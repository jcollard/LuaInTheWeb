-- rooms/hungry_goat.lua
-- Post-extinguishing: goat is damp and hungry. Feed it the can, then
-- sneak past while it's distracted chewing.

local shell = require("shell")
local util  = require("util")

return function(s)
  util.header("HUNGRY GOAT", shell.PINK)

  shell.foreground(shell.WHITE)
  print("          /|__|\\")
  print("         ( -  - )   *rumble*")
  print("          \\ __ /")
  shell.reset()
  print("")

  if s.goat_fed then
    print("The goat is blissfully CHOMPING on the aluminum can, eyes closed.")
    print("It's completely distracted. You could " .. util.keyword("pass") .. " it now.")
  else
    print("The goat is soggy, steaming faintly, and clearly STARVING.")
    print("Its stomach growls like a distant subway train.")
    if s.has_empty_can then
      print("You could " .. util.keyword("feed") .. " it the empty SPRYTE can — goats eat anything, right?")
    else
      print("You have nothing to offer. Maybe step " .. util.keyword("back") .. " and think.")
    end
  end
  print("You can always go " .. util.keyword("back") .. " down the escalator.")

  while true do
    local cmd = util.prompt()
    if cmd == "feed" then
      if s.goat_fed then
        util.bad("The goat is already busy chewing. Don't push your luck.")
      elseif s.has_empty_can then
        print("You offer the can. The goat's eyes light up and it CHOMPS down,")
        print("lost in aluminum bliss. This is your chance.")
        s.has_empty_can = false
        s.goat_fed      = true
        util.pause()
        return
      else
        util.bad("You have nothing to feed it.")
      end
    elseif cmd == "pass" then
      if s.goat_fed then
        print("You tiptoe past the chewing goat. It doesn't even look up.")
        print("The escalator stretches up toward freedom.")
        s.goat_gone = true
        util.pause()
        s.current = "escalator"
        return
      else
        util.bad("The goat is still watching you hungrily. Passing now is a bad idea.")
      end
    elseif cmd == "back" then
      s.current = "escalator"
      return
    else
      if s.goat_fed then
        util.bad("You can " .. util.keyword("pass") .. " the goat or go "
                 .. util.keyword("back") .. ".")
      else
        util.bad("You can " .. util.keyword("feed") .. " the goat (if you have something) or go "
                 .. util.keyword("back") .. ".")
      end
    end
  end
end
