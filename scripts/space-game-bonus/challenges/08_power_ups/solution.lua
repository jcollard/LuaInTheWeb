-- ============================================================
-- Space Shooter — Bonus 8: Power-Ups
-- Grab falling power-ups for triple shot, a shield, or extra speed!
-- ============================================================

local canvas = require("canvas")
canvas.assets.add_path("images")
canvas.set_size(800, 600)

local SCREEN_W = 800
local SCREEN_H = 600

-- ============================================================
-- GAME STATE
-- ============================================================

-- Ship
local ship_x = 370
local ship_y = 500
local ship_w = 60
local ship_h = 48
local ship_speed = 300

-- Lasers
local lasers = {}
local laser_w = 9
local laser_h = 30
local laser_speed = 500

-- Meteors
local meteors = {}
local meteor_w = 48
local meteor_h = 48
local meteor_speed = 150

-- Spawn timer
local spawn_timer = 0
local spawn_interval = 2.0

-- Score
local score = 0

-- Game over
local game_over = false

-- Stars
local stars = {}
local STAR_COUNT = 60

-- Power-ups
local powerups = {}
local powerup_size = 34
local powerup_speed = 100
local POWERUP_CHANCE = 5       -- 1 in 5 destroyed meteors drops one
local POWERUP_DURATION = 5     -- seconds
local POWERUP_KINDS = {"triple", "shield", "speed"}
local triple_timer = 0
local speed_timer = 0
local shield_active = false

-- Load images
canvas.assets.load_image("ship", "blue_ship.png")
canvas.assets.load_image("laser", "laser.png")
canvas.assets.load_image("meteor", "meteor.png")
canvas.assets.load_image("powerup_triple", "powerup_triple.png")
canvas.assets.load_image("powerup_shield", "powerup_shield.png")
canvas.assets.load_image("powerup_speed", "powerup_speed.png")
canvas.assets.load_image("shield", "shield.png")

-- ============================================================
-- GENERATE STAR
-- ============================================================

local function generate_star()
    local size = math.random(1, 3)
    local speed = size * 30
    local brightness = size * 60 + 40
    return {
        x = math.random(0, SCREEN_W),
        y = math.random(0, SCREEN_H),
        size = size,
        speed = speed,
        brightness = brightness
    }
end

-- ============================================================
-- INIT STARS
-- ============================================================

local function init_stars()
    stars = {}
    for i = 1, STAR_COUNT do
        table.insert(stars, generate_star())
    end
end

init_stars()

-- ============================================================
-- COLLISION DETECTION
-- ============================================================

local function check_collision(a_x, a_y, a_w, a_h, b_x, b_y, b_w, b_h)
    return a_x < b_x + b_w
       and a_x + a_w > b_x
       and a_y < b_y + b_h
       and a_y + a_h > b_y
end

-- ============================================================
-- SPAWN METEOR
-- ============================================================

local function spawn_meteor()
    local meteor = {
        x = math.random(0, SCREEN_W - meteor_w),
        y = -meteor_h
    }
    table.insert(meteors, meteor)
end

-- ============================================================
-- SPAWN LASER
-- ============================================================

local function spawn_laser(x, y, vx)
    local laser = {
        x = x,
        y = y,
        vx = vx or 0
    }
    table.insert(lasers, laser)
end

-- ============================================================
-- SPAWN POWER-UP
-- ============================================================

