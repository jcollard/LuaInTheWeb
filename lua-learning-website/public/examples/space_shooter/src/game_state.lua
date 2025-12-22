-- game_state.lua
-- Global game state management

---@class GameState
---@field score number Current player score
---@field game_over boolean Whether the game has ended
---@field title_screen boolean Whether on title screen
local GameState = {
    score = 0,
    game_over = false,
    title_screen = true
}

---Reset the game state to initial values
function GameState.reset()
    GameState.score = 0
    GameState.game_over = false
    GameState.title_screen = false
end

---Add points to the current score
---@param points number Points to add
function GameState.add_score(points)
    GameState.score = GameState.score + points
end

---End the game
function GameState.set_game_over()
    GameState.game_over = true
end

---Return to title screen
function GameState.go_to_title()
    GameState.score = 0
    GameState.game_over = false
    GameState.title_screen = true
end

return GameState
