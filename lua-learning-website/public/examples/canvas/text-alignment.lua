-- Text Alignment Demo
-- Demonstrates set_text_align(), set_text_baseline(), and draw_label()

local canvas = require("canvas")

-- Colors
local BG_COLOR = "#1a1a2e"
local TEXT_COLOR = "#FFFFFF"
local GUIDE_COLOR = "#FF6B6B40"
local ACCENT_COLOR = "#4ECDC4"
local BOX_COLOR = "#2d2d44"

canvas.set_size(560, 500)

canvas.tick(function()
    canvas.clear()

    local w, h = canvas.get_width(), canvas.get_height()

    -- Clear background
    canvas.set_fill_style(BG_COLOR)
    canvas.fill_rect(0, 0, w, h)

    -- Title
    canvas.set_fill_style(ACCENT_COLOR)
    canvas.set_font_size(24)
    canvas.set_text_align("center")
    canvas.set_text_baseline("top")
    canvas.draw_text(w / 2, 15, "Text Alignment & draw_label() Demo")

    -- =========================================================================
    -- Section 1: Basic Alignment (set_text_align / set_text_baseline)
    -- =========================================================================
    local section1Y = 55
    canvas.set_font_size(14)
    canvas.set_fill_style(TEXT_COLOR)
    canvas.set_text_align("left")
    canvas.draw_text(20, section1Y, "1. Basic Alignment (set_text_align)")

    -- Draw center line for alignment reference
    local centerX = w / 2
    canvas.set_stroke_style(GUIDE_COLOR)
    canvas.set_line_width(2)
    canvas.begin_path()
    canvas.move_to(centerX, section1Y + 20)
    canvas.line_to(centerX, section1Y + 80)
    canvas.stroke()

    -- Show different alignments
    canvas.set_font_size(13)
    canvas.set_fill_style(TEXT_COLOR)
    canvas.set_text_baseline("middle")

    canvas.set_text_align("left")
    canvas.draw_text(centerX, section1Y + 35, 'align = "left"')

    canvas.set_text_align("center")
    canvas.draw_text(centerX, section1Y + 52, 'align = "center"')

    canvas.set_text_align("right")
    canvas.draw_text(centerX, section1Y + 69, 'align = "right"')

    -- =========================================================================
    -- Section 2: draw_label() Basic Usage
    -- =========================================================================
    local section2Y = 145
    canvas.set_font_size(14)
    canvas.set_fill_style(TEXT_COLOR)
    canvas.set_text_align("left")
    canvas.set_text_baseline("top")
    canvas.draw_text(20, section2Y, "2. draw_label() - Centered in Rectangle")

    -- Draw labeled boxes
    local boxes = {
        {x = 30, y = section2Y + 25, w = 110, h = 35, text = "Default"},
        {x = 160, y = section2Y + 25, w = 110, h = 35, text = "Centered", align_h = "center"},
        {x = 290, y = section2Y + 25, w = 110, h = 35, text = "Left", align_h = "left"},
        {x = 420, y = section2Y + 25, w = 110, h = 35, text = "Right", align_h = "right"},
    }

    for _, box in ipairs(boxes) do
        -- Box background
        canvas.set_fill_style(BOX_COLOR)
        canvas.fill_rect(box.x, box.y, box.w, box.h)

        -- Box border
        canvas.set_stroke_style(ACCENT_COLOR)
        canvas.set_line_width(1)
        canvas.begin_path()
        canvas.move_to(box.x, box.y)
        canvas.line_to(box.x + box.w, box.y)
        canvas.line_to(box.x + box.w, box.y + box.h)
        canvas.line_to(box.x, box.y + box.h)
        canvas.close_path()
        canvas.stroke()

        -- Label text
        canvas.set_fill_style(TEXT_COLOR)
        canvas.set_font_size(13)
        canvas.draw_label(box.x, box.y, box.w, box.h, box.text, {
            align_h = box.align_h or "center"
        })
    end

    -- =========================================================================
    -- Section 3: draw_label() with Padding
    -- =========================================================================
    local section3Y = 220
    canvas.set_font_size(14)
    canvas.set_fill_style(TEXT_COLOR)
    canvas.set_text_align("left")
    canvas.set_text_baseline("top")
    canvas.draw_text(20, section3Y, "3. draw_label() - With Padding")

    local paddingBoxes = {
        {x = 30, y = section3Y + 25, w = 150, h = 32, text = "No padding", padding = {}},
        {x = 200, y = section3Y + 25, w = 150, h = 32, text = "Left: 15px", padding = {left = 15}, align_h = "left"},
        {x = 370, y = section3Y + 25, w = 160, h = 32, text = "All sides: 10px", padding = {left = 10, top = 10, right = 10, bottom = 10}},
    }

    for _, box in ipairs(paddingBoxes) do
        canvas.set_fill_style(BOX_COLOR)
        canvas.fill_rect(box.x, box.y, box.w, box.h)

        canvas.set_stroke_style(ACCENT_COLOR)
        canvas.set_line_width(1)
        canvas.begin_path()
        canvas.move_to(box.x, box.y)
        canvas.line_to(box.x + box.w, box.y)
        canvas.line_to(box.x + box.w, box.y + box.h)
        canvas.line_to(box.x, box.y + box.h)
        canvas.close_path()
        canvas.stroke()

        canvas.set_fill_style(TEXT_COLOR)
        canvas.set_font_size(12)
        canvas.draw_label(box.x, box.y, box.w, box.h, box.text, {
            align_h = box.align_h or "center",
            padding = box.padding
        })
    end

    -- =========================================================================
    -- Section 4: draw_label() Overflow Handling
    -- =========================================================================
    local section4Y = 295
    canvas.set_font_size(14)
    canvas.set_fill_style(TEXT_COLOR)
    canvas.set_text_align("left")
    canvas.set_text_baseline("top")
    canvas.draw_text(20, section4Y, "4. draw_label() - Overflow Handling")

    local longText = "This is a very long text that will overflow"
    local overflowBoxes = {
        {x = 30, y = section4Y + 30, w = 150, h = 32, overflow = "visible", label = "visible"},
        {x = 200, y = section4Y + 30, w = 150, h = 32, overflow = "hidden", label = "hidden"},
        {x = 370, y = section4Y + 30, w = 150, h = 32, overflow = "ellipsis", label = "ellipsis"},
    }

    for _, box in ipairs(overflowBoxes) do
        canvas.set_fill_style(BOX_COLOR)
        canvas.fill_rect(box.x, box.y, box.w, box.h)

        canvas.set_stroke_style(ACCENT_COLOR)
        canvas.set_line_width(1)
        canvas.begin_path()
        canvas.move_to(box.x, box.y)
        canvas.line_to(box.x + box.w, box.y)
        canvas.line_to(box.x + box.w, box.y + box.h)
        canvas.line_to(box.x, box.y + box.h)
        canvas.close_path()
        canvas.stroke()

        -- Overflow label
        canvas.set_fill_style(GUIDE_COLOR)
        canvas.set_font_size(10)
        canvas.set_text_align("center")
        canvas.set_text_baseline("bottom")
        canvas.draw_text(box.x + box.w/2, box.y - 2, 'overflow="' .. box.label .. '"')

        -- Text with overflow
        canvas.set_fill_style(TEXT_COLOR)
        canvas.set_font_size(12)
        canvas.draw_label(box.x, box.y, box.w, box.h, longText, {
            overflow = box.overflow,
            align_h = "left",
            padding = {left = 5}
        })
    end

    -- =========================================================================
    -- Section 5: Practical Button Example
    -- =========================================================================
    local section5Y = 385
    canvas.set_font_size(14)
    canvas.set_fill_style(TEXT_COLOR)
    canvas.set_text_align("left")
    canvas.set_text_baseline("top")
    canvas.draw_text(20, section5Y, "5. Practical: UI Buttons with draw_label()")

    local buttons = {
        {x = 30, y = section5Y + 25, w = 100, h = 38, text = "Play", color = "#4CAF50"},
        {x = 145, y = section5Y + 25, w = 100, h = 38, text = "Settings", color = "#2196F3"},
        {x = 260, y = section5Y + 25, w = 100, h = 38, text = "Exit", color = "#f44336"},
        {x = 375, y = section5Y + 25, w = 150, h = 38, text = "Very Long Button Text", color = "#9C27B0"},
    }

    for _, btn in ipairs(buttons) do
        -- Button background
        canvas.set_fill_style(btn.color)
        canvas.fill_rect(btn.x, btn.y, btn.w, btn.h)

        -- Button text using draw_label (automatically centered with ellipsis)
        canvas.set_fill_style(TEXT_COLOR)
        canvas.set_font_size(14)
        canvas.draw_label(btn.x, btn.y, btn.w, btn.h, btn.text, {
            overflow = "ellipsis",
            padding = {left = 8, right = 8}
        })
    end

    -- Footer note
    canvas.set_fill_style("#888888")
    canvas.set_font_size(11)
    canvas.set_text_align("center")
    canvas.set_text_baseline("bottom")
    canvas.draw_text(w / 2, h - 10, "draw_label() simplifies text positioning in UI elements")
end)
