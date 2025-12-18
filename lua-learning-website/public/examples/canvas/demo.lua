-- canvas/demo.lua
-- Comprehensive canvas API demo

local canvas = require("canvas")

local player_x, player_y = 400, 300
local speed = 200
local clicks = 0
local key_presses = 0
local last_keys_pressed = {}

local function handle_input()
    local dt = canvas.get_delta()
    -- Keyboard: WASD movement (using canvas.keys constants)
    if
        canvas.is_key_down(canvas.keys.W) or canvas.is_key_down(canvas.keys.UP)
    then
        player_y = player_y - speed * dt
    end
    if
        canvas.is_key_down(canvas.keys.S) or canvas.is_key_down(canvas.keys.DOWN)
    then
        player_y = player_y + speed * dt
    end
    if
        canvas.is_key_down(canvas.keys.A) or canvas.is_key_down(canvas.keys.LEFT)
    then
        player_x = player_x - speed * dt
    end
    if
        canvas.is_key_down(canvas.keys.D) or canvas.is_key_down(canvas.keys.RIGHT)
    then
        player_x = player_x + speed * dt
    end

    -- Track all keys pressed this frame using get_keys_pressed()
    local pressed = canvas.get_keys_pressed()
    if #pressed > 0 then
        last_keys_pressed = pressed
        key_presses = key_presses + 1
    end

    -- Track clicks
    if canvas.is_mouse_pressed(0) then
        clicks = clicks + 1
    end
end

local function update()
    local width = canvas.get_width()
    local height = canvas.get_height()

    -- Keep player in bounds
    player_x = math.max(25, math.min(width - 25, player_x))
    player_y = math.max(25, math.min(height - 25, player_y))
end

local function draw()
    local dt = canvas.get_delta()
    local width = canvas.get_width()
    local height = canvas.get_height()
    local time = canvas.get_time()

    -- Clear screen
    canvas.clear()

    -- === Drawing Tests ===

    -- Test set_color and fill_rect
    canvas.set_color(50, 50, 80)
    canvas.fill_rect(0, 0, width, height) -- Background

    -- Test draw_rect (stroked rectangle)
    canvas.set_color(255, 255, 0)
    canvas.set_line_width(2)
    canvas.draw_rect(10, 10, 150, 100)

    -- Test fill_rect
    canvas.set_color(0, 100, 255)
    canvas.fill_rect(20, 20, 130, 80)

    -- Test draw_circle (stroked)
    canvas.set_color(255, 0, 255)
    canvas.set_line_width(3)
    canvas.draw_circle(250, 60, 40)

    -- Test fill_circle
    canvas.set_color(0, 255, 100)
    canvas.fill_circle(350, 60, 40)

    -- Test draw_line
    canvas.set_color(255, 100, 0)
    canvas.set_line_width(2)
    canvas.draw_line(400, 20, 500, 100)
    canvas.draw_line(400, 100, 500, 20)

    -- Test alpha (RGBA)
    canvas.set_color(255, 0, 0, 0.5)
    canvas.fill_rect(520, 20, 80, 80)
    canvas.set_color(0, 0, 255, 0.5)
    canvas.fill_rect(560, 40, 80, 80)

    -- Draw player
    canvas.set_color(255, 200, 0)
    canvas.fill_rect(player_x - 25, player_y - 25, 50, 50)
    canvas.set_color(255, 255, 255)
    canvas.draw_rect(player_x - 25, player_y - 25, 50, 50)

    -- === Text Tests ===
    canvas.set_color(255, 255, 255)
    canvas.draw_text(10, 140, "Canvas API Test")
    canvas.draw_text(10, 160, "Width: " .. width .. " Height: " .. height)
    canvas.draw_text(10, 180, "Time: " .. string.format("%.2f", time) .. "s")
    canvas.draw_text(10, 200, "Delta: " .. string.format("%.4f", dt) .. "s")
    canvas.draw_text(10, 220, "FPS: " .. string.format("%.0f", 1 / dt))

    -- Mouse tracking
    local mx = canvas.get_mouse_x()
    local my = canvas.get_mouse_y()

    -- Draw crosshair at mouse position
    canvas.set_color(255, 0, 0)
    canvas.set_line_width(1)
    canvas.draw_line(mx - 10, my, mx + 10, my)
    canvas.draw_line(mx, my - 10, mx, my + 10)

    -- Draw circle when mouse button held
    if canvas.is_mouse_down(0) then
        canvas.set_color(255, 0, 0, 0.5)
        canvas.fill_circle(mx, my, 20)
    end
    if canvas.is_mouse_down(2) then
        canvas.set_color(0, 255, 0, 0.5)
        canvas.fill_circle(mx, my, 20)
    end

    -- === Info Panel ===
    canvas.set_color(0, 0, 0, 0.7)
    canvas.fill_rect(10, height - 170, 320, 160)

    canvas.set_color(255, 255, 255)
    canvas.draw_text(20, height - 150, "=== Controls ===")
    canvas.draw_text(20, height - 130, "WASD/Arrows: Move yellow square")
    canvas.draw_text(20, height - 110, "Mouse: Red crosshair follows")
    canvas.draw_text(20, height - 90, "Left click: Red circle + count")
    canvas.draw_text(20, height - 70, "Right click: Green circle")
    canvas.draw_text(20, height - 50, "Clicks: " .. clicks)
    canvas.draw_text(20, height - 20, "Key Presses: " .. key_presses)

    -- Show keys currently held (using get_keys_down)
    local keys_down = canvas.get_keys_down()
    local keys_str = #keys_down > 0 and table.concat(keys_down, ", ") or "none"
    canvas.draw_text(20, height - 30, "Keys held: " .. keys_str)

    -- Show last keys pressed
    local last_str = #last_keys_pressed > 0
            and table.concat(last_keys_pressed, ", ")
        or "none"
    canvas.draw_text(350, height - 30, "Last pressed: " .. last_str)

    -- Mouse position display
    canvas.draw_text(
        350,
        height - 50,
        "Mouse: " .. math.floor(mx) .. ", " .. math.floor(my)
    )
end

function game()
    handle_input()
    update()
    draw()
end

function main()
    canvas.set_size(800, 600)
    canvas.tick(game)
    canvas.start()
end

main()
