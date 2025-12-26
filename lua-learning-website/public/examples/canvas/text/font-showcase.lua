-- canvas/text/font-showcase.lua
-- Font API demonstration showcasing custom fonts and text styling

local canvas = require("canvas")

-- Font definitions with their optimal sizes (paths relative to script location)
local fonts = {
    { name = "Bitfantasy", path = "../fonts/10px-Bitfantasy.ttf", size = 20 },
    { name = "CelticTime", path = "../fonts/10px-CelticTime.ttf", size = 20 },
    { name = "HelvetiPixel", path = "../fonts/10px-HelvetiPixel.ttf", size = 20 },
    { name = "Questgiver", path = "../fonts/11px-Questgiver.ttf", size = 22 },
    { name = "FancyPixels", path = "../fonts/12px-FancyPixels.ttf", size = 24 },
    { name = "TimesNewPixel", path = "../fonts/12px-TimesNewPixel.ttf", size = 24 },
    { name = "OldWizard", path = "../fonts/13px-OldWizard.ttf", size = 26 },
    { name = "Sword", path = "../fonts/13px-sword.ttf", size = 26 },
    { name = "WizardsManse", path = "../fonts/13px-WizardsManse.ttf", size = 26 },
    { name = "DungeonSlant", path = "../fonts/15px-DungeonSlant.ttf", size = 30 },
    { name = "Gothbit", path = "../fonts/16px-Gothbit.ttf", size = 32 },
    { name = "Royalati", path = "../fonts/16px-Royalati.ttf", size = 32 },
}

local current_font_index = 1
local scroll_offset = 0
local demo_text = "The quick brown fox jumps!"
local rainbow_phase = 0

-- Register all fonts before starting
for _, font in ipairs(fonts) do
    canvas.assets.font(font.name, font.path)
end

-- Rainbow color cycling
local function get_rainbow_color(offset)
    local phase = (rainbow_phase + offset) % 1
    local r = math.floor(math.sin(phase * 6.28) * 127 + 128)
    local g = math.floor(math.sin(phase * 6.28 + 2.09) * 127 + 128)
    local b = math.floor(math.sin(phase * 6.28 + 4.19) * 127 + 128)
    return r, g, b
end

local function user_input()
    -- Cycle through fonts with arrow keys
    if canvas.is_key_pressed(canvas.keys.DOWN) or canvas.is_key_pressed(canvas.keys.S) then
        current_font_index = current_font_index + 1
        if current_font_index > #fonts then
            current_font_index = 1
        end
    end
    if canvas.is_key_pressed(canvas.keys.UP) or canvas.is_key_pressed(canvas.keys.W) then
        current_font_index = current_font_index - 1
        if current_font_index < 1 then
            current_font_index = #fonts
        end
    end
end

local function draw_header()
    local width = canvas.get_width()

    -- Title with large font
    canvas.set_font_size(48)
    canvas.set_font_family("Gothbit")
    canvas.set_color(255, 215, 0) -- Gold

    local title = "Font Showcase"
    local title_width = canvas.get_text_width(title)
    canvas.draw_text((width - title_width) / 2, 20, title)

    -- Subtitle with different font
    canvas.set_font_size(20)
    canvas.set_font_family("HelvetiPixel")
    canvas.set_color(180, 180, 180)

    local subtitle = "Press UP/DOWN to cycle through fonts"
    local sub_width = canvas.get_text_width(subtitle)
    canvas.draw_text((width - sub_width) / 2, 75, subtitle)
end

local function draw_current_font_demo()
    local width = canvas.get_width()
    local font = fonts[current_font_index]

    -- Current font name (centered, highlighted)
    canvas.set_color(100, 200, 255)
    canvas.set_font_family("Royalati")
    canvas.set_font_size(28)

    local label = "Current: " .. font.name
    local label_width = canvas.get_text_width(label)
    canvas.draw_text((width - label_width) / 2, 110, label)

    -- Demo box background
    canvas.set_color(40, 40, 60)
    canvas.fill_rect(50, 150, width - 100, 120)
    canvas.set_color(100, 100, 150)
    canvas.set_line_width(2)
    canvas.draw_rect(50, 150, width - 100, 120)

    -- Demo text in current font at various sizes
    canvas.set_font_family(font.name)

    -- Small size
    canvas.set_color(200, 200, 200)
    canvas.set_font_size(font.size)
    canvas.draw_text(70, 165, demo_text .. " (size: " .. font.size .. ")")

    -- Medium size
    canvas.set_font_size(font.size + 8)
    canvas.set_color(255, 255, 255)
    canvas.draw_text(70, 195, demo_text .. " (size: " .. (font.size + 8) .. ")")

    -- Large size with rainbow effect
    canvas.set_font_size(font.size + 16)
    local r, g, b = get_rainbow_color(0)
    canvas.set_color(r, g, b)
    canvas.draw_text(70, 230, demo_text .. " (size: " .. (font.size + 16) .. ")")
