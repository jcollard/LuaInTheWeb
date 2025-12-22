-- player.lua
-- Player ship management

local canvas = require("canvas")

---@class Player
---@field x number X position (center of ship)
---@field y number Y position (center of ship)
---@field speed number Movement speed in pixels per second
---@field scale number Size multiplier for the ship sprite
---@field tilt number Current tilt angle in radians (for visual rotation)
---@field moving_left boolean Whether player is moving left this frame
---@field moving_right boolean Whether player is moving right this frame
local Player = {
    x = 400,
    y = 500,
    speed = 300,
    scale = 0.6,
    tilt = 0,
    moving_left = false,
    moving_right = false
}

---Reset player to starting position
---@param screen_width number Screen width in pixels
---@param screen_height number Screen height in pixels
function Player.reset(screen_width, screen_height)
    Player.x = screen_width / 2
    Player.y = screen_height - 100
    Player.tilt = 0
    Player.moving_left = false
    Player.moving_right = false
end

---Handle player input for movement
---@param dt number Delta time in seconds
function Player.handle_input(dt)
    Player.moving_left = canvas.is_key_down(canvas.keys.LEFT) or canvas.is_key_down(canvas.keys.A)
    Player.moving_right = canvas.is_key_down(canvas.keys.RIGHT) or canvas.is_key_down(canvas.keys.D)
    local moving_up = canvas.is_key_down(canvas.keys.UP) or canvas.is_key_down(canvas.keys.W)
    local moving_down = canvas.is_key_down(canvas.keys.DOWN) or canvas.is_key_down(canvas.keys.S)

    if Player.moving_left then
        Player.x = Player.x - Player.speed * dt
    end
    if Player.moving_right then
        Player.x = Player.x + Player.speed * dt
    end
    if moving_up then
        Player.y = Player.y - Player.speed * dt
    end
    if moving_down then
        Player.y = Player.y + Player.speed * dt
    end
end

---Update player state (keep in bounds and animate tilt)
---@param dt number Delta time in seconds
---@param screen_width number Screen width in pixels
---@param screen_height number Screen height in pixels
function Player.update(dt, screen_width, screen_height)
    local ship_w = canvas.assets.get_width("ship") * Player.scale
    local ship_h = canvas.assets.get_height("ship") * Player.scale

    -- Keep player in horizontal bounds
    if Player.x < ship_w / 2 then
        Player.x = ship_w / 2
    end
    if Player.x > screen_width - ship_w / 2 then
        Player.x = screen_width - ship_w / 2
    end

    -- Keep player in vertical bounds
    if Player.y < ship_h / 2 then
        Player.y = ship_h / 2
    end
    if Player.y > screen_height - ship_h / 2 then
        Player.y = screen_height - ship_h / 2
    end

    -- Smoothly animate tilt based on movement direction
    local target_tilt = 0
    if Player.moving_left then
        target_tilt = -0.15  -- ~8 degrees left
    elseif Player.moving_right then
        target_tilt = 0.15   -- ~8 degrees right
    end
    Player.tilt = Player.tilt + (target_tilt - Player.tilt) * 10 * dt
end

---Draw the player ship with tilt rotation
function Player.draw()
    local ship_w = canvas.assets.get_width("ship") * Player.scale
    local ship_h = canvas.assets.get_height("ship") * Player.scale

    -- Use transformation stack for rotation
    canvas.save()
    canvas.translate(Player.x, Player.y)
    canvas.rotate(Player.tilt)
    canvas.draw_image("ship", -ship_w / 2, -ship_h / 2, ship_w, ship_h)
    canvas.restore()
end

---Get player bounding box for collision detection
---@return number x Top-left X
---@return number y Top-left Y
---@return number w Width
---@return number h Height
function Player.get_bounds()
    local w = canvas.assets.get_width("ship") * Player.scale
    local h = canvas.assets.get_height("ship") * Player.scale
    return Player.x - w / 2, Player.y - h / 2, w, h
end

return Player
