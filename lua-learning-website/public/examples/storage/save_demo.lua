-- storage/save_demo.lua
-- Demonstrates the localStorage API for persistent data storage

local canvas = require("canvas")
local localstorage = require("localstorage")

-- Game state that we'll persist
local score = 0
local high_score = 0
local games_played = 0
local player_name = "Player"

-- UI state
local message = ""
local message_timer = 0

-- Load saved data on startup
local function load_saved_data()
    -- Load high score
    local saved_high = localstorage.get_item("demo_high_score")
    if saved_high then
        high_score = tonumber(saved_high) or 0
    end

    -- Load games played
    local saved_games = localstorage.get_item("demo_games_played")
    if saved_games then
        games_played = tonumber(saved_games) or 0
    end

    -- Load player name
    local saved_name = localstorage.get_item("demo_player_name")
    if saved_name and saved_name ~= "" then
        player_name = saved_name
    end

    message = "Data loaded!"
    message_timer = 2
end

-- Save current game data
local function save_data()
    local success, err = localstorage.set_item("demo_high_score", tostring(high_score))
    if not success then
        message = "Save failed: " .. (err or "unknown error")
        message_timer = 3
        return
    end

    localstorage.set_item("demo_games_played", tostring(games_played))
    localstorage.set_item("demo_player_name", player_name)

    message = "Game saved!"
    message_timer = 2
end

-- Clear all saved data
local function clear_data()
    localstorage.remove_item("demo_high_score")
    localstorage.remove_item("demo_games_played")
    localstorage.remove_item("demo_player_name")

    high_score = 0
    games_played = 0
    player_name = "Player"

    message = "Data cleared!"
    message_timer = 2
end

-- Simple game logic - click circles to score points
local circles = {}
local game_active = false
local game_time = 0
local GAME_DURATION = 10 -- seconds

local function spawn_circle()
    table.insert(circles, {
        x = math.random(50, 750),
        y = math.random(150, 500),
        radius = math.random(20, 40),
        color = { math.random(100, 255), math.random(100, 255), math.random(100, 255) }
    })
end

local function start_game()
    game_active = true
    game_time = GAME_DURATION
    score = 0
    circles = {}
    games_played = games_played + 1

    -- Spawn initial circles
    for _ = 1, 5 do
        spawn_circle()
    end
end

local function end_game()
    game_active = false
    if score > high_score then
        high_score = score
        message = "New high score: " .. score .. "!"
    else
        message = "Game over! Score: " .. score
    end
    message_timer = 3
    save_data() -- Auto-save after each game
end

local function update()
    local dt = canvas.get_delta()

    -- Update message timer
    if message_timer > 0 then
        message_timer = message_timer - dt
    end

    if game_active then
        game_time = game_time - dt
        if game_time <= 0 then
            end_game()
            return
        end

        -- Check for clicks on circles
        if canvas.is_mouse_pressed(0) then
            local mx, my = canvas.get_mouse_x(), canvas.get_mouse_y()
            for i = #circles, 1, -1 do
                local c = circles[i]
                local dx = mx - c.x
                local dy = my - c.y
                if dx * dx + dy * dy <= c.radius * c.radius then
                    score = score + 10
                    table.remove(circles, i)
                    spawn_circle()
                    spawn_circle() -- Spawn extra to increase difficulty
                    break
                end
            end
        end

        -- Randomly spawn new circles
        if math.random() < 0.02 then
            spawn_circle()
        end
    else
        -- Menu controls
        if canvas.is_key_pressed(canvas.keys.SPACE) then
            start_game()
        elseif canvas.is_key_pressed(canvas.keys.C) then
            clear_data()
        elseif canvas.is_key_pressed(canvas.keys.S) then
            save_data()
        end
    end
end

local function draw()
    canvas.clear()

    -- Background
    canvas.set_color(30, 30, 50)
    canvas.fill_rect(0, 0, 800, 600)

    if game_active then
        -- Draw circles
        for _, c in ipairs(circles) do
            canvas.set_color(c.color[1], c.color[2], c.color[3])
            canvas.fill_circle(c.x, c.y, c.radius)
            canvas.set_color(255, 255, 255)
            canvas.draw_circle(c.x, c.y, c.radius)
        end

        -- Draw game UI
        canvas.set_color(255, 255, 255)
        canvas.draw_text(10, 10, "Score: " .. score, { font_size = 24 })
        canvas.draw_text(10, 40, "Time: " .. string.format("%.1f", game_time), { font_size = 24 })
        canvas.draw_text(10, 70, "High Score: " .. high_score, { font_size = 18 })

        -- Instructions
        canvas.set_color(200, 200, 200)
        canvas.draw_text(10, 570, "Click the circles to score points!", { font_size = 16 })
    else
        -- Draw menu
        canvas.set_color(255, 255, 100)
        canvas.draw_text(250, 100, "LocalStorage Demo", { font_size = 32 })

        canvas.set_color(255, 255, 255)
        canvas.draw_text(200, 180, "Player: " .. player_name, { font_size = 24 })
        canvas.draw_text(200, 220, "High Score: " .. high_score, { font_size = 24 })
        canvas.draw_text(200, 260, "Games Played: " .. games_played, { font_size = 24 })

        -- Storage info
        local remaining = localstorage.get_remaining_space()
        local remaining_kb = math.floor(remaining / 1024)
        canvas.set_color(150, 150, 150)
        canvas.draw_text(200, 310, "Storage remaining: " .. remaining_kb .. " KB", { font_size = 18 })

        -- Controls
        canvas.set_color(100, 255, 100)
        canvas.draw_text(200, 380, "[SPACE] Start Game", { font_size = 20 })
        canvas.set_color(100, 200, 255)
        canvas.draw_text(200, 410, "[S] Save Data", { font_size = 20 })
        canvas.set_color(255, 100, 100)
        canvas.draw_text(200, 440, "[C] Clear Saved Data", { font_size = 20 })

        -- How it works
        canvas.set_color(200, 200, 200)
        canvas.draw_text(200, 500, "Your progress is automatically saved after each game!", { font_size = 16 })
        canvas.draw_text(200, 520, "Close and reopen this page - your data persists!", { font_size = 16 })
    end

    -- Display message
    if message_timer > 0 then
        canvas.set_color(0, 0, 0, 0.7)
        canvas.fill_rect(250, 550, 300, 40)
        canvas.set_color(255, 255, 100)
        canvas.draw_text(260, 560, message, { font_size = 18 })
    end
end

local function game_loop()
    update()
    draw()
end

-- Initialize
canvas.set_size(800, 600)
load_saved_data()
canvas.tick(game_loop)
canvas.start()
