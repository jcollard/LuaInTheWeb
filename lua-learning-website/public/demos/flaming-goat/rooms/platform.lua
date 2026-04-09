-- rooms/platform.lua
-- Hub room. Two landmarks: the soda machine and the escalator.

local shell = require("shell")
local util  = require("util")

return function(s)
  util.header("SUBWAY PLATFORM", shell.CYAN)

  print("The platform is eerily empty. A fluorescent light flickers overhead.")
  print("A glowing soda " .. util.keyword("machine") .. " hums to your left.")
  print("A broken " .. util.keyword("escalator") .. " rises into the darkness to your right.")

  while true do
    local cmd = util.prompt()
    if cmd == "machine" then
      s.current = "machine"
      return
    elseif cmd == "escalator" then
      s.current = "escalator"
      return
    else
      util.bad("You can go to the " .. util.keyword("machine") .. " or the "
               .. util.keyword("escalator") .. ".")
    end
  end
end
