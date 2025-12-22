-- enemies.lua
-- Enemy ship management

local canvas = require("canvas")

---@class Enemy
---@field x number X position (center)
---@field y number Y position (center)
---@field speed_y number Vertical movement speed in pixels per second
---@field speed_x number Horizontal movement speed in pixels per second
---@field direction number Horizontal direction (-1 = left, 1 = right)
---@field fire_cooldown number Time until enemy can fire again

---@class Enemies
---@field list Enemy[] Active enemy ships
---@field spawn_timer number Time since last spawn
---@field spawn_interval number Seconds between spawns
---@field size number Width and height of enemy hitbox
---@field fire_interval number Seconds between shots
---@field alignment_threshold number How close X must be to player to fire
local Enemies = {
    list = {},
    spawn_timer = 0,
    spawn_interval = 1.5,
    size = 50,
    fire_interval = 1.0,
    alignment_threshold = 30
}

-- Reference to EnemyLasers module (set via init)
local EnemyLasers = nil

---Initialize with reference to EnemyLasers module
---@param enemy_lasers_module table The EnemyLasers module
function Enemies.init(enemy_lasers_module)
    EnemyLasers = enemy_lasers_module
end

---Reset all enemies and spawn timer
function Enemies.reset()
    Enemies.list = {}
    Enemies.spawn_timer = 0
end

---Spawn a new enemy that moves horizontally
---@param screen_width number Screen width in pixels
function Enemies.spawn(screen_width)
    -- Randomly choose to enter from left or right side
    local from_left = math.random() > 0.5
    local direction = from_left and 1 or -1
    local start_x = from_left and -25 or (screen_width + 25)

    table.insert(Enemies.list, {
        x = start_x,
        y = math.random(60, 200),
        speed_y = math.random(20, 50),
        speed_x = math.random(100, 180),
        direction = direction,
        fire_cooldown = math.random() * Enemies.fire_interval
    })
end

---Update spawn timer and spawn enemies when ready
---@param dt number Delta time in seconds
---@param screen_width number Screen width in pixels
function Enemies.update_spawner(dt, screen_width)
    Enemies.spawn_timer = Enemies.spawn_timer + dt
    if Enemies.spawn_timer > Enemies.spawn_interval then
        Enemies.spawn(screen_width)
        Enemies.spawn_timer = 0
    end
end

---Update all enemy positions, handle firing, and remove off-screen enemies
---@param dt number Delta time in seconds
---@param player_x number Player's X position for targeting
---@param screen_width number Screen width in pixels
---@param screen_height number Screen height in pixels
function Enemies.update(dt, player_x, screen_width, screen_height)
    Enemies.update_spawner(dt, screen_width)

    for i = #Enemies.list, 1, -1 do
        local enemy = Enemies.list[i]

        -- Move horizontally
        enemy.x = enemy.x + enemy.speed_x * enemy.direction * dt

        -- Slow downward drift
        enemy.y = enemy.y + enemy.speed_y * dt

        -- Update fire cooldown
        enemy.fire_cooldown = enemy.fire_cooldown - dt

        -- Fire if aligned with player and cooldown ready
        if EnemyLasers and enemy.fire_cooldown <= 0 then
            if math.abs(enemy.x - player_x) < Enemies.alignment_threshold then
                EnemyLasers.spawn(enemy.x, enemy.y)
                enemy.fire_cooldown = Enemies.fire_interval
            end
        end

        -- Remove if off screen (left, right, or bottom)
        if enemy.x < -50 or enemy.x > screen_width + 50 or enemy.y > screen_height + 50 then
            table.remove(Enemies.list, i)
        end
    end
end

---Draw all enemies
function Enemies.draw()
    local half = Enemies.size / 2
    for _, enemy in ipairs(Enemies.list) do
        canvas.draw_image("enemy", enemy.x - half, enemy.y - half, Enemies.size, Enemies.size)
    end
end

---Remove an enemy by index
---@param index number Index of enemy to remove
function Enemies.remove(index)
    table.remove(Enemies.list, index)
end

---Get enemy bounding box for collision detection
---@param enemy Enemy The enemy to get bounds for
---@return number x Top-left X
---@return number y Top-left Y
---@return number w Width
---@return number h Height
function Enemies.get_bounds(enemy)
    local half = Enemies.size / 2
    return enemy.x - half, enemy.y - half, Enemies.size, Enemies.size
end

return Enemies
