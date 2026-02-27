-- ============================================================
-- Space Shooter
-- Your mission: build a space shooter, one step at a time!
-- Open guides/part_0.md to get started.
-- ============================================================

local canvas = require("canvas")
canvas.assets.add_path("images")
canvas.set_size(800, 600)

local SCREEN_W = 800
local SCREEN_H = 600

-- ============================================================
-- GAME STATE
-- ============================================================

local ship_x = 370
local ship_y = 500
local ship_w = 60
local ship_h = 48
local ship_speed = 300

-- ============================================================
-- USER INPUT
-- ============================================================

local function user_input()
    local dt = canvas.get_delta()

    if canvas.is_key_down(canvas.keys.LEFT) then
        ship_x = ship_x - ship_speed * dt
    end
    if canvas.is_key_down(canvas.keys.RIGHT) then
        ship_x = ship_x + ship_speed * dt
    end
end

-- ============================================================
-- UPDATE
-- ============================================================

local function update()
    ship_x = math.max(0, math.min(SCREEN_W - ship_w, ship_x))
    ship_y = math.max(0, math.min(SCREEN_H - ship_h, ship_y))
end

-- ============================================================
-- DRAW
-- ============================================================

local function draw()
    canvas.clear()

    -- Dark space background
    canvas.set_color(10, 10, 30)
    canvas.fill_rect(0, 0, SCREEN_W, SCREEN_H)

    -- HUD
    canvas.set_color(255, 255, 255)
    canvas.set_font_size(16)
    canvas.draw_text(10, 10, "Arrow keys: Move")
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
