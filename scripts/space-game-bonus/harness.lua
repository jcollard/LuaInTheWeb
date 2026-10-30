-- Headless smoke-test harness for space game solutions.
-- Usage: lua harness.lua <solution.lua> <project_dir> [frames] [seed]
-- Mocks the canvas API, feeds random input, and runs the game loop.
-- Fails on any Lua error, missing asset, unknown API, or bad draw values.

local script_path, project_dir = arg[1], arg[2]
local FRAMES = tonumber(arg[3] or "20000")
local SEED = tonumber(arg[4] or "1")
math.randomseed(SEED)
local rng_state = SEED

local function rnd()
    -- driver RNG independent of the game's math.random
    rng_state = (rng_state * 1103515245 + 12345) % 2147483648
    return rng_state / 2147483648
end

local API = [[start stop tick set_start_screen is_waiting_for_interaction set_size get_width get_height clear clear_rect set_color set_line_width set_line_cap set_line_join set_miter_limit set_line_dash get_line_dash set_line_dash_offset create_linear_gradient create_radial_gradient create_conic_gradient create_pattern set_fill_style set_stroke_style set_shadow_color set_shadow_blur set_shadow_offset_x set_shadow_offset_y set_shadow clear_shadow set_global_alpha set_composite_operation set_image_smoothing set_filter set_text_align set_text_baseline set_direction draw_label set_font_size set_font_family get_text_width get_text_metrics draw_rect fill_rect draw_circle fill_circle draw_line draw_text stroke_text get_delta get_time capture is_key_down is_key_pressed get_keys_down get_keys_pressed get_mouse_x get_mouse_y is_mouse_down is_mouse_pressed get_gamepad_count is_gamepad_connected get_gamepad_button is_gamepad_button_pressed get_gamepad_axis draw_image translate rotate scale save restore transform set_transform reset_transform begin_path close_path move_to line_to fill stroke arc arc_to quadratic_curve_to bezier_curve_to ellipse round_rect rect clip is_point_in_path is_point_in_stroke create_path play_sound get_sound_duration play_music stop_music pause_music resume_music set_music_volume is_music_playing get_music_time get_music_duration set_master_volume get_master_volume mute unmute is_muted]]

local DT = 1 / 60
local frame = 0
local tick_fn = nil
local started = false
local paths = {}
local images, sounds, musics, fonts = {}, {}, {}, {}
local save_depth = 0
local stats = { draws = 0, sounds = {}, max_entities = 0 }
local held, pressed = {}, {}
local mouse_x, mouse_y, mouse_down, mouse_pressed = 400, 300, false, false
local font_size = 16
local muted = false

local function file_exists(p)
    local f = io.open(p, "rb")
    if f then f:close() return true end
    return false
end

local function png_size(p)
    local f = assert(io.open(p, "rb"))
    local data = f:read(24)
    f:close()
    local function u32(i)
        local a, b, c, d = data:byte(i, i + 3)
        return ((a * 256 + b) * 256 + c) * 256 + d
    end
    return u32(17), u32(21)
end

local function find_asset(filename)
    for _, dir in ipairs(paths) do
        local p = project_dir .. "/" .. dir .. "/" .. filename
        if file_exists(p) then return p end
    end
    return nil
end

local function check_num(name, ...)
    local n = select("#", ...)
    for i = 1, n do
        local v = select(i, ...)
        if type(v) ~= "number" then
            error(name .. ": argument " .. i .. " must be a number, got " .. type(v), 3)
        end
        if v ~= v or v == math.huge or v == -math.huge then
            error(name .. ": argument " .. i .. " is NaN/inf", 3)
        end
    end
end

local canvas = {}
for name in API:gmatch("%S+") do
    canvas[name] = function() return nil end
end

canvas.keys = setmetatable({}, { __index = function(_, k) return "Key_" .. k end })
canvas.buttons = setmetatable({}, { __index = function(_, k) return "Btn_" .. k end })
canvas.axes = setmetatable({}, { __index = function(_, k) return "Axis_" .. k end })

canvas.assets = {}
function canvas.assets.add_path(p) table.insert(paths, p) end
function canvas.assets.load_image(name, filename)
    assert(not started, "load_image must be called before canvas.start()")
    local p = find_asset(filename)
    if not p then error("image not found: " .. filename, 2) end
    local w, h = png_size(p)
    images[name] = { w = w, h = h }
    return { _name = name }
