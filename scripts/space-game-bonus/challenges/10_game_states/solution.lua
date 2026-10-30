-- ============================================================
-- Space Shooter — Bonus 10: Game States
-- A title screen, a pause button, and one state variable to rule them all!
-- ============================================================

local canvas = require("canvas")
canvas.assets.add_path("images")
canvas.assets.add_path("fonts")
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

-- Game state: "title", "playing", "paused", or "game_over"
local state = "title"

-- Stars
local stars = {}
local STAR_COUNT = 60

-- Load images
canvas.assets.load_image("ship", "blue_ship.png")
canvas.assets.load_image("laser", "laser.png")
canvas.assets.load_image("meteor", "meteor.png")

-- Load fonts
canvas.assets.load_font("future", "kenvector_future.ttf")

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
-- MOVE STARS
-- ============================================================

local function move_stars(dt)
    for i, star in ipairs(stars) do
        star.y = star.y + star.speed * dt
        if star.y > SCREEN_H then
            star.x = math.random(0, SCREEN_W)
            star.y = -star.size
        end
    end
end

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
-- RESET GAME
-- ============================================================

local function reset_game()
    ship_x = 370
    ship_y = 500
    lasers = {}
    meteors = {}
    spawn_timer = 0
    score = 0
    init_stars()
end

-- ============================================================
-- USER INPUT
-- ============================================================

local function user_input()
    local dt = canvas.get_delta()

    if state == "title" then
        -- Start a fresh game
        if canvas.is_key_pressed(canvas.keys.ENTER) then
            reset_game()
            state = "playing"
        end

    elseif state == "playing" then
        -- Pause
        if canvas.is_key_pressed(canvas.keys.P) then
            state = "paused"
        end

        -- Ship movement
        if canvas.is_key_down(canvas.keys.LEFT) then ship_x = ship_x - ship_speed * dt end
        if canvas.is_key_down(canvas.keys.RIGHT) then ship_x = ship_x + ship_speed * dt end
        if canvas.is_key_down(canvas.keys.UP) then ship_y = ship_y - ship_speed * dt end
        if canvas.is_key_down(canvas.keys.DOWN) then ship_y = ship_y + ship_speed * dt end

        -- Fire laser
        if canvas.is_key_pressed(canvas.keys.SPACE) then
            spawn_laser(ship_x + ship_w / 2 - laser_w / 2, ship_y)
        end

    elseif state == "paused" then
        -- Unpause
        if canvas.is_key_pressed(canvas.keys.P) then
            state = "playing"
        end

    elseif state == "game_over" then
        -- Back to the title screen
        if canvas.is_key_pressed(canvas.keys.ENTER) then
            state = "title"
        end
    end
end

-- ============================================================
-- UPDATE
-- ============================================================

local function update()
    local dt = canvas.get_delta()

    -- Title screen: only the stars move
    if state == "title" then
        move_stars(dt)
        return
    end

    -- Paused or game over: nothing moves
    if state ~= "playing" then return end

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
            state = "game_over"
            return
        end
    end

    -- Move stars
    move_stars(dt)
end

-- ============================================================
-- DRAW TITLE
-- ============================================================

local function draw_title()
    -- Game name in the sci-fi font
    canvas.set_font_family("future")
    canvas.set_font_size(48)
    canvas.set_color(255, 200, 50)
    local title = "SPACE SHOOTER"
    local title_w = canvas.get_text_width(title)
    canvas.draw_text((SCREEN_W - title_w) / 2, 200, title)

    -- Everything else in the normal font
    canvas.set_font_family("monospace")
    canvas.set_font_size(24)
    canvas.set_color(255, 255, 255)
    local start_text = "Press ENTER to start"
    local start_w = canvas.get_text_width(start_text)
    canvas.draw_text((SCREEN_W - start_w) / 2, 320, start_text)

    canvas.set_font_size(16)
    canvas.set_color(180, 180, 200)
    local help_text = "Arrow keys: Move | SPACE: Shoot | P: Pause"
    local help_w = canvas.get_text_width(help_text)
    canvas.draw_text((SCREEN_W - help_w) / 2, 370, help_text)
end

-- ============================================================
-- DRAW PAUSED
-- ============================================================

local function draw_paused()
    -- See-through overlay so the frozen game shows behind it
    canvas.set_color(0, 0, 0, 120)
    canvas.fill_rect(0, 0, SCREEN_W, SCREEN_H)

    canvas.set_font_size(48)
    canvas.set_color(255, 255, 255)
    local paused_text = "PAUSED"
    local paused_w = canvas.get_text_width(paused_text)
    canvas.draw_text((SCREEN_W - paused_w) / 2, SCREEN_H / 2 - 40, paused_text)

    canvas.set_font_size(24)
    local resume_text = "Press P to resume"
    local resume_w = canvas.get_text_width(resume_text)
    canvas.draw_text((SCREEN_W - resume_w) / 2, SCREEN_H / 2 + 20, resume_text)
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

    -- Title screen: just stars and the title, no ship or HUD
    if state == "title" then
        draw_title()
        return
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
    canvas.draw_text(10, 30, "Arrow keys: Move | SPACE: Shoot | P: Pause")

    -- Paused overlay
    if state == "paused" then
        draw_paused()
    end

    -- Game over overlay
    if state == "game_over" then
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
        local restart_text = "Press ENTER to continue"
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
