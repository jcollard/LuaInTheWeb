-- canvas/gamepad/demo.lua
-- Gamepad input demonstration
-- Shows connected gamepads, button states, and axis values

local canvas = require("canvas")

-- Display constants
local WIDTH, HEIGHT = 800, 600
local GAMEPAD_WIDTH = 350
local GAMEPAD_HEIGHT = 250
local GAMEPAD_MARGIN = 25

-- Colors
local BG_COLOR = {30, 30, 40}
local GAMEPAD_BG = {50, 50, 60}
local CONNECTED_COLOR = {0, 200, 100}
local DISCONNECTED_COLOR = {150, 50, 50}
local BUTTON_OFF = {80, 80, 90}
local BUTTON_ON = {255, 200, 50}
local AXIS_BG = {60, 60, 70}
local AXIS_FG = {100, 200, 255}
local TEXT_COLOR = {255, 255, 255}
local TEXT_DIM = {150, 150, 150}

-- Draw a single gamepad visualization
local function draw_gamepad(index, x, y)
    local connected = canvas.is_gamepad_connected(index)

    -- Background panel
    if connected then
        canvas.set_color(CONNECTED_COLOR[1], CONNECTED_COLOR[2], CONNECTED_COLOR[3], 0.1)
    else
        canvas.set_color(DISCONNECTED_COLOR[1], DISCONNECTED_COLOR[2], DISCONNECTED_COLOR[3], 0.1)
    end
    canvas.fill_rect(x, y, GAMEPAD_WIDTH, GAMEPAD_HEIGHT)

    -- Border
    if connected then
        canvas.set_color(CONNECTED_COLOR[1], CONNECTED_COLOR[2], CONNECTED_COLOR[3])
    else
        canvas.set_color(DISCONNECTED_COLOR[1], DISCONNECTED_COLOR[2], DISCONNECTED_COLOR[3])
    end
    canvas.set_line_width(2)
    canvas.draw_rect(x, y, GAMEPAD_WIDTH, GAMEPAD_HEIGHT)

    -- Gamepad number
    canvas.set_color(TEXT_COLOR[1], TEXT_COLOR[2], TEXT_COLOR[3])
    canvas.draw_text(x + 10, y + 20, "Gamepad " .. index)

    -- Connection status
    if connected then
        canvas.set_color(CONNECTED_COLOR[1], CONNECTED_COLOR[2], CONNECTED_COLOR[3])
        canvas.draw_text(x + 100, y + 20, "Connected")
    else
        canvas.set_color(DISCONNECTED_COLOR[1], DISCONNECTED_COLOR[2], DISCONNECTED_COLOR[3])
        canvas.draw_text(x + 100, y + 20, "Not connected")
        return -- Don't draw the rest if not connected
    end

    -- === Face Buttons (ABXY / Cross-Circle-Square-Triangle) ===
    local face_x, face_y = x + 270, y + 50
    local btn_size = 25
    local btn_spacing = 30

    -- Button A/Cross (South)
    local a_pressed = canvas.get_gamepad_button(index, canvas.buttons.A) > 0
    if a_pressed then
        canvas.set_color(BUTTON_ON[1], BUTTON_ON[2], BUTTON_ON[3])
    else
        canvas.set_color(BUTTON_OFF[1], BUTTON_OFF[2], BUTTON_OFF[3])
    end
    canvas.fill_circle(face_x, face_y + btn_spacing, btn_size / 2)
    canvas.set_color(TEXT_COLOR[1], TEXT_COLOR[2], TEXT_COLOR[3])
    canvas.draw_text(face_x - 4, face_y + btn_spacing + 5, "A")

    -- Button B/Circle (East)
    local b_pressed = canvas.get_gamepad_button(index, canvas.buttons.B) > 0
    if b_pressed then
        canvas.set_color(BUTTON_ON[1], BUTTON_ON[2], BUTTON_ON[3])
    else
        canvas.set_color(BUTTON_OFF[1], BUTTON_OFF[2], BUTTON_OFF[3])
    end
    canvas.fill_circle(face_x + btn_spacing, face_y, btn_size / 2)
    canvas.set_color(TEXT_COLOR[1], TEXT_COLOR[2], TEXT_COLOR[3])
    canvas.draw_text(face_x + btn_spacing - 4, face_y + 5, "B")

    -- Button X/Square (West)
    local x_pressed = canvas.get_gamepad_button(index, canvas.buttons.X) > 0
    if x_pressed then
        canvas.set_color(BUTTON_ON[1], BUTTON_ON[2], BUTTON_ON[3])
    else
        canvas.set_color(BUTTON_OFF[1], BUTTON_OFF[2], BUTTON_OFF[3])
    end
    canvas.fill_circle(face_x - btn_spacing, face_y, btn_size / 2)
    canvas.set_color(TEXT_COLOR[1], TEXT_COLOR[2], TEXT_COLOR[3])
    canvas.draw_text(face_x - btn_spacing - 4, face_y + 5, "X")

    -- Button Y/Triangle (North)
    local y_pressed = canvas.get_gamepad_button(index, canvas.buttons.Y) > 0
    if y_pressed then
        canvas.set_color(BUTTON_ON[1], BUTTON_ON[2], BUTTON_ON[3])
    else
        canvas.set_color(BUTTON_OFF[1], BUTTON_OFF[2], BUTTON_OFF[3])
    end
    canvas.fill_circle(face_x, face_y - btn_spacing, btn_size / 2)
    canvas.set_color(TEXT_COLOR[1], TEXT_COLOR[2], TEXT_COLOR[3])
    canvas.draw_text(face_x - 4, face_y - btn_spacing + 5, "Y")

    -- === D-Pad ===
    local dpad_x, dpad_y = x + 80, y + 60
    local dpad_size = 18

    -- D-Pad Up
    local dpad_up = canvas.get_gamepad_button(index, canvas.buttons.DPAD_UP) > 0
    if dpad_up then
        canvas.set_color(BUTTON_ON[1], BUTTON_ON[2], BUTTON_ON[3])
    else
        canvas.set_color(BUTTON_OFF[1], BUTTON_OFF[2], BUTTON_OFF[3])
    end
    canvas.fill_rect(dpad_x - dpad_size / 2, dpad_y - dpad_size * 1.5, dpad_size, dpad_size)

    -- D-Pad Down
    local dpad_down = canvas.get_gamepad_button(index, canvas.buttons.DPAD_DOWN) > 0
    if dpad_down then
        canvas.set_color(BUTTON_ON[1], BUTTON_ON[2], BUTTON_ON[3])
    else
        canvas.set_color(BUTTON_OFF[1], BUTTON_OFF[2], BUTTON_OFF[3])
    end
    canvas.fill_rect(dpad_x - dpad_size / 2, dpad_y + dpad_size / 2, dpad_size, dpad_size)

    -- D-Pad Left
    local dpad_left = canvas.get_gamepad_button(index, canvas.buttons.DPAD_LEFT) > 0
    if dpad_left then
        canvas.set_color(BUTTON_ON[1], BUTTON_ON[2], BUTTON_ON[3])
    else
        canvas.set_color(BUTTON_OFF[1], BUTTON_OFF[2], BUTTON_OFF[3])
    end
    canvas.fill_rect(dpad_x - dpad_size * 1.5, dpad_y - dpad_size / 2, dpad_size, dpad_size)

    -- D-Pad Right
    local dpad_right = canvas.get_gamepad_button(index, canvas.buttons.DPAD_RIGHT) > 0
    if dpad_right then
        canvas.set_color(BUTTON_ON[1], BUTTON_ON[2], BUTTON_ON[3])
    else
        canvas.set_color(BUTTON_OFF[1], BUTTON_OFF[2], BUTTON_OFF[3])
    end
    canvas.fill_rect(dpad_x + dpad_size / 2, dpad_y - dpad_size / 2, dpad_size, dpad_size)

    -- === Shoulder Buttons (LB/RB) ===
    local shoulder_y = y + 110

    -- LB (L1)
    local lb_pressed = canvas.get_gamepad_button(index, canvas.buttons.LB) > 0
    if lb_pressed then
        canvas.set_color(BUTTON_ON[1], BUTTON_ON[2], BUTTON_ON[3])
    else
        canvas.set_color(BUTTON_OFF[1], BUTTON_OFF[2], BUTTON_OFF[3])
    end
    canvas.fill_rect(x + 30, shoulder_y, 60, 20)
    canvas.set_color(TEXT_COLOR[1], TEXT_COLOR[2], TEXT_COLOR[3])
    canvas.draw_text(x + 50, shoulder_y + 14, "LB")

    -- RB (R1)
    local rb_pressed = canvas.get_gamepad_button(index, canvas.buttons.RB) > 0
    if rb_pressed then
        canvas.set_color(BUTTON_ON[1], BUTTON_ON[2], BUTTON_ON[3])
    else
        canvas.set_color(BUTTON_OFF[1], BUTTON_OFF[2], BUTTON_OFF[3])
    end
    canvas.fill_rect(x + 260, shoulder_y, 60, 20)
    canvas.set_color(TEXT_COLOR[1], TEXT_COLOR[2], TEXT_COLOR[3])
    canvas.draw_text(x + 280, shoulder_y + 14, "RB")

    -- === Triggers (LT/RT) - Analog ===
    local trigger_y = y + 140

    -- LT (L2) - show as bar
    local lt_value = canvas.get_gamepad_button(index, canvas.buttons.LT)
    canvas.set_color(AXIS_BG[1], AXIS_BG[2], AXIS_BG[3])
    canvas.fill_rect(x + 30, trigger_y, 60, 15)
    canvas.set_color(AXIS_FG[1], AXIS_FG[2], AXIS_FG[3])
    canvas.fill_rect(x + 30, trigger_y, 60 * lt_value, 15)
    canvas.set_color(TEXT_COLOR[1], TEXT_COLOR[2], TEXT_COLOR[3])
    canvas.draw_text(x + 50, trigger_y + 12, "LT")

    -- RT (R2) - show as bar
    local rt_value = canvas.get_gamepad_button(index, canvas.buttons.RT)
    canvas.set_color(AXIS_BG[1], AXIS_BG[2], AXIS_BG[3])
    canvas.fill_rect(x + 260, trigger_y, 60, 15)
    canvas.set_color(AXIS_FG[1], AXIS_FG[2], AXIS_FG[3])
    canvas.fill_rect(x + 260, trigger_y, 60 * rt_value, 15)
    canvas.set_color(TEXT_COLOR[1], TEXT_COLOR[2], TEXT_COLOR[3])
    canvas.draw_text(x + 280, trigger_y + 12, "RT")

    -- === Analog Sticks ===
    local stick_radius = 35
    local dot_radius = 8

    -- Left Stick
    local ls_x = x + 60
    local ls_y = y + 200
    local left_x = canvas.get_gamepad_axis(index, canvas.axes.LEFT_STICK_X)
    local left_y = canvas.get_gamepad_axis(index, canvas.axes.LEFT_STICK_Y)
    local ls_pressed = canvas.get_gamepad_button(index, canvas.buttons.LEFT_STICK) > 0

    -- Background circle
    canvas.set_color(AXIS_BG[1], AXIS_BG[2], AXIS_BG[3])
    canvas.fill_circle(ls_x, ls_y, stick_radius)
    canvas.set_color(100, 100, 110)
    canvas.set_line_width(1)
    canvas.draw_circle(ls_x, ls_y, stick_radius)

    -- Stick position dot
    if ls_pressed then
        canvas.set_color(BUTTON_ON[1], BUTTON_ON[2], BUTTON_ON[3])
    else
        canvas.set_color(AXIS_FG[1], AXIS_FG[2], AXIS_FG[3])
    end
    canvas.fill_circle(ls_x + left_x * (stick_radius - dot_radius), ls_y + left_y * (stick_radius - dot_radius), dot_radius)

    canvas.set_color(TEXT_DIM[1], TEXT_DIM[2], TEXT_DIM[3])
    canvas.draw_text(ls_x - 30, ls_y + 50, string.format("%.2f, %.2f", left_x, left_y))

    -- Right Stick
    local rs_x = x + 200
    local rs_y = y + 200
    local right_x = canvas.get_gamepad_axis(index, canvas.axes.RIGHT_STICK_X)
    local right_y = canvas.get_gamepad_axis(index, canvas.axes.RIGHT_STICK_Y)
    local rs_pressed = canvas.get_gamepad_button(index, canvas.buttons.RIGHT_STICK) > 0

    -- Background circle
    canvas.set_color(AXIS_BG[1], AXIS_BG[2], AXIS_BG[3])
    canvas.fill_circle(rs_x, rs_y, stick_radius)
    canvas.set_color(100, 100, 110)
    canvas.set_line_width(1)
    canvas.draw_circle(rs_x, rs_y, stick_radius)

    -- Stick position dot
    if rs_pressed then
        canvas.set_color(BUTTON_ON[1], BUTTON_ON[2], BUTTON_ON[3])
    else
        canvas.set_color(AXIS_FG[1], AXIS_FG[2], AXIS_FG[3])
    end
    canvas.fill_circle(rs_x + right_x * (stick_radius - dot_radius), rs_y + right_y * (stick_radius - dot_radius), dot_radius)

    canvas.set_color(TEXT_DIM[1], TEXT_DIM[2], TEXT_DIM[3])
    canvas.draw_text(rs_x - 30, rs_y + 50, string.format("%.2f, %.2f", right_x, right_y))

    -- === Menu Buttons (Start/Back/Home) ===
    local menu_y = y + 50

    -- Back/Select
    local back_pressed = canvas.get_gamepad_button(index, canvas.buttons.BACK) > 0
    if back_pressed then
        canvas.set_color(BUTTON_ON[1], BUTTON_ON[2], BUTTON_ON[3])
    else
        canvas.set_color(BUTTON_OFF[1], BUTTON_OFF[2], BUTTON_OFF[3])
    end
    canvas.fill_rect(x + 140, menu_y, 30, 15)

    -- Start
    local start_pressed = canvas.get_gamepad_button(index, canvas.buttons.START) > 0
    if start_pressed then
        canvas.set_color(BUTTON_ON[1], BUTTON_ON[2], BUTTON_ON[3])
    else
        canvas.set_color(BUTTON_OFF[1], BUTTON_OFF[2], BUTTON_OFF[3])
    end
    canvas.fill_rect(x + 180, menu_y, 30, 15)