local function spawn_powerup(x, y)
    local powerup = {
        x = x,
        y = y,
        kind = POWERUP_KINDS[math.random(1, #POWERUP_KINDS)]
    }
    table.insert(powerups, powerup)
end

-- ============================================================
-- RESET GAME
-- ============================================================

local function reset_game()
    ship_x = 370
    ship_y = 500
    lasers = {}
    meteors = {}
    spawn_timer = 0
    score = 0
    game_over = false
    powerups = {}
    triple_timer = 0
    speed_timer = 0
    shield_active = false
    init_stars()
end

-- ============================================================
-- USER INPUT
-- ============================================================

local function user_input()
    local dt = canvas.get_delta()

    -- Restart on ENTER when game is over
    if game_over then
        if canvas.is_key_pressed(canvas.keys.ENTER) then
            reset_game()
        end
        return
    end

    -- Speed boost doubles the ship's speed
    local speed = ship_speed
    if speed_timer > 0 then
        speed = ship_speed * 2
    end

    -- Ship movement
    if canvas.is_key_down(canvas.keys.LEFT) then ship_x = ship_x - speed * dt end
    if canvas.is_key_down(canvas.keys.RIGHT) then ship_x = ship_x + speed * dt end
    if canvas.is_key_down(canvas.keys.UP) then ship_y = ship_y - speed * dt end
    if canvas.is_key_down(canvas.keys.DOWN) then ship_y = ship_y + speed * dt end

    -- Fire laser (three spreading lasers with triple shot)
    if canvas.is_key_pressed(canvas.keys.SPACE) then
        local laser_x = ship_x + ship_w / 2 - laser_w / 2
        spawn_laser(laser_x, ship_y)
        if triple_timer > 0 then
            spawn_laser(laser_x, ship_y, -150)
            spawn_laser(laser_x, ship_y, 150)
        end
    end
end

-- ============================================================
-- UPDATE
-- ============================================================

local function update()
    if game_over then return end

    local dt = canvas.get_delta()

    -- Clamp ship to screen
    ship_x = math.max(0, math.min(SCREEN_W - ship_w, ship_x))
    ship_y = math.max(0, math.min(SCREEN_H - ship_h, ship_y))

    -- Move lasers and remove off-screen ones
    for i = #lasers, 1, -1 do
        lasers[i].x = lasers[i].x + lasers[i].vx * dt
        lasers[i].y = lasers[i].y - laser_speed * dt
        if lasers[i].y + laser_h < 0 then
            table.remove(lasers, i)
        end
    end

    -- Spawn timer
    spawn_timer = spawn_timer + dt
    if spawn_timer >= spawn_interval then
        spawn_meteor()
        spawn_timer = 0
    end

    -- Move meteors and remove off-screen ones
    for i = #meteors, 1, -1 do
        meteors[i].y = meteors[i].y + meteor_speed * dt
        if meteors[i].y > SCREEN_H then
            table.remove(meteors, i)
        end
    end

    -- Laser vs meteor collision
    for i = #lasers, 1, -1 do
        for j = #meteors, 1, -1 do
            if check_collision(lasers[i].x, lasers[i].y, laser_w, laser_h,
                               meteors[j].x, meteors[j].y, meteor_w, meteor_h) then
                -- Sometimes drop a power-up where the meteor was
                if math.random(1, POWERUP_CHANCE) == 1 then
                    spawn_powerup(meteors[j].x + meteor_w / 2 - powerup_size / 2,
                                  meteors[j].y + meteor_h / 2 - powerup_size / 2)
                end
                table.remove(meteors, j)
                table.remove(lasers, i)
                score = score + 1
                break
            end
        end
    end

    -- Power-up timers count down to 0
    triple_timer = math.max(0, triple_timer - dt)
    speed_timer = math.max(0, speed_timer - dt)

    -- Move power-ups, collect them, or remove off-screen ones
    for i = #powerups, 1, -1 do
        local p = powerups[i]
        p.y = p.y + powerup_speed * dt
        if check_collision(ship_x, ship_y, ship_w, ship_h,
                           p.x, p.y, powerup_size, powerup_size) then
            if p.kind == "triple" then
                triple_timer = POWERUP_DURATION
            elseif p.kind == "speed" then
                speed_timer = POWERUP_DURATION
            elseif p.kind == "shield" then
                shield_active = true
            end
            table.remove(powerups, i)
        elseif p.y > SCREEN_H then
            table.remove(powerups, i)
        end
    end

    -- Ship vs meteor collision (the shield saves you once)
    for i = #meteors, 1, -1 do
        if check_collision(ship_x, ship_y, ship_w, ship_h,
                           meteors[i].x, meteors[i].y, meteor_w, meteor_h) then
            if shield_active then
                shield_active = false
                table.remove(meteors, i)
            else
                game_over = true
                return
            end
        end
    end

    -- Move stars
    for i, star in ipairs(stars) do
        star.y = star.y + star.speed * dt
        if star.y > SCREEN_H then
            star.x = math.random(0, SCREEN_W)
            star.y = -star.size
        end
    end
end

-- ============================================================
-- DRAW
-- ============================================================

local function draw()
    canvas.clear()

    -- Dark space background
    canvas.set_color(10, 10, 30)
    canvas.fill_rect(0, 0, SCREEN_W, SCREEN_H)

    -- Stars
    for i, star in ipairs(stars) do
        canvas.set_color(star.brightness, star.brightness, star.brightness)
        canvas.fill_rect(star.x, star.y, star.size, star.size)
    end

    -- Lasers
    for i, laser in ipairs(lasers) do
        canvas.draw_image("laser", laser.x, laser.y, laser_w, laser_h)
    end

    -- Meteors
    for i, meteor in ipairs(meteors) do
        canvas.draw_image("meteor", meteor.x, meteor.y, meteor_w, meteor_h)
    end

    -- Power-ups ("powerup_" .. "triple" is "powerup_triple")
    for i, p in ipairs(powerups) do
        canvas.draw_image("powerup_" .. p.kind, p.x, p.y, powerup_size, powerup_size)
    end

    -- Ship
    canvas.draw_image("ship", ship_x, ship_y, ship_w, ship_h)

    -- Shield bubble, centered on the ship
    if shield_active then
        local shield_w = ship_w + 20
        local shield_h = ship_h + 20
        canvas.draw_image("shield", ship_x + ship_w / 2 - shield_w / 2,
                          ship_y + ship_h / 2 - shield_h / 2, shield_w, shield_h)
    end

    -- HUD
    canvas.set_color(255, 255, 255)
    canvas.set_font_size(16)
    canvas.draw_text(10, 10, "Score: " .. score)
    canvas.draw_text(10, 30, "Arrow keys: Move | SPACE: Shoot")

    -- Active power-ups, one line each
    local hud_y = 50
    if triple_timer > 0 then
        canvas.draw_text(10, hud_y, "Triple Shot: " .. string.format("%.1f", triple_timer))
        hud_y = hud_y + 20
    end
    if speed_timer > 0 then
        canvas.draw_text(10, hud_y, "Speed: " .. string.format("%.1f", speed_timer))
        hud_y = hud_y + 20
    end
    if shield_active then
        canvas.draw_text(10, hud_y, "Shield: ON")
    end

    -- Game over overlay
    if game_over then
        -- Dark overlay
        canvas.set_color(0, 0, 0, 180)
        canvas.fill_rect(0, 0, SCREEN_W, SCREEN_H)

        -- "GAME OVER" text (red)
        canvas.set_font_size(48)
        canvas.set_color(255, 50, 50)
        local title = "GAME OVER"
        local title_w = canvas.get_text_width(title)
        canvas.draw_text((SCREEN_W - title_w) / 2, SCREEN_H / 2 - 60, title)

        -- Score text (white)
        canvas.set_font_size(24)
        canvas.set_color(255, 255, 255)
        local score_text = "Score: " .. score
        local score_w = canvas.get_text_width(score_text)
        canvas.draw_text((SCREEN_W - score_w) / 2, SCREEN_H / 2, score_text)

        -- Restart prompt (white)
        local restart_text = "Press ENTER to restart"
        local restart_w = canvas.get_text_width(restart_text)
        canvas.draw_text((SCREEN_W - restart_w) / 2, SCREEN_H / 2 + 40, restart_text)
    end
end

-- ============================================================
-- GAME LOOP
-- ============================================================

local function game()
    user_input()
    update()
    draw()
end

canvas.tick(game)
canvas.start()
