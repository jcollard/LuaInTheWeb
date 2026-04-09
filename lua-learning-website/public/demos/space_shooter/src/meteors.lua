-- meteors.lua
-- Meteor obstacle management

local canvas = require("canvas")

---@class Meteor
---@field x number X position (center)
---@field y number Y position (center)
---@field speed number Vertical movement speed in pixels per second
---@field velocity_x number Horizontal movement speed in pixels per second
---@field size number Width and height of this meteor
---@field angle number Current rotation angle in radians
---@field spin number Rotation speed in radians per second

---@class Meteors
---@field list Meteor[] Active meteors
---@field spawn_timer number Time since last spawn
---@field spawn_interval number Seconds between spawns
---@field min_size number Minimum meteor size
---@field max_size number Maximum meteor size
---@field min_break_size number Minimum size before meteor is destroyed
local Meteors = {
    list = {},
    spawn_timer = 0,
    spawn_interval = 2.0,
    min_size = 30,
    max_size = 80,
    min_break_size = 20  -- Meteors smaller than this are destroyed when hit
}

---Reset all meteors and spawn timer
function Meteors.reset()
    Meteors.list = {}
    Meteors.spawn_timer = 0
end

---Spawn a new meteor at a random X position with random size
---@param screen_width number Screen width in pixels
function Meteors.spawn(screen_width)
    local size = math.random(Meteors.min_size, Meteors.max_size)
    -- Larger meteors move slower, smaller ones move faster
    local speed = 150 - (size - Meteors.min_size) * 1.5 + math.random(0, 50)
    -- Random spin direction and speed (larger = slower spin)
    local spin = (math.random() * 2 - 1) * (3 / (size / 30))
    table.insert(Meteors.list, {
        x = math.random(50, screen_width - 50),
        y = -size,
        speed = speed,
        velocity_x = 0,  -- No horizontal movement for spawned meteors
        size = size,
        angle = math.random() * math.pi * 2,  -- Random starting angle
        spin = spin
    })
end

---Spawn meteor fragments when a meteor is destroyed
---@param meteor Meteor The meteor that was hit
function Meteors.break_meteor(meteor)
    -- Don't break if too small - just destroy
    if meteor.size < Meteors.min_break_size then
        return
    end

    -- Create 2-3 smaller fragments
    local num_fragments = math.random(2, 3)
    local new_size = meteor.size * 0.5  -- Each fragment is half the size

    for i = 1, num_fragments do
        -- Spread fragments horizontally
        local spread_direction = (i - 1) / (num_fragments - 1) * 2 - 1  -- -1 to 1
        local velocity_x = spread_direction * math.random(80, 150)

        -- Fragments spin faster than parents
        local spin = (math.random() * 2 - 1) * (5 / (new_size / 20))

        table.insert(Meteors.list, {
            x = meteor.x,
            y = meteor.y,
            speed = meteor.speed + math.random(20, 50),  -- Slightly faster
            velocity_x = velocity_x,
            size = new_size,
            angle = math.random() * math.pi * 2,
            spin = spin
        })
    end
end

---Update spawn timer and spawn meteors when ready
---@param dt number Delta time in seconds
---@param screen_width number Screen width in pixels
function Meteors.update_spawner(dt, screen_width)
    Meteors.spawn_timer = Meteors.spawn_timer + dt
    if Meteors.spawn_timer > Meteors.spawn_interval then
        Meteors.spawn(screen_width)
        Meteors.spawn_timer = 0
    end
end

---Update all meteor positions and remove off-screen meteors
---@param dt number Delta time in seconds
---@param screen_width number Screen width in pixels
---@param screen_height number Screen height in pixels
function Meteors.update(dt, screen_width, screen_height)
    Meteors.update_spawner(dt, screen_width)

    for i = #Meteors.list, 1, -1 do
        local meteor = Meteors.list[i]

        -- Update position
        meteor.y = meteor.y + meteor.speed * dt
        meteor.x = meteor.x + meteor.velocity_x * dt

        -- Update rotation
        meteor.angle = meteor.angle + meteor.spin * dt

        -- Remove if off screen (bottom, or sides for fragments)
        if meteor.y > screen_height + 50 or
           meteor.x < -50 or
           meteor.x > screen_width + 50 then
            table.remove(Meteors.list, i)
        end
    end
end

---Draw all meteors with rotation
function Meteors.draw()
    for _, meteor in ipairs(Meteors.list) do
        local half = meteor.size / 2

        -- Use transformation stack for rotation
        canvas.save()
        canvas.translate(meteor.x, meteor.y)
        canvas.rotate(meteor.angle)
        canvas.draw_image("meteor", -half, -half, meteor.size, meteor.size)
        canvas.restore()
    end
end

---Get meteor bounding box for collision detection
---@param meteor Meteor The meteor to get bounds for
---@return number x Top-left X
---@return number y Top-left Y
---@return number w Width
---@return number h Height
function Meteors.get_bounds(meteor)
    local half = meteor.size / 2
    return meteor.x - half, meteor.y - half, meteor.size, meteor.size
end

---Remove a meteor by index
---@param index number Index of meteor to remove
function Meteors.remove(index)
    table.remove(Meteors.list, index)
end

return Meteors