end

local function draw()
    -- Clear
    canvas.set_color(BG_COLOR[1], BG_COLOR[2], BG_COLOR[3])
    canvas.fill_rect(0, 0, WIDTH, HEIGHT)

    -- Title
    canvas.set_color(TEXT_COLOR[1], TEXT_COLOR[2], TEXT_COLOR[3])
    canvas.draw_text(10, 25, "Gamepad Input Demo")

    -- Gamepad count
    local count = canvas.get_gamepad_count()
    canvas.set_color(TEXT_DIM[1], TEXT_DIM[2], TEXT_DIM[3])
    canvas.draw_text(10, 45, "Connected gamepads: " .. count)
    canvas.draw_text(10, 65, "Press buttons on your controller to test")

    -- Draw up to 4 gamepads
    draw_gamepad(1, GAMEPAD_MARGIN, 80)
    draw_gamepad(2, GAMEPAD_MARGIN + GAMEPAD_WIDTH + GAMEPAD_MARGIN, 80)
    draw_gamepad(3, GAMEPAD_MARGIN, 80 + GAMEPAD_HEIGHT + GAMEPAD_MARGIN)
    draw_gamepad(4, GAMEPAD_MARGIN + GAMEPAD_WIDTH + GAMEPAD_MARGIN, 80 + GAMEPAD_HEIGHT + GAMEPAD_MARGIN)

    -- Instructions
    canvas.set_color(TEXT_DIM[1], TEXT_DIM[2], TEXT_DIM[3])
    canvas.draw_text(10, HEIGHT - 20, "Connect a gamepad to see it appear. Press ESC to exit.")
end

local function update()
    -- Exit on ESC
    if canvas.is_key_pressed(canvas.keys.ESCAPE) then
        canvas.stop()
    end
end

canvas.set_size(WIDTH, HEIGHT)
canvas.tick(function()
    update()
    draw()
end)
canvas.start()
