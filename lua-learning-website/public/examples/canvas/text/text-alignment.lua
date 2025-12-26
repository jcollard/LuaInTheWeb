-- canvas/text/text-alignment.lua
-- Demonstrates set_text_align(), set_text_baseline(), and draw_label()

local canvas = require("canvas")

-- Colors
local BG_COLOR = "#1a1a2e"
local TEXT_COLOR = "#FFFFFF"
local GUIDE_COLOR = "#FF6B6B"
local ACCENT_COLOR = "#4ECDC4"
local BOX_COLOR = "#2d2d44"

canvas.set_size(600, 580)

canvas.tick(function()
    canvas.clear()

    local w, h = canvas.get_width(), canvas.get_height()

    -- Clear background
    canvas.set_fill_style(BG_COLOR)
    canvas.fill_rect(0, 0, w, h)

    -- Title
    canvas.set_fill_style(ACCENT_COLOR)
    canvas.set_font_size(20)
    canvas.set_text_align("center")
    canvas.set_text_baseline("top")
    canvas.draw_text(w / 2, 10, "Text Alignment Demo")

    -- =========================================================================
    -- Section 1: set_text_align (horizontal)
    -- =========================================================================
    local section1Y = 45
    canvas.set_font_size(12)
    canvas.set_fill_style(TEXT_COLOR)
    canvas.set_text_align("left")
    canvas.set_text_baseline("top")
    canvas.draw_text(20, section1Y, "1. set_text_align() - Horizontal")

    -- Draw center line for alignment reference
    local centerX = 140
    canvas.set_stroke_style(GUIDE_COLOR)
    canvas.set_line_width(1)
    canvas.begin_path()
    canvas.move_to(centerX, section1Y + 18)
    canvas.line_to(centerX, section1Y + 70)
    canvas.stroke()

    canvas.set_font_size(11)
    canvas.set_fill_style(TEXT_COLOR)
    canvas.set_text_baseline("middle")

    canvas.set_text_align("left")
    canvas.draw_text(centerX, section1Y + 28, 'left')
    canvas.set_text_align("center")
    canvas.draw_text(centerX, section1Y + 44, 'center')
    canvas.set_text_align("right")
    canvas.draw_text(centerX, section1Y + 60, 'right')

    -- =========================================================================
    -- Section 2: set_text_baseline (vertical)
    -- =========================================================================
    local section2X = 280
    canvas.set_font_size(12)
    canvas.set_fill_style(TEXT_COLOR)
    canvas.set_text_align("left")
    canvas.set_text_baseline("top")
    canvas.draw_text(section2X, section1Y, "2. set_text_baseline() - Vertical")

    -- Draw horizontal baseline reference line
    local baselineY = section1Y + 50
    canvas.set_stroke_style(GUIDE_COLOR)
    canvas.begin_path()
    canvas.move_to(section2X + 10, baselineY)
    canvas.line_to(section2X + 300, baselineY)
    canvas.stroke()

    canvas.set_font_size(11)
    canvas.set_fill_style(TEXT_COLOR)
    canvas.set_text_align("left")

    local baselines = {"top", "middle", "alphabetic", "bottom"}
    local bx = section2X + 20
    for _, bl in ipairs(baselines) do
        canvas.set_text_baseline(bl)
        canvas.draw_text(bx, baselineY, bl)
        bx = bx + 70
    end

    -- =========================================================================
    -- Section 3: draw_label() - Centered in boxes
    -- =========================================================================
    local section3Y = 125
    canvas.set_font_size(12)
    canvas.set_fill_style(TEXT_COLOR)
    canvas.set_text_align("left")
    canvas.set_text_baseline("top")
    canvas.draw_text(20, section3Y, "3. draw_label() - Alignment in Rectangle")

    local boxes = {
        {x = 20, y = section3Y + 20, w = 90, h = 35, text = "Default"},
        {x = 120, y = section3Y + 20, w = 90, h = 35, text = "Left", align_h = "left"},
        {x = 220, y = section3Y + 20, w = 90, h = 35, text = "Right", align_h = "right"},
        {x = 320, y = section3Y + 20, w = 90, h = 35, text = "Top", align_v = "top"},
        {x = 420, y = section3Y + 20, w = 90, h = 35, text = "Bottom", align_v = "bottom"},
    }

    for _, box in ipairs(boxes) do
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
        canvas.set_font_size(11)
        canvas.draw_label(box.x, box.y, box.w, box.h, box.text, {
            align_h = box.align_h or "center",
            align_v = box.align_v or "middle"
        })
    end

    -- =========================================================================
    -- Section 4: draw_label() - Overflow handling
    -- =========================================================================
    local section4Y = 200
    canvas.set_font_size(12)
    canvas.set_fill_style(TEXT_COLOR)
    canvas.set_text_align("left")
    canvas.set_text_baseline("top")
    canvas.draw_text(20, section4Y, "4. draw_label() - Overflow Handling")

    local longText = "This is a very long text that will overflow"
    local overflowBoxes = {
        {x = 20, y = section4Y + 20, w = 150, h = 30, overflow = "visible", label = "visible"},
        {x = 190, y = section4Y + 20, w = 150, h = 30, overflow = "hidden", label = "hidden"},
        {x = 360, y = section4Y + 20, w = 150, h = 30, overflow = "ellipsis", label = "ellipsis"},
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
        canvas.set_fill_style("#888888")
        canvas.set_font_size(9)
        canvas.set_text_align("center")
        canvas.set_text_baseline("bottom")
        canvas.draw_text(box.x + box.w/2, box.y - 2, box.label)

        canvas.set_fill_style(TEXT_COLOR)
        canvas.set_font_size(11)
        canvas.draw_label(box.x, box.y, box.w, box.h, longText, {
            overflow = box.overflow,
            align_h = "left",
            padding = {left = 5}
        })
    end

    -- =========================================================================
    -- Section 5: draw_label() - Word Wrapping
    -- =========================================================================
    local section5Y = 270
    canvas.set_font_size(12)
    canvas.set_fill_style(TEXT_COLOR)
    canvas.set_text_align("left")
    canvas.set_text_baseline("top")
    canvas.draw_text(20, section5Y, "5. draw_label() - Word Wrapping")

    local wrapText = "This text will wrap to multiple lines within the box"
    local wrapBoxes = {
        {x = 20, y = section5Y + 20, w = 130, h = 60, align_h = "left", label = "Left"},
        {x = 170, y = section5Y + 20, w = 130, h = 60, align_h = "center", label = "Center"},
        {x = 320, y = section5Y + 20, w = 130, h = 60, align_h = "right", label = "Right"},
    }

    for _, box in ipairs(wrapBoxes) do
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

        -- Label
        canvas.set_fill_style("#888888")
        canvas.set_font_size(9)
        canvas.set_text_align("center")
        canvas.set_text_baseline("bottom")
        canvas.draw_text(box.x + box.w/2, box.y - 2, box.label)

        canvas.set_fill_style(TEXT_COLOR)
        canvas.set_font_size(11)
        canvas.draw_label(box.x, box.y, box.w, box.h, wrapText, {
            wrap = true,
            align_h = box.align_h,
            padding = {left = 8, right = 8}
        })
    end

    -- =========================================================================
    -- Section 6: Typewriter Effect (char_count)
    -- =========================================================================
    local section6Y = 365
    canvas.set_font_size(12)
    canvas.set_fill_style(TEXT_COLOR)
    canvas.set_text_align("left")
    canvas.set_text_baseline("top")
    canvas.draw_text(20, section6Y, "6. draw_label() - Typewriter Effect (char_count)")

    local typewriterText = "Hello! This text appears one character at a time, creating a typewriter effect perfect for dialogue in games."
    local chars_to_show = math.floor(canvas.get_time() * 12) % (#typewriterText + 30)

    -- Typewriter box
    canvas.set_fill_style(BOX_COLOR)
    canvas.fill_rect(20, section6Y + 20, 400, 50)
    canvas.set_stroke_style(ACCENT_COLOR)
    canvas.set_line_width(1)
    canvas.begin_path()
    canvas.move_to(20, section6Y + 20)
    canvas.line_to(420, section6Y + 20)
    canvas.line_to(420, section6Y + 70)
    canvas.line_to(20, section6Y + 70)
    canvas.close_path()
    canvas.stroke()

    canvas.set_fill_style(TEXT_COLOR)
    canvas.set_font_size(11)
    canvas.draw_label(20, section6Y + 20, 400, 50, typewriterText, {
        wrap = true,
        align_h = "left",
        char_count = chars_to_show,
        padding = {left = 10, right = 10, top = 5, bottom = 5}
    })

    -- Character counter
    canvas.set_fill_style("#888888")
    canvas.set_font_size(9)
    canvas.set_text_align("left")
    canvas.set_text_baseline("top")
    canvas.draw_text(430, section6Y + 40, "chars: " .. math.min(chars_to_show, #typewriterText) .. "/" .. #typewriterText)

    -- =========================================================================
    -- Section 7: Practical UI Buttons
    -- =========================================================================
    local section7Y = 445
    canvas.set_font_size(12)
    canvas.set_fill_style(TEXT_COLOR)
    canvas.set_text_align("left")
    canvas.set_text_baseline("top")
    canvas.draw_text(20, section7Y, "7. Practical: UI Buttons")

    local buttons = {
        {x = 20, y = section7Y + 20, w = 100, h = 40, text = "Play", color = "#4CAF50"},
        {x = 130, y = section7Y + 20, w = 100, h = 40, text = "Settings", color = "#2196F3"},
        {x = 240, y = section7Y + 20, w = 100, h = 40, text = "Exit", color = "#f44336"},
        {x = 350, y = section7Y + 20, w = 140, h = 40, text = "Very Long Button Text", color = "#9C27B0"},
    }

    for _, btn in ipairs(buttons) do
        canvas.set_fill_style(btn.color)
        canvas.fill_rect(btn.x, btn.y, btn.w, btn.h)
        canvas.set_fill_style(TEXT_COLOR)
        canvas.set_font_size(13)
        canvas.draw_label(btn.x, btn.y, btn.w, btn.h, btn.text, {
            overflow = "ellipsis",
            padding = {left = 8, right = 8}
        })
    end

    -- Footer note
    canvas.set_fill_style("#666666")
    canvas.set_font_size(10)
    canvas.set_text_align("center")
    canvas.set_text_baseline("bottom")
    canvas.draw_text(w / 2, h - 8, "draw_label() simplifies text positioning in UI elements")
end)

canvas.start()
