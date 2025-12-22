-- stars.lua
-- Parallax starfield background

local canvas = require("canvas")

---@class Star
---@field x number X position
---@field y number Y position
---@field size number Size in pixels (1-4)
---@field speed number Scroll speed in pixels per second
---@field brightness number Color brightness (0-255)

---@class Stars
---@field list Star[] Active stars
---@field count number Number of stars to maintain
local Stars = {
    list = {},
    count = 80
}

-- Store screen dimensions for star generation
local screen_w = 800
local screen_h = 600

---Generate a random star with size-based parallax properties
---@param y? number Optional Y position (nil for random)
---@return Star star The generated star
local function generate_star(y)
    -- Random size from 1 to 4 pixels
    local size = math.random(1, 4)

    -- Larger stars are closer, so they move faster (parallax effect)
    -- Size 1 = 20-40 speed, Size 4 = 80-160 speed
    local base_speed = size * 20
    local speed = base_speed + math.random(0, base_speed)

    -- Larger stars are brighter (closer = more visible)
    -- Size 1 = dim (100-140), Size 4 = bright (220-255)
    local min_brightness = 80 + (size * 30)
    local max_brightness = math.min(255, min_brightness + 40)
    local brightness = math.random(min_brightness, max_brightness)

    return {
        x = math.random(0, screen_w),
        y = y or math.random(0, screen_h),
        size = size,
        speed = speed,
        brightness = brightness
    }
end

---Initialize the starfield with random stars
---@param width number Screen width in pixels
---@param height number Screen height in pixels
function Stars.reset(width, height)
    screen_w = width
    screen_h = height
    Stars.list = {}
    for i = 1, Stars.count do
        table.insert(Stars.list, generate_star())
    end
end

---Update star positions and respawn stars that scroll off screen
---@param dt number Delta time in seconds
---@param width number Screen width in pixels
---@param height number Screen height in pixels
function Stars.update(dt, width, height)
    screen_w = width
    screen_h = height

    for i, star in ipairs(Stars.list) do
        star.y = star.y + star.speed * dt

        -- Respawn star at top when it goes off screen
        if star.y > screen_h then
            Stars.list[i] = generate_star(-star.size)
        end
    end
end

---Draw all stars
function Stars.draw()
    for _, star in ipairs(Stars.list) do
        canvas.set_color(star.brightness, star.brightness, star.brightness)
        canvas.fill_rect(star.x, star.y, star.size, star.size)
    end
end

return Stars
