-- rooms/machine.lua
-- The SPRYTE vending machine. Needs a coin.

local shell = require("shell")
local util  = require("util")

return function(s)
  util.header("SPRYTE MACHINE", shell.MAGENTA)

  shell.foreground(shell.MAGENTA)
  print("    .-----------------.")
  print("    |   S P R Y T E   |")
  print("    |  ~fizzy~fresh~  |")
  print("    | [ INSERT COIN ] |")
  print("    '-----------------'")
  shell.reset()
  print("")

  print("A brand-new SPRYTE machine glows hot pink and teal.")
  if s.has_spryte then
    print("You already have a cold can of SPRYTE rattling in your pocket.")
  elseif s.has_empty_can then
    print("The machine's slot is empty. You already used your SPRYTE.")
  else
    print("You could try to " .. util.keyword("buy") .. " a SPRYTE.")
  end
  print("Or you can head " .. util.keyword("back") .. " to the platform.")

  while true do
    local cmd = util.prompt()
    if cmd == "buy" then
      if s.has_spryte or s.has_empty_can then
        util.bad("The machine beeps. \"ONE PER CUSTOMER\", it whines.")
      elseif not s.has_coin then
        shell.foreground(shell.RED)
        print("  >> INSERT COIN <<")
        shell.reset()
        util.bad("You don't have a coin. The machine is unimpressed.")
      else
        print("You feed the coin in. A can CLUNKS out, ice-cold.")
        s.has_coin   = false
        s.has_spryte = true
        util.pause()
        return
      end
    elseif cmd == "back" then
      s.current = "platform"
      return
    else
      util.bad("You can " .. util.keyword("buy") .. " a SPRYTE or go "
               .. util.keyword("back") .. ".")
    end
  end
end
