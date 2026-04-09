-- state.lua
-- Shared game state for the Escape Room demo.
-- Every room receives this table and mutates it to drive the game forward.

local state = {}

function state.new()
  return {
    current       = "subway",  -- name of the active room (key into rooms table)
    coin_taken    = false,     -- true once the escalator glint has been examined
    has_coin      = false,     -- the coin itself (spent at the SPRYTE machine)
    has_spryte    = false,     -- full SPRYTE can bought from the machine
    has_empty_can = false,     -- leftover can after pouring on the goat
    fire_out      = false,     -- goat's flames extinguished
    goat_fed      = false,     -- goat is distracted chewing the can
    goat_gone     = false,     -- goat has wandered off — escalator is clear
    game_over     = false,     -- ends the main loop
    won           = false,     -- decides WIN vs GAME OVER banner
  }
end

return state
