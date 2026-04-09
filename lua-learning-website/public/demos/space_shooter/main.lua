-- main.lua
-- Space Shooter - Main entry point
-- Images by Kenney (www.kenney.nl) - CC0 License

local canvas = require("canvas")
local Player = require("src.player")
local Lasers = require("src.lasers")
local EnemyLasers = require("src.enemy_lasers")
local Enemies = require("src.enemies")
local Meteors = require("src.meteors")
local Stars = require("src.stars")
local Collision = require("src.collision")
local GameState = require("src.game_state")

-- Initialize module dependencies
Enemies.init(EnemyLasers)

-- =============================================================================
-- Asset Registration
-- =============================================================================

-- Register asset directories
canvas.assets.add_path("src/images")
canvas.assets.add_path("src/fonts")

-- Load images
canvas.assets.load_image("ship", "blue_ship.png")
canvas.assets.load_image("enemy", "enemy_ship.png")
canvas.assets.load_image("meteor", "meteor.png")
canvas.assets.load_image("laser", "laser.png")

-- Load fonts
canvas.assets.load_font("font_large", "12px-TimesNewPixel.ttf")
canvas.assets.load_font("font_small", "9px-Habbo.ttf")

-- Screen dimensions (set after canvas.set_size)
local SCREEN_WIDTH = 800
local SCREEN_HEIGHT = 600

-- =============================================================================
-- Game Reset
-- =============================================================================

---Reset all game state to start a new game
local function reset_game()
    Player.reset(SCREEN_WIDTH, SCREEN_HEIGHT)
    Lasers.reset()
    EnemyLasers.reset()
    Enemies.reset()
    Meteors.reset()
    Stars.reset(SCREEN_WIDTH, SCREEN_HEIGHT)
    GameState.reset()
end

-- =============================================================================
-- Core Game Functions
-- =============================================================================

---Handle all user input
---@param dt number Delta time in seconds
local function user_input(dt)
    -- Title screen input
    if GameState.title_screen then
        if canvas.is_key_pressed(canvas.keys.ENTER) then
            reset_game()
        end
        return
    end

    -- Game over input
    if GameState.game_over then
        if canvas.is_key_pressed(canvas.keys.ENTER) then
            GameState.go_to_title()
        end
        return
    end

    -- Player movement
    Player.handle_input(dt)

    -- Fire laser (space or left mouse click)
    if canvas.is_key_pressed(canvas.keys.SPACE) or canvas.is_mouse_pressed(0) then
        Lasers.spawn(Player.x, Player.y)
    end
end

---Update all game objects and check collisions
---@param dt number Delta time in seconds
local function update(dt)
    -- Stars always update (for visual effect on all screens)
    Stars.update(dt, SCREEN_WIDTH, SCREEN_HEIGHT)

    -- Skip game updates on title screen or game over
    if GameState.title_screen or GameState.game_over then
        return
    end

    -- Update entities
    Player.update(dt, SCREEN_WIDTH, SCREEN_HEIGHT)
    Lasers.update(dt)
    EnemyLasers.update(dt, SCREEN_HEIGHT)
    Enemies.update(dt, Player.x, SCREEN_WIDTH, SCREEN_HEIGHT)
    Meteors.update(dt, SCREEN_WIDTH, SCREEN_HEIGHT)

    -- Check laser vs enemy collisions
    for li = #Lasers.list, 1, -1 do
        local laser = Lasers.list[li]
        local lx, ly, lw, lh = Lasers.get_bounds(laser)

        for ei = #Enemies.list, 1, -1 do
            local enemy = Enemies.list[ei]
            local ex, ey, ew, eh = Enemies.get_bounds(enemy)

            if Collision.check_aabb(lx, ly, lw, lh, ex, ey, ew, eh) then
                Lasers.remove(li)
                Enemies.remove(ei)
                GameState.add_score(100)
                break
            end
        end
    end

    -- Check laser vs meteor collisions
    for li = #Lasers.list, 1, -1 do
        local laser = Lasers.list[li]
        local lx, ly, lw, lh = Lasers.get_bounds(laser)

        for mi = #Meteors.list, 1, -1 do
            local meteor = Meteors.list[mi]
            local mx, my, mw, mh = Meteors.get_bounds(meteor)

            if Collision.check_aabb(lx, ly, lw, lh, mx, my, mw, mh) then
                Lasers.remove(li)
                -- Break meteor into fragments (or destroy if too small)
                Meteors.break_meteor(meteor)
                Meteors.remove(mi)
                -- Score based on meteor size
                GameState.add_score(math.floor(meteor.size))
                break
            end
        end
    end

    -- Check player vs enemy collisions
    local px, py, pw, ph = Player.get_bounds()

    for _, enemy in ipairs(Enemies.list) do
        local ex, ey, ew, eh = Enemies.get_bounds(enemy)
        if Collision.check_aabb(px, py, pw, ph, ex, ey, ew, eh) then
            GameState.set_game_over()
            return
        end
    end

    -- Check player vs meteor collisions
    for _, meteor in ipairs(Meteors.list) do
        local mx, my, mw, mh = Meteors.get_bounds(meteor)
        if Collision.check_aabb(px, py, pw, ph, mx, my, mw, mh) then
            GameState.set_game_over()
            return
        end
    end

    -- Check player vs enemy laser collisions
    for _, laser in ipairs(EnemyLasers.list) do
        local lx, ly, lw, lh = EnemyLasers.get_bounds(laser)
        if Collision.check_aabb(px, py, pw, ph, lx, ly, lw, lh) then
            GameState.set_game_over()
            return
        end
    end
