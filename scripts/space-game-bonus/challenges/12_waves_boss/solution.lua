-- ============================================================
-- Space Shooter — Bonus 12: Waves & a Boss
-- Clear wave after wave, and face a boss every third wave!
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

-- Enemy ships
local enemies = {}
local enemy_w = 60
local enemy_h = 54
local enemy_speed = 60
local enemy_spawn_timer = 0
local enemy_spawn_interval = 5.0

-- Enemy lasers
local enemy_lasers = {}
local enemy_laser_speed = 300

-- Waves
local wave = 0
local wave_state = "banner"   -- "banner" or "fighting"
local banner_timer = 0
local BANNER_TIME = 2.0
local wave_meteors_left = 0
local wave_enemies_left = 0

-- Boss (nil when there is no boss on screen)
local boss = nil
local boss_w = 200
local boss_h = 160
local boss_speed = 120
local BOSS_Y = 60
local BOSS_HP = 30
local BOSS_FIRE_INTERVAL = 1.2

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
canvas.assets.load_image("enemy", "enemy.png")
canvas.assets.load_image("enemy_laser", "enemy_laser.png")
canvas.assets.load_image("boss", "boss.png")

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
-- SPAWN ENEMY
-- ============================================================

local function spawn_enemy()
    local start_x = math.random(80, SCREEN_W - enemy_w - 80)
    local enemy = {
        x = start_x,
        y = -enemy_h,
        start_x = start_x,
        t = 0,
        hp = 2,
        fire_timer = math.random(10, 20) / 10
    }
    table.insert(enemies, enemy)
end

-- ============================================================
-- SPAWN ENEMY LASER
-- ============================================================

local function spawn_enemy_laser(x, y, vx)
    local laser = {
        x = x,
        y = y,
        vx = vx
    }
    table.insert(enemy_lasers, laser)
end

-- ============================================================
-- SPAWN BOSS
-- ============================================================

local function spawn_boss()
    boss = {
        x = (SCREEN_W - boss_w) / 2,
        y = -boss_h,
        vx = boss_speed,
        hp = BOSS_HP,
        max_hp = BOSS_HP,
        fire_timer = BOSS_FIRE_INTERVAL
    }
end

-- ============================================================
-- START WAVE
-- ============================================================

local function start_wave()
    wave = wave + 1
    wave_state = "banner"
    banner_timer = BANNER_TIME
    spawn_timer = 0
    enemy_spawn_timer = 0
    if wave % 3 == 0 then
        -- Boss wave: just the boss
        wave_meteors_left = 0
        wave_enemies_left = 0
        spawn_boss()
    else
        wave_meteors_left = 3 + wave * 2
        wave_enemies_left = wave
    end
end

start_wave()

-- ============================================================
-- RESET GAME
-- ============================================================

