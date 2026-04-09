-- enemy_lasers.lua
-- Enemy laser projectile management

local canvas = require("canvas")

---@class EnemyLaser
---@field x number X position (center)
---@field y number Y position (center)

---@class EnemyLasers
---@field list EnemyLaser[] Active enemy laser projectiles
---@field speed number Laser movement speed in pixels per second
local EnemyLasers = {
    list = {},
    speed = 350
}

---Reset all enemy lasers (clear the list)
function EnemyLasers.reset()
    EnemyLasers.list = {}
end

---Spawn a new enemy laser at the given position
---@param x number X position to spawn at
---@param y number Y position to spawn at
function EnemyLasers.spawn(x, y)
    table.insert(EnemyLasers.list, { x = x, y = y + 30 })
end

---Update all enemy laser positions and remove off-screen lasers
---@param dt number Delta time in seconds
---@param screen_height number Screen height in pixels
function EnemyLasers.update(dt, screen_height)
    for i = #EnemyLasers.list, 1, -1 do
        EnemyLasers.list[i].y = EnemyLasers.list[i].y + EnemyLasers.speed * dt
        if EnemyLasers.list[i].y > screen_height + 20 then
            table.remove(EnemyLasers.list, i)
        end
    end
end

---Draw all enemy lasers (red tint)
function EnemyLasers.draw()
    canvas.set_color(255, 80, 80)
    for _, laser in ipairs(EnemyLasers.list) do
        canvas.fill_rect(laser.x - 3, laser.y - 10, 6, 20)
    end
end

---Remove an enemy laser by index
---@param index number Index of laser to remove
function EnemyLasers.remove(index)
    table.remove(EnemyLasers.list, index)
end

---Get enemy laser bounding box for collision detection
---@param laser EnemyLaser The laser to get bounds for
---@return number x Top-left X
---@return number y Top-left Y
---@return number w Width
---@return number h Height
function EnemyLasers.get_bounds(laser)
    return laser.x - 3, laser.y - 10, 6, 20
end

return EnemyLasers
