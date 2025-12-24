-- Game HUD Demo
-- Demonstrates text alignment, draw_label, and various canvas features
-- in a stylized game interface

local canvas = require("canvas")

canvas.set_size(640, 480)

-- Colors
local COLORS = {
    bg = "#0a0a12",
    panel = "#1a1a2e",
    panel_border = "#2d2d44",
    accent = "#4ECDC4",
    health = "#e74c3c",
    health_bg = "#5c1e1a",
    mana = "#3498db",
    mana_bg = "#1a3a5c",
    xp = "#f1c40f",
    xp_bg = "#5c4a0f",
    gold = "#ffd700",
    text = "#ffffff",
    text_dim = "#888888",
    button = "#667eea",
    button_hover = "#764ba2",
    danger = "#ff6b6b",
    success = "#51cf66",
}

-- Game state (simulated)
local player = {
    name = "Adventurer",
    level = 12,
    health = 73,
    max_health = 100,
    mana = 45,
    max_mana = 80,
    xp = 2450,
    xp_to_level = 3000,
    gold = 1284,
    strength = 18,
    defense = 12,
    magic = 15,
}

local dialogue = {
    speaker = "Elder Sage",
    text = "Welcome, brave adventurer! The ancient ruins to the north hold many secrets. But beware - dark forces have awakened within...",
    active = true,
}

local notifications = {
    {text = "+50 XP", color = COLORS.xp, time = 2.5},
    {text = "Quest Updated!", color = COLORS.accent, time = 1.8},
    {text = "Low Health!", color = COLORS.danger, time = 0.5},
}

-- Helper: Draw a panel with border
local function draw_panel(x, y, w, h, title)
    -- Panel background
    canvas.set_fill_style(COLORS.panel)
    canvas.begin_path()
    canvas.round_rect(x, y, w, h, 8)
    canvas.fill()

    -- Border
    canvas.set_stroke_style(COLORS.panel_border)
    canvas.set_line_width(2)
    canvas.begin_path()
    canvas.round_rect(x, y, w, h, 8)
    canvas.stroke()

    -- Title if provided
    if title then
        canvas.set_fill_style(COLORS.accent)
        canvas.set_font_size(11)
        canvas.set_text_align("left")
        canvas.set_text_baseline("top")
        canvas.draw_text(x + 10, y + 6, title)
    end
end

-- Helper: Draw a progress bar
local function draw_bar(x, y, w, h, value, max, fg_color, bg_color, show_text)
    local pct = value / max

    -- Background
    canvas.set_fill_style(bg_color)
    canvas.begin_path()
    canvas.round_rect(x, y, w, h, 4)
    canvas.fill()

    -- Foreground
    if pct > 0 then
        canvas.set_fill_style(fg_color)
        canvas.begin_path()
        canvas.round_rect(x, y, w * pct, h, 4)
        canvas.fill()
    end

    -- Text overlay
    if show_text then
        canvas.set_fill_style(COLORS.text)
        canvas.set_font_size(10)
        canvas.draw_label(x, y, w, h, value .. "/" .. max)
    end
end

-- Helper: Draw a button
local function draw_button(x, y, w, h, text, color)
    -- Shadow
    canvas.set_shadow(COLORS.bg, 4, 2, 2)

    -- Button background
    canvas.set_fill_style(color or COLORS.button)
    canvas.begin_path()
    canvas.round_rect(x, y, w, h, 6)
    canvas.fill()

    canvas.clear_shadow()

    -- Button text
    canvas.set_fill_style(COLORS.text)
    canvas.set_font_size(12)
    canvas.draw_label(x, y, w, h, text, {
        overflow = "ellipsis",
        padding = {left = 8, right = 8}
    })
end