end
function canvas.assets.load_sound(name, filename)
    assert(not started, "load_sound must be called before canvas.start()")
    if not find_asset(filename) then error("sound not found: " .. filename, 2) end
    sounds[name] = true
    return { _name = name }
end
function canvas.assets.load_music(name, filename)
    if not find_asset(filename) then error("music not found: " .. filename, 2) end
    musics[name] = true
    return { _name = name }
end
function canvas.assets.load_font(name, filename)
    if not find_asset(filename) then error("font not found: " .. filename, 2) end
    fonts[name] = true
    return { _name = name }
end
local function asset_name(x) return type(x) == "table" and x._name or x end
function canvas.assets.get_width(n) return images[asset_name(n)].w end
function canvas.assets.get_height(n) return images[asset_name(n)].h end

function canvas.set_size(w, h) check_num("set_size", w, h) end
function canvas.get_width() return 800 end
function canvas.get_height() return 600 end
function canvas.get_delta() return DT end
function canvas.get_time() return frame * DT end
function canvas.tick(fn) tick_fn = fn end
function canvas.start() started = true end

function canvas.set_color(r, g, b, a)
    check_num("set_color", r, g, b)
    if a ~= nil then check_num("set_color", a) end
end
function canvas.set_global_alpha(a)
    check_num("set_global_alpha", a)
end
function canvas.set_font_size(s) check_num("set_font_size", s) font_size = s end
function canvas.set_font_family(f)
    if not fonts[f] and type(f) ~= "string" then error("bad font", 2) end
end
function canvas.get_text_width(s)
    assert(type(s) == "string", "get_text_width needs a string")
    return #s * font_size * 0.55
end
function canvas.fill_rect(x, y, w, h) check_num("fill_rect", x, y, w, h) stats.draws = stats.draws + 1 end
function canvas.draw_rect(x, y, w, h) check_num("draw_rect", x, y, w, h) end
function canvas.fill_circle(x, y, r) check_num("fill_circle", x, y, r) end
function canvas.draw_circle(x, y, r) check_num("draw_circle", x, y, r) end
function canvas.draw_line(a, b, c, d) check_num("draw_line", a, b, c, d) end
function canvas.draw_text(x, y, s)
    check_num("draw_text", x, y)
    if type(s) ~= "string" and type(s) ~= "number" then error("draw_text: text must be string", 2) end
end
function canvas.draw_image(name, x, y, w, h)
    if not images[asset_name(name)] then error("draw_image: image not loaded: " .. tostring(asset_name(name)), 2) end
    check_num("draw_image", x, y)
    if w ~= nil then check_num("draw_image", w, h) end
    stats.draws = stats.draws + 1
end
function canvas.translate(x, y) check_num("translate", x, y) end
function canvas.rotate(a) check_num("rotate", a) end
function canvas.scale(x, y) check_num("scale", x, y) end
function canvas.save() save_depth = save_depth + 1 end
function canvas.restore()
    save_depth = save_depth - 1
    if save_depth < 0 then error("restore() without save()", 2) end
end
function canvas.play_sound(n, vol)
    n = asset_name(n)
    if not sounds[n] then error("play_sound: sound not loaded: " .. tostring(n), 2) end
    stats.sounds[n] = (stats.sounds[n] or 0) + 1
end
function canvas.play_music(n)
    n = asset_name(n)
    if not musics[n] then error("play_music: music not loaded: " .. tostring(n), 2) end
end
function canvas.mute() muted = true end
function canvas.unmute() muted = false end
function canvas.is_muted() return muted end

function canvas.is_key_down(k)
    if k == nil then error("is_key_down: key is nil", 2) end
    return held[k] == true
end
function canvas.is_key_pressed(k)
    if k == nil then error("is_key_pressed: key is nil", 2) end
    return pressed[k] == true