end

---Draw all game objects and UI
local function draw()
    canvas.clear()

    -- Background (dark space)
    canvas.set_color(10, 10, 30)
    canvas.fill_rect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT)

    -- Parallax starfield (always visible)
    Stars.draw()

    -- Title screen
    if GameState.title_screen then
        -- Game title
        canvas.set_font_family("font_large")
        canvas.set_font_size(64)
        canvas.set_color(100, 200, 255)
        local title = "Space Flyer"
        local title_w = canvas.get_text_width(title)
        canvas.draw_text((SCREEN_WIDTH - title_w) / 2, SCREEN_HEIGHT / 2 - 80, title)

        -- Flickering "Press Enter to Start" text
        local time = canvas.get_time()
        local flicker = math.sin(time * 5) * 0.5 + 0.5  -- Oscillates 0 to 1
        local alpha = math.floor(100 + flicker * 155)   -- Alpha from 100 to 255

        canvas.set_font_family("font_small")
        canvas.set_font_size(24)
        canvas.set_color(255, 255, 255, alpha)
        local start_text = "Press Enter to Start"
        local start_w = canvas.get_text_width(start_text)
        canvas.draw_text((SCREEN_WIDTH - start_w) / 2, SCREEN_HEIGHT / 2 + 40, start_text)
        return
    end

    -- Draw game entities
    Meteors.draw()
    Enemies.draw()
    EnemyLasers.draw()
    Lasers.draw()
    Player.draw()

    -- HUD (small font)
    canvas.set_font_family("font_small")
    canvas.set_font_size(20)
    canvas.set_color(255, 255, 255)
    canvas.draw_text(10, 10, "Score: " .. GameState.score)
    canvas.draw_text(10, 30, "WASD/Arrows: Move | SPACE/Click: Shoot")

    -- Game over screen
    if GameState.game_over then
        -- Semi-transparent overlay box
        local box_w, box_h = 400, 200
        local box_x = (SCREEN_WIDTH - box_w) / 2
        local box_y = (SCREEN_HEIGHT - box_h) / 2
        canvas.set_color(0, 0, 0, 180)
        canvas.fill_rect(box_x, box_y, box_w, box_h)

        -- "GAME OVER" title (large font, centered)
        canvas.set_font_family("font_large")
        canvas.set_font_size(48)
        canvas.set_color(255, 0, 0)
        local title = "GAME OVER"
        local title_w = canvas.get_text_width(title)
        canvas.draw_text((SCREEN_WIDTH - title_w) / 2, box_y + 40, title)

        -- Score and restart text (small font, centered)
        canvas.set_font_family("font_small")
        canvas.set_font_size(20)
        canvas.set_color(255, 255, 255)
        local score_text = "Final Score: " .. GameState.score
        local score_w = canvas.get_text_width(score_text)
        canvas.draw_text((SCREEN_WIDTH - score_w) / 2, box_y + 100, score_text)

        local restart_text = "Press ENTER to continue"
        local restart_w = canvas.get_text_width(restart_text)
        canvas.draw_text((SCREEN_WIDTH - restart_w) / 2, box_y + 140, restart_text)
    end
end

-- =============================================================================
-- Game Loop
-- =============================================================================

---Main game loop callback (called every frame by canvas.tick)
local function game()
    local dt = canvas.get_delta()
    user_input(dt)
    update(dt)
    draw()
end

-- =============================================================================
-- Entry Point
-- =============================================================================

---Initialize and start the game
local function main()
    canvas.set_size(SCREEN_WIDTH, SCREEN_HEIGHT)
    Stars.reset(SCREEN_WIDTH, SCREEN_HEIGHT)  -- Initialize starfield before game starts
    Player.reset(SCREEN_WIDTH, SCREEN_HEIGHT)  -- Initialize player position
    canvas.tick(game)
    canvas.start()
end

-- Run the game
main()
