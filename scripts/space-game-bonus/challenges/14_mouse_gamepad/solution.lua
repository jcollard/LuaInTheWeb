-- ============================================================
-- Space Shooter — Bonus 14: Mouse & Gamepad Controls
-- Fly with the keyboard, the mouse, or a gamepad: input is just numbers!
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

-- Gamepad stick values smaller than this are ignored
local DEAD_ZONE = 0.2

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

-- Load images
canvas.assets.load_image("ship", "blue_ship.png")
canvas.assets.load_image("laser", "laser.png")
canvas.assets.load_image("meteor", "meteor.png")

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

local function spawn_laser(x, y)
    local laser = {
        x = x,
        y = y
    }
    table.insert(lasers, laser)
end

-- ============================================================
-- MOVE TOWARD
-- ============================================================

-- Move current toward target, but never by more than max_step
local function move_toward(current, target, max_step)
    if current < target then
        return math.min(current + max_step, target)
    else
        return math.max(current - max_step, target)
    end
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
    init_stars()
end

-- ============================================================
-- USER INPUT
-- ============================================================

local function user_input()
    local dt = canvas.get_delta()
    local has_pad = canvas.is_gamepad_connected(1)

    -- Restart on ENTER (or START on a gamepad) when game is over
    if game_over then
        if canvas.is_key_pressed(canvas.keys.ENTER)
           or (has_pad and canvas.is_gamepad_button_pressed(1, canvas.buttons.START)) then
            reset_game()
        end
        return
    end

    -- Ship movement
    if canvas.is_key_down(canvas.keys.LEFT) then ship_x = ship_x - ship_speed * dt end
    if canvas.is_key_down(canvas.keys.RIGHT) then ship_x = ship_x + ship_speed * dt end
    if canvas.is_key_down(canvas.keys.UP) then ship_y = ship_y - ship_speed * dt end
    if canvas.is_key_down(canvas.keys.DOWN) then ship_y = ship_y + ship_speed * dt end

    -- Mouse: hold the left button to fly toward the pointer
    if canvas.is_mouse_down(0) then
        local target_x = canvas.get_mouse_x() - ship_w / 2
        local target_y = canvas.get_mouse_y() - ship_h / 2
        ship_x = move_toward(ship_x, target_x, ship_speed * dt)
        ship_y = move_toward(ship_y, target_y, ship_speed * dt)
    end

    -- Gamepad: left stick moves the ship
    if has_pad then
        local stick_x = canvas.get_gamepad_axis(1, canvas.axes.LEFT_STICK_X)
        local stick_y = canvas.get_gamepad_axis(1, canvas.axes.LEFT_STICK_Y)
        if math.abs(stick_x) > DEAD_ZONE then ship_x = ship_x + stick_x * ship_speed * dt end
        if math.abs(stick_y) > DEAD_ZONE then ship_y = ship_y + stick_y * ship_speed * dt end
    end

    -- Fire laser: SPACE, left click, or the gamepad's bottom button
    local fire = canvas.is_key_pressed(canvas.keys.SPACE) or canvas.is_mouse_pressed(0)
    if has_pad and canvas.is_gamepad_button_pressed(1, canvas.buttons.SOUTH) then
        fire = true
    end
    if fire then
        spawn_laser(ship_x + ship_w / 2 - laser_w / 2, ship_y)
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
                table.remove(meteors, j)
                table.remove(lasers, i)
                score = score + 1
                break
            end
        end
    end

    -- Ship vs meteor collision
    for i, meteor in ipairs(meteors) do
        if check_collision(ship_x, ship_y, ship_w, ship_h,
                           meteor.x, meteor.y, meteor_w, meteor_h) then
            game_over = true
            return
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

    -- Ship
    canvas.draw_image("ship", ship_x, ship_y, ship_w, ship_h)

    -- HUD
    canvas.set_color(255, 255, 255)
    canvas.set_font_size(16)
    canvas.draw_text(10, 10, "Score: " .. score)
    canvas.draw_text(10, 30, "Move: Arrows / Stick / Hold mouse | Shoot: SPACE / A / Click")

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
        local restart_text = "Press ENTER or START to restart"
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
