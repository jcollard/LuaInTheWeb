-- rooms/subway.lua
-- Opening room. The player has to actually get off the train.

local shell = require("shell")
local util  = require("util")

return function(s)
  util.header("SUBWAY CAR", shell.YELLOW)

  print("The subway shudders to a halt. A crackly announcer voice says:")
  shell.foreground(shell.GRAY)
  print('    "NOW ARRIVING: your stop. Probably. We think."')
  shell.reset()
  print("")
  print("The doors hiss open. A cold platform waits outside.")
  print("Do you " .. util.keyword("exit") .. " the train, or "
        .. util.keyword("stay") .. " in your nice warm seat?")

  while true do
    local cmd = util.prompt()
    if cmd == "exit" then
      print("You heave yourself up and step onto the platform.")
      util.pause()
      s.current = "platform"
      return
    elseif cmd == "stay" then
      print("You settle in. The doors slam shut. The train lurches onward...")
      util.pause()
      s.game_over = true
      s.won = false
      return
    else
      util.bad("You can only " .. util.keyword("exit") .. " or "
               .. util.keyword("stay") .. ".")
    end
  end
end