end
function canvas.get_mouse_x() return mouse_x end
function canvas.get_mouse_y() return mouse_y end
function canvas.is_mouse_down(b) return b == 0 and mouse_down end
function canvas.is_mouse_pressed(b) return b == 0 and mouse_pressed end
-- Simulate one connected gamepad with random input
local pad = { axes = {}, buttons = {}, pressed = {} }
function canvas.get_gamepad_count() return 1 end
function canvas.is_gamepad_connected(i) return i == 1 end
function canvas.get_gamepad_axis(i, a) return pad.axes[a] or 0 end
function canvas.get_gamepad_button(i, b) return pad.buttons[b] or 0 end
function canvas.is_gamepad_button_pressed(i, b) return pad.pressed[b] == true end

-- Guard against typos: unknown canvas functions are errors.
setmetatable(canvas, { __index = function(_, k) error("unknown canvas API: canvas." .. tostring(k), 2) end })
setmetatable(canvas.assets, { __index = function(_, k) error("unknown canvas.assets API: " .. tostring(k), 2) end })

local storage = {}
package.preload["canvas"] = function() return canvas end
package.preload["localstorage"] = function()
    local ls = {}
    local prefix = ""
    function ls.set_prefix(p) prefix = p end
    function ls.get_item(k) return storage[prefix .. k] end
    function ls.set_item(k, v) storage[prefix .. k] = tostring(v) return true end
    function ls.remove_item(k) storage[prefix .. k] = nil end
    function ls.clear() storage = {} end
    return ls
end

-- Load and run the script (top level registers tick and calls start)
local chunk = assert(loadfile(script_path))
chunk()
assert(tick_fn, "canvas.tick was never called")
assert(started, "canvas.start was never called")

local KEYS = { "LEFT", "RIGHT", "UP", "DOWN", "SPACE", "ENTER", "P", "M", "ESCAPE" }
local hold_for = {}
for f = 1, FRAMES do
    frame = f
    pressed = {}
    for _, k in ipairs(KEYS) do
        local key = canvas.keys[k]
        local was = held[key]
        if (hold_for[k] or 0) > 0 then
            hold_for[k] = hold_for[k] - 1
        else
            local p = (k == "SPACE" and 0.08) or ((k == "ENTER") and 0.01)
                or ((k == "P" or k == "M" or k == "ESCAPE") and 0.002) or 0.03
            if rnd() < p then hold_for[k] = math.floor(rnd() * 40) + 1 else hold_for[k] = 0 end
        end
        held[key] = hold_for[k] > 0
        if held[key] and not was then pressed[key] = true end
    end
    -- unpause quickly so pause doesn't eat the whole run
    if held[canvas.keys.P] then hold_for.P = 0 end
    local was_down = mouse_down
    mouse_x = math.max(0, math.min(800, mouse_x + (rnd() - 0.5) * 40))
    mouse_y = math.max(0, math.min(600, mouse_y + (rnd() - 0.5) * 40))
    mouse_down = rnd() < 0.3
    mouse_pressed = mouse_down and not was_down
    pad.axes[canvas.axes.LEFT_STICK_X] = (rnd() - 0.5) * 2
    pad.axes[canvas.axes.LEFT_STICK_Y] = (rnd() - 0.5) * 2
    pad.pressed = {}
    if rnd() < 0.05 then pad.pressed[canvas.buttons.SOUTH] = true pad.pressed[canvas.buttons.A] = true end
    if rnd() < 0.01 then pad.pressed[canvas.buttons.START] = true end
    pad.buttons[canvas.buttons.SOUTH] = rnd() < 0.2 and 1 or 0
    pad.buttons[canvas.buttons.A] = pad.buttons[canvas.buttons.SOUTH]

    local ok, err = pcall(tick_fn)
    if not ok then
        io.stderr:write(string.format("FAIL %s frame %d: %s\n", script_path, f, tostring(err)))
        os.exit(1)
    end
    if save_depth ~= 0 then
        io.stderr:write(string.format("FAIL %s frame %d: unbalanced save/restore (%d)\n", script_path, f, save_depth))
        os.exit(1)
    end
end

local snd = {}
for k, v in pairs(sounds) do snd[#snd + 1] = k .. "=" .. (stats.sounds[k] or 0) end
table.sort(snd)
print(string.format("OK %s seed=%d frames=%d draws=%d sounds[%s]", script_path:match("[^/]+$"), SEED, FRAMES, stats.draws, table.concat(snd, ",")))