local function reset_game()
    ship_x = 370
    ship_y = 500
    lasers = {}
    meteors = {}
    spawn_timer = 0
    enemies = {}
    enemy_lasers = {}
    enemy_spawn_timer = 0
    boss = nil
    wave = 0
    start_wave()
    score = 0
    game_over = false
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

    -- Ship movement
    if canvas.is_key_down(canvas.keys.LEFT) then ship_x = ship_x - ship_speed * dt end
    if canvas.is_key_down(canvas.keys.RIGHT) then ship_x = ship_x + ship_speed * dt end
    if canvas.is_key_down(canvas.keys.UP) then ship_y = ship_y - ship_speed * dt end
    if canvas.is_key_down(canvas.keys.DOWN) then ship_y = ship_y + ship_speed * dt end

    -- Fire laser
    if canvas.is_key_pressed(canvas.keys.SPACE) then
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

    -- Wave banner: count down, then start fighting
    if wave_state == "banner" then
        banner_timer = banner_timer - dt
        if banner_timer <= 0 then
            wave_state = "fighting"
        end
    end

    -- Spawn meteors and enemies only while fighting, until the wave runs out
    if wave_state == "fighting" then
        spawn_timer = spawn_timer + dt
        if spawn_timer >= spawn_interval and wave_meteors_left > 0 then
            spawn_meteor()
            wave_meteors_left = wave_meteors_left - 1
            spawn_timer = 0
        end

        enemy_spawn_timer = enemy_spawn_timer + dt
        if enemy_spawn_timer >= enemy_spawn_interval and wave_enemies_left > 0 then
            spawn_enemy()
            wave_enemies_left = wave_enemies_left - 1
            enemy_spawn_timer = 0
        end
    end

    -- Move meteors and remove off-screen ones
    for i = #meteors, 1, -1 do
        meteors[i].y = meteors[i].y + meteor_speed * dt
        if meteors[i].y > SCREEN_H then
            table.remove(meteors, i)
        end
    end

    -- Move enemies, let them fire, and remove off-screen ones
    for i = #enemies, 1, -1 do
        local enemy = enemies[i]
        enemy.t = enemy.t + dt
        enemy.y = enemy.y + enemy_speed * dt
        enemy.x = enemy.start_x + math.sin(enemy.t * 2) * 80

        enemy.fire_timer = enemy.fire_timer - dt
        if enemy.fire_timer <= 0 then
            spawn_enemy_laser(enemy.x + enemy_w / 2 - laser_w / 2, enemy.y + enemy_h, 0)
            enemy.fire_timer = math.random(10, 20) / 10
        end

        if enemy.y > SCREEN_H then
            table.remove(enemies, i)
        end
    end

    -- Move the boss: fly in from the top, then slide side to side and fire
    if boss ~= nil then
        if boss.y < BOSS_Y then
            boss.y = boss.y + 80 * dt
        else
            boss.x = boss.x + boss.vx * dt
            if boss.x < 0 then
                boss.x = 0
                boss.vx = boss_speed
            elseif boss.x + boss_w > SCREEN_W then
                boss.x = SCREEN_W - boss_w
                boss.vx = -boss_speed
            end

            boss.fire_timer = boss.fire_timer - dt
            if boss.fire_timer <= 0 then
                local gun_x = boss.x + boss_w / 2 - laser_w / 2
                local gun_y = boss.y + boss_h - 20
                spawn_enemy_laser(gun_x, gun_y, -150)
                spawn_enemy_laser(gun_x, gun_y, 0)
                spawn_enemy_laser(gun_x, gun_y, 150)
                boss.fire_timer = BOSS_FIRE_INTERVAL
            end
        end
    end

    -- Move enemy lasers and remove off-screen ones
    for i = #enemy_lasers, 1, -1 do
        enemy_lasers[i].x = enemy_lasers[i].x + enemy_lasers[i].vx * dt
        enemy_lasers[i].y = enemy_lasers[i].y + enemy_laser_speed * dt
        if enemy_lasers[i].y > SCREEN_H then
            table.remove(enemy_lasers, i)
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

    -- Laser vs enemy collision
    for i = #lasers, 1, -1 do
        for j = #enemies, 1, -1 do
            if check_collision(lasers[i].x, lasers[i].y, laser_w, laser_h,
                               enemies[j].x, enemies[j].y, enemy_w, enemy_h) then
                table.remove(lasers, i)
                enemies[j].hp = enemies[j].hp - 1
                if enemies[j].hp <= 0 then
                    table.remove(enemies, j)
                    score = score + 5
                end
                break
            end
        end
    end

    -- Laser vs boss collision
    if boss ~= nil then
        for i = #lasers, 1, -1 do
            if check_collision(lasers[i].x, lasers[i].y, laser_w, laser_h,
                               boss.x, boss.y, boss_w, boss_h) then
                table.remove(lasers, i)
                boss.hp = boss.hp - 1
            end
        end
        if boss.hp <= 0 then
            boss = nil
            score = score + 50
        end
    end

    -- Next wave when everything is spawned and cleared
    if wave_state == "fighting"
       and wave_meteors_left == 0 and wave_enemies_left == 0
       and #meteors == 0 and #enemies == 0 and boss == nil then
        start_wave()
    end

    -- Ship vs meteor collision
    for i, meteor in ipairs(meteors) do
        if check_collision(ship_x, ship_y, ship_w, ship_h,
                           meteor.x, meteor.y, meteor_w, meteor_h) then
            game_over = true
            return
        end
    end

    -- Ship vs enemy collision
    for i, enemy in ipairs(enemies) do
        if check_collision(ship_x, ship_y, ship_w, ship_h,
                           enemy.x, enemy.y, enemy_w, enemy_h) then
            game_over = true
            return
        end
    end

    -- Ship vs enemy laser collision
    for i, laser in ipairs(enemy_lasers) do
        if check_collision(ship_x, ship_y, ship_w, ship_h,
                           laser.x, laser.y, laser_w, laser_h) then
            game_over = true
            return
        end
    end

    -- Ship vs boss collision
    if boss ~= nil and check_collision(ship_x, ship_y, ship_w, ship_h,
                                       boss.x, boss.y, boss_w, boss_h) then
        game_over = true
        return
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

    -- Enemy lasers
    for i, laser in ipairs(enemy_lasers) do
        canvas.draw_image("enemy_laser", laser.x, laser.y, laser_w, laser_h)
    end

    -- Enemies
    for i, enemy in ipairs(enemies) do
        canvas.draw_image("enemy", enemy.x, enemy.y, enemy_w, enemy_h)
    end

    -- Boss
    if boss ~= nil then
        canvas.draw_image("boss", boss.x, boss.y, boss_w, boss_h)
    end

    -- Ship
    canvas.draw_image("ship", ship_x, ship_y, ship_w, ship_h)

    -- HUD
    canvas.set_color(255, 255, 255)
    canvas.set_font_size(16)
    canvas.draw_text(10, 10, "Score: " .. score)
    canvas.draw_text(10, 30, "Wave: " .. wave)
    canvas.draw_text(10, 50, "Arrow keys: Move | SPACE: Shoot")

    -- Boss health bar
    if boss ~= nil then
        local bar_w = 300
        local bar_x = (SCREEN_W - bar_w) / 2
        canvas.set_color(60, 60, 60)
        canvas.fill_rect(bar_x, 15, bar_w, 14)
        canvas.set_color(220, 40, 40)
        canvas.fill_rect(bar_x, 15, bar_w * boss.hp / boss.max_hp, 14)
    end

    -- Wave banner
    if wave_state == "banner" and not game_over then
        canvas.set_font_size(48)
        canvas.set_color(255, 220, 80)
        local banner = "WAVE " .. wave
        if boss ~= nil then
            banner = "BOSS WAVE!"
        end
        local banner_w = canvas.get_text_width(banner)
        canvas.draw_text((SCREEN_W - banner_w) / 2, SCREEN_H / 2 - 24, banner)
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