end

local function draw_font_list()
    local width = canvas.get_width()
    local start_y = 290
    local line_height = 28

    -- Section header
    canvas.set_font_family("WizardsManse")
    canvas.set_font_size(24)
    canvas.set_color(255, 200, 100)
    canvas.draw_text(50, start_y, "Available Fonts:")

    start_y = start_y + 35

    -- Draw each font in its own style
    for i, font in ipairs(fonts) do
        local y = start_y + (i - 1) * line_height
        local is_selected = (i == current_font_index)

        -- Highlight selected font
        if is_selected then
            canvas.set_color(60, 80, 120)
            canvas.fill_rect(45, y - 2, width - 90, line_height - 2)
            canvas.set_color(100, 150, 255)
            canvas.set_line_width(1)
            canvas.draw_rect(45, y - 2, width - 90, line_height - 2)
        end

        -- Font number
        canvas.set_font_family("monospace")
        canvas.set_font_size(14)
        if is_selected then
            canvas.set_color(100, 200, 255)
        else
            canvas.set_color(100, 100, 100)
        end
        canvas.draw_text(50, y, string.format("%2d.", i))

        -- Font name in its own font
        canvas.set_font_family(font.name)
        canvas.set_font_size(font.size)
        if is_selected then
            local r, g, b = get_rainbow_color(i * 0.1)
            canvas.set_color(r, g, b)
        else
            canvas.set_color(220, 220, 220)
        end
        canvas.draw_text(90, y, font.name .. " - ABCDEFG abcdefg 0123456789")
    end
end

local function draw_text_measurement_demo()
    local width = canvas.get_width()
    local height = canvas.get_height()
    local y = height - 80

    -- Measurement demo section
    canvas.set_color(30, 30, 50)
    canvas.fill_rect(0, y - 10, width, 90)

    canvas.set_font_family("HelvetiPixel")
    canvas.set_font_size(16)
    canvas.set_color(255, 200, 100)
    canvas.draw_text(50, y, "Text Measurement Demo (get_text_width):")

    -- Measure and display text width
    local font = fonts[current_font_index]
    canvas.set_font_family(font.name)
    canvas.set_font_size(font.size)

    local measure_text = "Hello World"
    local text_width = canvas.get_text_width(measure_text)

    -- Draw measured text with box showing exact width
    canvas.set_color(255, 255, 255)
    local text_x = 50
    local text_y = y + 25
    canvas.draw_text(text_x, text_y, measure_text)

    -- Draw width indicator
    canvas.set_color(255, 100, 100)
    canvas.set_line_width(2)
    canvas.draw_line(text_x, text_y + font.size + 5, text_x + text_width, text_y + font.size + 5)

    -- Width label
    canvas.set_font_family("monospace")
    canvas.set_font_size(14)
    canvas.set_color(255, 150, 150)
    canvas.draw_text(text_x + text_width + 10, text_y + 5,
        string.format("width: %.1f px", text_width))

    -- Per-call override demo
    canvas.set_color(100, 255, 100)
    canvas.draw_text(400, y, "Per-call font override:")

    -- Use draw_text with options table for inline font changes
    canvas.set_color(255, 255, 255)
    canvas.draw_text(400, y + 25, "Mixed ", { font_size = 18 })
    canvas.draw_text(460, y + 25, "fonts ", { font_family = "Gothbit", font_size = 24 })
    canvas.draw_text(530, y + 25, "in one ", { font_family = "OldWizard", font_size = 20 })
    canvas.draw_text(610, y + 25, "line!", { font_family = "DungeonSlant", font_size = 26 })
end

local function draw()
    local dt = canvas.get_delta()
    rainbow_phase = rainbow_phase + dt * 0.3

    -- Clear with dark background
    canvas.set_color(25, 25, 35)
    canvas.fill_rect(0, 0, canvas.get_width(), canvas.get_height())

    draw_header()
    draw_current_font_demo()
    draw_font_list()
    draw_text_measurement_demo()
end

local function game()
    user_input()
    draw()
end

canvas.set_size(800, 800)
canvas.tick(game)
canvas.start()
