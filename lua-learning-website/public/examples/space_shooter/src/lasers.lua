-- lasers.lua
-- Laser projectile management

local canvas = require("canvas")

---@class Laser
---@field x number X position (center)
---@field y number Y position (center)

---@class Lasers
---@field list Laser[] Active laser projectiles
---@field speed number Laser movement speed in pixels per second
local Lasers = {
    list = {},
    speed = 500
}

---Reset all lasers (clear the list)
function Lasers.reset()
    Lasers.list = {}
end

---Spawn a new laser at the given position
---@param x number X position to spawn at
---@param y number Y position to spawn at
function Lasers.spawn(x, y)
    table.insert(Lasers.list, { x = x, y = y - 30 })
end

---Update all laser positions and remove off-screen lasers
---@param dt number Delta time in seconds
function Lasers.update(dt)
    for i = #Lasers.list, 1, -1 do
        Lasers.list[i].y = Lasers.list[i].y - Lasers.speed * dt
        if Lasers.list[i].y < -20 then
            table.remove(Lasers.list, i)
        end
    end
end

---Draw all lasers
function Lasers.draw()
    for _, laser in ipairs(Lasers.list) do
        canvas.draw_image("laser", laser.x - 3, laser.y - 10, 6, 20)
    end
end

---Remove a laser by index
---@param index number Index of laser to remove
function Lasers.remove(index)
    table.remove(Lasers.list, index)
end

---Get laser bounding box for collision detection
---@param laser Laser The laser to get bounds for
---@return number x Top-left X
---@return number y Top-left Y
---@return number w Width
---@return number h Height
function Lasers.get_bounds(laser)
    return laser.x - 3, laser.y - 10, 6, 20
end

return Lasers
