-- main.lua
-- Entry point for THE FLAMING GOAT.
-- Run this inside the Adventures in Lua IDE (the `shell` module is web-only).

local shell = require("shell")
local state = require("state")
local util  = require("util")

-- Load every room module. Each file returns a single function
-- that takes the shared state table `s` and updates it.
local subway       = require("rooms.subway")
local platform     = require("rooms.platform")
local machine      = require("rooms.machine")
local escalator    = require("rooms.escalator")
local flaming_goat = require("rooms.flaming_goat")
local hungry_goat  = require("rooms.hungry_goat")

local s = state.new()

util.title()

-- Main game loop: keep calling whichever room the player is currently in,
-- until the game is over.
while not s.game_over do
  if s.current == "subway" then
    subway(s)
  elseif s.current == "platform" then
    platform(s)
  elseif s.current == "machine" then
    machine(s)
  elseif s.current == "escalator" then
    escalator(s)
  elseif s.current == "flaming_goat" then
    flaming_goat(s)
  elseif s.current == "hungry_goat" then
    hungry_goat(s)
  else
    print("Unknown room: " .. s.current)
    s.game_over = true
  end
end

if s.won then
  util.win()
else
  util.game_over("You missed your stop. The train never comes back.")
end

shell.reset()
