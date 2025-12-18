-- mad_takes.lua
-- A Mad Takes game (Old MacDonald Had a Farm)

local shell = require("shell")

-- Get words from user
shell.foreground(shell.YELLOW)
print("Enter an animal:")
shell.reset()
local animal = io.read()

shell.foreground(shell.YELLOW)
print("Enter a sound that animal makes:")
shell.reset()
local sound = io.read()

-- Display the result
print()
shell.foreground(shell.GREEN)
print("Here's your song!")
print()

shell.foreground(shell.WHITE)
print("Old MacDonald had a farm, E-I-E-I-O!")
print("And on his farm he had a " .. animal .. ", E-I-E-I-O!")
print("With a " .. sound .. "-" .. sound .. " here,")
print("And a " .. sound .. "-" .. sound .. " there,")
print("Here a " .. sound .. ", there a " .. sound .. ",")
print("Everywhere a " .. sound .. "-" .. sound .. "!")
print("Old MacDonald had a farm, E-I-E-I-O!")

shell.reset()