canvas.tick(function()
    canvas.clear()
    local w, h = canvas.get_width(), canvas.get_height()
    local time = canvas.get_time()

    -- Background
    canvas.set_fill_style(COLORS.bg)
    canvas.fill_rect(0, 0, w, h)

    -- =========================================================================
    -- TOP LEFT: Player Info Panel
    -- =========================================================================
    draw_panel(10, 10, 200, 120, "PLAYER")

    -- Player name and level
    canvas.set_fill_style(COLORS.text)
    canvas.set_font_size(14)
    canvas.set_text_align("left")
    canvas.set_text_baseline("top")
    canvas.draw_text(20, 28, player.name)

    canvas.set_fill_style(COLORS.accent)
    canvas.set_font_size(11)
    canvas.draw_text(20, 46, "Level " .. player.level)

    -- Health bar
    canvas.set_fill_style(COLORS.text_dim)
    canvas.set_font_size(9)
    canvas.draw_text(20, 64, "HP")
    draw_bar(42, 62, 155, 14, player.health, player.max_health, COLORS.health, COLORS.health_bg, true)

    -- Mana bar
    canvas.draw_text(20, 82, "MP")
    draw_bar(42, 80, 155, 14, player.mana, player.max_mana, COLORS.mana, COLORS.mana_bg, true)

    -- XP bar
    canvas.draw_text(20, 100, "XP")
    draw_bar(42, 98, 155, 14, player.xp, player.xp_to_level, COLORS.xp, COLORS.xp_bg, true)

    -- =========================================================================
    -- TOP RIGHT: Stats Panel
    -- =========================================================================
    draw_panel(w - 150, 10, 140, 100, "STATS")

    local stats = {
        {label = "STR", value = player.strength, color = COLORS.health},
        {label = "DEF", value = player.defense, color = COLORS.mana},
        {label = "MAG", value = player.magic, color = COLORS.accent},
    }

    for i, stat in ipairs(stats) do
        local sy = 30 + (i - 1) * 22
        canvas.set_fill_style(COLORS.text_dim)
        canvas.set_font_size(10)
        canvas.set_text_align("left")
        canvas.set_text_baseline("middle")
        canvas.draw_text(w - 140, sy + 8, stat.label)

        -- Stat bar
        canvas.set_fill_style(stat.color .. "40")
        canvas.fill_rect(w - 110, sy, 80, 16)
        canvas.set_fill_style(stat.color)
        canvas.fill_rect(w - 110, sy, 80 * (stat.value / 25), 16)

        -- Value
        canvas.set_fill_style(COLORS.text)
        canvas.set_font_size(11)
        canvas.draw_label(w - 110, sy, 80, 16, tostring(stat.value))
    end

    -- =========================================================================
    -- TOP CENTER: Currency/Score
    -- =========================================================================
    canvas.set_fill_style(COLORS.gold)
    canvas.set_font_size(16)
    canvas.set_text_align("center")
    canvas.set_text_baseline("top")
    canvas.draw_text(w / 2, 15, string.format("%d G", player.gold))

    -- =========================================================================
    -- BOTTOM: Dialogue Box (with typewriter effect)
    -- =========================================================================
    if dialogue.active then
        local dlg_x, dlg_y = 10, h - 110
        local dlg_w, dlg_h = w - 20, 100

        -- Dialogue panel with gradient-like effect
        canvas.set_fill_style(COLORS.panel .. "ee")
        canvas.begin_path()
        canvas.round_rect(dlg_x, dlg_y, dlg_w, dlg_h, 10)
        canvas.fill()

        canvas.set_stroke_style(COLORS.accent)
        canvas.set_line_width(2)
        canvas.begin_path()
        canvas.round_rect(dlg_x, dlg_y, dlg_w, dlg_h, 10)
        canvas.stroke()

        -- Speaker name
        canvas.set_fill_style(COLORS.accent)
        canvas.set_font_size(13)
        canvas.set_text_align("left")
        canvas.set_text_baseline("top")
        canvas.draw_text(dlg_x + 15, dlg_y + 10, dialogue.speaker)

        -- Dialogue text with typewriter effect
        local chars = math.floor(time * 25) % (#dialogue.text + 60)
        canvas.set_fill_style(COLORS.text)
        canvas.set_font_size(12)
        canvas.draw_label(dlg_x + 15, dlg_y + 30, dlg_w - 30, dlg_h - 45, dialogue.text, {
            wrap = true,
            align_h = "left",
            align_v = "top",
            char_count = chars,
            line_height = 1.4
        })

        -- "Press SPACE to continue" hint (blinking)
        if chars >= #dialogue.text then
            local blink = math.floor(time * 2) % 2 == 0
            if blink then
                canvas.set_fill_style(COLORS.text_dim)
                canvas.set_font_size(10)
                canvas.set_text_align("right")
                canvas.set_text_baseline("bottom")
                canvas.draw_text(dlg_x + dlg_w - 15, dlg_y + dlg_h - 10, "[SPACE] Continue")
            end
        end
    end

    -- =========================================================================
    -- RIGHT SIDE: Action Buttons
    -- =========================================================================
    local btn_x = w - 110
    local btn_y = 130
    local btn_w = 100
    local btn_h = 32
    local btn_gap = 8

    draw_button(btn_x, btn_y, btn_w, btn_h, "Inventory", COLORS.button)
    draw_button(btn_x, btn_y + btn_h + btn_gap, btn_w, btn_h, "Skills", COLORS.button)
    draw_button(btn_x, btn_y + (btn_h + btn_gap) * 2, btn_w, btn_h, "Map", COLORS.button)
    draw_button(btn_x, btn_y + (btn_h + btn_gap) * 3, btn_w, btn_h, "Quest Log", COLORS.button_hover)

    -- =========================================================================
    -- LEFT SIDE: Quick Slots
    -- =========================================================================
    local slot_size = 40
    local slot_y = h - 160

    canvas.set_fill_style(COLORS.text_dim)
    canvas.set_font_size(10)
    canvas.set_text_align("left")
    canvas.set_text_baseline("bottom")
    canvas.draw_text(10, slot_y - 5, "QUICK SLOTS")

    for i = 1, 4 do
        local sx = 10 + (i - 1) * (slot_size + 5)

        -- Slot background
        canvas.set_fill_style(COLORS.panel)
        canvas.begin_path()
        canvas.round_rect(sx, slot_y, slot_size, slot_size, 6)
        canvas.fill()

        canvas.set_stroke_style(COLORS.panel_border)
        canvas.set_line_width(1)
        canvas.begin_path()
        canvas.round_rect(sx, slot_y, slot_size, slot_size, 6)
        canvas.stroke()

        -- Slot number
        canvas.set_fill_style(COLORS.text_dim)
        canvas.set_font_size(9)
        canvas.set_text_align("left")
        canvas.set_text_baseline("top")
        canvas.draw_text(sx + 4, slot_y + 3, tostring(i))

        -- Simulated item icons (colored circles)
        if i <= 3 then
            local colors = {COLORS.health, COLORS.mana, COLORS.xp}
            canvas.set_fill_style(colors[i])
            canvas.fill_circle(sx + slot_size/2, slot_y + slot_size/2 + 3, 12)
        end
    end

    -- =========================================================================
    -- FLOATING NOTIFICATIONS (animated)
    -- =========================================================================
    for i, notif in ipairs(notifications) do
        local y_offset = math.sin(time * 3 + i) * 5
        local alpha = 0.7 + math.sin(time * 4 + i * 0.5) * 0.3

        canvas.set_fill_style(notif.color)
        canvas.set_font_size(12)
        canvas.set_text_align("center")
        canvas.set_text_baseline("middle")
        canvas.draw_text(w / 2, 60 + i * 25 + y_offset, notif.text)
    end

    -- =========================================================================
    -- MINIMAP (top right corner, below stats)
    -- =========================================================================
    local map_x, map_y = w - 150, 120
    local map_size = 80

    draw_panel(map_x, map_y, map_size + 10, map_size + 25, "MAP")

    -- Map background
    canvas.set_fill_style("#0d1117")
    canvas.fill_rect(map_x + 5, map_y + 20, map_size, map_size)

    -- Simulated terrain dots
    canvas.set_fill_style("#2d5a27")
    for j = 0, 7 do
        for k = 0, 7 do
            if math.random() > 0.6 then
                canvas.fill_rect(map_x + 7 + j * 10, map_y + 22 + k * 10, 8, 8)
            end
        end
    end

    -- Player position (blinking dot)
    local blink = math.floor(time * 3) % 2 == 0
    if blink then
        canvas.set_fill_style(COLORS.accent)
        canvas.fill_circle(map_x + 5 + map_size/2, map_y + 20 + map_size/2, 4)
    end

    -- =========================================================================
    -- FPS Counter (bottom right)
    -- =========================================================================
    local fps = math.floor(1 / canvas.get_delta())
    canvas.set_fill_style(COLORS.text_dim)
    canvas.set_font_size(10)
    canvas.set_text_align("right")
    canvas.set_text_baseline("bottom")
    canvas.draw_text(w - 10, h - 115, "FPS: " .. fps)
end)

canvas.start()
