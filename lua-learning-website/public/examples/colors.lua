-- colors.lua
-- Demonstrates shell library terminal colors

local shell = require("shell")

-- Print text in different foreground colors
shell.foreground(shell.RED)
print("This text is red!")

shell.foreground(shell.GREEN)
print("This text is green!")

shell.foreground(shell.BLUE)
print("This text is blue!")

shell.foreground(shell.YELLOW)
print("This text is yellow!")

shell.foreground(shell.MAGENTA)
print("This text is magenta!")

shell.foreground(shell.CYAN)
print("This text is cyan!")

-- Reset to default colors
shell.reset()
print("Back to normal colors!")

-- You can also set background colors
shell.background(shell.BLUE)
shell.foreground(shell.WHITE)
print("White text on blue background!")

shell.reset()
print("All done!")
